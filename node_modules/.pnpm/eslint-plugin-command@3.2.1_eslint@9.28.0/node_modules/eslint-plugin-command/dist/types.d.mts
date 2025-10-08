import { TSESTree, TSESLint } from '@typescript-eslint/utils';
export { TSESLint as Linter, TSESTree as Tree } from '@typescript-eslint/utils';

interface TraversePath {
    node: TSESTree.Node;
    parent: TSESTree.Node | null;
    parentKey: string | null;
    parentPath: TraversePath | null;
}
type TraverseVisitor = (path: TraversePath, symbols: {
    SKIP: symbol;
    STOP: symbol;
}) => symbol | void;

declare class CommandContext {
    /**
     * The ESLint RuleContext
     */
    readonly context: TSESLint.RuleContext<MessageIds, RuleOptions>;
    /**
     * The comment node that triggered the command
     */
    readonly comment: TSESTree.Comment;
    /**
     * Command that triggered the context
     */
    readonly command: Command;
    /**
     * Alias for `this.context.sourceCode`
     */
    readonly source: TSESLint.SourceCode;
    /**
     * Regexp matches
     */
    readonly matches: RegExpMatchArray;
    constructor(context: TSESLint.RuleContext<MessageIds, RuleOptions>, comment: TSESTree.Comment, command: Command, matches: RegExpMatchArray);
    /**
     * A shorthand of `this.context.sourceCode.getText(node)`
     *
     * When `node` is `null` or `undefined`, it returns an empty string
     */
    getTextOf(node?: TSESTree.Node | TSESTree.Token | TSESTree.Range | null): string;
    /**
     * Report an ESLint error on the triggering comment, without fix
     */
    reportError(message: string, ...causes: CommandReportErrorCauseDescriptor[]): void;
    /**
     * Report an ESLint error.
     * Different from normal `context.report` as that it requires `message` instead of `messageId`.
     */
    report(descriptor: CommandReportDescriptor): void;
    /**
     * Utility to traverse the AST starting from a node
     */
    traverse(node: TSESTree.Node, cb: TraverseVisitor): boolean;
    /**
     * Find specific node within the line below the comment
     *
     * Override 1: Find the fist node of a specific type with rest parameters
     */
    findNodeBelow<T extends TSESTree.Node['type']>(...keys: (T | `${T}`)[]): Extract<TSESTree.Node, {
        type: T;
    }> | undefined;
    /**
     * Find specific node within the line below the comment
     *
     * Override 2: Find the first matched node with a custom filter function
     */
    findNodeBelow(filter: ((node: TSESTree.Node) => boolean)): TSESTree.Node | undefined;
    /**
     * Find specific node within the line below the comment
     *
     * Override 3: Find all match with full options (returns an array)
     */
    findNodeBelow<T extends TSESTree.Node['type']>(options: FindNodeOptions<T, true>): Extract<TSESTree.Node, {
        type: T;
    }>[] | undefined;
    /**
     * Find specific node within the line below the comment
     *
     * Override 4: Find one match with full options
     */
    findNodeBelow<T extends TSESTree.Node['type']>(options: FindNodeOptions<T>): Extract<TSESTree.Node, {
        type: T;
    }> | undefined;
    /**
     * Get the parent block of the triggering comment
     */
    getParentBlock(): TSESTree.BlockStatement | TSESTree.Program;
    /**
     * Get indent string of a specific line
     */
    getIndentOfLine(line: number): string;
}

type NodeType = `${TSESTree.Node['type']}`;
type RuleOptions = [];
type MessageIds = 'command-error' | 'command-error-cause' | 'command-fix';
interface Command {
    /**
     * The name of the command
     * Used to identify the command in reported errors
     */
    name: string;
    /**
     * RegExp to match the comment, without the leading `//` or `/*`
     */
    match: RegExp | ((comment: TSESTree.Comment) => RegExpMatchArray | boolean | undefined | null);
    /**
     * The type of the comment. By default commands are only matched with line comments.
     *
     * - `line` - `//`
     * - `block` - `/*`
     *
     * @default 'line'
     */
    commentType?: 'line' | 'block' | 'both';
    /**
     * Main action of the command.
     *
     * Return `false` for "no-change", and forward to the next commands.
     *
     * @param ctx The context of the command (per-file, per matched comment)
     */
    action: (ctx: CommandContext) => false | void;
}
interface ESLintPluginCommandOptions {
    /**
     * Name of the plugin
     * @default 'command'
     */
    name?: string;
    /**
     * Custom commands to use
     * If not provided, all the built-in commands will be used
     */
    commands?: Command[];
}
type CommandReportDescriptor = Partial<TSESLint.ReportDescriptor<MessageIds>> & {
    nodes?: TSESTree.Node[];
    /**
     * Remove the command comment on fix
     *
     * @default true
     */
    removeComment?: boolean;
    /**
     * Message of the report
     */
    message: string;
};
type CommandReportErrorCauseDescriptor = {
    /**
     * An override of the location of the report
     */
    loc: Readonly<TSESTree.Position> | Readonly<TSESTree.SourceLocation>;
    /**
     * Reason of the cause
     */
    message: string;
} | {
    /**
     * The Node or AST Token which the report is being attached to
     */
    node: TSESTree.Node | TSESTree.Token;
    /**
     * An override of the location of the report
     */
    loc?: Readonly<TSESTree.Position> | Readonly<TSESTree.SourceLocation>;
    /**
     * Reason of the cause
     */
    message: string;
};
declare function defineCommand(command: Command): Command;
interface FindNodeOptions<Keys extends TSESTree.Node['type'], All extends boolean | undefined = false> {
    /**
     * The type of the node to search for
     */
    types?: (Keys | `${Keys}`)[];
    /**
     * Whether to search only the direct children of the node
     */
    shallow?: boolean;
    /**
     * Return the first node found, or an array of all matches
     */
    findAll?: All;
    /**
     * Custom filter function to further filter the nodes
     *
     * `types` is ignored when `filter` is provided
     */
    filter?: (node: TSESTree.Node) => boolean;
}

export { type Command, CommandContext, type CommandReportDescriptor, type CommandReportErrorCauseDescriptor, type ESLintPluginCommandOptions, type FindNodeOptions, type MessageIds, type NodeType, type RuleOptions, defineCommand };
