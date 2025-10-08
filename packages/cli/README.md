# @mcp-use/cli

Build tool for MCP UI widgets.

## Install

```bash
npm install -g @mcp-use/cli
```

## Usage

```bash
mcp-use build [-p <project-path>]
```

Bundles all `.tsx` files from `resources/` into standalone HTML pages in `dist/resources/mcp-use/widgets/`.

Each widget gets:
- Hashed bundle for caching
- Standalone HTML file
- All dependencies bundled

## Example

```bash
# Build widgets in current directory
mcp-use build

# Build widgets in specific path
mcp-use build -p ./my-app
```

## Project Structure

```
my-app/
├── resources/
│   ├── todo-list.tsx
│   └── kanban-board.tsx
└── dist/
    └── resources/
        └── mcp-use/
            └── widgets/
                ├── todo-list/
                │   ├── index.html
                │   └── assets/
                └── kanban-board/
                    ├── index.html
                    └── assets/
```

