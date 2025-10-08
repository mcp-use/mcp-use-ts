import { z } from "zod/v3";
import { validate, } from "@cfworker/json-schema";
import { CallbackManager, parseCallbackConfigArg, } from "../callbacks/manager.js";
import { BaseLangChain } from "../language_models/base.js";
import { mergeConfigs, ensureConfig, patchConfig, pickRunnableConfigKeys, } from "../runnables/config.js";
import { isDirectToolOutput, ToolMessage } from "../messages/tool.js";
import { AsyncLocalStorageProviderSingleton } from "../singletons/index.js";
import { _configHasToolCallId, _isToolCall, ToolInputParsingException, } from "./utils.js";
import { interopParseAsync, isSimpleStringZodSchema, isInteropZodSchema, getSchemaDescription, } from "../utils/types/zod.js";
import { validatesOnlyStrings } from "../utils/json_schema.js";
export { isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams, } from "./types.js";
export { ToolInputParsingException };
/**
 * Base class for Tools that accept input of any shape defined by a Zod schema.
 */
export class StructuredTool extends BaseLangChain {
    get lc_namespace() {
        return ["langchain", "tools"];
    }
    constructor(fields) {
        super(fields ?? {});
        /**
         * Whether to return the tool's output directly.
         *
         * Setting this to true means that after the tool is called,
         * an agent should stop looping.
         */
        Object.defineProperty(this, "returnDirect", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "verboseParsingErrors", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /**
         * The tool response format.
         *
         * If "content" then the output of the tool is interpreted as the contents of a
         * ToolMessage. If "content_and_artifact" then the output is expected to be a
         * two-tuple corresponding to the (content, artifact) of a ToolMessage.
         *
         * @default "content"
         */
        Object.defineProperty(this, "responseFormat", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "content"
        });
        /**
         * Default config object for the tool runnable.
         */
        Object.defineProperty(this, "defaultConfig", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.verboseParsingErrors =
            fields?.verboseParsingErrors ?? this.verboseParsingErrors;
        this.responseFormat = fields?.responseFormat ?? this.responseFormat;
        this.defaultConfig = fields?.defaultConfig ?? this.defaultConfig;
        this.metadata = fields?.metadata ?? this.metadata;
    }
    /**
     * Invokes the tool with the provided input and configuration.
     * @param input The input for the tool.
     * @param config Optional configuration for the tool.
     * @returns A Promise that resolves with the tool's output.
     */
    async invoke(input, config) {
        let toolInput;
        let enrichedConfig = ensureConfig(mergeConfigs(this.defaultConfig, config));
        if (_isToolCall(input)) {
            toolInput = input.args;
            enrichedConfig = {
                ...enrichedConfig,
                toolCall: input,
            };
        }
        else {
            toolInput = input;
        }
        return this.call(toolInput, enrichedConfig);
    }
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     *
     * Calls the tool with the provided argument, configuration, and tags. It
     * parses the input according to the schema, handles any errors, and
     * manages callbacks.
     * @param arg The input argument for the tool.
     * @param configArg Optional configuration or callbacks for the tool.
     * @param tags Optional tags for the tool.
     * @returns A Promise that resolves with a string.
     */
    async call(arg, configArg, 
    /** @deprecated */
    tags) {
        // Determine the actual input that needs parsing/validation.
        // If arg is a ToolCall, use its args; otherwise, use arg directly.
        const inputForValidation = _isToolCall(arg) ? arg.args : arg;
        let parsed; // This will hold the successfully parsed input of the expected output type.
        if (isInteropZodSchema(this.schema)) {
            try {
                // Validate the inputForValidation - TS needs help here as it can't exclude ToolCall based on the check
                parsed = await interopParseAsync(this.schema, inputForValidation);
            }
            catch (e) {
                let message = `Received tool input did not match expected schema`;
                if (this.verboseParsingErrors) {
                    message = `${message}\nDetails: ${e.message}`;
                }
                // Pass the original raw input arg to the exception
                throw new ToolInputParsingException(message, JSON.stringify(arg));
            }
        }
        else {
            const result = validate(inputForValidation, this.schema);
            if (!result.valid) {
                let message = `Received tool input did not match expected schema`;
                if (this.verboseParsingErrors) {
                    message = `${message}\nDetails: ${result.errors
                        .map((e) => `${e.keywordLocation}: ${e.error}`)
                        .join("\n")}`;
                }
                // Pass the original raw input arg to the exception
                throw new ToolInputParsingException(message, JSON.stringify(arg));
            }
            // Assign the validated input to parsed
            // We cast here because validate() doesn't narrow the type sufficiently for TS, but we know it's valid.
            parsed = inputForValidation;
        }
        const config = parseCallbackConfigArg(configArg);
        const callbackManager_ = CallbackManager.configure(config.callbacks, this.callbacks, config.tags || tags, this.tags, config.metadata, this.metadata, { verbose: this.verbose });
        const runManager = await callbackManager_?.handleToolStart(this.toJSON(), 
        // Log the original raw input arg
        typeof arg === "string" ? arg : JSON.stringify(arg), config.runId, undefined, undefined, undefined, config.runName);
        delete config.runId;
        let result;
        try {
            // Pass the correctly typed parsed input to _call
            result = await this._call(parsed, runManager, config);
        }
        catch (e) {
            await runManager?.handleToolError(e);
            throw e;
        }
        let content;
        let artifact;
        if (this.responseFormat === "content_and_artifact") {
            if (Array.isArray(result) && result.length === 2) {
                [content, artifact] = result;
            }
            else {
                throw new Error(`Tool response format is "content_and_artifact" but the output was not a two-tuple.\nResult: ${JSON.stringify(result)}`);
            }
        }
        else {
            content = result;
        }
        let toolCallId;
        // Extract toolCallId ONLY if the original arg was a ToolCall
        if (_isToolCall(arg)) {
            toolCallId = arg.id;
        }
        // Or if it was provided in the config's toolCall property
        if (!toolCallId && _configHasToolCallId(config)) {
            toolCallId = config.toolCall.id;
        }
        const formattedOutput = _formatToolOutput({
            content,
            artifact,
            toolCallId,
            name: this.name,
            metadata: this.metadata,
        });
        await runManager?.handleToolEnd(formattedOutput);
        return formattedOutput;
    }
}
/**
 * Base class for Tools that accept input as a string.
 */
export class Tool extends StructuredTool {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "schema", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: z
                .object({ input: z.string().optional() })
                .transform((obj) => obj.input)
        });
    }
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     *
     * Calls the tool with the provided argument and callbacks. It handles
     * string inputs specifically.
     * @param arg The input argument for the tool, which can be a string, undefined, or an input of the tool's schema.
     * @param callbacks Optional callbacks for the tool.
     * @returns A Promise that resolves with a string.
     */
    // Match the base class signature including the generics and conditional return type
    call(arg, callbacks) {
        // Prepare the input for the base class call method.
        // If arg is string or undefined, wrap it; otherwise, pass ToolCall or { input: ... } directly.
        const structuredArg = typeof arg === "string" || arg == null ? { input: arg } : arg;
        // Ensure TConfig is passed to super.call
        return super.call(structuredArg, callbacks);
    }
}
/**
 * A tool that can be created dynamically from a function, name, and description.
 */
export class DynamicTool extends Tool {
    static lc_name() {
        return "DynamicTool";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "description", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "func", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = fields.name;
        this.description = fields.description;
        this.func = fields.func;
        this.returnDirect = fields.returnDirect ?? this.returnDirect;
    }
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     */
    async call(arg, configArg) {
        const config = parseCallbackConfigArg(configArg);
        if (config.runName === undefined) {
            config.runName = this.name;
        }
        // Call the Tool class's call method, passing generics through
        // Cast config to TConfig to satisfy the super.call signature
        return super.call(arg, config);
    }
    /** @ignore */
    async _call(input, // DynamicTool's _call specifically expects a string after schema transformation
    runManager, parentConfig) {
        return this.func(input, runManager, parentConfig);
    }
}
/**
 * A tool that can be created dynamically from a function, name, and
 * description, designed to work with structured data. It extends the
 * StructuredTool class and overrides the _call method to execute the
 * provided function when the tool is called.
 *
 * Schema can be passed as Zod or JSON schema. The tool will not validate
 * input if JSON schema is passed.
 */
export class DynamicStructuredTool extends StructuredTool {
    static lc_name() {
        return "DynamicStructuredTool";
    }
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "description", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "func", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "schema", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = fields.name;
        this.description = fields.description;
        this.func = fields.func;
        this.returnDirect = fields.returnDirect ?? this.returnDirect;
        this.schema = fields.schema;
    }
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     */
    // Match the base class signature
    async call(arg, configArg, 
    /** @deprecated */
    tags) {
        const config = parseCallbackConfigArg(configArg);
        if (config.runName === undefined) {
            config.runName = this.name;
        }
        // Call the base class method, passing generics through
        // Cast config to TConfig to satisfy the super.call signature
        return super.call(arg, config, tags);
    }
    _call(arg, runManager, parentConfig) {
        return this.func(arg, runManager, parentConfig);
    }
}
/**
 * Abstract base class for toolkits in LangChain. Toolkits are collections
 * of tools that agents can use. Subclasses must implement the `tools`
 * property to provide the specific tools for the toolkit.
 */
export class BaseToolkit {
    getTools() {
        return this.tools;
    }
}
export function tool(func, fields) {
    const isSimpleStringSchema = isSimpleStringZodSchema(fields.schema);
    const isStringJSONSchema = validatesOnlyStrings(fields.schema);
    // If the schema is not provided, or it's a simple string schema, create a DynamicTool
    if (!fields.schema || isSimpleStringSchema || isStringJSONSchema) {
        return new DynamicTool({
            ...fields,
            description: fields.description ??
                (fields.schema && getSchemaDescription(fields.schema)) ??
                `${fields.name} tool`,
            func: async (input, runManager, config) => {
                return new Promise((resolve, reject) => {
                    const childConfig = patchConfig(config, {
                        callbacks: runManager?.getChild(),
                    });
                    void AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(childConfig), async () => {
                        try {
                            // TS doesn't restrict the type here based on the guard above
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            resolve(func(input, childConfig));
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            },
        });
    }
    const schema = fields.schema;
    const description = fields.description ??
        fields.schema.description ??
        `${fields.name} tool`;
    return new DynamicStructuredTool({
        ...fields,
        description,
        schema,
        func: async (input, runManager, config) => {
            return new Promise((resolve, reject) => {
                const childConfig = patchConfig(config, {
                    callbacks: runManager?.getChild(),
                });
                void AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(childConfig), async () => {
                    try {
                        resolve(func(input, childConfig));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        },
    });
}
function _formatToolOutput(params) {
    const { content, artifact, toolCallId, metadata } = params;
    if (toolCallId && !isDirectToolOutput(content)) {
        if (typeof content === "string" ||
            (Array.isArray(content) &&
                content.every((item) => typeof item === "object"))) {
            return new ToolMessage({
                status: "success",
                content,
                artifact,
                tool_call_id: toolCallId,
                name: params.name,
                metadata,
            });
        }
        else {
            return new ToolMessage({
                status: "success",
                content: _stringify(content),
                artifact,
                tool_call_id: toolCallId,
                name: params.name,
                metadata,
            });
        }
    }
    else {
        return content;
    }
}
function _stringify(content) {
    try {
        return JSON.stringify(content, null, 2) ?? "";
    }
    catch (_noOp) {
        return `${content}`;
    }
}
