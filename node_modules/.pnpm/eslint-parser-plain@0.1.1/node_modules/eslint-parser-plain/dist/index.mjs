const name = "eslint-parser-plain";
const version = "0.1.1";

const parseForESLint = (code) => ({
  ast: {
    type: "Program",
    loc: { start: 0, end: code.length },
    range: [0, code.length],
    body: [],
    comments: [],
    tokens: []
  },
  services: { isPlain: true },
  scopeManager: null,
  visitorKeys: {
    Program: []
  }
});
const meta = {
  name: name,
  version: version
};

export { meta, parseForESLint };
