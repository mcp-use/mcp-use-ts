# Filesystem MCP Server

A filesystem MCP server created with `create-mcp-app` that provides file and directory operations.

## Features

- **📁 Directory Listing**: List files and directories
- **📄 File Reading**: Read file contents
- **ℹ️ File Information**: Get detailed file stats
- **🎯 File Templates**: Access files by template

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Production

```bash
# Build the server
npm run build

# Run the built server
npm start
```

## Available Tools

### `read-file`
Read the contents of a file.

**Parameters:**
- `path` (string, required): Path to the file to read

**Example:**
```json
{
  "path": "README.md"
}
```

### `list-directory`
List files and directories in a path.

**Parameters:**
- `path` (string, required): Directory path to list
- `include-hidden` (boolean, optional): Include hidden files

**Example:**
```json
{
  "path": "./src",
  "include-hidden": false
}
```

### `file-info`
Get detailed information about a file or directory.

**Parameters:**
- `path` (string, required): Path to the file or directory

**Example:**
```json
{
  "path": "package.json"
}
```

## Available Resources

### `fs://current`
Lists the contents of the current directory.

## Available Templates

### `file://{filename}`
Template for accessing files by name.

**Example:** `file://README.md` will read the README.md file.

## Security Considerations

⚠️ **Important**: This server provides full filesystem access. In production:

1. **Restrict access** to specific directories
2. **Validate paths** to prevent directory traversal attacks
3. **Set appropriate permissions** for the server process
4. **Use authentication** if exposing over network

## Customization

Edit `src/server.ts` to customize the filesystem operations:

```typescript
// Add path validation
const validatePath = (path: string) => {
  const resolved = resolve(path)
  const allowedDir = resolve('./allowed-directory')
  return resolved.startsWith(allowedDir)
}

// Add custom file operations
mcp.tool({
  name: 'search-files',
  description: 'Search for files by pattern',
  inputs: [
    { name: 'pattern', type: 'string', required: true },
    { name: 'directory', type: 'string', required: true }
  ],
  fn: async ({ pattern, directory }) => {
    // Implement file search logic
  }
})
```

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io)
- [mcp-use Documentation](https://docs.mcp-use.io)
- [Node.js File System API](https://nodejs.org/api/fs.html)
