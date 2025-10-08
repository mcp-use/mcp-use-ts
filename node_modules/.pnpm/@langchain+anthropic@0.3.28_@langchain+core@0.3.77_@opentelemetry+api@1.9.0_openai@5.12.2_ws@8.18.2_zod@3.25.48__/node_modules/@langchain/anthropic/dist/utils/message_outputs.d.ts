/**
 * This util file contains functions for converting Anthropic messages to LangChain messages.
 */
import Anthropic from "@anthropic-ai/sdk";
import { AIMessageChunk } from "@langchain/core/messages";
import { ChatGeneration } from "@langchain/core/outputs";
import { AnthropicMessageResponse } from "../types.js";
export declare function _makeMessageChunkFromAnthropicEvent(data: Anthropic.Messages.RawMessageStreamEvent, fields: {
    streamUsage: boolean;
    coerceContentToString: boolean;
}): {
    chunk: AIMessageChunk;
} | null;
export declare function anthropicResponseToChatMessages(messages: AnthropicMessageResponse[], additionalKwargs: Record<string, unknown>): ChatGeneration[];
