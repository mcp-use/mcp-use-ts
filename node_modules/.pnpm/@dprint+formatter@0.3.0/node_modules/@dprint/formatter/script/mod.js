"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFromInstance = exports.createFromBuffer = exports.createStreaming = exports.createHost = void 0;
const decoder = new TextDecoder();
const encoder = new TextEncoder();
/**
 * Creates host for host formatting.
 */
function createHost() {
    let instance;
    let hostFormatter = (_filePath, fileText, _overrideConfig) => fileText;
    let overrideConfig = {};
    let filePath = "";
    let formattedText = "";
    let errorText = "";
    return {
        setInstance(wasmInstance) {
            instance = wasmInstance;
        },
        setHostFormatter(formatWithHost) {
            hostFormatter = formatWithHost;
        },
        createImportObject() {
            let sharedBuffer = new Uint8Array(0);
            let sharedBufferIndex = 0;
            const resetSharedBuffer = (length) => {
                sharedBuffer = new Uint8Array(length);
                sharedBufferIndex = 0;
            };
            return {
                dprint: {
                    "host_clear_bytes": (length) => {
                        resetSharedBuffer(length);
                    },
                    "host_read_buffer": (pointer, length) => {
                        sharedBuffer.set(getWasmBufferAtPointer(instance, pointer, length), sharedBufferIndex);
                        sharedBufferIndex += length;
                    },
                    "host_write_buffer": (pointer, index, length) => {
                        getWasmBufferAtPointer(instance, pointer, length).set(sharedBuffer.slice(index, index + length));
                    },
                    "host_take_file_path": () => {
                        filePath = decoder.decode(sharedBuffer);
                        resetSharedBuffer(0);
                    },
                    "host_take_override_config": () => {
                        overrideConfig = JSON.parse(decoder.decode(sharedBuffer));
                        resetSharedBuffer(0);
                    },
                    "host_format": () => {
                        const fileText = decoder.decode(sharedBuffer);
                        try {
                            formattedText = hostFormatter(filePath, fileText, overrideConfig);
                            return fileText === formattedText ? 0 : 1;
                        }
                        catch (error) {
                            errorText = String(error);
                            return 2;
                        }
                    },
                    "host_get_formatted_text": () => {
                        sharedBuffer = encoder.encode(formattedText);
                        sharedBufferIndex = 0;
                        return sharedBuffer.length;
                    },
                    "host_get_error_text": () => {
                        sharedBuffer = encoder.encode(errorText);
                        sharedBufferIndex = 0;
                        return sharedBuffer.length;
                    },
                },
            };
        },
    };
}
exports.createHost = createHost;
/**
 * Creates a formatter from the specified streaming source.
 * @remarks This is the most efficient way to create a formatter.
 * @param response - The streaming source to create the formatter from.
 */
async function createStreaming(responsePromise) {
    const response = await responsePromise;
    if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}\n${await response.text()}`);
    }
    if (typeof WebAssembly.instantiateStreaming === "function"
        && response.headers.get("content-type") === "application/wasm") {
        const host = createHost();
        const { instance } = await WebAssembly
            // deno-lint-ignore no-explicit-any
            .instantiateStreaming(response, host.createImportObject());
        return createFromInstance(instance, host);
    }
    else {
        // fallback for node.js or when the content type isn't application/wasm
        return response.arrayBuffer()
            .then((buffer) => createFromBuffer(buffer));
    }
}
exports.createStreaming = createStreaming;
/**
 * Creates a formatter from the specified wasm module bytes.
 * @param wasmModuleBuffer - The buffer of the wasm module.
 */
function createFromBuffer(wasmModuleBuffer) {
    const host = createHost();
    const wasmModule = new WebAssembly.Module(wasmModuleBuffer);
    const wasmInstance = new WebAssembly.Instance(wasmModule, host.createImportObject());
    return createFromInstance(wasmInstance, host);
}
exports.createFromBuffer = createFromBuffer;
/**
 * Creates a formatter from the specified wasm instance.
 * @param wasmInstance - The WebAssembly instance.
 * @param host- Formatting host.
 */
function createFromInstance(wasmInstance, host) {
    host.setInstance(wasmInstance);
    // deno-lint-ignore no-explicit-any
    const wasmExports = wasmInstance.exports;
    const { 
    // deno-lint-ignore camelcase
    get_plugin_schema_version, 
    // deno-lint-ignore camelcase
    set_file_path, 
    // deno-lint-ignore camelcase
    set_override_config, 
    // deno-lint-ignore camelcase
    get_formatted_text, format, 
    // deno-lint-ignore camelcase
    get_error_text, 
    // deno-lint-ignore camelcase
    get_plugin_info, 
    // deno-lint-ignore camelcase
    get_resolved_config, 
    // deno-lint-ignore camelcase
    get_config_diagnostics, 
    // deno-lint-ignore camelcase
    set_global_config, 
    // deno-lint-ignore camelcase
    set_plugin_config, 
    // deno-lint-ignore camelcase
    get_license_text, 
    // deno-lint-ignore camelcase
    reset_config, } = wasmExports;
    const pluginSchemaVersion = get_plugin_schema_version();
    const expectedPluginSchemaVersion = 3;
    if (pluginSchemaVersion !== 2
        && pluginSchemaVersion !== expectedPluginSchemaVersion) {
        throw new Error(`Not compatible plugin. `
            + `Expected schema ${expectedPluginSchemaVersion}, `
            + `but plugin had ${pluginSchemaVersion}.`);
    }
    let configSet = false;
    return {
        setConfig(globalConfig, pluginConfig) {
            setConfig(globalConfig, pluginConfig);
        },
        getConfigDiagnostics() {
            setConfigIfNotSet();
            const length = get_config_diagnostics();
            return JSON.parse(receiveString(wasmInstance, length));
        },
        getResolvedConfig() {
            setConfigIfNotSet();
            const length = get_resolved_config();
            return JSON.parse(receiveString(wasmInstance, length));
        },
        getPluginInfo() {
            const length = get_plugin_info();
            const pluginInfo = JSON.parse(receiveString(wasmInstance, length));
            pluginInfo.fileNames = pluginInfo.fileNames ?? [];
            return pluginInfo;
        },
        getLicenseText() {
            const length = get_license_text();
            return receiveString(wasmInstance, length);
        },
        formatText(filePath, fileText, overrideConfig, formatWithHost) {
            if (formatWithHost) {
                host.setHostFormatter(formatWithHost);
            }
            setConfigIfNotSet();
            if (overrideConfig != null) {
                if (pluginSchemaVersion === 2) {
                    throw new Error("Cannot set the override configuration for this old plugin.");
                }
                sendString(wasmInstance, JSON.stringify(overrideConfig));
                set_override_config();
            }
            sendString(wasmInstance, filePath);
            set_file_path();
            sendString(wasmInstance, fileText);
            const responseCode = format();
            switch (responseCode) {
                case 0: // no change
                    return fileText;
                case 1: // change
                    return receiveString(wasmInstance, get_formatted_text());
                case 2: // error
                    throw new Error(receiveString(wasmInstance, get_error_text()));
                default:
                    throw new Error(`Unexpected response code: ${responseCode}`);
            }
        },
    };
    function setConfigIfNotSet() {
        if (!configSet) {
            setConfig({}, {});
        }
    }
    function setConfig(globalConfig, pluginConfig) {
        if (reset_config != null) {
            reset_config();
        }
        sendString(wasmInstance, JSON.stringify(globalConfig));
        set_global_config();
        sendString(wasmInstance, JSON.stringify(pluginConfig));
        set_plugin_config();
        configSet = true;
    }
}
exports.createFromInstance = createFromInstance;
function sendString(wasmInstance, text) {
    // deno-lint-ignore no-explicit-any
    const exports = wasmInstance.exports;
    const encodedText = encoder.encode(text);
    const length = encodedText.length;
    const memoryBufferSize = exports.get_wasm_memory_buffer_size();
    const memoryBufferPointer = getWasmMemoryBufferPointer(wasmInstance);
    exports.clear_shared_bytes(length);
    let index = 0;
    while (index < length) {
        const writeCount = Math.min(length - index, memoryBufferSize);
        const wasmBuffer = getWasmBufferAtPointer(wasmInstance, memoryBufferPointer, writeCount);
        wasmBuffer.set(encodedText.slice(index, index + writeCount));
        exports.add_to_shared_bytes_from_buffer(writeCount);
        index += writeCount;
    }
    return length;
}
function receiveString(wasmInstance, length) {
    // deno-lint-ignore no-explicit-any
    const exports = wasmInstance.exports;
    const memoryBufferSize = exports.get_wasm_memory_buffer_size();
    const memoryBufferPointer = getWasmMemoryBufferPointer(wasmInstance);
    const buffer = new Uint8Array(length);
    let index = 0;
    while (index < length) {
        const readCount = Math.min(length - index, memoryBufferSize);
        exports.set_buffer_with_shared_bytes(index, readCount);
        const wasmBuffer = getWasmBufferAtPointer(wasmInstance, memoryBufferPointer, readCount);
        buffer.set(wasmBuffer, index);
        index += readCount;
    }
    return decoder.decode(buffer);
}
function getWasmMemoryBufferPointer(wasmInstance) {
    // deno-lint-ignore no-explicit-any
    return wasmInstance.exports.get_wasm_memory_buffer();
}
function getWasmBufferAtPointer(wasmInstance, pointer, length) {
    return new Uint8Array(
    // deno-lint-ignore no-explicit-any
    wasmInstance.exports.memory.buffer, pointer, length);
}
