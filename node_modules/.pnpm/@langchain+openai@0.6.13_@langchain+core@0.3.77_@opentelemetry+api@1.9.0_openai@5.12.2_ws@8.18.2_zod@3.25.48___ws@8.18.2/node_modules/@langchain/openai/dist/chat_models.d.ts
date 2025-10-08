import { type ClientOptions, OpenAI as OpenAIClient } from "openai";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { AIMessageChunk, type BaseMessage, ChatMessageChunk, FunctionMessageChunk, HumanMessageChunk, SystemMessageChunk, ToolMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk, type ChatGeneration, type ChatResult } from "@langchain/core/outputs";
import { BaseChatModel, type LangSmithParams, type BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { type BaseFunctionCallOptions, type BaseLanguageModelInput, type StructuredOutputMethodOptions } from "@langchain/core/language_models/base";
import { Runnable } from "@langchain/core/runnables";
import { InteropZodType } from "@langchain/core/utils/types";
import { type OpenAICallOptions, type OpenAIChatInput, type OpenAICoreRequestOptions, type ChatOpenAIResponseFormat, ChatOpenAIReasoningSummary, ResponseFormatConfiguration, OpenAIVerbosityParam } from "./types.js";
import { OpenAIToolChoice } from "./utils/openai.js";
import { ChatOpenAIToolType, ResponsesTool, ResponsesToolChoice } from "./utils/tools.js";
interface OpenAILLMOutput {
    tokenUsage: {
        completionTokens?: number;
        promptTokens?: number;
        totalTokens?: number;
    };
}
export type { OpenAICallOptions, OpenAIChatInput };
export declare function messageToOpenAIRole(message: BaseMessage): OpenAIClient.ChatCompletionRole;
export declare function _convertMessagesToOpenAIParams(messages: BaseMessage[], model?: string): OpenAIClient.Chat.Completions.ChatCompletionMessageParam[];
export interface BaseChatOpenAICallOptions extends OpenAICallOptions, BaseFunctionCallOptions {
    /**
     * A list of tools that the model may use to generate responses.
     * Each tool can be a function, a built-in tool, or a custom tool definition.
     * If not provided, the model will not use any tools.
     */
    tools?: ChatOpenAIToolType[];
    /**
     * Specifies which tool the model should use to respond.
     * Can be an {@link OpenAIToolChoice} or a {@link ResponsesToolChoice}.
     * If not set, the model will decide which tool to use automatically.
     */
    tool_choice?: OpenAIToolChoice | ResponsesToolChoice;
    /**
     * Adds a prompt index to prompts passed to the model to track
     * what prompt is being used for a given generation.
     */
    promptIndex?: number;
    /**
     * An object specifying the format that the model must output.
     */
    response_format?: ChatOpenAIResponseFormat;
    /**
     * When provided, the completions API will make a best effort to sample
     * deterministically, such that repeated requests with the same `seed`
     * and parameters should return the same result.
     */
    seed?: number;
    /**
     * Additional options to pass to streamed completions.
     * If provided, this takes precedence over "streamUsage" set at
     * initialization time.
     */
    stream_options?: OpenAIClient.Chat.ChatCompletionStreamOptions;
    /**
     * The model may choose to call multiple functions in a single turn. You can
     * set parallel_tool_calls to false which ensures only one tool is called at most.
     * [Learn more](https://platform.openai.com/docs/guides/function-calling#parallel-function-calling)
     */
    parallel_tool_calls?: boolean;
    /**
     * If `true`, model output is guaranteed to exactly match the JSON Schema
     * provided in the tool definition. If `true`, the input schema will also be
     * validated according to
     * https://platform.openai.com/docs/guides/structured-outputs/supported-schemas.
     *
     * If `false`, input schema will not be validated and model output will not
     * be validated.
     *
     * If `undefined`, `strict` argument will not be passed to the model.
     */
    strict?: boolean;
    /**
     * Output types that you would like the model to generate for this request. Most
     * models are capable of generating text, which is the default:
     *
     * `["text"]`
     *
     * The `gpt-4o-audio-preview` model can also be used to
     * [generate audio](https://platform.openai.com/docs/guides/audio). To request that
     * this model generate both text and audio responses, you can use:
     *
     * `["text", "audio"]`
     */
    modalities?: Array<OpenAIClient.Chat.ChatCompletionModality>;
    /**
     * Parameters for audio output. Required when audio output is requested with
     * `modalities: ["audio"]`.
     * [Learn more](https://platform.openai.com/docs/guides/audio).
     */
    audio?: OpenAIClient.Chat.ChatCompletionAudioParam;
    /**
     * Static predicted output content, such as the content of a text file that is being regenerated.
     * [Learn more](https://platform.openai.com/docs/guides/latency-optimization#use-predicted-outputs).
     */
    prediction?: OpenAIClient.ChatCompletionPredictionContent;
    /**
     * Options for reasoning models.
     *
     * Note that some options, like reasoning summaries, are only available when using the responses
     * API. If these options are set, the responses API will be used to fulfill the request.
     *
     * These options will be ignored when not using a reasoning model.
     */
    reasoning?: OpenAIClient.Reasoning;
    /**
     * Service tier to use for this request. Can be "auto", "default", or "flex"
     * Specifies the service tier for prioritization and latency optimization.
     */
    service_tier?: OpenAIClient.Chat.ChatCompletionCreateParams["service_tier"];
    /**
     * Used by OpenAI to cache responses for similar requests to optimize your cache
     * hit rates. Replaces the `user` field.
     * [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
     */
    promptCacheKey?: string;
    /**
     * The verbosity of the model's response.
     */
    verbosity?: OpenAIVerbosityParam;
}
export interface BaseChatOpenAIFields extends Partial<OpenAIChatInput>, BaseChatModelParams {
    /**
     * Optional configuration options for the OpenAI client.
     */
    configuration?: ClientOptions;
}
/** @internal */
export declare abstract class BaseChatOpenAI<CallOptions extends BaseChatOpenAICallOptions> extends BaseChatModel<CallOptions, AIMessageChunk> implements Partial<OpenAIChatInput> {
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    n?: number;
    logitBias?: Record<string, number>;
    model: string;
    modelKwargs?: OpenAIChatInput["modelKwargs"];
    stop?: string[];
    stopSequences?: string[];
    user?: string;
    timeout?: number;
    streaming: boolean;
    streamUsage: boolean;
    maxTokens?: number;
    logprobs?: boolean;
    topLogprobs?: number;
    apiKey?: string;
    organization?: string;
    __includeRawResponse?: boolean;
    /** @internal */
    client: OpenAIClient;
    /** @internal */
    clientConfig: ClientOptions;
    /**
     * Whether the model supports the `strict` argument when passing in tools.
     * If `undefined` the `strict` argument will not be passed to OpenAI.
     */
    supportsStrictToolCalling?: boolean;
    audio?: OpenAIClient.Chat.ChatCompletionAudioParam;
    modalities?: Array<OpenAIClient.Chat.ChatCompletionModality>;
    reasoning?: OpenAIClient.Reasoning;
    /**
     * Must be set to `true` in tenancies with Zero Data Retention. Setting to `true` will disable
     * output storage in the Responses API, but this DOES NOT enable Zero Data Retention in your
     * OpenAI organization or project. This must be configured directly with OpenAI.
     *
     * See:
     * https://help.openai.com/en/articles/10503543-data-residency-for-the-openai-api
     * https://platform.openai.com/docs/api-reference/responses/create#responses-create-store
     *
     * @default false
     */
    zdrEnabled?: boolean | undefined;
    /**
     * Service tier to use for this request. Can be "auto", "default", or "flex" or "priority".
     * Specifies the service tier for prioritization and latency optimization.
     */
    service_tier?: OpenAIClient.Chat.ChatCompletionCreateParams["service_tier"];
    /**
     * Used by OpenAI to cache responses for similar requests to optimize your cache
     * hit rates.
     * [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
     */
    promptCacheKey: string;
    /**
     * The verbosity of the model's response.
     */
    verbosity?: OpenAIVerbosityParam;
    protected defaultOptions: CallOptions;
    _llmType(): string;
    static lc_name(): string;
    get callKeys(): string[];
    lc_serializable: boolean;
    get lc_secrets(): {
        [key: string]: string;
    } | undefined;
    get lc_aliases(): Record<string, string>;
    get lc_serializable_keys(): string[];
    getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
    /** @ignore */
    _identifyingParams(): Omit<OpenAIClient.Chat.ChatCompletionCreateParams, "messages"> & {
        model_name: string;
    } & ClientOptions;
    /**
     * Get the identifying parameters for the model
     */
    identifyingParams(): Omit<OpenAIClient.Chat.Completions.ChatCompletionCreateParams, "messages"> & {
        model_name: string;
    } & ClientOptions;
    constructor(fields?: BaseChatOpenAIFields);
    /**
     * Returns backwards compatible reasoning parameters from constructor params and call options
     * @internal
     */
    protected _getReasoningParams(options?: this["ParsedCallOptions"]): OpenAIClient.Reasoning | undefined;
    /**
     * Returns an openai compatible response format from a set of options
     * @internal
     */
    protected _getResponseFormat(resFormat?: CallOptions["response_format"]): ResponseFormatConfiguration | undefined;
    protected _combineCallOptions(additionalOptions?: this["ParsedCallOptions"]): this["ParsedCallOptions"];
    /** @internal */
    _getClientOptions(options: OpenAICoreRequestOptions | undefined): OpenAICoreRequestOptions;
    protected _convertChatOpenAIToolToCompletionsTool(tool: ChatOpenAIToolType, fields?: {
        strict?: boolean;
    }): OpenAIClient.ChatCompletionTool;
    bindTools(tools: ChatOpenAIToolType[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions>;
    stream(input: BaseLanguageModelInput, options?: CallOptions): Promise<import("@langchain/core/utils/stream").IterableReadableStream<AIMessageChunk>>;
    invoke(input: BaseLanguageModelInput, options?: CallOptions): Promise<AIMessageChunk>;
    /** @ignore */
    _combineLLMOutput(...llmOutputs: OpenAILLMOutput[]): OpenAILLMOutput;
    getNumTokensFromMessages(messages: BaseMessage[]): Promise<{
        totalCount: number;
        countPerMessage: number[];
    }>;
    /** @internal */
    protected _getNumTokensFromGenerations(generations: ChatGeneration[]): Promise<number>;
    /** @internal */
    protected _getEstimatedTokenCountFromPrompt(messages: BaseMessage[], functions?: OpenAIClient.Chat.ChatCompletionCreateParams.Function[], function_call?: "none" | "auto" | OpenAIClient.Chat.ChatCompletionFunctionCallOption): Promise<number>;
    /** @internal */
    protected _getStructuredOutputMethod(config: StructuredOutputMethodOptions<boolean>): string | undefined;
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
        raw: BaseMessage;
        parsed: RunOutput;
    }>;
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<boolean>): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
        raw: BaseMessage;
        parsed: RunOutput;
    }>;
}
type ExcludeController<T> = T extends {
    controller: unknown;
} ? never : T;
type ResponsesCreate = OpenAIClient.Responses["create"];
type ResponsesParse = OpenAIClient.Responses["parse"];
type ResponsesCreateInvoke = ExcludeController<Awaited<ReturnType<ResponsesCreate>>>;
type ResponsesParseInvoke = ExcludeController<Awaited<ReturnType<ResponsesParse>>>;
export interface ChatOpenAIResponsesCallOptions extends BaseChatOpenAICallOptions {
    /**
     * Configuration options for a text response from the model. Can be plain text or
     * structured JSON data.
     */
    text?: OpenAIClient.Responses.ResponseCreateParams["text"];
    /**
     * The truncation strategy to use for the model response.
     */
    truncation?: OpenAIClient.Responses.ResponseCreateParams["truncation"];
    /**
     * Specify additional output data to include in the model response.
     */
    include?: OpenAIClient.Responses.ResponseCreateParams["include"];
    /**
     * The unique ID of the previous response to the model. Use this to create multi-turn
     * conversations.
     */
    previous_response_id?: OpenAIClient.Responses.ResponseCreateParams["previous_response_id"];
    /**
     * The verbosity of the model's response.
     */
    verbosity?: OpenAIVerbosityParam;
}
type ChatResponsesInvocationParams = Omit<OpenAIClient.Responses.ResponseCreateParams, "input">;
/**
 * OpenAI Responses API implementation.
 *
 * Will be exported in a later version of @langchain/openai.
 *
 * @internal
 */
export declare class ChatOpenAIResponses<CallOptions extends ChatOpenAIResponsesCallOptions = ChatOpenAIResponsesCallOptions> extends BaseChatOpenAI<CallOptions> {
    invocationParams(options?: this["ParsedCallOptions"]): ChatResponsesInvocationParams;
    _generate(messages: BaseMessage[], options: this["ParsedCallOptions"]): Promise<ChatResult>;
    _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
    /**
     * Calls the Responses API with retry logic in case of failures.
     * @param request The request to send to the OpenAI API.
     * @param options Optional configuration for the API call.
     * @returns The response from the OpenAI API.
     */
    completionWithRetry(request: OpenAIClient.Responses.ResponseCreateParamsStreaming, requestOptions?: OpenAIClient.RequestOptions): Promise<AsyncIterable<OpenAIClient.Responses.ResponseStreamEvent>>;
    completionWithRetry(request: OpenAIClient.Responses.ResponseCreateParamsNonStreaming, requestOptions?: OpenAIClient.RequestOptions): Promise<OpenAIClient.Responses.Response>;
    /** @internal */
    protected _convertResponsesMessageToBaseMessage(response: ResponsesCreateInvoke | ResponsesParseInvoke): BaseMessage;
    /** @internal */
    protected _convertResponsesDeltaToBaseMessageChunk(chunk: OpenAIClient.Responses.ResponseStreamEvent): ChatGenerationChunk | null;
    /** @internal */
    protected _convertMessagesToResponsesParams(messages: BaseMessage[]): (OpenAIClient.Responses.ResponseReasoningItem | OpenAIClient.Responses.EasyInputMessage | OpenAIClient.Responses.ResponseInputItem.Message | OpenAIClient.Responses.ResponseOutputMessage | OpenAIClient.Responses.ResponseFileSearchToolCall | OpenAIClient.Responses.ResponseComputerToolCall | OpenAIClient.Responses.ResponseInputItem.ComputerCallOutput | OpenAIClient.Responses.ResponseFunctionWebSearch | OpenAIClient.Responses.ResponseFunctionToolCall | OpenAIClient.Responses.ResponseInputItem.FunctionCallOutput | OpenAIClient.Responses.ResponseInputItem.ImageGenerationCall | OpenAIClient.Responses.ResponseCodeInterpreterToolCall | OpenAIClient.Responses.ResponseInputItem.LocalShellCall | OpenAIClient.Responses.ResponseInputItem.LocalShellCallOutput | OpenAIClient.Responses.ResponseInputItem.McpListTools | OpenAIClient.Responses.ResponseInputItem.McpApprovalRequest | OpenAIClient.Responses.ResponseInputItem.McpApprovalResponse | OpenAIClient.Responses.ResponseInputItem.McpCall | OpenAIClient.Responses.ResponseCustomToolCallOutput | OpenAIClient.Responses.ResponseCustomToolCall | OpenAIClient.Responses.ResponseInputItem.ItemReference)[];
    /** @internal */
    protected _convertReasoningSummary(reasoning: ChatOpenAIReasoningSummary): OpenAIClient.Responses.ResponseReasoningItem;
    /** @internal */
    protected _reduceChatOpenAITools(tools: ChatOpenAIToolType[], fields: {
        stream?: boolean;
        strict?: boolean;
    }): ResponsesTool[];
}
export interface ChatOpenAICompletionsCallOptions extends BaseChatOpenAICallOptions {
}
type ChatCompletionsInvocationParams = Omit<OpenAIClient.Chat.Completions.ChatCompletionCreateParams, "messages">;
/**
 * OpenAI Completions API implementation.
 * @internal
 */
export declare class ChatOpenAICompletions<CallOptions extends ChatOpenAICompletionsCallOptions = ChatOpenAICompletionsCallOptions> extends BaseChatOpenAI<CallOptions> {
    /** @internal */
    invocationParams(options?: this["ParsedCallOptions"], extra?: {
        streaming?: boolean;
    }): ChatCompletionsInvocationParams;
    _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
    _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
    completionWithRetry(request: OpenAIClient.Chat.ChatCompletionCreateParamsStreaming, requestOptions?: OpenAIClient.RequestOptions): Promise<AsyncIterable<OpenAIClient.Chat.Completions.ChatCompletionChunk>>;
    completionWithRetry(request: OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming, requestOptions?: OpenAIClient.RequestOptions): Promise<OpenAIClient.Chat.Completions.ChatCompletion>;
    /** @internal */
    protected _convertCompletionsMessageToBaseMessage(message: OpenAIClient.Chat.Completions.ChatCompletionMessage, rawResponse: OpenAIClient.Chat.Completions.ChatCompletion): BaseMessage;
    /** @internal */
    protected _convertCompletionsDeltaToBaseMessageChunk(delta: Record<string, any>, rawResponse: OpenAIClient.Chat.Completions.ChatCompletionChunk, defaultRole?: OpenAIClient.Chat.ChatCompletionRole): AIMessageChunk | HumanMessageChunk | SystemMessageChunk | FunctionMessageChunk | ToolMessageChunk | ChatMessageChunk;
}
export type ChatOpenAICallOptions = ChatOpenAICompletionsCallOptions & ChatOpenAIResponsesCallOptions;
export interface ChatOpenAIFields extends BaseChatOpenAIFields {
    /**
     * Whether to use the responses API for all requests. If `false` the responses API will be used
     * only when required in order to fulfill the request.
     */
    useResponsesApi?: boolean;
    /**
     * The completions chat instance
     * @internal
     */
    completions?: ChatOpenAICompletions;
    /**
     * The responses chat instance
     * @internal
     */
    responses?: ChatOpenAIResponses;
}
/**
 * OpenAI chat model integration.
 *
 * To use with Azure, import the `AzureChatOpenAI` class.
 *
 * Setup:
 * Install `@langchain/openai` and set an environment variable named `OPENAI_API_KEY`.
 *
 * ```bash
 * npm install @langchain/openai
 * export OPENAI_API_KEY="your-api-key"
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_openai.ChatOpenAI.html#constructor)
 *
 * ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_openai.ChatOpenAICallOptions.html)
 *
 * Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
 * They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
 *
 * ```typescript
 * // When calling `.withConfig`, call options should be passed via the first argument
 * const llmWithArgsBound = llm.withConfig({
 *   stop: ["\n"],
 *   tools: [...],
 * });
 *
 * // When calling `.bindTools`, call options should be passed via the second argument
 * const llmWithTools = llm.bindTools(
 *   [...],
 *   {
 *     tool_choice: "auto",
 *   }
 * );
 * ```
 *
 * ## Examples
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { ChatOpenAI } from '@langchain/openai';
 *
 * const llm = new ChatOpenAI({
 *   model: "gpt-4o-mini",
 *   temperature: 0,
 *   maxTokens: undefined,
 *   timeout: undefined,
 *   maxRetries: 2,
 *   // apiKey: "...",
 *   // baseUrl: "...",
 *   // organization: "...",
 *   // other params...
 * });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Invoking</strong></summary>
 *
 * ```typescript
 * const input = `Translate "I love programming" into French.`;
 *
 * // Models also accept a list of chat messages or a formatted prompt
 * const result = await llm.invoke(input);
 * console.log(result);
 * ```
 *
 * ```txt
 * AIMessage {
 *   "id": "chatcmpl-9u4Mpu44CbPjwYFkTbeoZgvzB00Tz",
 *   "content": "J'adore la programmation.",
 *   "response_metadata": {
 *     "tokenUsage": {
 *       "completionTokens": 5,
 *       "promptTokens": 28,
 *       "totalTokens": 33
 *     },
 *     "finish_reason": "stop",
 *     "system_fingerprint": "fp_3aa7262c27"
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 28,
 *     "output_tokens": 5,
 *     "total_tokens": 33
 *   }
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Streaming Chunks</strong></summary>
 *
 * ```typescript
 * for await (const chunk of await llm.stream(input)) {
 *   console.log(chunk);
 * }
 * ```
 *
 * ```txt
 * AIMessageChunk {
 *   "id": "chatcmpl-9u4NWB7yUeHCKdLr6jP3HpaOYHTqs",
 *   "content": ""
 * }
 * AIMessageChunk {
 *   "content": "J"
 * }
 * AIMessageChunk {
 *   "content": "'adore"
 * }
 * AIMessageChunk {
 *   "content": " la"
 * }
 * AIMessageChunk {
 *   "content": " programmation",,
 * }
 * AIMessageChunk {
 *   "content": ".",,
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "response_metadata": {
 *     "finish_reason": "stop",
 *     "system_fingerprint": "fp_c9aa9c0491"
 *   },
 * }
 * AIMessageChunk {
 *   "content": "",
 *   "usage_metadata": {
 *     "input_tokens": 28,
 *     "output_tokens": 5,
 *     "total_tokens": 33
 *   }
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Aggregate Streamed Chunks</strong></summary>
 *
 * ```typescript
 * import { AIMessageChunk } from '@langchain/core/messages';
 * import { concat } from '@langchain/core/utils/stream';
 *
 * const stream = await llm.stream(input);
 * let full: AIMessageChunk | undefined;
 * for await (const chunk of stream) {
 *   full = !full ? chunk : concat(full, chunk);
 * }
 * console.log(full);
 * ```
 *
 * ```txt
 * AIMessageChunk {
 *   "id": "chatcmpl-9u4PnX6Fy7OmK46DASy0bH6cxn5Xu",
 *   "content": "J'adore la programmation.",
 *   "response_metadata": {
 *     "prompt": 0,
 *     "completion": 0,
 *     "finish_reason": "stop",
 *   },
 *   "usage_metadata": {
 *     "input_tokens": 28,
 *     "output_tokens": 5,
 *     "total_tokens": 33
 *   }
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Bind tools</strong></summary>
 *
 * ```typescript
 * import { z } from 'zod';
 *
 * const GetWeather = {
 *   name: "GetWeather",
 *   description: "Get the current weather in a given location",
 *   schema: z.object({
 *     location: z.string().describe("The city and state, e.g. San Francisco, CA")
 *   }),
 * }
 *
 * const GetPopulation = {
 *   name: "GetPopulation",
 *   description: "Get the current population in a given location",
 *   schema: z.object({
 *     location: z.string().describe("The city and state, e.g. San Francisco, CA")
 *   }),
 * }
 *
 * const llmWithTools = llm.bindTools(
 *   [GetWeather, GetPopulation],
 *   {
 *     // strict: true  // enforce tool args schema is respected
 *   }
 * );
 * const aiMsg = await llmWithTools.invoke(
 *   "Which city is hotter today and which is bigger: LA or NY?"
 * );
 * console.log(aiMsg.tool_calls);
 * ```
 *
 * ```txt
 * [
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call',
 *     id: 'call_uPU4FiFzoKAtMxfmPnfQL6UK'
 *   },
 *   {
 *     name: 'GetWeather',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'call_UNkEwuQsHrGYqgDQuH9nPAtX'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'Los Angeles, CA' },
 *     type: 'tool_call',
 *     id: 'call_kL3OXxaq9OjIKqRTpvjaCH14'
 *   },
 *   {
 *     name: 'GetPopulation',
 *     args: { location: 'New York, NY' },
 *     type: 'tool_call',
 *     id: 'call_s9KQB1UWj45LLGaEnjz0179q'
 *   }
 * ]
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Structured Output</strong></summary>
 *
 * ```typescript
 * import { z } from 'zod';
 *
 * const Joke = z.object({
 *   setup: z.string().describe("The setup of the joke"),
 *   punchline: z.string().describe("The punchline to the joke"),
 *   rating: z.number().nullable().describe("How funny the joke is, from 1 to 10")
 * }).describe('Joke to tell user.');
 *
 * const structuredLlm = llm.withStructuredOutput(Joke, {
 *   name: "Joke",
 *   strict: true, // Optionally enable OpenAI structured outputs
 * });
 * const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
 * console.log(jokeResult);
 * ```
 *
 * ```txt
 * {
 *   setup: 'Why was the cat sitting on the computer?',
 *   punchline: 'Because it wanted to keep an eye on the mouse!',
 *   rating: 7
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>JSON Object Response Format</strong></summary>
 *
 * ```typescript
 * const jsonLlm = llm.withConfig({ response_format: { type: "json_object" } });
 * const jsonLlmAiMsg = await jsonLlm.invoke(
 *   "Return a JSON object with key 'randomInts' and a value of 10 random ints in [0-99]"
 * );
 * console.log(jsonLlmAiMsg.content);
 * ```
 *
 * ```txt
 * {
 *   "randomInts": [23, 87, 45, 12, 78, 34, 56, 90, 11, 67]
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Multimodal</strong></summary>
 *
 * ```typescript
 * import { HumanMessage } from '@langchain/core/messages';
 *
 * const imageUrl = "https://example.com/image.jpg";
 * const imageData = await fetch(imageUrl).then(res => res.arrayBuffer());
 * const base64Image = Buffer.from(imageData).toString('base64');
 *
 * const message = new HumanMessage({
 *   content: [
 *     { type: "text", text: "describe the weather in this image" },
 *     {
 *       type: "image_url",
 *       image_url: { url: `data:image/jpeg;base64,${base64Image}` },
 *     },
 *   ]
 * });
 *
 * const imageDescriptionAiMsg = await llm.invoke([message]);
 * console.log(imageDescriptionAiMsg.content);
 * ```
 *
 * ```txt
 * The weather in the image appears to be clear and sunny. The sky is mostly blue with a few scattered white clouds, indicating fair weather. The bright sunlight is casting shadows on the green, grassy hill, suggesting it is a pleasant day with good visibility. There are no signs of rain or stormy conditions.
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Usage Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForMetadata = await llm.invoke(input);
 * console.log(aiMsgForMetadata.usage_metadata);
 * ```
 *
 * ```txt
 * { input_tokens: 28, output_tokens: 5, total_tokens: 33 }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Logprobs</strong></summary>
 *
 * ```typescript
 * const logprobsLlm = new ChatOpenAI({ model: "gpt-4o-mini", logprobs: true });
 * const aiMsgForLogprobs = await logprobsLlm.invoke(input);
 * console.log(aiMsgForLogprobs.response_metadata.logprobs);
 * ```
 *
 * ```txt
 * {
 *   content: [
 *     {
 *       token: 'J',
 *       logprob: -0.000050616763,
 *       bytes: [Array],
 *       top_logprobs: []
 *     },
 *     {
 *       token: "'",
 *       logprob: -0.01868736,
 *       bytes: [Array],
 *       top_logprobs: []
 *     },
 *     {
 *       token: 'ad',
 *       logprob: -0.0000030545007,
 *       bytes: [Array],
 *       top_logprobs: []
 *     },
 *     { token: 'ore', logprob: 0, bytes: [Array], top_logprobs: [] },
 *     {
 *       token: ' la',
 *       logprob: -0.515404,
 *       bytes: [Array],
 *       top_logprobs: []
 *     },
 *     {
 *       token: ' programm',
 *       logprob: -0.0000118755715,
 *       bytes: [Array],
 *       top_logprobs: []
 *     },
 *     { token: 'ation', logprob: 0, bytes: [Array], top_logprobs: [] },
 *     {
 *       token: '.',
 *       logprob: -0.0000037697225,
 *       bytes: [Array],
 *       top_logprobs: []
 *     }
 *   ],
 *   refusal: null
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Response Metadata</strong></summary>
 *
 * ```typescript
 * const aiMsgForResponseMetadata = await llm.invoke(input);
 * console.log(aiMsgForResponseMetadata.response_metadata);
 * ```
 *
 * ```txt
 * {
 *   tokenUsage: { completionTokens: 5, promptTokens: 28, totalTokens: 33 },
 *   finish_reason: 'stop',
 *   system_fingerprint: 'fp_3aa7262c27'
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>JSON Schema Structured Output</strong></summary>
 *
 * ```typescript
 * const llmForJsonSchema = new ChatOpenAI({
 *   model: "gpt-4o-2024-08-06",
 * }).withStructuredOutput(
 *   z.object({
 *     command: z.string().describe("The command to execute"),
 *     expectedOutput: z.string().describe("The expected output of the command"),
 *     options: z
 *       .array(z.string())
 *       .describe("The options you can pass to the command"),
 *   }),
 *   {
 *     method: "jsonSchema",
 *     strict: true, // Optional when using the `jsonSchema` method
 *   }
 * );
 *
 * const jsonSchemaRes = await llmForJsonSchema.invoke(
 *   "What is the command to list files in a directory?"
 * );
 * console.log(jsonSchemaRes);
 * ```
 *
 * ```txt
 * {
 *   command: 'ls',
 *   expectedOutput: 'A list of files and subdirectories within the specified directory.',
 *   options: [
 *     '-a: include directory entries whose names begin with a dot (.).',
 *     '-l: use a long listing format.',
 *     '-h: with -l, print sizes in human readable format (e.g., 1K, 234M, 2G).',
 *     '-t: sort by time, newest first.',
 *     '-r: reverse order while sorting.',
 *     '-S: sort by file size, largest first.',
 *     '-R: list subdirectories recursively.'
 *   ]
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Audio Outputs</strong></summary>
 *
 * ```typescript
 * import { ChatOpenAI } from "@langchain/openai";
 *
 * const modelWithAudioOutput = new ChatOpenAI({
 *   model: "gpt-4o-audio-preview",
 *   // You may also pass these fields to `.withConfig` as a call argument.
 *   modalities: ["text", "audio"], // Specifies that the model should output audio.
 *   audio: {
 *     voice: "alloy",
 *     format: "wav",
 *   },
 * });
 *
 * const audioOutputResult = await modelWithAudioOutput.invoke("Tell me a joke about cats.");
 * const castMessageContent = audioOutputResult.content[0] as Record<string, any>;
 *
 * console.log({
 *   ...castMessageContent,
 *   data: castMessageContent.data.slice(0, 100) // Sliced for brevity
 * })
 * ```
 *
 * ```txt
 * {
 *   id: 'audio_67117718c6008190a3afad3e3054b9b6',
 *   data: 'UklGRqYwBgBXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAATElTVBoAAABJTkZPSVNGVA4AAABMYXZmNTguMjkuMTAwAGRhdGFg',
 *   expires_at: 1729201448,
 *   transcript: 'Sure! Why did the cat sit on the computer? Because it wanted to keep an eye on the mouse!'
 * }
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Audio Outputs</strong></summary>
 *
 * ```typescript
 * import { ChatOpenAI } from "@langchain/openai";
 *
 * const modelWithAudioOutput = new ChatOpenAI({
 *   model: "gpt-4o-audio-preview",
 *   // You may also pass these fields to `.withConfig` as a call argument.
 *   modalities: ["text", "audio"], // Specifies that the model should output audio.
 *   audio: {
 *     voice: "alloy",
 *     format: "wav",
 *   },
 * });
 *
 * const audioOutputResult = await modelWithAudioOutput.invoke("Tell me a joke about cats.");
 * const castAudioContent = audioOutputResult.additional_kwargs.audio as Record<string, any>;
 *
 * console.log({
 *   ...castAudioContent,
 *   data: castAudioContent.data.slice(0, 100) // Sliced for brevity
 * })
 * ```
 *
 * ```txt
 * {
 *   id: 'audio_67117718c6008190a3afad3e3054b9b6',
 *   data: 'UklGRqYwBgBXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAATElTVBoAAABJTkZPSVNGVA4AAABMYXZmNTguMjkuMTAwAGRhdGFg',
 *   expires_at: 1729201448,
 *   transcript: 'Sure! Why did the cat sit on the computer? Because it wanted to keep an eye on the mouse!'
 * }
 * ```
 * </details>
 *
 * <br />
 */
export declare class ChatOpenAI<CallOptions extends ChatOpenAICallOptions = ChatOpenAICallOptions> extends BaseChatOpenAI<CallOptions> {
    protected fields?: ChatOpenAIFields | undefined;
    /**
     * Whether to use the responses API for all requests. If `false` the responses API will be used
     * only when required in order to fulfill the request.
     */
    useResponsesApi: boolean;
    protected responses: ChatOpenAIResponses;
    protected completions: ChatOpenAICompletions;
    get lc_serializable_keys(): string[];
    constructor(fields?: ChatOpenAIFields | undefined);
    protected _useResponsesApi(options: this["ParsedCallOptions"] | undefined): boolean | undefined;
    getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
    invocationParams(options?: this["ParsedCallOptions"]): ChatResponsesInvocationParams | ChatCompletionsInvocationParams;
    /** @ignore */
    _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
    _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
    withConfig(config: Partial<CallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions>;
}
