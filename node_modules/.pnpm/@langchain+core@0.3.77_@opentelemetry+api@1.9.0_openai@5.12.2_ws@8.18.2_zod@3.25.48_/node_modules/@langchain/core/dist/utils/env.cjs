"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = exports.isNode = exports.isDeno = exports.isJsDom = exports.isWebWorker = exports.isBrowser = void 0;
exports.getRuntimeEnvironment = getRuntimeEnvironment;
exports.getRuntimeEnvironmentSync = getRuntimeEnvironmentSync;
exports.getEnvironmentVariable = getEnvironmentVariable;
const isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";
exports.isBrowser = isBrowser;
const isWebWorker = () => typeof globalThis === "object" &&
    globalThis.constructor &&
    globalThis.constructor.name === "DedicatedWorkerGlobalScope";
exports.isWebWorker = isWebWorker;
const isJsDom = () => (typeof window !== "undefined" && window.name === "nodejs") ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom"));
exports.isJsDom = isJsDom;
// Supabase Edge Function provides a `Deno` global object
// without `version` property
const isDeno = () => typeof Deno !== "undefined";
exports.isDeno = isDeno;
// Mark not-as-node if in Supabase Edge Function
const isNode = () => typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined" &&
    !(0, exports.isDeno)();
exports.isNode = isNode;
const getEnv = () => {
    let env;
    if ((0, exports.isBrowser)()) {
        env = "browser";
    }
    else if ((0, exports.isNode)()) {
        env = "node";
    }
    else if ((0, exports.isWebWorker)()) {
        env = "webworker";
    }
    else if ((0, exports.isJsDom)()) {
        env = "jsdom";
    }
    else if ((0, exports.isDeno)()) {
        env = "deno";
    }
    else {
        env = "other";
    }
    return env;
};
exports.getEnv = getEnv;
let runtimeEnvironment;
/**
 * @deprecated Use getRuntimeEnvironmentSync instead
 */
async function getRuntimeEnvironment() {
    return getRuntimeEnvironmentSync();
}
function getRuntimeEnvironmentSync() {
    if (runtimeEnvironment === undefined) {
        const env = (0, exports.getEnv)();
        runtimeEnvironment = {
            library: "langchain-js",
            runtime: env,
        };
    }
    return runtimeEnvironment;
}
function getEnvironmentVariable(name) {
    // Certain Deno setups will throw an error if you try to access environment variables
    // https://github.com/langchain-ai/langchainjs/issues/1412
    try {
        if (typeof process !== "undefined") {
            // eslint-disable-next-line no-process-env
            return process.env?.[name];
        }
        else if ((0, exports.isDeno)()) {
            return Deno?.env.get(name);
        }
        else {
            return undefined;
        }
    }
    catch (e) {
        return undefined;
    }
}
