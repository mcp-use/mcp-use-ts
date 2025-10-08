"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = exports.deepCompareStrict = void 0;
exports.toJsonSchema = toJsonSchema;
exports.validatesOnlyStrings = validatesOnlyStrings;
const core_1 = require("zod/v4/core");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const json_schema_1 = require("@cfworker/json-schema");
const zod_js_1 = require("./types/zod.cjs");
var json_schema_2 = require("@cfworker/json-schema");
Object.defineProperty(exports, "deepCompareStrict", { enumerable: true, get: function () { return json_schema_2.deepCompareStrict; } });
Object.defineProperty(exports, "Validator", { enumerable: true, get: function () { return json_schema_2.Validator; } });
/**
 * Converts a Zod schema or JSON schema to a JSON schema.
 * @param schema - The schema to convert.
 * @returns The converted schema.
 */
function toJsonSchema(schema) {
    if ((0, zod_js_1.isZodSchemaV4)(schema)) {
        const inputSchema = (0, zod_js_1.interopZodTransformInputSchema)(schema, true);
        if ((0, zod_js_1.isZodObjectV4)(inputSchema)) {
            const strictSchema = (0, zod_js_1.interopZodObjectStrict)(inputSchema, true);
            return (0, core_1.toJSONSchema)(strictSchema);
        }
        else {
            return (0, core_1.toJSONSchema)(schema);
        }
    }
    if ((0, zod_js_1.isZodSchemaV3)(schema)) {
        return (0, zod_to_json_schema_1.zodToJsonSchema)(schema);
    }
    return schema;
}
/**
 * Validates if a JSON schema validates only strings. May return false negatives in some edge cases
 * (like recursive or unresolvable refs).
 *
 * @param schema - The schema to validate.
 * @returns `true` if the schema validates only strings, `false` otherwise.
 */
function validatesOnlyStrings(schema) {
    // Null, undefined, or empty schema
    if (!schema ||
        typeof schema !== "object" ||
        Object.keys(schema).length === 0 ||
        Array.isArray(schema)) {
        return false; // Validates anything, not just strings
    }
    // Explicit type constraint
    if ("type" in schema) {
        if (typeof schema.type === "string") {
            return schema.type === "string";
        }
        if (Array.isArray(schema.type)) {
            // not sure why someone would do `"type": ["string"]` or especially `"type": ["string",
            // "string", "string", ...]` but we're not here to judge
            return schema.type.every((t) => t === "string");
        }
        return false; // Invalid or non-string type
    }
    // Enum with only string values
    if ("enum" in schema) {
        return (Array.isArray(schema.enum) &&
            schema.enum.length > 0 &&
            schema.enum.every((val) => typeof val === "string"));
    }
    // String constant
    if ("const" in schema) {
        return typeof schema.const === "string";
    }
    // Schema combinations
    if ("allOf" in schema && Array.isArray(schema.allOf)) {
        // If any subschema validates only strings, then the overall schema validates only strings
        return schema.allOf.some((subschema) => validatesOnlyStrings(subschema));
    }
    if (("anyOf" in schema && Array.isArray(schema.anyOf)) ||
        ("oneOf" in schema && Array.isArray(schema.oneOf))) {
        const subschemas = ("anyOf" in schema ? schema.anyOf : schema.oneOf);
        // All subschemas must validate only strings
        return (subschemas.length > 0 &&
            subschemas.every((subschema) => validatesOnlyStrings(subschema)));
    }
    // We're not going to try on this one, it's too complex - we just assume if it has a "not" key and hasn't matched one of the above checks, it's not a string schema.
    if ("not" in schema) {
        return false; // The not case can validate non-strings
    }
    if ("$ref" in schema && typeof schema.$ref === "string") {
        const ref = schema.$ref;
        const resolved = (0, json_schema_1.dereference)(schema);
        if (resolved[ref]) {
            return validatesOnlyStrings(resolved[ref]);
        }
        return false;
    }
    // ignore recursive refs and other cases where type is omitted for now
    // ignore other cases for now where type is omitted
    return false;
}
