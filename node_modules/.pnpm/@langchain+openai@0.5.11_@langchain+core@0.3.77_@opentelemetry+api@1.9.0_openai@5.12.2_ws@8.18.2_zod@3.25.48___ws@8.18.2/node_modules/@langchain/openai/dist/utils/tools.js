import { isLangChainTool } from "@langchain/core/utils/function_calling";
import { formatToOpenAITool } from "./openai.js";
/**
 * Formats a tool in either OpenAI format, or LangChain structured tool format
 * into an OpenAI tool format. If the tool is already in OpenAI format, return without
 * any changes. If it is in LangChain structured tool format, convert it to OpenAI tool format
 * using OpenAI's `zodFunction` util, falling back to `convertToOpenAIFunction` if the parameters
 * returned from the `zodFunction` util are not defined.
 *
 * @param {BindToolsInput} tool The tool to convert to an OpenAI tool.
 * @param {Object} [fields] Additional fields to add to the OpenAI tool.
 * @returns {ToolDefinition} The inputted tool in OpenAI tool format.
 */
export function _convertToOpenAITool(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
tool, fields) {
    let toolDef;
    if (isLangChainTool(tool)) {
        toolDef = formatToOpenAITool(tool);
    }
    else {
        toolDef = tool;
    }
    if (fields?.strict !== undefined) {
        toolDef.function.strict = fields.strict;
    }
    return toolDef;
}
