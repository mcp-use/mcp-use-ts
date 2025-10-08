'use strict';

const prettierLinterHelpers = require('prettier-linter-helpers');

const { INSERT, DELETE, REPLACE } = prettierLinterHelpers.generateDifferences;
const messages = {
  [INSERT]: "Insert `{{ insertText }}`",
  [DELETE]: "Delete `{{ deleteText }}`",
  [REPLACE]: "Replace `{{ deleteText }}` with `{{ insertText }}`"
};
function _reportDifference(context, difference, rangeOffset = 0) {
  const { operation, offset, deleteText = "", insertText = "" } = difference;
  const range = [
    offset + rangeOffset,
    offset + rangeOffset + deleteText.length
  ];
  const [start, end] = range.map((index) => context.sourceCode.getLocFromIndex(index));
  context.report({
    messageId: operation,
    data: {
      deleteText: prettierLinterHelpers.showInvisibles(deleteText),
      insertText: prettierLinterHelpers.showInvisibles(insertText)
    },
    loc: { start, end },
    fix: (fixer) => fixer.replaceTextRange(range, insertText)
  });
}
function reportDifferences(context, source, formatted, offset = 0) {
  if (source !== formatted) {
    const differences = prettierLinterHelpers.generateDifferences(source, formatted);
    for (const difference of differences)
      _reportDifference(context, difference, offset);
  }
}

exports.messages = messages;
exports.reportDifferences = reportDifferences;
