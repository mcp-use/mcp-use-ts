"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = exports.insecureHash = void 0;
var hash_js_1 = require("./js-sha1/hash.cjs");
Object.defineProperty(exports, "insecureHash", { enumerable: true, get: function () { return hash_js_1.insecureHash; } });
var hash_js_2 = require("./js-sha256/hash.cjs");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hash_js_2.sha256; } });
