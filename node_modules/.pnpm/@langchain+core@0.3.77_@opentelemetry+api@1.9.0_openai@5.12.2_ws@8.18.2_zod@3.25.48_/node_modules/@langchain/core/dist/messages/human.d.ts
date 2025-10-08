import { BaseMessage, BaseMessageChunk, type MessageType, type BaseMessageFields, type MessageContentComplex } from "./base.js";
import type { DataContentBlock } from "./content_blocks.js";
export type HumanMessageFields = BaseMessageFields & {
    content: string | (MessageContentComplex | DataContentBlock)[];
};
/**
 * Represents a human message in a conversation.
 */
export declare class HumanMessage extends BaseMessage {
    content: string | (MessageContentComplex | DataContentBlock)[];
    static lc_name(): string;
    _getType(): MessageType;
    constructor(fields: string | HumanMessageFields, 
    /** @deprecated */
    kwargs?: Record<string, unknown>);
}
/**
 * Represents a chunk of a human message, which can be concatenated with
 * other human message chunks.
 */
export declare class HumanMessageChunk extends BaseMessageChunk {
    content: string | (MessageContentComplex | DataContentBlock)[];
    static lc_name(): string;
    _getType(): MessageType;
    constructor(fields: string | HumanMessageFields, 
    /** @deprecated */
    kwargs?: Record<string, unknown>);
    concat(chunk: HumanMessageChunk): HumanMessageChunk;
}
export declare function isHumanMessage(x: BaseMessage): x is HumanMessage;
export declare function isHumanMessageChunk(x: BaseMessageChunk): x is HumanMessageChunk;
