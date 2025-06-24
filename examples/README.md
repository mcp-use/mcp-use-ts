# MCP-Use TypeScript Examples

This directory contains examples demonstrating how to use the mcp-use library with various MCP servers.

## Prerequisites

1. **Node.js**: Ensure you have Node.js 22+ installed
2. **Environment Variables**: Create a `.env` file in the project root with your API keys:
   ```bash
   ANTHROPIC_API_KEY=your_anthropic_key
   OPENAI_API_KEY=your_openai_key
   E2B_API_KEY=your_e2b_key  # Only for sandbox example
   ```

## Running Examples

First, build the library:
```bash
npm run build
```

Then run any example using Node.js:
```bash
node dist/examples/example_name.js
```

Or use the npm scripts:
```bash
npm run example:airbnb
npm run example:browser
npm run example:chat
# ... etc
```

## Available Examples

### 1. Airbnb Search (`airbnb_use.ts`)
Search for accommodations using the Airbnb MCP server.
```bash
npm run example:airbnb
```

### 2. Browser Automation (`browser_use.ts`)
Control a browser using Playwright MCP server.
```bash
npm run example:browser
```

### 3. Interactive Chat (`chat_example.ts`)
Interactive chat session with conversation memory.
```bash
npm run example:chat
```

### 4. File System Operations (`filesystem_use.ts`)
Access and manipulate files using the filesystem MCP server.
```bash
# First, edit the example to set your directory path
npm run example:filesystem
```

### 5. HTTP Server Connection (`http_example.ts`)
Connect to an MCP server via HTTP.
```bash
# First, start the Playwright server in another terminal:
npx @playwright/mcp@latest --port 8931

# Then run the example:
npm run example:http
```

### 6. MCP Everything Test (`mcp_everything.ts`)
Test various MCP functionalities.
```bash
npm run example:everything
```

### 7. Multiple Servers (`multi_server_example.ts`)
Use multiple MCP servers in a single session.
```bash
# First, edit the example to set your directory path
npm run example:multi
```

### 8. Sandboxed Environment (`sandbox_everything.ts`)
Run MCP servers in an E2B sandbox (requires E2B_API_KEY).
```bash
npm run example:sandbox
```

### 9. OAuth Authentication (`simple_oauth_example.ts`)
OAuth flow example with Linear.
```bash
# First, register your app with Linear and update the client_id
npm run example:oauth
```

### 10. Blender Integration (`blender_use.ts`)
Control Blender 3D through MCP.
```bash
# First, install and enable the Blender MCP addon
npm run example:blender
```

## Configuration Files

Some examples use JSON configuration files:
- `airbnb_mcp.json` - Airbnb server configuration
- `browser_mcp.json` - Browser server configuration

## Environment Variables

Different examples require different API keys:
- **ANTHROPIC_API_KEY**: For examples using Claude (airbnb, multi_server, blender)
- **OPENAI_API_KEY**: For examples using GPT (browser, chat, filesystem, http, everything)
- **E2B_API_KEY**: Only for the sandbox example

## Troubleshooting

1. **Module not found**: Make sure to build the project first with `npm run build`
2. **API key errors**: Check your `.env` file has the required keys
3. **Server connection failed**: Some examples require external servers to be running
4. **Permission errors**: Some examples may need specific permissions (e.g., filesystem access)

## Writing Your Own Examples

To create a new example:

1. Import the necessary modules:
   ```typescript
   import { MCPAgent, MCPClient } from '../index.js'
   import { ChatOpenAI } from '@langchain/openai'
   ```

2. Configure your MCP server:
   ```typescript
   const config = {
     mcpServers: {
       yourServer: {
         command: 'npx',
         args: ['your-mcp-server']
       }
     }
   }
   ```

3. Create client, LLM, and agent:
   ```typescript
   const client = MCPClient.fromDict(config)
   const llm = new ChatOpenAI({ model: 'gpt-4o' })
   const agent = new MCPAgent({ llm, client, maxSteps: 30 })
   ```

4. Run your queries:
   ```typescript
   const result = await agent.run('Your prompt here', { maxSteps: 30 })
   ```

## Contributing

Feel free to add more examples! Make sure to:
1. Follow the existing code style
2. Add appropriate documentation
3. Update this README with your example
4. Add a corresponding npm script in package.json