"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyToJson = keyToJson;
exports.keyFromJson = keyFromJson;
exports.mapKeys = mapKeys;
const decamelize_1 = __importDefault(require("decamelize"));
const camelcase_1 = __importDefault(require("camelcase"));
function keyToJson(key, map) {
    return map?.[key] || (0, decamelize_1.default)(key);
}
function keyFromJson(key, map) {
    return map?.[key] || (0, camelcase_1.default)(key);
}
function mapKeys(fields, mapper, map) {
    const mapped = {};
    for (const key in fields) {
        if (Object.hasOwn(fields, key)) {
            mapped[mapper(key, map)] = fields[key];
        }
    }
    return mapped;
}
