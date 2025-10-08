import { BaseMessage, BaseMessageChunk, type MessageType, type BaseMessageFields, type MessageContentComplex } from "./base.js";
import type { DataContentBlock } from "./content_blocks.js";
export type SystemMessageFields = BaseMessageFields & {
    content: string | (MessageContentComplex | DataContentBlock)[];
};
/**
 * Represents a system message in a conversation.
 */
export declare class SystemMessage extends BaseMessage {
    content: string | (MessageContentComplex | DataContentBlock)[];
    static lc_name(): string;
    _getType(): MessageType;
    constructor(fields: string | SystemMessageFields, 
    /** @deprecated */
    kwargs?: Record<string, unknown>);
}
/**
 * Represents a chunk of a system message, which can be concatenated with
 * other system message chunks.
 */
export declare class SystemMessageChunk extends BaseMessageChunk {
    content: string | (MessageContentComplex | DataContentBlock)[];
    static lc_name(): string;
    _getType(): MessageType;
    constructor(fields: string | SystemMessageFields, 
    /** @deprecated */
    kwargs?: Record<string, unknown>);
    concat(chunk: SystemMessageChunk): SystemMessageChunk;
}
export declare function isSystemMessage(x: BaseMessage): x is SystemMessage;
export declare function isSystemMessageChunk(x: BaseMessageChunk): x is SystemMessageChunk;
