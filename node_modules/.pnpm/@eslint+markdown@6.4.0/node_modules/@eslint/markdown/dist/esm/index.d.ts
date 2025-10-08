export type Extensions = import("mdast-util-from-markdown").Options["extensions"];
export type MdastExtensions = import("mdast-util-from-markdown").Options["mdastExtensions"];
export type OkParseResult = import("@eslint/core").OkParseResult<RootNode>;
export type MarkdownLanguageContext = import("./types.ts").MarkdownLanguageContext;
export type ParserMode = "commonmark" | "gfm";
export type NoMissingLabelRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [];
}>;
export type Block = import("./types.ts").Block;
export type RangeMap = import("./types.ts").RangeMap;
export type Node = import("mdast").Node;
export type ParentNode = import("mdast").Parent;
export type CodeNode = import("mdast").Code;
export type HtmlNode = import("mdast").Html;
export type Message = import("eslint").Linter.LintMessage;
export type Fix = import("eslint").Rule.Fix;
export type Range = import("eslint").AST.Range;
export type RootNode = import("mdast").Root;
export type MarkdownNode = import("mdast").Node;
export type HTMLNode = import("mdast").Html;
export type Language = import("@eslint/core").Language;
export type File = import("@eslint/core").File;
export type TraversalStep = import("@eslint/core").TraversalStep;
export type VisitTraversalStep = import("@eslint/core").VisitTraversalStep;
export type ParseResult = import("@eslint/core").ParseResult<RootNode>;
export type SourceLocation = import("@eslint/core").SourceLocation;
export type SourceRange = import("@eslint/core").SourceRange;
export type FileProblem = import("@eslint/core").FileProblem;
export type DirectiveType = import("@eslint/core").DirectiveType;
export type RulesConfig = import("@eslint/core").RulesConfig;
/**
 * <Options>
 */
export type TextSourceCode<Options extends SourceCodeBaseTypeOptions = import("./types.ts").SourceCodeBaseTypeOptions> = import("@eslint/core").TextSourceCode<Options>;
export type MarkdownLanguageOptions = import("./types.ts").MarkdownLanguageOptions;
export type SourceCodeBaseTypeOptions = import("./types.ts").SourceCodeBaseTypeOptions;
export type FencedCodeLanguageRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [{
        required?: string[];
    }];
}>;
export type HeadingIncrementRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [];
}>;
export type NoDuplicateHeadingsRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [];
}>;
export type NoEmptyLinksRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [];
}>;
export type NoHtmlRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [{
        allowed?: string[];
    }];
}>;
export type Position = import("unist").Position;
export type TextNode = import("mdast").Text;
export type NoInvalidLabelRuleDefinition = import("./types.ts").MarkdownRuleDefinition<{
    RuleOptions: [];
}>;
export type RulesRecord = import("eslint").Linter.RulesRecord;
export type Config = import("eslint").Linter.Config;
export type Plugin = import("eslint").ESLint.Plugin;
/**
 * <Options>
 */
export type MarkdownRuleDefinition<Options extends Partial<import("./types.ts").MarkdownRuleDefinitionTypeOptions> = {}> = import("./types.ts").MarkdownRuleDefinition<Options>;
export type RuleModule = MarkdownRuleDefinition;
export type MarkdownRuleVisitor = import("./types.ts").MarkdownRuleVisitor;
/**
 * Markdown Source Code Object
 * @implements {TextSourceCode<{LangOptions: MarkdownLanguageOptions, RootNode: RootNode, SyntaxElementWithLoc: MarkdownNode, ConfigNode: { value: string; position: SourceLocation }}>}
 */
export class MarkdownSourceCode extends TextSourceCodeBase implements TextSourceCode<{
    LangOptions: MarkdownLanguageOptions;
    RootNode: RootNode;
    SyntaxElementWithLoc: MarkdownNode;
    ConfigNode: {
        value: string;
        position: SourceLocation;
    };
}> {
    /**
     * Creates a new instance.
     * @param {Object} options The options for the instance.
     * @param {string} options.text The source code text.
     * @param {RootNode} options.ast The root AST node.
     */
    constructor({ text, ast }: {
        text: string;
        ast: RootNode;
    });
    /**
     * The AST of the source code.
     * @type {RootNode}
     */
    ast: RootNode;
    /**
     * Returns the parent of the given node.
     * @param {MarkdownNode} node The node to get the parent of.
     * @returns {MarkdownNode|undefined} The parent of the node.
     */
    getParent(node: MarkdownNode): MarkdownNode | undefined;
    /**
     * Returns an array of all inline configuration nodes found in the
     * source code.
     * @returns {Array<InlineConfigComment>} An array of all inline configuration nodes.
     */
    getInlineConfigNodes(): Array<InlineConfigComment>;
    /**
     * Returns an all directive nodes that enable or disable rules along with any problems
     * encountered while parsing the directives.
     * @returns {{problems:Array<FileProblem>,directives:Array<Directive>}} Information
     *      that ESLint needs to further process the directives.
     */
    getDisableDirectives(): {
        problems: Array<FileProblem>;
        directives: Array<Directive>;
    };
    /**
     * Returns inline rule configurations along with any problems
     * encountered while parsing the configurations.
     * @returns {{problems:Array<FileProblem>,configs:Array<{config:{rules:RulesConfig},loc:SourceLocation}>}} Information
     *      that ESLint needs to further process the rule configurations.
     */
    applyInlineConfig(): {
        problems: Array<FileProblem>;
        configs: Array<{
            config: {
                rules: RulesConfig;
            };
            loc: SourceLocation;
        }>;
    };
    #private;
}
declare namespace plugin {
    export namespace meta {
        let name: string;
        let version: string;
    }
    export namespace processors {
        export { processor as markdown };
    }
    export namespace languages {
        let commonmark: MarkdownLanguage;
        let gfm: MarkdownLanguage;
    }
    export { rules };
    export let configs: {
        "recommended-legacy": {
            plugins: string[];
            overrides: ({
                files: string[];
                processor: string;
                parserOptions?: undefined;
                rules?: undefined;
            } | {
                files: string[];
                parserOptions: {
                    ecmaFeatures: {
                        impliedStrict: boolean;
                    };
                };
                rules: {
                    [rule: string]: import("eslint").Linter.RuleEntry<any[]>;
                };
                processor?: undefined;
            })[];
        };
        recommended: {
            name: string;
            files: string[];
            language: string;
            plugins: {};
            rules: {
                readonly "markdown/fenced-code-language": "error";
                readonly "markdown/heading-increment": "error";
                readonly "markdown/no-empty-links": "error";
                readonly "markdown/no-invalid-label-refs": "error";
                readonly "markdown/no-missing-label-refs": "error";
            };
        }[];
        processor: ({
            name: string;
            plugins: {};
            files?: undefined;
            processor?: undefined;
            languageOptions?: undefined;
            rules?: undefined;
        } | {
            name: string;
            files: string[];
            processor: string;
            plugins?: undefined;
            languageOptions?: undefined;
            rules?: undefined;
        } | {
            name: string;
            files: string[];
            languageOptions: {
                parserOptions: {
                    ecmaFeatures: {
                        impliedStrict: boolean;
                    };
                };
            };
            rules: {
                [rule: string]: import("eslint").Linter.RuleEntry<any[]>;
            };
            plugins?: undefined;
            processor?: undefined;
        })[];
    };
}
import { TextSourceCodeBase } from '@eslint/plugin-kit';
/**
 * Represents an inline config comment in the source code.
 */
declare class InlineConfigComment {
    /**
     * Creates a new instance.
     * @param {Object} options The options for the instance.
     * @param {string} options.value The comment text.
     * @param {SourceLocation} options.position The position of the comment in the source code.
     */
    constructor({ value, position }: {
        value: string;
        position: SourceLocation;
    });
    /**
     * The comment text.
     * @type {string}
     */
    value: string;
    /**
     * The position of the comment in the source code.
     * @type {SourceLocation}
     */
    position: SourceLocation;
}
import { Directive } from '@eslint/plugin-kit';
declare namespace processor {
    export namespace meta_1 {
        let name_1: string;
        export { name_1 as name };
        let version_1: string;
        export { version_1 as version };
    }
    export { meta_1 as meta };
    export { preprocess };
    export { postprocess };
    export { SUPPORTS_AUTOFIX as supportsAutofix };
}
/**
 * Markdown Language Object
 * @implements {Language}
 */
declare class MarkdownLanguage implements Language {
    /**
     * Creates a new instance.
     * @param {Object} options The options to use for this instance.
     * @param {ParserMode} [options.mode] The Markdown parser mode to use.
     */
    constructor({ mode }?: {
        mode?: ParserMode;
    });
    /**
     * The type of file to read.
     * @type {"text"}
     */
    fileType: "text";
    /**
     * The line number at which the parser starts counting.
     * @type {0|1}
     */
    lineStart: 0 | 1;
    /**
     * The column number at which the parser starts counting.
     * @type {0|1}
     */
    columnStart: 0 | 1;
    /**
     * The name of the key that holds the type of the node.
     * @type {string}
     */
    nodeTypeKey: string;
    /**
     * Default language options. User-defined options are merged with this object.
     * @type {MarkdownLanguageOptions}
     */
    defaultLanguageOptions: MarkdownLanguageOptions;
    /**
     * Validates the language options.
     * @param {MarkdownLanguageOptions} languageOptions The language options to validate.
     * @returns {void}
     * @throws {Error} When the language options are invalid.
     */
    validateLanguageOptions(languageOptions: MarkdownLanguageOptions): void;
    /**
     * Parses the given file into an AST.
     * @param {File} file The virtual file to parse.
     * @param {MarkdownLanguageContext} context The options to use for parsing.
     * @returns {ParseResult} The result of parsing.
     */
    parse(file: File, context: MarkdownLanguageContext): ParseResult;
    /**
     * Creates a new `MarkdownSourceCode` object from the given information.
     * @param {File} file The virtual file to create a `MarkdownSourceCode` object from.
     * @param {OkParseResult} parseResult The result returned from `parse()`.
     * @returns {MarkdownSourceCode} The new `MarkdownSourceCode` object.
     */
    createSourceCode(file: File, parseResult: OkParseResult): MarkdownSourceCode;
    #private;
}
declare var rules: {
    "fenced-code-language": FencedCodeLanguageRuleDefinition;
    "heading-increment": HeadingIncrementRuleDefinition;
    "no-duplicate-headings": NoDuplicateHeadingsRuleDefinition;
    "no-empty-links": NoEmptyLinksRuleDefinition;
    "no-html": NoHtmlRuleDefinition;
    "no-invalid-label-refs": NoInvalidLabelRuleDefinition;
    "no-missing-label-refs": import("./types.ts").MarkdownRuleDefinition<{
        RuleOptions: [];
    }>;
};
/**
 * Extracts lintable code blocks from Markdown text.
 * @param {string} sourceText The text of the file.
 * @param {string} filename The filename of the file
 * @returns {Array<{ filename: string, text: string }>} Source code blocks to lint.
 */
declare function preprocess(sourceText: string, filename: string): Array<{
    filename: string;
    text: string;
}>;
/**
 * Transforms generated messages for output.
 * @param {Array<Message[]>} messages An array containing one array of messages
 *     for each code block returned from `preprocess`.
 * @param {string} filename The filename of the file
 * @returns {Message[]} A flattened array of messages with mapped locations.
 */
declare function postprocess(messages: Array<Message[]>, filename: string): Message[];
declare const SUPPORTS_AUTOFIX: true;
export { plugin as default };
