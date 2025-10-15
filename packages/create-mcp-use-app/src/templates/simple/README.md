# Simple MCP Server

A simple MCP (Model Context Protocol) server with basic calculator tools.

## Features

- **add_numbers**: Add two numbers together

## Getting Started

### Development

Start the development server with hot reloading:

```bash
npm run dev
```

The server will start on `http://localhost:3000` with:
- MCP endpoint at `/mcp`
- Inspector UI at `/inspector`

### Production

Build and start the production server:

```bash
npm run build
npm start
```

## Using the Server

### With MCP Inspector

The easiest way to test your server is using the built-in inspector:

1. Start the server: `npm run dev`
2. Open `http://localhost:3000/inspector` in your browser
3. Try the `add_numbers` tool with parameters like `{"a": 5, "b": 3}`

### With Claude Desktop

Add this configuration to your Claude Desktop config:

```json
{
  "mcpServers": {
    "simple-calculator": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Adding More Tools

Edit `src/server.ts` to add more tools:

```typescript
server.addTool({
  name: 'multiply_numbers',
  description: 'Multiply two numbers',
  parameters: {
    type: 'object',
    properties: {
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' },
    },
    required: ['a', 'b'],
  },
  execute: async ({ a, b }) => {
    return { result: a * b }
  },
})
```

## Learn More

- [MCP-Use Documentation](https://docs.mcp-use.com)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

