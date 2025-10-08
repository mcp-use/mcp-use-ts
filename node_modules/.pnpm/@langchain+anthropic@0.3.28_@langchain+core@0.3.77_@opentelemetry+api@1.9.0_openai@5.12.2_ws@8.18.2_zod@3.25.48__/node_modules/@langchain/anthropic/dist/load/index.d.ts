import { type OptionalImportMap, type SecretMap } from "./import_type.js";
import * as importMap from "./import_map.js";
import { optionalImportEntrypoints } from "./import_constants.js";
export { optionalImportEntrypoints, importMap, type OptionalImportMap, type SecretMap, };
/**
 * Load a LangChain module from a serialized text representation.
 * NOTE: This functionality is currently in beta.
 * Loaded classes may change independently of semver.
 * @param text Serialized text representation of the module.
 * @param secretsMap
 * @param optionalImportsMap
 * @returns A loaded instance of a LangChain module.
 */
export declare function load<T>(text: string, secretsMap?: Record<string, any>, optionalImportsMap?: OptionalImportMap & Record<string, any>): Promise<T>;
