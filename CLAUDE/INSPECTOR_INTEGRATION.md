# MCP Inspector Integration

## Overview

The MCP Inspector is now automatically mounted at `/inspector` for all MCP servers created with `createMCPServer`, similar to how FastAPI provides automatic Swagger documentation at `/docs`.

## Key Changes

### 1. Inspector Package (`@mcp-use/inspector`)

- **New Middleware Function**: Created `mountInspector()` function that can mount the inspector UI on any Express app
- **Package Configuration**: 
  - Added `main` and `exports` fields to make it importable
  - Added Express as a peer dependency
  - Built server components are available in `dist/server/`

### 2. MCP Server (`mcp-use`)

- **Automatic Mounting**: Modified `createMCPServer()` to automatically mount the inspector at `/inspector`
- **Optional Dependency**: Added `@mcp-use/inspector` as an optional peer dependency
- **Graceful Degradation**: Server works fine if inspector package is not installed

### 3. Templates (`create-mcp-use-app`)

- **Automatic Setup**: All new projects created with `create-mcp-use-app` include `@mcp-use/inspector` as a dependency
- **No Manual Configuration**: Developers don't need to manually call `mountInspector()` anymore
- **Console Message**: Server startup logs include the inspector URL

## Usage

### For New Projects

When developers create a new MCP server:

```typescript
import { createMCPServer } from 'mcp-use/server'

const server = createMCPServer('my-server', {
  version: '1.0.0',
  description: 'My awesome MCP server'
})

// Define tools, resources, prompts...

server.listen(3000)
// Inspector automatically available at http://localhost:3000/inspector
```

### For Existing Projects

1. Install the inspector package:
   ```bash
   pnpm add @mcp-use/inspector
   ```

2. Build the inspector:
   ```bash
   cd packages/inspector && pnpm build
   ```

3. The inspector will automatically be available at `/inspector` when you start your server

### Manual Mounting (Advanced)

If you need custom mounting:

```typescript
import { mountInspector } from '@mcp-use/inspector'

// Mount at custom path
mountInspector(server, '/my-custom-path')
```

## Implementation Details

### How It Works

1. When `createMCPServer()` is called, it attempts to dynamically import `@mcp-use/inspector`
2. If the package is installed, `mountInspector()` is called automatically with the Express app instance
3. The inspector middleware:
   - Serves the built React UI from `dist/client/`
   - Handles static assets (JS, CSS)
   - Serves the HTML for all inspector routes (client-side routing)

### Workspace Setup

For local development in the monorepo:

```json
{
  "dependencies": {
    "@mcp-use/inspector": "workspace:*"
  }
}
```

For published packages:

```json
{
  "dependencies": {
    "@mcp-use/inspector": "^0.1.0"
  }
}
```

## Benefits

1. **Zero Configuration**: Works out of the box, just like FastAPI's `/docs`
2. **Developer Experience**: Instant visual debugging and testing of MCP servers
3. **Optional**: Doesn't break existing servers if inspector is not installed
4. **Consistent**: All MCP servers have the same inspector experience

## Files Modified

- `packages/inspector/src/server/middleware.ts` - New middleware function
- `packages/inspector/src/server/index.ts` - Export mountInspector
- `packages/inspector/package.json` - Added exports and peer dependencies
- `packages/inspector/tsconfig.server.json` - Fixed TypeScript config
- `packages/mcp-use/src/server/mcp-server.ts` - Auto-mount inspector
- `packages/mcp-use/package.json` - Added inspector as optional peer dependency
- `packages/create-mcp-use-app/src/templates/ui/package.json` - Added inspector dependency
- `packages/create-mcp-use-app/src/templates/ui/src/server.ts` - Updated comments

