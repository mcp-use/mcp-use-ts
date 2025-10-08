"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charChunks = void 0;
const index_js_1 = require("../../messages/index.cjs");
/** Tiny helper to convert string into char chunk. For eg: Turn `"Hi!"` into `[AIMessageChunk("H"), AIMessageChunk("i"), AIMessageChunk("!")] */
const charChunks = (text) => [...text].map((c) => new index_js_1.AIMessageChunk({ content: c }));
exports.charChunks = charChunks;
