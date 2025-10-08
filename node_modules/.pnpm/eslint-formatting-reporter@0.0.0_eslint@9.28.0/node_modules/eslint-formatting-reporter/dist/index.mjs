import { generateDifferences, showInvisibles } from 'prettier-linter-helpers';

const { INSERT, DELETE, REPLACE } = generateDifferences;
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
      deleteText: showInvisibles(deleteText),
      insertText: showInvisibles(insertText)
    },
    loc: { start, end },
    fix: (fixer) => fixer.replaceTextRange(range, insertText)
  });
}
function reportDifferences(context, source, formatted, offset = 0) {
  if (source !== formatted) {
    const differences = generateDifferences(source, formatted);
    for (const difference of differences)
      _reportDifference(context, difference, offset);
  }
}

export { messages, reportDifferences };
