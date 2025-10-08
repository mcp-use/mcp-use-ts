/** Formats code. */
export interface Formatter {
    /**
     * Sets the configuration.
     * @param globalConfig - Global configuration for use across plugins.
     * @param pluginConfig - Plugin specific configuration.
     */
    setConfig(globalConfig: GlobalConfiguration, pluginConfig: Record<string, unknown>): void;
    /**
     * Gets the configuration diagnostics.
     */
    getConfigDiagnostics(): ConfigurationDiagnostic[];
    /**
     * Gets the resolved configuration.
     * @returns An object containing the resolved configuration.
     */
    getResolvedConfig(): Record<string, unknown>;
    /**
     * Gets the plugin info.
     */
    getPluginInfo(): PluginInfo;
    /**
     * Gets the license text of the plugin.
     */
    getLicenseText(): string;
    /**
     * Formats the specified file text.
     * @param filePath - The file path to format.
     * @param fileText - File text to format.
     * @param overrideConfig - Configuration to set for a single format.
     * @param formatWithHost - Host formatter.
     * @returns The formatted text.
     * @throws If there is an error formatting.
     */
    formatText(filePath: string, fileText: string, overrideConfig?: Record<string, unknown>, formatWithHost?: (filePath: string, fileText: string, overrideConfig: Record<string, unknown>) => string): string;
}
/** Configuration specified for use across plugins. */
export interface GlobalConfiguration {
    lineWidth?: number;
    indentWidth?: number;
    useTabs?: boolean;
    newLineKind?: "auto" | "lf" | "crlf" | "system";
}
/** A diagnostic indicating a problem with the specified configuration. */
export interface ConfigurationDiagnostic {
    propertyName: string;
    message: string;
}
/** Information about a plugin. */
export interface PluginInfo {
    name: string;
    version: string;
    configKey: string;
    fileExtensions: string[];
    fileNames: string[];
    helpUrl: string;
    configSchemaUrl: string;
}
export interface Host {
    setInstance(wasmInstance: WebAssembly.Instance): void;
    setHostFormatter(formatWithHost: (filePath: string, fileText: string, overrideConfig: Record<string, unknown>) => string): void;
    createImportObject(): WebAssembly.Imports;
}
/**
 * Creates host for host formatting.
 */
export declare function createHost(): Host;
export interface ResponseLike {
    status: number;
    arrayBuffer(): Promise<BufferSource>;
    text(): Promise<string>;
    headers: {
        get(name: string): string | null;
    };
}
/**
 * Creates a formatter from the specified streaming source.
 * @remarks This is the most efficient way to create a formatter.
 * @param response - The streaming source to create the formatter from.
 */
export declare function createStreaming(responsePromise: Promise<ResponseLike> | ResponseLike): Promise<Formatter>;
/**
 * Creates a formatter from the specified wasm module bytes.
 * @param wasmModuleBuffer - The buffer of the wasm module.
 */
export declare function createFromBuffer(wasmModuleBuffer: BufferSource): Formatter;
/**
 * Creates a formatter from the specified wasm instance.
 * @param wasmInstance - The WebAssembly instance.
 * @param host- Formatting host.
 */
export declare function createFromInstance(wasmInstance: WebAssembly.Instance, host: Host): Formatter;
