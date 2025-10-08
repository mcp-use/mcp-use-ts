"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseToolkit = exports.DynamicStructuredTool = exports.DynamicTool = exports.Tool = exports.StructuredTool = exports.ToolInputParsingException = exports.isStructuredToolParams = exports.isStructuredTool = exports.isRunnableToolLike = exports.isLangChainTool = void 0;
exports.tool = tool;
const v3_1 = require("zod/v3");
const json_schema_1 = require("@cfworker/json-schema");
const manager_js_1 = require("../callbacks/manager.cjs");
const base_js_1 = require("../language_models/base.cjs");
const config_js_1 = require("../runnables/config.cjs");
const tool_js_1 = require("../messages/tool.cjs");
const index_js_1 = require("../singletons/index.cjs");
const utils_js_1 = require("./utils.cjs");
Object.defineProperty(exports, "ToolInputParsingException", { enumerable: true, get: function () { return utils_js_1.ToolInputParsingException; } });
const zod_js_1 = require("../utils/types/zod.cjs");
const json_schema_js_1 = require("../utils/json_schema.cjs");
var types_js_1 = require("./types.cjs");
Object.defineProperty(exports, "isLangChainTool", { enumerable: true, get: function () { return types_js_1.isLangChainTool; } });
Object.defineProperty(exports, "isRunnableToolLike", { enumerable: true, get: function () { return types_js_1.isRunnableToolLike; } });
Object.defineProperty(exports, "isStructuredTool", { enumerable: true, get: function () { return types_js_1.isStructuredTool; } });
Object.defineProperty(exports, "isStructuredToolParams", { enumerable: true, get: function () { return types_js_1.isStructuredToolParams; } });
/**
 * Base class for Tools that accept input of any shape defined by a Zod schema.
 */
class StructuredTool extends base_js_1.BaseLangChain {
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
        let enrichedConfig = (0, config_js_1.ensureConfig)((0, config_js_1.mergeConfigs)(this.defaultConfig, config));
        if ((0, utils_js_1._isToolCall)(input)) {
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
        const inputForValidation = (0, utils_js_1._isToolCall)(arg) ? arg.args : arg;
        let parsed; // This will hold the successfully parsed input of the expected output type.
        if ((0, zod_js_1.isInteropZodSchema)(this.schema)) {
            try {
                // Validate the inputForValidation - TS needs help here as it can't exclude ToolCall based on the check
                parsed = await (0, zod_js_1.interopParseAsync)(this.schema, inputForValidation);
            }
            catch (e) {
                let message = `Received tool input did not match expected schema`;
                if (this.verboseParsingErrors) {
                    message = `${message}\nDetails: ${e.message}`;
                }
                // Pass the original raw input arg to the exception
                throw new utils_js_1.ToolInputParsingException(message, JSON.stringify(arg));
            }
        }
        else {
            const result = (0, json_schema_1.validate)(inputForValidation, this.schema);
            if (!result.valid) {
                let message = `Received tool input did not match expected schema`;
                if (this.verboseParsingErrors) {
                    message = `${message}\nDetails: ${result.errors
                        .map((e) => `${e.keywordLocation}: ${e.error}`)
                        .join("\n")}`;
                }
                // Pass the original raw input arg to the exception
                throw new utils_js_1.ToolInputParsingException(message, JSON.stringify(arg));
            }
            // Assign the validated input to parsed
            // We cast here because validate() doesn't narrow the type sufficiently for TS, but we know it's valid.
            parsed = inputForValidation;
        }
        const config = (0, manager_js_1.parseCallbackConfigArg)(configArg);
        const callbackManager_ = manager_js_1.CallbackManager.configure(config.callbacks, this.callbacks, config.tags || tags, this.tags, config.metadata, this.metadata, { verbose: this.verbose });
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
        if ((0, utils_js_1._isToolCall)(arg)) {
            toolCallId = arg.id;
        }
        // Or if it was provided in the config's toolCall property
        if (!toolCallId && (0, utils_js_1._configHasToolCallId)(config)) {
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
exports.StructuredTool = StructuredTool;
/**
 * Base class for Tools that accept input as a string.
 */
class Tool extends StructuredTool {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "schema", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: v3_1.z
                .object({ input: v3_1.z.string().optional() })
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
exports.Tool = Tool;
/**
 * A tool that can be created dynamically from a function, name, and description.
 */
class DynamicTool extends Tool {
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
        const config = (0, manager_js_1.parseCallbackConfigArg)(configArg);
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
exports.DynamicTool = DynamicTool;
/**
 * A tool that can be created dynamically from a function, name, and
 * description, designed to work with structured data. It extends the
 * StructuredTool class and overrides the _call method to execute the
 * provided function when the tool is called.
 *
 * Schema can be passed as Zod or JSON schema. The tool will not validate
 * input if JSON schema is passed.
 */
class DynamicStructuredTool extends StructuredTool {
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
        const config = (0, manager_js_1.parseCallbackConfigArg)(configArg);
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
exports.DynamicStructuredTool = DynamicStructuredTool;
/**
 * Abstract base class for toolkits in LangChain. Toolkits are collections
 * of tools that agents can use. Subclasses must implement the `tools`
 * property to provide the specific tools for the toolkit.
 */
class BaseToolkit {
    getTools() {
        return this.tools;
    }
}
exports.BaseToolkit = BaseToolkit;
function tool(func, fields) {
    const isSimpleStringSchema = (0, zod_js_1.isSimpleStringZodSchema)(fields.schema);
    const isStringJSONSchema = (0, json_schema_js_1.validatesOnlyStrings)(fields.schema);
    // If the schema is not provided, or it's a simple string schema, create a DynamicTool
    if (!fields.schema || isSimpleStringSchema || isStringJSONSchema) {
        return new DynamicTool({
            ...fields,
            description: fields.description ??
                (fields.schema && (0, zod_js_1.getSchemaDescription)(fields.schema)) ??
                `${fields.name} tool`,
            func: async (input, runManager, config) => {
                return new Promise((resolve, reject) => {
                    const childConfig = (0, config_js_1.patchConfig)(config, {
                        callbacks: runManager?.getChild(),
                    });
                    void index_js_1.AsyncLocalStorageProviderSingleton.runWithConfig((0, config_js_1.pickRunnableConfigKeys)(childConfig), async () => {
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
                const childConfig = (0, config_js_1.patchConfig)(config, {
                    callbacks: runManager?.getChild(),
                });
                void index_js_1.AsyncLocalStorageProviderSingleton.runWithConfig((0, config_js_1.pickRunnableConfigKeys)(childConfig), async () => {
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
    if (toolCallId && !(0, tool_js_1.isDirectToolOutput)(content)) {
        if (typeof content === "string" ||
            (Array.isArray(content) &&
                content.every((item) => typeof item === "object"))) {
            return new tool_js_1.ToolMessage({
                status: "success",
                content,
                artifact,
                tool_call_id: toolCallId,
                name: params.name,
                metadata,
            });
        }
        else {
            return new tool_js_1.ToolMessage({
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
