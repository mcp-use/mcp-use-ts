# eslint-formatting-reporter

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Report differences between the formatted and unformatted code for ESLint. Useful to create ESLint plugins that format plain code.

A thin wrapper around [prettier-linter-helpers](https://github.com/prettier/prettier-linter-helpers), extracted from [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier).

## Usage

```ts
import { messages, reportDifferences } from 'eslint-formatting-reporter'
import type { Rule } from 'eslint'

// New ESLint Rule
export default <Rule.RuleModule>{
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    messages
  },
  create(context) {
    return {
      Program() {
        const source = context.source.text
        const formatted = myFormat(source)

        reportDifferences(context, source, formatted)
      }
    }
  }
}
```

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2023-PRESENT [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/eslint-formatting-reporter?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/eslint-formatting-reporter
[npm-downloads-src]: https://img.shields.io/npm/dm/eslint-formatting-reporter?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/eslint-formatting-reporter
[bundle-src]: https://img.shields.io/bundlephobia/minzip/eslint-formatting-reporter?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=eslint-formatting-reporter
[license-src]: https://img.shields.io/github/license/antfu/eslint-formatting-reporter.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/eslint-formatting-reporter/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/eslint-formatting-reporter
