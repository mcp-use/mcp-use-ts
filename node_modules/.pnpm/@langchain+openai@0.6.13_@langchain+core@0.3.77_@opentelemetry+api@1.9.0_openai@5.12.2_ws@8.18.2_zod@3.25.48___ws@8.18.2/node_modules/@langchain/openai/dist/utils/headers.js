const iife = (fn) => fn();
export function isHeaders(headers) {
    return (typeof Headers !== "undefined" &&
        headers !== null &&
        typeof headers === "object" &&
        Object.prototype.toString.call(headers) === "[object Headers]");
}
export function normalizeHeaders(headers) {
    const output = iife(() => {
        // If headers is a Headers instance
        if (isHeaders(headers)) {
            return headers;
        }
        // If headers is an array of [key, value] pairs
        else if (Array.isArray(headers)) {
            return new Headers(headers);
        }
        // If headers is a NullableHeaders-like object (has 'values' property that is a Headers)
        else if (typeof headers === "object" &&
            headers !== null &&
            "values" in headers &&
            isHeaders(headers.values)) {
            return headers.values;
        }
        // If headers is a plain object
        else if (typeof headers === "object" && headers !== null) {
            const entries = Object.entries(headers)
                .filter(([, v]) => typeof v === "string")
                .map(([k, v]) => [k, v]);
            return new Headers(entries);
        }
        return new Headers();
    });
    return Object.fromEntries(output.entries());
}
