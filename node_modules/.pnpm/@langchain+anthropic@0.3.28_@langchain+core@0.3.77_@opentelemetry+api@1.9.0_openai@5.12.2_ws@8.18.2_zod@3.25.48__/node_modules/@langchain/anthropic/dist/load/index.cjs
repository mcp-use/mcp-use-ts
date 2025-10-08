"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.importMap = exports.optionalImportEntrypoints = void 0;
exports.load = load;
const load_1 = require("@langchain/core/load");
const importMap = __importStar(require("./import_map.cjs"));
exports.importMap = importMap;
const import_constants_js_1 = require("./import_constants.cjs");
Object.defineProperty(exports, "optionalImportEntrypoints", { enumerable: true, get: function () { return import_constants_js_1.optionalImportEntrypoints; } });
/**
 * Load a LangChain module from a serialized text representation.
 * NOTE: This functionality is currently in beta.
 * Loaded classes may change independently of semver.
 * @param text Serialized text representation of the module.
 * @param secretsMap
 * @param optionalImportsMap
 * @returns A loaded instance of a LangChain module.
 */
async function load(text, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
secretsMap = {}, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
optionalImportsMap = {}) {
    return (0, load_1.load)(text, {
        secretsMap,
        optionalImportsMap,
        optionalImportEntrypoints: import_constants_js_1.optionalImportEntrypoints,
        importMap,
    });
}
