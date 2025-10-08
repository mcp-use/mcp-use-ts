"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLangChainTool = exports.isRunnableToolLike = exports.isStructuredToolParams = exports.isStructuredTool = void 0;
exports.convertToOpenAIFunction = convertToOpenAIFunction;
exports.convertToOpenAITool = convertToOpenAITool;
const types_js_1 = require("../tools/types.cjs");
const json_schema_js_1 = require("./json_schema.cjs");
// These utility functions were moved to a more appropriate location,
// but we still export them here for backwards compatibility.
var types_js_2 = require("../tools/types.cjs");
Object.defineProperty(exports, "isStructuredTool", { enumerable: true, get: function () { return types_js_2.isStructuredTool; } });
Object.defineProperty(exports, "isStructuredToolParams", { enumerable: true, get: function () { return types_js_2.isStructuredToolParams; } });
Object.defineProperty(exports, "isRunnableToolLike", { enumerable: true, get: function () { return types_js_2.isRunnableToolLike; } });
Object.defineProperty(exports, "isLangChainTool", { enumerable: true, get: function () { return types_js_2.isLangChainTool; } });
/**
 * Formats a `StructuredTool` or `RunnableToolLike` instance into a format
 * that is compatible with OpenAI function calling. If `StructuredTool` or
 * `RunnableToolLike` has a zod schema, the output will be converted into a
 * JSON schema, which is then used as the parameters for the OpenAI tool.
 *
 * @param {StructuredToolInterface | RunnableToolLike} tool The tool to convert to an OpenAI function.
 * @returns {FunctionDefinition} The inputted tool in OpenAI function format.
 */
function convertToOpenAIFunction(tool, fields) {
    // @TODO 0.3.0 Remove the `number` typing
    const fieldsCopy = typeof fields === "number" ? undefined : fields;
    return {
        name: tool.name,
        description: tool.description,
        parameters: (0, json_schema_js_1.toJsonSchema)(tool.schema),
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
function convertToOpenAITool(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
tool, fields) {
    // @TODO 0.3.0 Remove the `number` typing
    const fieldsCopy = typeof fields === "number" ? undefined : fields;
    let toolDef;
    if ((0, types_js_1.isLangChainTool)(tool)) {
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
