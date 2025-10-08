import type { Node, Data, Literal, Parent, Blockquote, Break, Code, Definition, Emphasis, Heading, Html, Image, ImageReference, InlineCode, Link, LinkReference, List, ListItem, Paragraph, Root, Strong, Text, ThematicBreak, Delete, FootnoteDefinition, FootnoteReference, Table, TableCell, TableRow, Yaml } from "mdast";
import type { Linter } from "eslint";
import type { LanguageOptions, LanguageContext, RuleDefinition, RuleVisitor } from "@eslint/core";
import type { MarkdownSourceCode } from "./index.js";
/** Adds matching `:exit` selectors for all properties of a `RuleVisitor`. */
type WithExit<RuleVisitorType extends RuleVisitor> = {
    [Key in keyof RuleVisitorType as Key | `${Key & string}:exit`]: RuleVisitorType[Key];
};
export interface RangeMap {
    indent: number;
    js: number;
    md: number;
}
export interface BlockBase {
    baseIndentText: string;
    comments: string[];
    rangeMap: RangeMap[];
}
export interface Block extends Node, BlockBase {
    meta: string | null;
}
export type Message = Linter.LintMessage;
export type RuleType = "problem" | "suggestion" | "layout";
/**
 * Markdown TOML.
 */
export interface Toml extends Literal {
    /**
     * Node type of mdast TOML.
     */
    type: "toml";
    /**
     * Data associated with the mdast TOML.
     */
    data?: TomlData | undefined;
}
/**
 * Info associated with mdast TOML nodes by the ecosystem.
 */
export interface TomlData extends Data {
}
/**
 * Language options provided for Markdown files.
 */
export interface MarkdownLanguageOptions extends LanguageOptions {
    /**
     * The options for parsing frontmatter.
     */
    frontmatter?: false | "yaml" | "toml";
}
/**
 * The context object that is passed to the Markdown language plugin methods.
 */
export type MarkdownLanguageContext = LanguageContext<MarkdownLanguageOptions>;
/**
 * Generic options for the `SourceCodeBase` type.
 */
export interface SourceCodeBaseTypeOptions {
    LangOptions: LanguageOptions;
    RootNode: unknown;
    SyntaxElementWithLoc: unknown;
    ConfigNode: unknown;
}
export interface MarkdownRuleVisitor extends RuleVisitor, WithExit<{
    root?(node: Root): void;
} & {
    [NodeType in Blockquote | Break | Code | Definition | Emphasis | Heading | Html | Image | ImageReference | InlineCode | Link | LinkReference | List | ListItem | Paragraph | Strong | Text | ThematicBreak | Delete | FootnoteDefinition | FootnoteReference | Table | TableCell | TableRow | Yaml | Toml as NodeType["type"]]?: (node: NodeType, parent?: Parent) => void;
}> {
}
export type MarkdownRuleDefinitionTypeOptions = {
    RuleOptions: unknown[];
    MessageIds: string;
    ExtRuleDocs: Record<string, unknown>;
};
export type MarkdownRuleDefinition<Options extends Partial<MarkdownRuleDefinitionTypeOptions> = {}> = RuleDefinition<{
    LangOptions: MarkdownLanguageOptions;
    Code: MarkdownSourceCode;
    Visitor: MarkdownRuleVisitor;
    Node: Node;
} & Required<Options & Omit<MarkdownRuleDefinitionTypeOptions, keyof Options>>>;
export {};
