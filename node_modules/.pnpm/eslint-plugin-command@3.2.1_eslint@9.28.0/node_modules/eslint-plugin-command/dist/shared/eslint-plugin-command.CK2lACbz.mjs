import { u as builtinCommands } from './eslint-plugin-command.Csb1T2TS.mjs';

const version = "3.2.1";

const SKIP = Symbol("skip");
const STOP = Symbol("stop");
function traverse(context, node, visitor) {
  const allVisitorKeys = context.sourceCode.visitorKeys;
  const queue = [];
  queue.push({
    node,
    parent: null,
    parentKey: null,
    parentPath: null
  });
  while (queue.length) {
    const currentPath = queue.shift();
    const result = visitor(currentPath, { SKIP, STOP });
    if (result === STOP)
      return false;
    if (result === SKIP)
      continue;
    const visitorKeys = allVisitorKeys[currentPath.node.type];
    if (!visitorKeys)
      continue;
    for (const visitorKey of visitorKeys) {
      const child = currentPath.node[visitorKey];
      if (!child) {
        continue;
      } else if (Array.isArray(child)) {
        for (const item of child) {
          queue.push({
            node: item,
            parent: currentPath.node,
            parentKey: visitorKey,
            parentPath: currentPath
          });
        }
      } else {
        queue.push({
          node: child,
          parent: currentPath.node,
          parentKey: visitorKey,
          parentPath: currentPath
        });
      }
    }
  }
  return true;
}

class CommandContext {
  /**
   * The ESLint RuleContext
   */
  context;
  /**
   * The comment node that triggered the command
   */
  comment;
  /**
   * Command that triggered the context
   */
  command;
  /**
   * Alias for `this.context.sourceCode`
   */
  source;
  /**
   * Regexp matches
   */
  matches;
  constructor(context, comment, command, matches) {
    this.context = context;
    this.comment = comment;
    this.command = command;
    this.source = context.sourceCode;
    this.matches = matches;
  }
  /**
   * A shorthand of `this.context.sourceCode.getText(node)`
   *
   * When `node` is `null` or `undefined`, it returns an empty string
   */
  getTextOf(node) {
    if (!node)
      return "";
    if (Array.isArray(node))
      return this.context.sourceCode.text.slice(node[0], node[1]);
    return this.context.sourceCode.getText(node);
  }
  /**
   * Report an ESLint error on the triggering comment, without fix
   */
  reportError(message, ...causes) {
    this.context.report({
      loc: this.comment.loc,
      messageId: "command-error",
      data: {
        command: this.command.name,
        message
      }
    });
    for (const cause of causes) {
      const { message: message2, ...pos } = cause;
      this.context.report(
        {
          ...pos,
          messageId: "command-error-cause",
          data: {
            command: this.command.name,
            message: message2
          }
        }
      );
    }
  }
  /**
   * Report an ESLint error.
   * Different from normal `context.report` as that it requires `message` instead of `messageId`.
   */
  report(descriptor) {
    const { message, ...report } = descriptor;
    const { comment, source } = this;
    if (report.nodes) {
      report.loc ||= {
        start: report.nodes[0].loc.start,
        end: report.nodes[report.nodes.length - 1].loc.end
      };
    }
    this.context.report({
      ...report,
      messageId: "command-fix",
      data: {
        command: this.command.name,
        message,
        ...report.data
      },
      *fix(fixer) {
        if (report.fix) {
          const result = report.fix(fixer);
          if (result && "next" in result) {
            for (const fix of result)
              yield fix;
          } else if (result) {
            yield result;
          }
        }
        if (report.removeComment !== false) {
          const lastToken = source.getTokenBefore(
            comment,
            { includeComments: true }
          )?.range[1];
          let rangeStart = source.getIndexFromLoc({
            line: comment.loc.start.line,
            column: 0
          }) - 1;
          if (lastToken != null)
            rangeStart = Math.max(0, lastToken, rangeStart);
          let rangeEnd = comment.range[1];
          if (comment.loc.start.line === 1) {
            if (source.text[rangeEnd] === "\n")
              rangeEnd += 1;
          }
          yield fixer.removeRange([rangeStart, rangeEnd]);
        }
      }
    });
  }
  /**
   * Utility to traverse the AST starting from a node
   */
  traverse(node, cb) {
    return traverse(this.context, node, cb);
  }
  // Implementation
  findNodeBelow(...args) {
    let options;
    if (typeof args[0] === "string")
      options = { types: args };
    else if (typeof args[0] === "function")
      options = { filter: args[0] };
    else
      options = args[0];
    const {
      shallow = false,
      findAll = false
    } = options;
    const tokenBelow = this.context.sourceCode.getTokenAfter(this.comment);
    if (!tokenBelow)
      return;
    const nodeBelow = this.context.sourceCode.getNodeByRangeIndex(tokenBelow.range[1]);
    if (!nodeBelow)
      return;
    const result = [];
    let target = nodeBelow;
    while (target.parent && target.parent.loc.start.line === nodeBelow.loc.start.line)
      target = target.parent;
    const filter = options.filter ? options.filter : (node) => options.types.includes(node.type);
    this.traverse(target, (path) => {
      if (path.node.loc.start.line !== nodeBelow.loc.start.line)
        return STOP;
      if (filter(path.node)) {
        result.push(path.node);
        if (!findAll)
          return STOP;
        if (shallow)
          return SKIP;
      }
    });
    return findAll ? result : result[0];
  }
  /**
   * Get the parent block of the triggering comment
   */
  getParentBlock() {
    const node = this.source.getNodeByRangeIndex(this.comment.range[0]);
    if (node?.type === "BlockStatement") {
      if (this.source.getCommentsInside(node).includes(this.comment))
        return node;
    }
    if (node)
      console.warn(`Expected BlockStatement, got ${node.type}. This is probably an internal bug.`);
    return this.source.ast;
  }
  /**
   * Get indent string of a specific line
   */
  getIndentOfLine(line) {
    const lineStr = this.source.getLines()[line - 1] || "";
    const match = lineStr.match(/^\s*/);
    return match ? match[0] : "";
  }
}

function RuleCreator(urlCreator) {
  return function createNamedRule({
    name,
    meta,
    ...rule
  }) {
    return createRule({
      meta: {
        ...meta,
        docs: {
          ...meta.docs,
          url: urlCreator(name)
        }
      },
      ...rule
    });
  };
}
function createRule({
  create,
  defaultOptions,
  meta
}) {
  return {
    create: (context) => {
      const optionsWithDefault = context.options.map((options, index) => {
        return {
          ...defaultOptions[index] || {},
          ...options || {}
        };
      });
      return create(context, optionsWithDefault);
    },
    defaultOptions,
    meta
  };
}
const createEslintRule = RuleCreator(
  () => "https://github.com/antfu/eslint-plugin-command"
);

function createRuleWithCommands(commands) {
  return createEslintRule({
    name: "command",
    meta: {
      type: "problem",
      docs: {
        description: "Comment-as-command for one-off codemod with ESLint"
      },
      fixable: "code",
      schema: [],
      messages: {
        "command-error": "[{{command}}] error: {{message}}",
        "command-error-cause": "[{{command}}] error cause: {{message}}",
        "command-fix": "[{{command}}] fix: {{message}}"
      }
    },
    defaultOptions: [],
    create: (context) => {
      const sc = context.sourceCode;
      const comments = sc.getAllComments();
      for (const comment of comments) {
        const commandRaw = comment.value;
        for (const command of commands) {
          const type = command.commentType ?? "line";
          if (type === "line" && comment.type !== "Line")
            continue;
          if (type === "block" && comment.type !== "Block")
            continue;
          let matches = typeof command.match === "function" ? command.match(comment) : commandRaw.match(command.match);
          if (!matches)
            continue;
          if (matches === true)
            matches = "__dummy__".match("__dummy__");
          const result = command.action(new CommandContext(context, comment, command, matches));
          if (result !== false)
            break;
        }
      }
      return {};
    }
  });
}
const BuiltinRules = /* @__PURE__ */ createRuleWithCommands(builtinCommands);

function createPluginWithCommands(options = {}) {
  const {
    name = "command"
  } = options;
  const plugin = options.commands ? createRuleWithCommands(options.commands) : BuiltinRules;
  return {
    meta: {
      name,
      version
    },
    rules: {
      command: plugin
    }
  };
}

const defaultPlugin = createPluginWithCommands();

export { createPluginWithCommands as c, defaultPlugin as d };
