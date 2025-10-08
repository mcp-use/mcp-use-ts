# My MCP Server

A simple MCP server created with `create-mcp-app`.

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

## Features

- **Resource**: `info://server` - Server information
- **Tool**: `echo` - Echo back messages
- **Prompt**: `greeting` - Generate personalized greetings

## Customization

Edit `src/server.ts` to add your own resources, tools, and prompts:

```typescript
// Add a new resource
mcp.resource({
  uri: 'my://resource',
  name: 'My Resource',
  fn: async () => 'Resource content'
})

// Add a new tool
mcp.tool({
  name: 'my-tool',
  inputs: [{ name: 'input', type: 'string', required: true }],
  fn: async ({ input }) => `Processed: ${input}`
})

// Add a new prompt
mcp.prompt({
  name: 'my-prompt',
  args: [{ name: 'topic', type: 'string', required: true }],
  fn: async ({ topic }) => `Generate content about ${topic}`
})
```

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io)
- [mcp-use Documentation](https://docs.mcp-use.io)
- [Examples](https://github.com/mcp-use/mcp-use-ts/tree/main/examples)
