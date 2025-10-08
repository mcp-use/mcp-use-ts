import { type JsonSchema7Type } from "zod-to-json-schema";
import { InteropZodType } from "./types/zod.js";
export type JSONSchema = JsonSchema7Type;
export { deepCompareStrict, Validator } from "@cfworker/json-schema";
/**
 * Converts a Zod schema or JSON schema to a JSON schema.
 * @param schema - The schema to convert.
 * @returns The converted schema.
 */
export declare function toJsonSchema(schema: InteropZodType | JSONSchema): JSONSchema;
/**
 * Validates if a JSON schema validates only strings. May return false negatives in some edge cases
 * (like recursive or unresolvable refs).
 *
 * @param schema - The schema to validate.
 * @returns `true` if the schema validates only strings, `false` otherwise.
 */
export declare function validatesOnlyStrings(schema: unknown): boolean;
export { type JsonSchema7Type, type JsonSchema7ArrayType, type JsonSchema7ObjectType, type JsonSchema7StringType, type JsonSchema7NumberType, type JsonSchema7NullableType, } from "zod-to-json-schema";
