// @ts-self-types="./index.d.ts"
import { fromMarkdown } from 'mdast-util-from-markdown';
import { ConfigCommentParser, TextSourceCodeBase, Directive, VisitNodeStep } from '@eslint/plugin-kit';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';

/**
 * @fileoverview Processes Markdown files for consumption by ESLint.
 * @author Brandon Mills
 */


//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.ts").Block} Block */
/** @typedef {import("./types.ts").RangeMap} RangeMap */
/** @typedef {import("mdast").Node} Node */
/** @typedef {import("mdast").Parent} ParentNode */
/** @typedef {import("mdast").Code} CodeNode */
/** @typedef {import("mdast").Html} HtmlNode */
/** @typedef {import("eslint").Linter.LintMessage} Message */
/** @typedef {import("eslint").Rule.Fix} Fix */
/** @typedef {import("eslint").AST.Range} Range */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const UNSATISFIABLE_RULES = new Set([
	"eol-last", // The Markdown parser strips trailing newlines in code fences
	"unicode-bom", // Code blocks will begin in the middle of Markdown files
]);
const SUPPORTS_AUTOFIX = true;

const BOM = "\uFEFF";

/**
 * @type {Map<string, Block[]>}
 */
const blocksCache = new Map();

/**
 * Performs a depth-first traversal of the Markdown AST.
 * @param {Node} node A Markdown AST node.
 * @param {{[key: string]: (node?: Node) => void}} callbacks A map of node types to callbacks.
 * @returns {void}
 */
function traverse(node, callbacks) {
	if (callbacks[node.type]) {
		callbacks[node.type](node);
	} else {
		callbacks["*"]();
	}

	const parent = /** @type {ParentNode} */ (node);

	if (typeof parent.children !== "undefined") {
		for (let i = 0; i < parent.children.length; i++) {
			traverse(parent.children[i], callbacks);
		}
	}
}

/**
 * Extracts `eslint-*` or `global` comments from HTML comments if present.
 * @param {string} html The text content of an HTML AST node.
 * @returns {string} The comment's text without the opening and closing tags or
 *     an empty string if the text is not an ESLint HTML comment.
 */
function getComment(html) {
	const commentStart = "<!--";
	const commentEnd = "-->";
	const regex = /^(eslint\b|global\s)/u;

	if (
		html.slice(0, commentStart.length) !== commentStart ||
		html.slice(-commentEnd.length) !== commentEnd
	) {
		return "";
	}

	const comment = html.slice(commentStart.length, -commentEnd.length);

	if (!regex.test(comment.trim())) {
		return "";
	}

	return comment;
}

// Before a code block, blockquote characters (`>`) are also considered
// "whitespace".
const leadingWhitespaceRegex = /^[>\s]*/u;

/**
 * Gets the offset for the first column of the node's first line in the
 * original source text.
 * @param {Node} node A Markdown code block AST node.
 * @returns {number} The offset for the first column of the node's first line.
 */
function getBeginningOfLineOffset(node) {
	return node.position.start.offset - node.position.start.column + 1;
}

/**
 * Gets the leading text, typically whitespace with possible blockquote chars,
 * used to indent a code block.
 * @param {string} text The text of the file.
 * @param {Node} node A Markdown code block AST node.
 * @returns {string} The text from the start of the first line to the opening
 *     fence of the code block.
 */
function getIndentText(text, node) {
	return leadingWhitespaceRegex.exec(
		text.slice(getBeginningOfLineOffset(node)),
	)[0];
}

/**
 * When applying fixes, the postprocess step needs to know how to map fix ranges
 * from their location in the linted JS to the original offset in the Markdown.
 * Configuration comments and indentation trimming both complicate this process.
 *
 * Configuration comments appear in the linted JS but not in the Markdown code
 * block. Fixes to configuration comments would cause undefined behavior and
 * should be ignored during postprocessing. Fixes to actual code after
 * configuration comments need to be mapped back to the code block after
 * removing any offset due to configuration comments.
 *
 * Fenced code blocks can be indented by up to three spaces at the opening
 * fence. Inside of a list, for example, this indent can be in addition to the
 * indent already required for list item children. Leading whitespace inside
 * indented code blocks is trimmed up to the level of the opening fence and does
 * not appear in the linted code. Further, lines can have less leading
 * whitespace than the opening fence, so not all lines are guaranteed to have
 * the same column offset as the opening fence.
 *
 * The source code of a non-configuration-comment line in the linted JS is a
 * suffix of the corresponding line in the Markdown code block. There are no
 * differences within the line, so the mapping need only provide the offset
 * delta at the beginning of each line.
 * @param {string} text The text of the file.
 * @param {Node} node A Markdown code block AST node.
 * @param {string[]} comments List of configuration comment strings that will be
 *     inserted at the beginning of the code block.
 * @returns {RangeMap[]} A list of offset-based adjustments, where lookups are
 *     done based on the `js` key, which represents the range in the linted JS,
 *     and the `md` key is the offset delta that, when added to the JS range,
 *     returns the corresponding location in the original Markdown source.
 */
function getBlockRangeMap(text, node, comments) {
	/*
	 * The parser sets the fenced code block's start offset to wherever content
	 * should normally begin (typically the first column of the line, but more
	 * inside a list item, for example). The code block's opening fence may be
	 * further indented by up to three characters. If the code block has
	 * additional indenting, the opening fence's first backtick may be up to
	 * three whitespace characters after the start offset.
	 */
	const startOffset = getBeginningOfLineOffset(node);

	/*
	 * Extract the Markdown source to determine the leading whitespace for each
	 * line.
	 */
	const code = text.slice(startOffset, node.position.end.offset);
	const lines = code.split("\n");

	/*
	 * The parser trims leading whitespace from each line of code within the
	 * fenced code block up to the opening fence's first backtick. The first
	 * backtick's column is the AST node's starting column plus any additional
	 * indentation.
	 */
	const baseIndent = getIndentText(text, node).length;

	/*
	 * Track the length of any inserted configuration comments at the beginning
	 * of the linted JS and start the JS offset lookup keys at this index.
	 */
	const commentLength = comments.reduce(
		(len, comment) => len + comment.length + 1,
		0,
	);

	/*
	 * In case there are configuration comments, initialize the map so that the
	 * first lookup index is always 0. If there are no configuration comments,
	 * the lookup index will also be 0, and the lookup should always go to the
	 * last range that matches, skipping this initialization entry.
	 */
	const rangeMap = [
		{
			indent: baseIndent,
			js: 0,
			md: 0,
		},
	];

	// Start the JS offset after any configuration comments.
	let jsOffset = commentLength;

	/*
	 * Start the Markdown offset at the beginning of the block's first line of
	 * actual code. The first line of the block is always the opening fence, so
	 * the code begins on the second line.
	 */
	let mdOffset = startOffset + lines[0].length + 1;

	/*
	 * For each line, determine how much leading whitespace was trimmed due to
	 * indentation. Increase the JS lookup offset by the length of the line
	 * post-trimming and the Markdown offset by the total line length.
	 */
	for (let i = 0; i + 1 < lines.length; i++) {
		const line = lines[i + 1];
		const leadingWhitespaceLength =
			leadingWhitespaceRegex.exec(line)[0].length;

		// The parser trims leading whitespace up to the level of the opening
		// fence, so keep any additional indentation beyond that.
		const trimLength = Math.min(baseIndent, leadingWhitespaceLength);

		rangeMap.push({
			indent: trimLength,
			js: jsOffset,

			// Advance `trimLength` character from the beginning of the Markdown
			// line to the beginning of the equivalent JS line, then compute the
			// delta.
			md: mdOffset + trimLength - jsOffset,
		});

		// Accumulate the current line in the offsets, and don't forget the
		// newline.
		mdOffset += line.length + 1;
		jsOffset += line.length - trimLength + 1;
	}

	return rangeMap;
}

const codeBlockFileNameRegex = /filename=(?<quote>["'])(?<filename>.*?)\1/u;

/**
 * Parses the file name from a block meta, if available.
 * @param {Block} block A code block.
 * @returns {string | null | undefined} The filename, if parsed from block meta.
 */
function fileNameFromMeta(block) {
	return block.meta
		?.match(codeBlockFileNameRegex)
		?.groups.filename.replaceAll(/\s+/gu, "_");
}

const languageToFileExtension = {
	javascript: "js",
	ecmascript: "js",
	typescript: "ts",
	markdown: "md",
};

/**
 * Extracts lintable code blocks from Markdown text.
 * @param {string} sourceText The text of the file.
 * @param {string} filename The filename of the file
 * @returns {Array<{ filename: string, text: string }>} Source code blocks to lint.
 */
function preprocess(sourceText, filename) {
	const text = sourceText.startsWith(BOM) ? sourceText.slice(1) : sourceText;
	const ast = fromMarkdown(text);
	const blocks = [];

	blocksCache.set(filename, blocks);

	/**
	 * During the depth-first traversal, keep track of any sequences of HTML
	 * comment nodes containing `eslint-*` or `global` comments. If a code
	 * block immediately follows such a sequence, insert the comments at the
	 * top of the code block. Any non-ESLint comment or other node type breaks
	 * and empties the sequence.
	 * @type {string[]}
	 */
	let htmlComments = [];

	traverse(ast, {
		"*"() {
			htmlComments = [];
		},

		/**
		 * Visit a code node.
		 * @param {CodeNode} node The visited node.
		 * @returns {void}
		 */
		code(node) {
			if (node.lang) {
				const comments = [];

				for (const comment of htmlComments) {
					if (comment.trim() === "eslint-skip") {
						htmlComments = [];
						return;
					}

					comments.push(`/*${comment}*/`);
				}

				htmlComments = [];

				blocks.push({
					...node,
					baseIndentText: getIndentText(text, node),
					comments,
					rangeMap: getBlockRangeMap(text, node, comments),
				});
			}
		},

		/**
		 * Visit an HTML node.
		 * @param {HtmlNode} node The visited node.
		 * @returns {void}
		 */
		html(node) {
			const comment = getComment(node.value);

			if (comment) {
				htmlComments.push(comment);
			} else {
				htmlComments = [];
			}
		},
	});

	return blocks.map((block, index) => {
		const [language] = block.lang.trim().split(" ");
		const fileExtension = Object.hasOwn(languageToFileExtension, language)
			? languageToFileExtension[language]
			: language;

		return {
			filename: fileNameFromMeta(block) ?? `${index}.${fileExtension}`,
			text: [...block.comments, block.value, ""].join("\n"),
		};
	});
}

/**
 * Adjusts a fix in a code block.
 * @param {Block} block A code block.
 * @param {Fix} fix A fix to adjust.
 * @returns {Fix} The fix with adjusted ranges.
 */
function adjustFix(block, fix) {
	return {
		range: /** @type {Range} */ (
			fix.range.map(range => {
				// Advance through the block's range map to find the last
				// matching range by finding the first range too far and
				// then going back one.
				let i = 1;

				while (
					i < block.rangeMap.length &&
					block.rangeMap[i].js <= range
				) {
					i++;
				}

				// Apply the mapping delta for this range.
				return range + block.rangeMap[i - 1].md;
			})
		),
		text: fix.text.replace(/\n/gu, `\n${block.baseIndentText}`),
	};
}

/**
 * Creates a map function that adjusts messages in a code block.
 * @param {Block} block A code block.
 * @returns {(message: Message) => Message} A function that adjusts messages in a code block.
 */
function adjustBlock(block) {
	const leadingCommentLines = block.comments.reduce(
		(count, comment) => count + comment.split("\n").length,
		0,
	);

	const blockStart = block.position.start.line;

	/**
	 * Adjusts ESLint messages to point to the correct location in the Markdown.
	 * @param {Message} message A message from ESLint.
	 * @returns {Message} The same message, but adjusted to the correct location.
	 */
	return function adjustMessage(message) {
		if (!Number.isInteger(message.line)) {
			return {
				...message,
				line: blockStart,
				column: block.position.start.column,
			};
		}

		const lineInCode = message.line - leadingCommentLines;

		if (lineInCode < 1 || lineInCode >= block.rangeMap.length) {
			return null;
		}

		const out = {
			line: lineInCode + blockStart,
			column: message.column + block.rangeMap[lineInCode].indent,
		};

		if (Number.isInteger(message.endLine)) {
			out.endLine = message.endLine - leadingCommentLines + blockStart;
		}

		if (Array.isArray(message.suggestions)) {
			out.suggestions = message.suggestions.map(suggestion => ({
				...suggestion,
				fix: adjustFix(block, suggestion.fix),
			}));
		}

		const adjustedFix = {};

		if (message.fix) {
			adjustedFix.fix = adjustFix(block, message.fix);
		}

		return { ...message, ...out, ...adjustedFix };
	};
}

/**
 * Excludes unsatisfiable rules from the list of messages.
 * @param {Message} message A message from the linter.
 * @returns {boolean} True if the message should be included in output.
 */
function excludeUnsatisfiableRules(message) {
	return message && !UNSATISFIABLE_RULES.has(message.ruleId);
}

/**
 * Transforms generated messages for output.
 * @param {Array<Message[]>} messages An array containing one array of messages
 *     for each code block returned from `preprocess`.
 * @param {string} filename The filename of the file
 * @returns {Message[]} A flattened array of messages with mapped locations.
 */
function postprocess(messages, filename) {
	const blocks = blocksCache.get(filename);

	blocksCache.delete(filename);

	return messages.flatMap((group, i) => {
		const adjust = adjustBlock(blocks[i]);

		return group.map(adjust).filter(excludeUnsatisfiableRules);
	});
}

const processor = {
	meta: {
		name: "@eslint/markdown/markdown",
		version: "6.4.0", // x-release-please-version
	},
	preprocess,
	postprocess,
	supportsAutofix: SUPPORTS_AUTOFIX,
};

/**
 * @fileoverview Utility Library
 * @author Nicholas C. Zakas
 */

/*
 * CommonMark does not allow any white space between the brackets in a reference link.
 * If that pattern is detected, then it's treated as text and not as a link. This pattern
 * is used to detect that situation.
 */
const illegalShorthandTailPattern = /\]\[\s+\]$/u;

/**
 * Finds the line and column offsets for a given offset in a string.
 * @param {string} text The text to search.
 * @param {number} offset The offset to find.
 * @returns {{lineOffset:number,columnOffset:number}} The location of the offset.
 *      Note that `columnOffset` should be used as an offset to the column number
 *      of the given text in the source code only when `lineOffset` is 0.
 *      Otherwise, it should be used as a 0-based column number in the source code.
 */
function findOffsets(text, offset) {
	let lineOffset = 0;
	let columnOffset = 0;

	for (let i = 0; i < offset; i++) {
		if (text[i] === "\n") {
			lineOffset++;
			columnOffset = 0;
		} else {
			columnOffset++;
		}
	}

	return {
		lineOffset,
		columnOffset,
	};
}

/**
 * @fileoverview The MarkdownSourceCode class.
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

/** @typedef {import("mdast").Root} RootNode */
/** @typedef {import("mdast").Node} MarkdownNode */
/** @typedef {import("mdast").Html} HTMLNode */
/** @typedef {import("@eslint/core").Language} Language */
/** @typedef {import("@eslint/core").File} File */
/** @typedef {import("@eslint/core").TraversalStep} TraversalStep */
/** @typedef {import("@eslint/core").VisitTraversalStep} VisitTraversalStep */
/** @typedef {import("@eslint/core").ParseResult<RootNode>} ParseResult */
/** @typedef {import("@eslint/core").SourceLocation} SourceLocation */
/** @typedef {import("@eslint/core").SourceRange} SourceRange */
/** @typedef {import("@eslint/core").FileProblem} FileProblem */
/** @typedef {import("@eslint/core").DirectiveType} DirectiveType */
/** @typedef {import("@eslint/core").RulesConfig} RulesConfig */
/**
 * @typedef {import("@eslint/core").TextSourceCode<Options>} TextSourceCode<Options>
 * @template {SourceCodeBaseTypeOptions} [Options=SourceCodeBaseTypeOptions]
 */
/** @typedef {import("./types.ts").MarkdownLanguageOptions} MarkdownLanguageOptions */
/** @typedef {import("./types.ts").SourceCodeBaseTypeOptions} SourceCodeBaseTypeOptions */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const commentParser = new ConfigCommentParser();
const configCommentStart =
	/<!--\s*(?:eslint(?:-enable|-disable(?:(?:-next)?-line)?)?)(?:\s|-->)/u;
const htmlComment = /<!--(.*?)-->/gsu;

/**
 * Represents an inline config comment in the source code.
 */
class InlineConfigComment {
	/**
	 * The comment text.
	 * @type {string}
	 */
	value;

	/**
	 * The position of the comment in the source code.
	 * @type {SourceLocation}
	 */
	position;

	/**
	 * Creates a new instance.
	 * @param {Object} options The options for the instance.
	 * @param {string} options.value The comment text.
	 * @param {SourceLocation} options.position The position of the comment in the source code.
	 */
	constructor({ value, position }) {
		this.value = value.trim();
		this.position = position;
	}
}

/**
 * Extracts inline configuration comments from an HTML node.
 * @param {HTMLNode} node The HTML node to extract comments from.
 * @returns {Array<InlineConfigComment>} The inline configuration comments found in the node.
 */
function extractInlineConfigCommentsFromHTML(node) {
	if (!configCommentStart.test(node.value)) {
		return [];
	}
	const comments = [];

	let match;

	while ((match = htmlComment.exec(node.value))) {
		if (configCommentStart.test(match[0])) {
			const comment = match[0];

			// calculate location of the comment inside the node
			const start = {
				...node.position.start,
			};

			const end = {
				...node.position.start,
			};

			const {
				lineOffset: startLineOffset,
				columnOffset: startColumnOffset,
			} = findOffsets(node.value, match.index);

			start.line += startLineOffset;
			start.column += startColumnOffset;
			start.offset += match.index;

			const commentLineCount = comment.split("\n").length - 1;

			end.line = start.line + commentLineCount;
			end.column =
				commentLineCount === 0
					? start.column + comment.length
					: comment.length - comment.lastIndexOf("\n");
			end.offset = start.offset + comment.length;

			comments.push(
				new InlineConfigComment({
					value: match[1].trim(),
					position: {
						start,
						end,
					},
				}),
			);
		}
	}

	return comments;
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Markdown Source Code Object
 * @implements {TextSourceCode<{LangOptions: MarkdownLanguageOptions, RootNode: RootNode, SyntaxElementWithLoc: MarkdownNode, ConfigNode: { value: string; position: SourceLocation }}>}
 */
class MarkdownSourceCode extends TextSourceCodeBase {
	/**
	 * Cached traversal steps.
	 * @type {Array<VisitNodeStep>|undefined}
	 */
	#steps;

	/**
	 * Cache of parent nodes.
	 * @type {WeakMap<MarkdownNode, MarkdownNode>}
	 */
	#parents = new WeakMap();

	/**
	 * Collection of HTML nodes. Used to find directive comments.
	 * @type {Array<HTMLNode>}
	 */
	#htmlNodes = [];

	/**
	 * Collection of inline configuration comments.
	 * @type {Array<InlineConfigComment>}
	 */
	#inlineConfigComments;

	/**
	 * The AST of the source code.
	 * @type {RootNode}
	 */
	ast = undefined;

	/**
	 * Creates a new instance.
	 * @param {Object} options The options for the instance.
	 * @param {string} options.text The source code text.
	 * @param {RootNode} options.ast The root AST node.
	 */
	constructor({ text, ast }) {
		super({ ast, text });
		this.ast = ast;

		// need to traverse the source code to get the inline config nodes
		this.traverse();
	}

	/**
	 * Returns the parent of the given node.
	 * @param {MarkdownNode} node The node to get the parent of.
	 * @returns {MarkdownNode|undefined} The parent of the node.
	 */
	getParent(node) {
		return this.#parents.get(node);
	}

	/**
	 * Returns an array of all inline configuration nodes found in the
	 * source code.
	 * @returns {Array<InlineConfigComment>} An array of all inline configuration nodes.
	 */
	getInlineConfigNodes() {
		if (!this.#inlineConfigComments) {
			this.#inlineConfigComments = this.#htmlNodes.flatMap(
				extractInlineConfigCommentsFromHTML,
			);
		}

		return this.#inlineConfigComments;
	}

	/**
	 * Returns an all directive nodes that enable or disable rules along with any problems
	 * encountered while parsing the directives.
	 * @returns {{problems:Array<FileProblem>,directives:Array<Directive>}} Information
	 *      that ESLint needs to further process the directives.
	 */
	getDisableDirectives() {
		const problems = [];
		const directives = [];

		this.getInlineConfigNodes().forEach(comment => {
			// Step 1: Parse the directive
			const {
				label,
				value,
				justification: justificationPart,
			} = commentParser.parseDirective(comment.value);

			// Step 2: Validate the directive does not span multiple lines
			if (
				label === "eslint-disable-line" &&
				comment.position.start.line !== comment.position.end.line
			) {
				const message = `${label} comment should not span multiple lines.`;

				problems.push({
					ruleId: null,
					message,
					loc: comment.position,
				});
				return;
			}

			// Step 3: Extract the directive value and create the Directive object
			switch (label) {
				case "eslint-disable":
				case "eslint-enable":
				case "eslint-disable-next-line":
				case "eslint-disable-line": {
					const directiveType = label.slice("eslint-".length);

					directives.push(
						new Directive({
							type: /** @type {DirectiveType} */ (directiveType),
							node: comment,
							value,
							justification: justificationPart,
						}),
					);
				}

				// no default
			}
		});

		return { problems, directives };
	}

	/**
	 * Returns inline rule configurations along with any problems
	 * encountered while parsing the configurations.
	 * @returns {{problems:Array<FileProblem>,configs:Array<{config:{rules:RulesConfig},loc:SourceLocation}>}} Information
	 *      that ESLint needs to further process the rule configurations.
	 */
	applyInlineConfig() {
		const problems = [];
		const configs = [];

		this.getInlineConfigNodes().forEach(comment => {
			const { label, value } = commentParser.parseDirective(
				comment.value,
			);

			if (label === "eslint") {
				const parseResult = commentParser.parseJSONLikeConfig(value);

				if (parseResult.ok) {
					configs.push({
						config: {
							rules: parseResult.config,
						},
						loc: comment.position,
					});
				} else {
					problems.push({
						ruleId: null,
						message:
							/** @type {{ok: false, error: { message: string }}} */ (
								parseResult
							).error.message,
						loc: comment.position,
					});
				}
			}
		});

		return {
			configs,
			problems,
		};
	}

	/**
	 * Traverse the source code and return the steps that were taken.
	 * @returns {Iterable<TraversalStep>} The steps that were taken while traversing the source code.
	 */
	traverse() {
		// Because the AST doesn't mutate, we can cache the steps
		if (this.#steps) {
			return this.#steps.values();
		}

		/** @type {Array<VisitNodeStep>} */
		const steps = (this.#steps = []);

		const visit = (node, parent) => {
			// first set the parent
			this.#parents.set(node, parent);

			// then add the step
			steps.push(
				new VisitNodeStep({
					target: node,
					phase: 1,
					args: [node, parent],
				}),
			);

			// save HTML nodes
			if (node.type === "html") {
				this.#htmlNodes.push(node);
			}

			// then visit the children
			if (node.children) {
				node.children.forEach(child => {
					visit(child, node);
				});
			}

			// then add the exit step
			steps.push(
				new VisitNodeStep({
					target: node,
					phase: 2,
					args: [node, parent],
				}),
			);
		};

		visit(this.ast);

		return steps.values();
	}
}

/**
 * @fileoverview Functions to fix up rules to provide missing methods on the `context` object.
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

/** @typedef {import("mdast-util-from-markdown").Options['extensions']} Extensions */
/** @typedef {import("mdast-util-from-markdown").Options['mdastExtensions']} MdastExtensions */
/** @typedef {import("@eslint/core").OkParseResult<RootNode>} OkParseResult */
/** @typedef {import("./types.ts").MarkdownLanguageContext} MarkdownLanguageContext */
/** @typedef {"commonmark"|"gfm"} ParserMode */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Create parser options based on `mode` and `languageOptions`.
 * @param {ParserMode} mode The markdown parser mode.
 * @param {MarkdownLanguageOptions} languageOptions Language options.
 * @returns {{extensions: Extensions, mdastExtensions: MdastExtensions}} Parser options for micromark and mdast
 */
function createParserOptions(mode, languageOptions) {
	/** @type {Extensions} */
	const extensions = [];
	/** @type {MdastExtensions} */
	const mdastExtensions = [];

	// 1. `mode`: Add GFM extensions if mode is "gfm"
	if (mode === "gfm") {
		extensions.push(gfm());
		mdastExtensions.push(gfmFromMarkdown());
	}

	// 2. `languageOptions.frontmatter`: Handle frontmatter options
	const frontmatterOption = languageOptions?.frontmatter;

	// Skip frontmatter entirely if false
	if (frontmatterOption !== false) {
		if (frontmatterOption === "yaml") {
			extensions.push(frontmatter(["yaml"]));
			mdastExtensions.push(frontmatterFromMarkdown(["yaml"]));
		} else if (frontmatterOption === "toml") {
			extensions.push(frontmatter(["toml"]));
			mdastExtensions.push(frontmatterFromMarkdown(["toml"]));
		}
	}

	return {
		extensions,
		mdastExtensions,
	};
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Markdown Language Object
 * @implements {Language}
 */
class MarkdownLanguage {
	/**
	 * The type of file to read.
	 * @type {"text"}
	 */
	fileType = "text";

	/**
	 * The line number at which the parser starts counting.
	 * @type {0|1}
	 */
	lineStart = 1;

	/**
	 * The column number at which the parser starts counting.
	 * @type {0|1}
	 */
	columnStart = 1;

	/**
	 * The name of the key that holds the type of the node.
	 * @type {string}
	 */
	nodeTypeKey = "type";

	/**
	 * Default language options. User-defined options are merged with this object.
	 * @type {MarkdownLanguageOptions}
	 */
	defaultLanguageOptions = {
		frontmatter: false,
	};

	/**
	 * The Markdown parser mode.
	 * @type {ParserMode}
	 */
	#mode = "commonmark";

	/**
	 * Creates a new instance.
	 * @param {Object} options The options to use for this instance.
	 * @param {ParserMode} [options.mode] The Markdown parser mode to use.
	 */
	constructor({ mode } = {}) {
		if (mode) {
			this.#mode = mode;
		}
	}

	/**
	 * Validates the language options.
	 * @param {MarkdownLanguageOptions} languageOptions The language options to validate.
	 * @returns {void}
	 * @throws {Error} When the language options are invalid.
	 */
	validateLanguageOptions(languageOptions) {
		const frontmatterOption = languageOptions?.frontmatter;
		const validFrontmatterOptions = new Set([false, "yaml", "toml"]);

		if (
			frontmatterOption !== undefined &&
			!validFrontmatterOptions.has(frontmatterOption)
		) {
			throw new Error(
				`Invalid language option value \`${frontmatterOption}\` for frontmatter.`,
			);
		}
	}

	/**
	 * Parses the given file into an AST.
	 * @param {File} file The virtual file to parse.
	 * @param {MarkdownLanguageContext} context The options to use for parsing.
	 * @returns {ParseResult} The result of parsing.
	 */
	parse(file, context) {
		// Note: BOM already removed
		const text = /** @type {string} */ (file.body);

		/*
		 * Check for parsing errors first. If there's a parsing error, nothing
		 * else can happen. However, a parsing error does not throw an error
		 * from this method - it's just considered a fatal error message, a
		 * problem that ESLint identified just like any other.
		 */
		try {
			const options = createParserOptions(
				this.#mode,
				context?.languageOptions,
			);
			const root = fromMarkdown(text, options);

			return {
				ok: true,
				ast: root,
			};
		} catch (ex) {
			return {
				ok: false,
				errors: [ex],
			};
		}
	}

	/**
	 * Creates a new `MarkdownSourceCode` object from the given information.
	 * @param {File} file The virtual file to create a `MarkdownSourceCode` object from.
	 * @param {OkParseResult} parseResult The result returned from `parse()`.
	 * @returns {MarkdownSourceCode} The new `MarkdownSourceCode` object.
	 */
	createSourceCode(file, parseResult) {
		return new MarkdownSourceCode({
			text: /** @type {string} */ (file.body),
			ast: parseResult.ast,
		});
	}
}

const rules$1 = /** @type {const} */ ({
    "markdown/fenced-code-language": "error",
    "markdown/heading-increment": "error",
    "markdown/no-empty-links": "error",
    "markdown/no-invalid-label-refs": "error",
    "markdown/no-missing-label-refs": "error"
});

/**
 * @fileoverview Rule to enforce languages for fenced code.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: [{ required?: string[]; }]; }>}
 * FencedCodeLanguageRuleDefinition
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const fencedCodeCharacters = new Set(["`", "~"]);

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {FencedCodeLanguageRuleDefinition} */
var rule0 = {
	meta: {
		type: "problem",

		docs: {
			recommended: true,
			description: "Require languages for fenced code blocks",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/fenced-code-language.md",
		},

		messages: {
			missingLanguage: "Missing code block language.",
			disallowedLanguage:
				'Code block language "{{lang}}" is not allowed.',
		},

		schema: [
			{
				type: "object",
				properties: {
					required: {
						type: "array",
						items: {
							type: "string",
						},
						uniqueItems: true,
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		const required = new Set(context.options[0]?.required);
		const { sourceCode } = context;

		return {
			code(node) {
				if (!node.lang) {
					// only check fenced code blocks
					if (
						!fencedCodeCharacters.has(
							sourceCode.text[node.position.start.offset],
						)
					) {
						return;
					}

					context.report({
						loc: node.position,
						messageId: "missingLanguage",
					});

					return;
				}

				if (required.size && !required.has(node.lang)) {
					context.report({
						loc: node.position,
						messageId: "disallowedLanguage",
						data: {
							lang: node.lang,
						},
					});
				}
			},
		};
	},
};

/**
 * @fileoverview Rule to enforce heading levels increment by one.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: []; }>}
 * HeadingIncrementRuleDefinition
 */

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {HeadingIncrementRuleDefinition} */
var rule1 = {
	meta: {
		type: "problem",

		docs: {
			recommended: true,
			description: "Enforce heading levels increment by one",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/heading-increment.md",
		},

		messages: {
			skippedHeading:
				"Heading level skipped from {{fromLevel}} to {{toLevel}}.",
		},
	},

	create(context) {
		let lastHeadingDepth = 0;

		return {
			heading(node) {
				if (lastHeadingDepth > 0 && node.depth > lastHeadingDepth + 1) {
					context.report({
						loc: node.position,
						messageId: "skippedHeading",
						data: {
							fromLevel: lastHeadingDepth.toString(),
							toLevel: node.depth.toString(),
						},
					});
				}

				lastHeadingDepth = node.depth;
			},
		};
	},
};

/**
 * @fileoverview Rule to prevent duplicate headings in Markdown.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: []; }>}
 * NoDuplicateHeadingsRuleDefinition
 */

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {NoDuplicateHeadingsRuleDefinition} */
var rule2 = {
	meta: {
		type: "problem",

		docs: {
			description: "Disallow duplicate headings in the same document",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/no-duplicate-headings.md",
		},

		messages: {
			duplicateHeading: 'Duplicate heading "{{text}}" found.',
		},
	},

	create(context) {
		const headings = new Set();
		const { sourceCode } = context;

		return {
			heading(node) {
				/*
				 * There are two types of headings in markdown:
				 * - ATX headings, which start with one or more # characters
				 * - Setext headings, which are underlined with = or -
				 * Setext headings are identified by being on two lines instead of one,
				 * with the second line containing only = or - characters. In order to
				 * get the correct heading text, we need to determine which type of
				 * heading we're dealing with.
				 */
				const isSetext =
					node.position.start.line !== node.position.end.line;

				const text = isSetext
					? // get only the text from the first line
						sourceCode.lines[node.position.start.line - 1].trim()
					: // get the text without the leading # characters
						sourceCode
							.getText(node)
							.slice(node.depth + 1)
							.trim();

				if (headings.has(text)) {
					context.report({
						loc: node.position,
						messageId: "duplicateHeading",
						data: {
							text,
						},
					});
				}

				headings.add(text);
			},
		};
	},
};

/**
 * @fileoverview Rule to prevent empty links in Markdown.
 * @author Nicholas C. Zakas
 */
//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: []; }>}
 * NoEmptyLinksRuleDefinition
 */

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {NoEmptyLinksRuleDefinition} */
var rule3 = {
	meta: {
		type: "problem",

		docs: {
			recommended: true,
			description: "Disallow empty links",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/no-empty-links.md",
		},

		messages: {
			emptyLink: "Unexpected empty link found.",
		},
	},

	create(context) {
		return {
			link(node) {
				if (!node.url || node.url === "#") {
					context.report({
						loc: node.position,
						messageId: "emptyLink",
					});
				}
			},
		};
	},
};

/**
 * @fileoverview Rule to disallow HTML inside of content.
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: [{ allowed?: string[]; }]; }>}
 * NoHtmlRuleDefinition
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const htmlTagPattern = /<([a-z0-9]+(?:-[a-z0-9]+)*)/giu;

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {NoHtmlRuleDefinition} */
var rule4 = {
	meta: {
		type: "problem",

		docs: {
			description: "Disallow HTML tags",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/no-html.md",
		},

		messages: {
			disallowedElement: 'HTML element "{{name}}" is not allowed.',
		},

		schema: [
			{
				type: "object",
				properties: {
					allowed: {
						type: "array",
						items: {
							type: "string",
						},
						uniqueItems: true,
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		const allowed = new Set(context.options[0]?.allowed);

		return {
			html(node) {
				let match;

				while ((match = htmlTagPattern.exec(node.value)) !== null) {
					const tagName = match[1];
					const { lineOffset, columnOffset } = findOffsets(
						node.value,
						match.index,
					);
					const start = {
						line: node.position.start.line + lineOffset,
						column: node.position.start.column + columnOffset,
					};
					const end = {
						line: start.line,
						column: start.column + match[0].length + 1,
					};

					if (allowed.size === 0 || !allowed.has(tagName)) {
						context.report({
							loc: { start, end },
							messageId: "disallowedElement",
							data: {
								name: tagName,
							},
						});
					}
				}
			},
		};
	},
};

/**
 * @fileoverview Rule to prevent non-complaint link references.
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("unist").Position} Position */
/** @typedef {import("mdast").Text} TextNode */
/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: []; }>}
 * NoInvalidLabelRuleDefinition
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

// matches i.e., [foo][bar]
const labelPattern = /\]\[([^\]]+)\]/u;

/**
 * Finds missing references in a node.
 * @param {TextNode} node The node to check.
 * @param {string} docText The text of the node.
 * @returns {Array<{label:string,position:Position}>} The missing references.
 */
function findInvalidLabelReferences(node, docText) {
	const invalid = [];
	let startIndex = 0;
	const offset = node.position.start.offset;
	const nodeStartLine = node.position.start.line;
	const nodeStartColumn = node.position.start.column;

	/*
	 * This loop works by searching the string inside the node for the next
	 * label reference. If it finds one, it checks to see if there is any
	 * white space between the [ and ]. If there is, it reports an error.
	 * It then moves the start index to the end of the label reference and
	 * continues searching the text until the end of the text is found.
	 */
	while (startIndex < node.value.length) {
		const value = node.value.slice(startIndex);
		const match = value.match(labelPattern);

		if (!match) {
			break;
		}

		if (!illegalShorthandTailPattern.test(match[0])) {
			startIndex += match.index + match[0].length;
			continue;
		}

		/*
		 * Calculate the match index relative to just the node and
		 * to the entire document text.
		 */
		const nodeMatchIndex = startIndex + match.index;
		const docMatchIndex = offset + nodeMatchIndex;

		/*
		 * Search the entire document text to find the preceding open bracket.
		 */
		const lastOpenBracketIndex = docText.lastIndexOf("[", docMatchIndex);

		if (lastOpenBracketIndex === -1) {
			startIndex += match.index + match[0].length;
			continue;
		}

		/*
		 * Note: `label` can contain leading and trailing newlines, so we need to
		 * take that into account when calculating the line and column offsets.
		 */
		const label = docText
			.slice(lastOpenBracketIndex, docMatchIndex + match[0].length)
			.match(/!?\[([^\]]+)\]/u)[1];

		// find location of [ in the document text
		const { lineOffset: startLineOffset, columnOffset: startColumnOffset } =
			findOffsets(node.value, nodeMatchIndex + 1);

		// find location of [ in the document text
		const { lineOffset: endLineOffset, columnOffset: endColumnOffset } =
			findOffsets(node.value, nodeMatchIndex + match[0].length);

		const startLine = nodeStartLine + startLineOffset;
		const startColumn = nodeStartColumn + startColumnOffset;
		const endLine = nodeStartLine + endLineOffset;
		const endColumn =
			(endLine === startLine ? nodeStartColumn : 0) + endColumnOffset;

		invalid.push({
			label: label.trim(),
			position: {
				start: {
					line: startLine,
					column: startColumn,
				},
				end: {
					line: endLine,
					column: endColumn,
				},
			},
		});

		startIndex += match.index + match[0].length;
	}

	return invalid;
}

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {NoInvalidLabelRuleDefinition} */
var rule5 = {
	meta: {
		type: "problem",

		docs: {
			recommended: true,
			description: "Disallow invalid label references",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/no-invalid-label-refs.md",
		},

		messages: {
			invalidLabelRef:
				"Label reference '{{label}}' is invalid due to white space between [ and ].",
		},
	},

	create(context) {
		const { sourceCode } = context;

		return {
			text(node) {
				const invalidReferences = findInvalidLabelReferences(
					node,
					sourceCode.text,
				);

				for (const invalidReference of invalidReferences) {
					context.report({
						loc: invalidReference.position,
						messageId: "invalidLabelRef",
						data: {
							label: invalidReference.label,
						},
					});
				}
			},
		};
	},
};

/**
 * @fileoverview Rule to prevent missing label references in Markdown.
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<{ RuleOptions: []; }>}
 * NoMissingLabelRuleDefinition
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Finds missing references in a node.
 * @param {TextNode} node The node to check.
 * @param {string} nodeText The text of the node.
 * @returns {Array<{label:string,position:Position}>} The missing references.
 */
function findMissingReferences(node, nodeText) {
	const missing = [];
	const nodeStartLine = node.position.start.line;
	const nodeStartColumn = node.position.start.column;

	/*
	 * Matches substrings like "[foo]", "[]", "[foo][bar]", "[foo][]", "[][bar]", or "[][]".
	 * `left` is the content between the first brackets. It can be empty.
	 * `right` is the content between the second brackets. It can be empty, and it can be undefined.
	 */
	const labelPattern = /\[(?<left>[^\]]*)\](?:\[(?<right>[^\]]*)\])?/dgu;

	let match;

	/*
	 * This loop searches the text inside the node for sequences that
	 * look like label references and reports an error for each one found.
	 */
	while ((match = labelPattern.exec(nodeText))) {
		// skip illegal shorthand tail -- handled by no-invalid-label-refs
		if (illegalShorthandTailPattern.test(match[0])) {
			continue;
		}

		const { left, right } = match.groups;

		// `[][]` or `[]`
		if (!left && !right) {
			continue;
		}

		let label, labelIndices;

		if (right) {
			label = right;
			labelIndices = match.indices.groups.right;
		} else {
			label = left;
			labelIndices = match.indices.groups.left;
		}

		const { lineOffset: startLineOffset, columnOffset: startColumnOffset } =
			findOffsets(nodeText, labelIndices[0]);
		const { lineOffset: endLineOffset, columnOffset: endColumnOffset } =
			findOffsets(nodeText, labelIndices[1]);

		missing.push({
			label: label.trim(),
			position: {
				start: {
					line: nodeStartLine + startLineOffset,
					column:
						startLineOffset > 0
							? startColumnOffset + 1
							: nodeStartColumn + startColumnOffset,
				},
				end: {
					line: nodeStartLine + endLineOffset,
					column:
						endLineOffset > 0
							? endColumnOffset + 1
							: nodeStartColumn + endColumnOffset,
				},
			},
		});
	}

	return missing;
}

//-----------------------------------------------------------------------------
// Rule Definition
//-----------------------------------------------------------------------------

/** @type {NoMissingLabelRuleDefinition} */
var rule6 = {
	meta: {
		type: "problem",

		docs: {
			recommended: true,
			description: "Disallow missing label references",
			url: "https://github.com/eslint/markdown/blob/main/docs/rules/no-missing-label-refs.md",
		},

		messages: {
			notFound: "Label reference '{{label}}' not found.",
		},
	},

	create(context) {
		const { sourceCode } = context;
		let allMissingReferences = [];

		return {
			"root:exit"() {
				for (const missingReference of allMissingReferences) {
					context.report({
						loc: missingReference.position,
						messageId: "notFound",
						data: {
							label: missingReference.label,
						},
					});
				}
			},

			text(node) {
				allMissingReferences.push(
					...findMissingReferences(node, sourceCode.getText(node)),
				);
			},

			definition(node) {
				/*
				 * Sometimes a poorly-formatted link will end up a text node instead of a link node
				 * even though the label definition exists. Here, we remove any missing references
				 * that have a matching label definition.
				 */
				allMissingReferences = allMissingReferences.filter(
					missingReference =>
						missingReference.label !== node.identifier,
				);
			},
		};
	},
};

var rules = {
    "fenced-code-language": rule0,
    "heading-increment": rule1,
    "no-duplicate-headings": rule2,
    "no-empty-links": rule3,
    "no-html": rule4,
    "no-invalid-label-refs": rule5,
    "no-missing-label-refs": rule6,
};

/**
 * @fileoverview Enables the processor for Markdown file extensions.
 * @author Brandon Mills
 */


//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("eslint").Linter.RulesRecord} RulesRecord*/
/** @typedef {import("eslint").Linter.Config} Config*/
/** @typedef {import("eslint").ESLint.Plugin} Plugin */
/**
 * @typedef {import("./types.ts").MarkdownRuleDefinition<Options>} MarkdownRuleDefinition<Options>
 * @template {Partial<import("./types.ts").MarkdownRuleDefinitionTypeOptions>} [Options={}]
 */
/** @typedef {MarkdownRuleDefinition} RuleModule */
/** @typedef {import("./types.ts").MarkdownRuleVisitor} MarkdownRuleVisitor */

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/** @type {RulesRecord} */
const processorRulesConfig = {
	// The Markdown parser automatically trims trailing
	// newlines from code blocks.
	"eol-last": "off",

	// In code snippets and examples, these rules are often
	// counterproductive to clarity and brevity.
	"no-undef": "off",
	"no-unused-expressions": "off",
	"no-unused-vars": "off",
	"padded-blocks": "off",

	// Adding a "use strict" directive at the top of every
	// code block is tedious and distracting. The config
	// opts into strict mode parsing without the directive.
	strict: "off",

	// The processor will not receive a Unicode Byte Order
	// Mark from the Markdown parser.
	"unicode-bom": "off",
};

let recommendedPlugins, processorPlugins;

const plugin = {
	meta: {
		name: "@eslint/markdown",
		version: "6.4.0", // x-release-please-version
	},
	processors: {
		markdown: processor,
	},
	languages: {
		commonmark: new MarkdownLanguage({ mode: "commonmark" }),
		gfm: new MarkdownLanguage({ mode: "gfm" }),
	},
	rules,
	configs: {
		"recommended-legacy": {
			plugins: ["markdown"],
			overrides: [
				{
					files: ["*.md"],
					processor: "markdown/markdown",
				},
				{
					files: ["**/*.md/**"],
					parserOptions: {
						ecmaFeatures: {
							// Adding a "use strict" directive at the top of
							// every code block is tedious and distracting, so
							// opt into strict mode parsing without the
							// directive.
							impliedStrict: true,
						},
					},
					rules: {
						...processorRulesConfig,
					},
				},
			],
		},
		recommended: [
			{
				name: "markdown/recommended",
				files: ["**/*.md"],
				language: "markdown/commonmark",
				plugins: (recommendedPlugins = {}),
				rules: rules$1,
			},
		],
		processor: [
			{
				name: "markdown/recommended/plugin",
				plugins: (processorPlugins = {}),
			},
			{
				name: "markdown/recommended/processor",
				files: ["**/*.md"],
				processor: "markdown/markdown",
			},
			{
				name: "markdown/recommended/code-blocks",
				files: ["**/*.md/**"],
				languageOptions: {
					parserOptions: {
						ecmaFeatures: {
							// Adding a "use strict" directive at the top of
							// every code block is tedious and distracting, so
							// opt into strict mode parsing without the
							// directive.
							impliedStrict: true,
						},
					},
				},
				rules: {
					...processorRulesConfig,
				},
			},
		],
	},
};

// @ts-expect-error
recommendedPlugins.markdown = processorPlugins.markdown = plugin;

export { MarkdownSourceCode, plugin as default };
