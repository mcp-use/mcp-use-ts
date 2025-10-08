/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
export function addLangChainErrorFields(error, lc_error_code) {
    error.lc_error_code = lc_error_code;
    error.message = `${error.message}\n\nTroubleshooting URL: https://js.langchain.com/docs/troubleshooting/errors/${lc_error_code}/\n`;
    return error;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapAnthropicClientError(e) {
    let error;
    if (e.status === 400 && e.message.includes("tool")) {
        error = addLangChainErrorFields(e, "INVALID_TOOL_RESULTS");
    }
    else if (e.status === 401) {
        error = addLangChainErrorFields(e, "MODEL_AUTHENTICATION");
    }
    else if (e.status === 404) {
        error = addLangChainErrorFields(e, "MODEL_NOT_FOUND");
    }
    else if (e.status === 429) {
        error = addLangChainErrorFields(e, "MODEL_RATE_LIMIT");
    }
    else {
        error = e;
    }
    return error;
}
