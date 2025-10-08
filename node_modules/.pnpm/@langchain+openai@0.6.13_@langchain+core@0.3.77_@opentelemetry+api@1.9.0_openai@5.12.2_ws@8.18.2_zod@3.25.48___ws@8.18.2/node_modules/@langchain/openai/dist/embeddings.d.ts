import { type ClientOptions, OpenAI as OpenAIClient } from "openai";
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
/**
 * @see https://platform.openai.com/docs/guides/embeddings#embedding-models
 */
export type OpenAIEmbeddingModelId = OpenAIClient.EmbeddingModel | (string & NonNullable<unknown>);
/**
 * Interface for OpenAIEmbeddings parameters. Extends EmbeddingsParams and
 * defines additional parameters specific to the OpenAIEmbeddings class.
 */
export interface OpenAIEmbeddingsParams extends EmbeddingsParams {
    /**
     * Model name to use
     * Alias for `model`
     * @deprecated Use "model" instead.
     */
    modelName: OpenAIEmbeddingModelId;
    /** Model name to use */
    model: OpenAIEmbeddingModelId;
    /**
     * The number of dimensions the resulting output embeddings should have.
     * Only supported in `text-embedding-3` and later models.
     */
    dimensions?: number;
    /**
     * Timeout to use when making requests to OpenAI.
     */
    timeout?: number;
    /**
     * The maximum number of documents to embed in a single request. This is
     * limited by the OpenAI API to a maximum of 2048.
     */
    batchSize?: number;
    /**
     * Whether to strip new lines from the input text. This is recommended by
     * OpenAI for older models, but may not be suitable for all use cases.
     * See: https://github.com/openai/openai-python/issues/418#issuecomment-1525939500
     */
    stripNewLines?: boolean;
    /**
     * The format to return the embeddings in. Can be either 'float' or 'base64'.
     */
    encodingFormat?: "float" | "base64";
}
/**
 * Class for generating embeddings using the OpenAI API.
 *
 * To use with Azure, import the `AzureOpenAIEmbeddings` class.
 *
 * @example
 * ```typescript
 * // Embed a query using OpenAIEmbeddings to generate embeddings for a given text
 * const model = new OpenAIEmbeddings();
 * const res = await model.embedQuery(
 *   "What would be a good company name for a company that makes colorful socks?",
 * );
 * console.log({ res });
 *
 * ```
 */
export declare class OpenAIEmbeddings<TOutput = number[]> extends Embeddings<TOutput> implements Partial<OpenAIEmbeddingsParams> {
    model: string;
    /** @deprecated Use "model" instead */
    modelName: string;
    batchSize: number;
    stripNewLines: boolean;
    /**
     * The number of dimensions the resulting output embeddings should have.
     * Only supported in `text-embedding-3` and later models.
     */
    dimensions?: number;
    timeout?: number;
    organization?: string;
    encodingFormat?: "float" | "base64";
    protected client: OpenAIClient;
    protected clientConfig: ClientOptions;
    constructor(fields?: Partial<OpenAIEmbeddingsParams> & {
        verbose?: boolean;
        /**
         * The OpenAI API key to use.
         * Alias for `apiKey`.
         */
        openAIApiKey?: string;
        /** The OpenAI API key to use. */
        apiKey?: string;
        configuration?: ClientOptions;
    });
    /**
     * Method to generate embeddings for an array of documents. Splits the
     * documents into batches and makes requests to the OpenAI API to generate
     * embeddings.
     * @param texts Array of documents to generate embeddings for.
     * @returns Promise that resolves to a 2D array of embeddings for each document.
     */
    embedDocuments(texts: string[]): Promise<TOutput[]>;
    /**
     * Method to generate an embedding for a single document. Calls the
     * embeddingWithRetry method with the document as the input.
     * @param text Document to generate an embedding for.
     * @returns Promise that resolves to an embedding for the document.
     */
    embedQuery(text: string): Promise<TOutput>;
    /**
     * Private method to make a request to the OpenAI API to generate
     * embeddings. Handles the retry logic and returns the response from the
     * API.
     * @param request Request to send to the OpenAI API.
     * @returns Promise that resolves to the response from the API.
     */
    protected embeddingWithRetry(request: OpenAIClient.EmbeddingCreateParams): Promise<OpenAIClient.Embeddings.CreateEmbeddingResponse & {
        _request_id?: string | null;
    }>;
}
