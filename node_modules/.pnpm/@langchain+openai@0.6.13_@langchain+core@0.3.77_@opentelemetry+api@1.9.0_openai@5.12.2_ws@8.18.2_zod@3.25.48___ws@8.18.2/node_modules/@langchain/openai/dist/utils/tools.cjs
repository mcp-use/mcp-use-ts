"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._convertToOpenAITool = _convertToOpenAITool;
exports.isBuiltInTool = isBuiltInTool;
exports.isBuiltInToolChoice = isBuiltInToolChoice;
exports.isCustomTool = isCustomTool;
exports.isOpenAICustomTool = isOpenAICustomTool;
exports.parseCustomToolCall = parseCustomToolCall;
exports.isCustomToolCall = isCustomToolCall;
exports.convertCompletionsCustomTool = convertCompletionsCustomTool;
exports.convertResponsesCustomTool = convertResponsesCustomTool;
const function_calling_1 = require("@langchain/core/utils/function_calling");
const openai_js_1 = require("./openai.cjs");
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
function _convertToOpenAITool(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
tool, fields) {
    let toolDef;
    if ((0, function_calling_1.isLangChainTool)(tool)) {
        toolDef = (0, openai_js_1.formatToOpenAITool)(tool);
    }
    else {
        toolDef = tool;
    }
    if (toolDef.type === "function" && fields?.strict !== undefined) {
        toolDef.function.strict = fields.strict;
    }
    return toolDef;
}
function isBuiltInTool(tool) {
    return "type" in tool && tool.type !== "function" && tool.type !== "custom";
}
function isBuiltInToolChoice(tool_choice) {
    return (tool_choice != null &&
        typeof tool_choice === "object" &&
        "type" in tool_choice &&
        tool_choice.type !== "function");
}
function isCustomTool(tool) {
    return (typeof tool === "object" &&
        tool !== null &&
        "metadata" in tool &&
        typeof tool.metadata === "object" &&
        tool.metadata !== null &&
        "customTool" in tool.metadata &&
        typeof tool.metadata.customTool === "object" &&
        tool.metadata.customTool !== null);
}
function isOpenAICustomTool(tool) {
    return ("type" in tool &&
        tool.type === "custom" &&
        "custom" in tool &&
        typeof tool.custom === "object" &&
        tool.custom !== null);
}
function parseCustomToolCall(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
rawToolCall) {
    if (rawToolCall.type !== "custom_tool_call") {
        return undefined;
    }
    return {
        ...rawToolCall,
        type: "tool_call",
        call_id: rawToolCall.id,
        id: rawToolCall.call_id,
        name: rawToolCall.name,
        isCustomTool: true,
        args: {
            input: rawToolCall.input,
        },
    };
}
function isCustomToolCall(toolCall) {
    return (toolCall.type === "tool_call" &&
        "isCustomTool" in toolCall &&
        toolCall.isCustomTool === true);
}
function convertCompletionsCustomTool(tool) {
    const getFormat = () => {
        if (!tool.custom.format) {
            return undefined;
        }
        if (tool.custom.format.type === "grammar") {
            return {
                type: "grammar",
                definition: tool.custom.format.grammar.definition,
                syntax: tool.custom.format.grammar.syntax,
            };
        }
        if (tool.custom.format.type === "text") {
            return {
                type: "text",
            };
        }
        return undefined;
    };
    return {
        type: "custom",
        name: tool.custom.name,
        description: tool.custom.description,
        format: getFormat(),
    };
}
function convertResponsesCustomTool(tool) {
    const getFormat = () => {
        if (!tool.format) {
            return undefined;
        }
        if (tool.format.type === "grammar") {
            return {
                type: "grammar",
                grammar: {
                    definition: tool.format.definition,
                    syntax: tool.format.syntax,
                },
            };
        }
        if (tool.format.type === "text") {
            return {
                type: "text",
            };
        }
        return undefined;
    };
    return {
        type: "custom",
        custom: {
            name: tool.name,
            description: tool.description,
            format: getFormat(),
        },
    };
}
