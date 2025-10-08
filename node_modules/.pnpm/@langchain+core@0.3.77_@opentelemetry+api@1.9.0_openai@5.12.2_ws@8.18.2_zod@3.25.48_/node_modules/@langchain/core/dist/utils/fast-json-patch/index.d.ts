export * from "./src/core.js";
export * from "./src/duplex.js";
export { PatchError as JsonPatchError, _deepClone as deepClone, escapePathComponent, unescapePathComponent, } from "./src/helpers.js";
/**
 * Default export for backwards compat
 */
import * as core from "./src/core.js";
import { PatchError as JsonPatchError, _deepClone as deepClone, escapePathComponent, unescapePathComponent } from "./src/helpers.js";
declare const _default: {
    JsonPatchError: typeof JsonPatchError;
    deepClone: typeof deepClone;
    escapePathComponent: typeof escapePathComponent;
    unescapePathComponent: typeof unescapePathComponent;
    getValueByPointer(document: any, pointer: string): any;
    applyOperation<T>(document: T, operation: core.Operation, validateOperation?: boolean | core.Validator<T>, mutateDocument?: boolean, banPrototypeModifications?: boolean, index?: number): core.OperationResult<T>;
    applyPatch<T>(document: T, patch: ReadonlyArray<core.Operation>, validateOperation?: boolean | core.Validator<T>, mutateDocument?: boolean, banPrototypeModifications?: boolean): core.PatchResult<T>;
    applyReducer<T>(document: T, operation: core.Operation, index: number): T;
    validator(operation: core.Operation, index: number, document?: any, existingPathFragment?: string): void;
    validate<T>(sequence: ReadonlyArray<core.Operation>, document?: T, externalValidator?: core.Validator<T>): JsonPatchError;
    _areEquals(a: any, b: any): boolean;
};
export default _default;
