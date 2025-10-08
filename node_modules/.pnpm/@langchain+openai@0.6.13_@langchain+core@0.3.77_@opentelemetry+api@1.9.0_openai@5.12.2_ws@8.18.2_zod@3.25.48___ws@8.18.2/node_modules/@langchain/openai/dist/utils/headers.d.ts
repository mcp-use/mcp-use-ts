type HeaderValue = string | undefined | null;
export type HeadersLike = Headers | readonly HeaderValue[][] | Record<string, HeaderValue | readonly HeaderValue[]> | undefined | null | {
    values: Headers;
    [key: string]: unknown;
};
export declare function isHeaders(headers: unknown): headers is Headers;
export declare function normalizeHeaders(headers: HeadersLike): Record<string, HeaderValue | readonly HeaderValue[]>;
export {};
