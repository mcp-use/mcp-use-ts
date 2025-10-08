"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToOpenAITool = exports.formatToOpenAIFunction = void 0;
exports.wrapOpenAIClientError = wrapOpenAIClientError;
exports.formatToOpenAIAssistantTool = formatToOpenAIAssistantTool;
exports.formatToOpenAIToolChoice = formatToOpenAIToolChoice;
exports.interopZodResponseFormat = interopZodResponseFormat;
const openai_1 = require("openai");
const function_calling_1 = require("@langchain/core/utils/function_calling");
Object.defineProperty(exports, "formatToOpenAIFunction", { enumerable: true, get: function () { return function_calling_1.convertToOpenAIFunction; } });
Object.defineProperty(exports, "formatToOpenAITool", { enumerable: true, get: function () { return function_calling_1.convertToOpenAITool; } });
const types_1 = require("@langchain/core/utils/types");
const json_schema_1 = require("@langchain/core/utils/json_schema");
const core_1 = require("zod/v4/core");
const zod_1 = require("openai/helpers/zod");
const errors_js_1 = require("./errors.cjs");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapOpenAIClientError(e) {
    let error;
    if (e.constructor.name === openai_1.APIConnectionTimeoutError.name) {
        error = new Error(e.message);
        error.name = "TimeoutError";
    }
    else if (e.constructor.name === openai_1.APIUserAbortError.name) {
        error = new Error(e.message);
        error.name = "AbortError";
    }
    else if (e.status === 400 && e.message.includes("tool_calls")) {
        error = (0, errors_js_1.addLangChainErrorFields)(e, "INVALID_TOOL_RESULTS");
    }
    else if (e.status === 401) {
        error = (0, errors_js_1.addLangChainErrorFields)(e, "MODEL_AUTHENTICATION");
    }
    else if (e.status === 429) {
        error = (0, errors_js_1.addLangChainErrorFields)(e, "MODEL_RATE_LIMIT");
    }
    else if (e.status === 404) {
        error = (0, errors_js_1.addLangChainErrorFields)(e, "MODEL_NOT_FOUND");
    }
    else {
        error = e;
    }
    return error;
}
function formatToOpenAIAssistantTool(tool) {
    return {
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: (0, types_1.isInteropZodSchema)(tool.schema)
                ? (0, json_schema_1.toJsonSchema)(tool.schema)
                : tool.schema,
        },
    };
}
function formatToOpenAIToolChoice(toolChoice) {
    if (!toolChoice) {
        return undefined;
    }
    else if (toolChoice === "any" || toolChoice === "required") {
        return "required";
    }
    else if (toolChoice === "auto") {
        return "auto";
    }
    else if (toolChoice === "none") {
        return "none";
    }
    else if (typeof toolChoice === "string") {
        return {
            type: "function",
            function: {
                name: toolChoice,
            },
        };
    }
    else {
        return toolChoice;
    }
}
// inlined from openai/lib/parser.ts
function makeParseableResponseFormat(response_format, parser) {
    const obj = { ...response_format };
    Object.defineProperties(obj, {
        $brand: {
            value: "auto-parseable-response-format",
            enumerable: false,
        },
        $parseRaw: {
            value: parser,
            enumerable: false,
        },
    });
    return obj;
}
function interopZodResponseFormat(zodSchema, name, props) {
    if ((0, types_1.isZodSchemaV3)(zodSchema)) {
        return (0, zod_1.zodResponseFormat)(zodSchema, name, props);
    }
    if ((0, types_1.isZodSchemaV4)(zodSchema)) {
        return makeParseableResponseFormat({
            type: "json_schema",
            json_schema: {
                ...props,
                name,
                strict: true,
                schema: (0, core_1.toJSONSchema)(zodSchema, {
                    cycles: "ref", // equivalent to nameStrategy: 'duplicate-ref'
                    reused: "ref", // equivalent to $refStrategy: 'extract-to-root'
                    override(ctx) {
                        ctx.jsonSchema.title = name; // equivalent to `name` property
                        // TODO: implement `nullableStrategy` patch-fix (zod doesn't support openApi3 json schema target)
                        // TODO: implement `openaiStrictMode` patch-fix (where optional properties without `nullable` are not supported)
                    },
                    /// property equivalents from native `zodResponseFormat` fn
                    // openaiStrictMode: true,
                    // name,
                    // nameStrategy: 'duplicate-ref',
                    // $refStrategy: 'extract-to-root',
                    // nullableStrategy: 'property',
                }),
            },
        }, (content) => (0, core_1.parse)(zodSchema, JSON.parse(content)));
    }
    throw new Error("Unsupported schema response format");
}
