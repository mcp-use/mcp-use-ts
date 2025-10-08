import { load as coreLoad } from "@langchain/core/load";
import * as importMap from "./import_map.js";
import { optionalImportEntrypoints } from "./import_constants.js";
export { optionalImportEntrypoints, importMap, };
/**
 * Load a LangChain module from a serialized text representation.
 * NOTE: This functionality is currently in beta.
 * Loaded classes may change independently of semver.
 * @param text Serialized text representation of the module.
 * @param secretsMap
 * @param optionalImportsMap
 * @returns A loaded instance of a LangChain module.
 */
export async function load(text, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
secretsMap = {}, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
optionalImportsMap = {}) {
    return coreLoad(text, {
        secretsMap,
        optionalImportsMap,
        optionalImportEntrypoints,
        importMap,
    });
}
