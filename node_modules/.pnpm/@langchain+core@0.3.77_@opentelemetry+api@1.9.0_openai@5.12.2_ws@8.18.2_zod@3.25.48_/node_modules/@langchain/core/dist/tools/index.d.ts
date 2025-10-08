import { z } from "zod/v3";
import { CallbackManagerForToolRun } from "../callbacks/manager.js";
import { BaseLangChain } from "../language_models/base.js";
import { type RunnableConfig } from "../runnables/config.js";
import type { RunnableFunc } from "../runnables/base.js";
import { ToolCall, ToolMessage } from "../messages/tool.js";
import { ToolInputParsingException } from "./utils.js";
import { type InferInteropZodInput, type InferInteropZodOutput, type ZodStringV3, type ZodStringV4, type ZodObjectV3, type ZodObjectV4 } from "../utils/types/zod.js";
import type { StructuredToolCallInput, ToolInputSchemaBase, ToolReturnType, ResponseFormat, ToolInputSchemaInputType, ToolInputSchemaOutputType, ToolParams, ToolRunnableConfig, StructuredToolInterface, DynamicToolInput, DynamicStructuredToolInput, StringInputToolSchema, ToolInterface, ToolOutputType } from "./types.js";
import { type JSONSchema } from "../utils/json_schema.js";
export type { BaseDynamicToolInput, ContentAndArtifact, DynamicToolInput, DynamicStructuredToolInput, ResponseFormat, StructuredToolCallInput, StructuredToolInterface, StructuredToolParams, ToolInterface, ToolParams, ToolReturnType, ToolRunnableConfig, ToolInputSchemaBase as ToolSchemaBase, } from "./types.js";
export { isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams, } from "./types.js";
export { ToolInputParsingException };
/**
 * Base class for Tools that accept input of any shape defined by a Zod schema.
 */
export declare abstract class StructuredTool<SchemaT = ToolInputSchemaBase, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType> extends BaseLangChain<StructuredToolCallInput<SchemaT, SchemaInputT>, ToolOutputT | ToolMessage> implements StructuredToolInterface<SchemaT, SchemaInputT, ToolOutputT> {
    abstract name: string;
    abstract description: string;
    abstract schema: SchemaT;
    /**
     * Whether to return the tool's output directly.
     *
     * Setting this to true means that after the tool is called,
     * an agent should stop looping.
     */
    returnDirect: boolean;
    verboseParsingErrors: boolean;
    get lc_namespace(): string[];
    /**
     * The tool response format.
     *
     * If "content" then the output of the tool is interpreted as the contents of a
     * ToolMessage. If "content_and_artifact" then the output is expected to be a
     * two-tuple corresponding to the (content, artifact) of a ToolMessage.
     *
     * @default "content"
     */
    responseFormat?: ResponseFormat;
    /**
     * Default config object for the tool runnable.
     */
    defaultConfig?: ToolRunnableConfig;
    constructor(fields?: ToolParams);
    protected abstract _call(arg: SchemaOutputT, runManager?: CallbackManagerForToolRun, parentConfig?: ToolRunnableConfig): Promise<ToolOutputT>;
    /**
     * Invokes the tool with the provided input and configuration.
     * @param input The input for the tool.
     * @param config Optional configuration for the tool.
     * @returns A Promise that resolves with the tool's output.
     */
    invoke<TInput extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(input: TInput, config?: TConfig): Promise<ToolReturnType<TInput, TConfig, ToolOutputT>>;
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
    call<TArg extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig, 
    /** @deprecated */
    tags?: string[]): Promise<ToolReturnType<TArg, TConfig, ToolOutputT>>;
}
/**
 * Base class for Tools that accept input as a string.
 */
export declare abstract class Tool<ToolOutputT = ToolOutputType> extends StructuredTool<StringInputToolSchema, ToolInputSchemaOutputType<StringInputToolSchema>, ToolInputSchemaInputType<StringInputToolSchema>, ToolOutputT> implements ToolInterface<StringInputToolSchema, ToolInputSchemaInputType<StringInputToolSchema>, ToolOutputT> {
    schema: z.ZodEffects<z.ZodObject<{
        input: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        input?: string | undefined;
    }, {
        input?: string | undefined;
    }>, string | undefined, {
        input?: string | undefined;
    }>;
    constructor(fields?: ToolParams);
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     *
     * Calls the tool with the provided argument and callbacks. It handles
     * string inputs specifically.
     * @param arg The input argument for the tool, which can be a string, undefined, or an input of the tool's schema.
     * @param callbacks Optional callbacks for the tool.
     * @returns A Promise that resolves with a string.
     */
    call<TArg extends string | undefined | z.input<this["schema"]> | ToolCall, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, callbacks?: TConfig): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
}
/**
 * A tool that can be created dynamically from a function, name, and description.
 */
export declare class DynamicTool<ToolOutputT = ToolOutputType> extends Tool<ToolOutputT> {
    static lc_name(): string;
    name: string;
    description: string;
    func: DynamicToolInput<ToolOutputT>["func"];
    constructor(fields: DynamicToolInput<ToolOutputT>);
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     */
    call<TArg extends string | undefined | z.input<this["schema"]> | ToolCall, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
    /** @ignore */
    _call(input: string, // DynamicTool's _call specifically expects a string after schema transformation
    runManager?: CallbackManagerForToolRun, parentConfig?: ToolRunnableConfig): Promise<ToolOutputT>;
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
export declare class DynamicStructuredTool<SchemaT = ToolInputSchemaBase, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType> extends StructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT> {
    static lc_name(): string;
    name: string;
    description: string;
    func: DynamicStructuredToolInput<SchemaT, SchemaOutputT, ToolOutputT>["func"];
    schema: SchemaT;
    constructor(fields: DynamicStructuredToolInput<SchemaT, SchemaOutputT, ToolOutputT>);
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     */
    call<TArg extends StructuredToolCallInput<SchemaT, SchemaInputT>, TConfig extends ToolRunnableConfig | undefined>(arg: TArg, configArg?: TConfig, 
    /** @deprecated */
    tags?: string[]): Promise<ToolReturnType<NonNullable<TArg>, TConfig, ToolOutputT>>;
    protected _call(arg: Parameters<DynamicStructuredToolInput<SchemaT, SchemaOutputT>["func"]>[0], runManager?: CallbackManagerForToolRun, parentConfig?: RunnableConfig): Promise<ToolOutputT>;
}
/**
 * Abstract base class for toolkits in LangChain. Toolkits are collections
 * of tools that agents can use. Subclasses must implement the `tools`
 * property to provide the specific tools for the toolkit.
 */
export declare abstract class BaseToolkit {
    abstract tools: StructuredToolInterface[];
    getTools(): StructuredToolInterface[];
}
/**
 * Parameters for the tool function.
 * Schema can be provided as Zod or JSON schema.
 * Both schema types will be validated.
 * @template {ToolInputSchemaBase} RunInput The input schema for the tool.
 */
interface ToolWrapperParams<RunInput = ToolInputSchemaBase | undefined> extends ToolParams {
    /**
     * The name of the tool. If using with an LLM, this
     * will be passed as the tool name.
     */
    name: string;
    /**
     * The description of the tool.
     * @default `${fields.name} tool`
     */
    description?: string;
    /**
     * The input schema for the tool. If using an LLM, this
     * will be passed as the tool schema to generate arguments
     * for.
     */
    schema?: RunInput;
    /**
     * The tool response format.
     *
     * If "content" then the output of the tool is interpreted as the contents of a
     * ToolMessage. If "content_and_artifact" then the output is expected to be a
     * two-tuple corresponding to the (content, artifact) of a ToolMessage.
     *
     * @default "content"
     */
    responseFormat?: ResponseFormat;
    /**
     * Whether to return the tool's output directly.
     *
     * Setting this to true means that after the tool is called,
     * an agent should stop looping.
     */
    returnDirect?: boolean;
}
/**
 * Creates a new StructuredTool instance with the provided function, name, description, and schema.
 *
 * Schema can be provided as Zod or JSON schema, and both will be validated.
 *
 * @function
 * @template {ToolInputSchemaBase} SchemaT The input schema for the tool.
 * @template {ToolReturnType} ToolOutputT The output type of the tool.
 *
 * @param {RunnableFunc<z.output<SchemaT>, ToolOutputT>} func - The function to invoke when the tool is called.
 * @param {ToolWrapperParams<SchemaT>} fields - An object containing the following properties:
 * @param {string} fields.name The name of the tool.
 * @param {string | undefined} fields.description The description of the tool. Defaults to either the description on the Zod schema, or `${fields.name} tool`.
 * @param {z.AnyZodObject | z.ZodString | undefined} fields.schema The Zod schema defining the input for the tool. If undefined, it will default to a Zod string schema.
 *
 * @returns {DynamicStructuredTool<SchemaT>} A new StructuredTool instance.
 */
export declare function tool<SchemaT extends ZodStringV3, ToolOutputT = ToolOutputType>(func: RunnableFunc<InferInteropZodOutput<SchemaT>, ToolOutputT, ToolRunnableConfig>, fields: ToolWrapperParams<SchemaT>): DynamicTool<ToolOutputT>;
export declare function tool<SchemaT extends ZodStringV4, ToolOutputT = ToolOutputType>(func: RunnableFunc<InferInteropZodOutput<SchemaT>, ToolOutputT, ToolRunnableConfig>, fields: ToolWrapperParams<SchemaT>): DynamicTool<ToolOutputT>;
export declare function tool<SchemaT extends ZodObjectV3, SchemaOutputT = InferInteropZodOutput<SchemaT>, SchemaInputT = InferInteropZodInput<SchemaT>, ToolOutputT = ToolOutputType>(func: RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig>, fields: ToolWrapperParams<SchemaT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT>;
export declare function tool<SchemaT extends ZodObjectV4, SchemaOutputT = InferInteropZodOutput<SchemaT>, SchemaInputT = InferInteropZodInput<SchemaT>, ToolOutputT = ToolOutputType>(func: RunnableFunc<SchemaOutputT, ToolOutputT, ToolRunnableConfig>, fields: ToolWrapperParams<SchemaT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT>;
export declare function tool<SchemaT extends JSONSchema, SchemaOutputT = ToolInputSchemaOutputType<SchemaT>, SchemaInputT = ToolInputSchemaInputType<SchemaT>, ToolOutputT = ToolOutputType>(func: RunnableFunc<Parameters<DynamicStructuredToolInput<SchemaT>["func"]>[0], ToolOutputT, ToolRunnableConfig>, fields: ToolWrapperParams<SchemaT>): DynamicStructuredTool<SchemaT, SchemaOutputT, SchemaInputT, ToolOutputT>;
