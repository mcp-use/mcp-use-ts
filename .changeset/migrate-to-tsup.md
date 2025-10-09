---
"mcp-use": patch
"@mcp-use/cli": patch
"@mcp-use/inspector": patch
"create-mcp-use-app": patch
---

Migrated build system from tsc to tsup for faster builds (10-100x improvement) with dual CJS/ESM output support. This is an internal change that improves build performance without affecting the public API.

