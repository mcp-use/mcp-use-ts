import { isLangChainTool, } from "../tools/types.js";
import { toJsonSchema } from "./json_schema.js";
// These utility functions were moved to a more appropriate location,
// but we still export them here for backwards compatibility.
export { isStructuredTool, isStructuredToolParams, isRunnableToolLike, isLangChainTool, } from "../tools/types.js";
/**
 * Formats a `StructuredTool` or `RunnableToolLike` instance into a format
 * that is compatible with OpenAI function calling. If `StructuredTool` or
 * `RunnableToolLike` has a zod schema, the output will be converted into a
 * JSON schema, which is then used as the parameters for the OpenAI tool.
 *
 * @param {StructuredToolInterface | RunnableToolLike} tool The tool to convert to an OpenAI function.
 * @returns {FunctionDefinition} The inputted tool in OpenAI function format.
 */
export function convertToOpenAIFunction(tool, fields) {
    // @TODO 0.3.0 Remove the `number` typing
    const fieldsCopy = typeof fields === "number" ? undefined : fields;
    return {
        name: tool.name,
        description: tool.description,
        parameters: toJsonSchema(tool.schema),
        // Do not include the `strict` field if it is `undefined`.
        ...(fieldsCopy?.strict !== undefined ? { strict: fieldsCopy.strict } : {}),
    };
}
/**
 * Formats a `StructuredTool` or `RunnableToolLike` instance into a
 * format that is compatible with OpenAI tool calling. If `StructuredTool` or
 * `RunnableToolLike` has a zod schema, the output will be converted into a
 * JSON schema, which is then used as the parameters for the OpenAI tool.
 *
 * @param {StructuredToolInterface | Record<string, any> | RunnableToolLike} tool The tool to convert to an OpenAI tool.
 * @returns {ToolDefinition} The inputted tool in OpenAI tool format.
 */
export function convertToOpenAITool(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
tool, fields) {
    // @TODO 0.3.0 Remove the `number` typing
    const fieldsCopy = typeof fields === "number" ? undefined : fields;
    let toolDef;
    if (isLangChainTool(tool)) {
        toolDef = {
            type: "function",
            function: convertToOpenAIFunction(tool),
        };
    }
    else {
        toolDef = tool;
    }
    if (fieldsCopy?.strict !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolDef.function.strict = fieldsCopy.strict;
    }
    return toolDef;
}
