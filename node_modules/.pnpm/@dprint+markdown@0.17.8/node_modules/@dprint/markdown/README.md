# @dprint/markdown

npm distribution of [dprint-plugin-markdown](https://github.com/dprint/dprint-plugin-markdown).

Use this with [@dprint/formatter](https://github.com/dprint/js-formatter) or just use @dprint/formatter and download the [dprint-plugin-markdown WASM file](https://github.com/dprint/dprint-plugin-markdown/releases).

## Example

```ts
import { createFromBuffer } from "@dprint/formatter";
import { getPath } from "@dprint/markdown";
import * as fs from "fs";

const buffer = fs.readFileSync(getPath());
const formatter = createFromBuffer(buffer);

console.log(formatter.formatText("test.md", "#   Some Title    "));
```
