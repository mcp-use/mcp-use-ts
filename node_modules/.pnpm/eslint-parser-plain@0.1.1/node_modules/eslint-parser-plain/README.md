# eslint-parser-plain

[![NPM version](https://img.shields.io/npm/v/eslint-parser-plain?color=a1b858&label=)](https://www.npmjs.com/package/eslint-parser-plain)

Allow you to parse various types of files with ESLint.

## 📦 Installation

```bash
$ npm install eslint-parser-plain -D
$ yarn add eslint-parser-plain -D
$ pnpm add eslint-parser-plain -D
```

## 🚀 Usage

In your eslint config file:

```ts
module.exports = {
  overrides: [
    {
      files: ["*.md"],
      parser: "eslint-parser-plain",
      rules: {
        "prettier/prettier": ["error", { parser: "markdown" }],
      },
    },
  ],
};
```

That's it!

## 📝 License

[MIT](./LICENSE). Made with ❤️ by [Ray](https://github.com/so1ve)
