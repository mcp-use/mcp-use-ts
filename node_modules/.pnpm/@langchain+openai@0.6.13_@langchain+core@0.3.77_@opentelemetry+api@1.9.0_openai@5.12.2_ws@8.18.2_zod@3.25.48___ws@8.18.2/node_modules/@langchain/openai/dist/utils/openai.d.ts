import { OpenAI as OpenAIClient } from "openai";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { convertToOpenAIFunction, convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { ToolDefinition } from "@langchain/core/language_models/base";
import { InteropZodType } from "@langchain/core/utils/types";
import { ResponseFormatJSONSchema } from "openai/resources";
export declare function wrapOpenAIClientError(e: any): any;
export { convertToOpenAIFunction as formatToOpenAIFunction, convertToOpenAITool as formatToOpenAITool, };
export declare function formatToOpenAIAssistantTool(tool: StructuredToolInterface): ToolDefinition;
export type OpenAIToolChoice = OpenAIClient.ChatCompletionToolChoiceOption | "any" | string;
export declare function formatToOpenAIToolChoice(toolChoice?: OpenAIToolChoice): OpenAIClient.ChatCompletionToolChoiceOption | undefined;
export declare function interopZodResponseFormat(zodSchema: InteropZodType, name: string, props: Omit<ResponseFormatJSONSchema.JSONSchema, "schema" | "strict" | "name">): {
    json_schema: ResponseFormatJSONSchema.JSONSchema;
    type: "json_schema";
};
