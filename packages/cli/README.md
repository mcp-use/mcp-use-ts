# @mcp-use/cli

Build and development tool for MCP servers with UI widgets.

## Install

```bash
npm install -g @mcp-use/cli
# or
yarn global add @mcp-use/cli
# or
pnpm add -g @mcp-use/cli
```

## Usage

### Development Mode

```bash
mcp-use dev [options]
```

Runs development server with:
- TypeScript compilation in watch mode
- Widget build in watch mode  
- Server with auto-reload (via tsx)
- **Auto-opens inspector in browser** when ready

Options:
- `-p, --path <path>` - Project directory (default: current directory)
- `--port <port>` - Server port (default: 3000)
- `--no-open` - Don't auto-open inspector

### Production Build

```bash
mcp-use build [options]
```

Builds TypeScript and bundles all `.tsx` files from `resources/` into standalone HTML pages.

Options:
- `-p, --path <path>` - Project directory (default: current directory)

Each widget gets:
- Hashed bundle for caching
- Standalone HTML file
- All dependencies bundled

### Production Start

```bash
mcp-use start [options]
```

Starts the production server from built files.

Options:
- `-p, --path <path>` - Project directory (default: current directory)
- `--port <port>` - Server port (default: 3000)

## Examples

```bash
# Start development with auto-reload and inspector
mcp-use dev

# Development on custom port
mcp-use dev --port 8080

# Development without auto-opening inspector
mcp-use dev --no-open

# Build for production
mcp-use build

# Start production server
mcp-use start

# All commands support custom project path
mcp-use dev -p ./my-app
mcp-use build -p ./my-app
mcp-use start -p ./my-app
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

