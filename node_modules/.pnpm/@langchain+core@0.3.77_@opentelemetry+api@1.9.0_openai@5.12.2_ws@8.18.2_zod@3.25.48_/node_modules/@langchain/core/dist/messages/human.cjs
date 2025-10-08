"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanMessageChunk = exports.HumanMessage = void 0;
exports.isHumanMessage = isHumanMessage;
exports.isHumanMessageChunk = isHumanMessageChunk;
const base_js_1 = require("./base.cjs");
/**
 * Represents a human message in a conversation.
 */
class HumanMessage extends base_js_1.BaseMessage {
    static lc_name() {
        return "HumanMessage";
    }
    _getType() {
        return "human";
    }
    constructor(fields, 
    /** @deprecated */
    kwargs) {
        super(fields, kwargs);
    }
}
exports.HumanMessage = HumanMessage;
/**
 * Represents a chunk of a human message, which can be concatenated with
 * other human message chunks.
 */
class HumanMessageChunk extends base_js_1.BaseMessageChunk {
    static lc_name() {
        return "HumanMessageChunk";
    }
    _getType() {
        return "human";
    }
    constructor(fields, 
    /** @deprecated */
    kwargs) {
        super(fields, kwargs);
    }
    concat(chunk) {
        return new HumanMessageChunk({
            content: (0, base_js_1.mergeContent)(this.content, chunk.content),
            additional_kwargs: (0, base_js_1._mergeDicts)(this.additional_kwargs, chunk.additional_kwargs),
            response_metadata: (0, base_js_1._mergeDicts)(this.response_metadata, chunk.response_metadata),
            id: this.id ?? chunk.id,
        });
    }
}
exports.HumanMessageChunk = HumanMessageChunk;
function isHumanMessage(x) {
    return x.getType() === "human";
}
function isHumanMessageChunk(x) {
    return x.getType() === "human";
}
