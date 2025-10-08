import { OpenAI as OpenAIClient } from "openai";
import { ToolCall } from "@langchain/core/messages/tool";
import { BindToolsInput } from "@langchain/core/language_models/chat_models";
import { DynamicTool } from "@langchain/core/tools";
import { OpenAIToolChoice } from "./openai.js";
export type ResponsesTool = NonNullable<OpenAIClient.Responses.ResponseCreateParams["tools"]>[number];
export type ResponsesToolChoice = NonNullable<OpenAIClient.Responses.ResponseCreateParams["tool_choice"]>;
export type ChatOpenAIToolType = BindToolsInput | OpenAIClient.Chat.ChatCompletionTool | ResponsesTool;
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
export declare function _convertToOpenAITool(tool: BindToolsInput, fields?: {
    /**
     * If `true`, model output is guaranteed to exactly match the JSON Schema
     * provided in the function definition.
     */
    strict?: boolean;
}): OpenAIClient.ChatCompletionTool;
export declare function isBuiltInTool(tool: ChatOpenAIToolType): tool is ResponsesTool;
export declare function isBuiltInToolChoice(tool_choice: OpenAIToolChoice | ResponsesToolChoice | undefined): tool_choice is ResponsesToolChoice;
export type CustomToolCall = ToolCall & {
    call_id: string;
    isCustomTool: true;
};
type LangchainCustomTool = DynamicTool<string> & {
    metadata: {
        customTool: OpenAIClient.Responses.CustomTool;
    };
};
export declare function isCustomTool(tool: unknown): tool is LangchainCustomTool;
export declare function isOpenAICustomTool(tool: ChatOpenAIToolType): tool is OpenAIClient.Chat.ChatCompletionCustomTool;
export declare function parseCustomToolCall(rawToolCall: Record<string, any>): CustomToolCall | undefined;
export declare function isCustomToolCall(toolCall: ToolCall): toolCall is CustomToolCall;
export declare function convertCompletionsCustomTool(tool: OpenAIClient.Chat.ChatCompletionCustomTool): OpenAIClient.Responses.CustomTool;
export declare function convertResponsesCustomTool(tool: OpenAIClient.Responses.CustomTool): OpenAIClient.Chat.ChatCompletionCustomTool;
export {};
