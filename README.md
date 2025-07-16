<div align="center" style="margin: 0 auto; max-width: 80%;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./static/logo_white.svg">
    <source media="(prefers-color-scheme: light)" srcset="./static/logo_black.svg">
    <img alt="mcp use logo" src="./static/logo_white.svg" width="80%" style="margin: 20px auto;">
  </picture>
</div>

<h1 align="center">Unified MCP Client Library</h1>

<p align="center">
    <a href="https://www.npmjs.com/package/mcp-use" alt="NPM Downloads">
        <img src="https://img.shields.io/npm/dw/mcp-use.svg"/></a>
    <a href="https://www.npmjs.com/package/mcp-use" alt="NPM Version">
        <img src="https://img.shields.io/npm/v/mcp-use.svg"/></a>
    <a href="https://docs.mcp-use.io" alt="Documentation">
        <img src="https://img.shields.io/badge/docs-mcp--use.io-blue" /></a>
    <a href="https://mcp-use.io" alt="Website">
        <img src="https://img.shields.io/badge/website-mcp--use.io-blue" /></a>
    <a href="https://github.com/mcp-use/mcp-use-ts/blob/main/LICENSE" alt="License">
        <img src="https://img.shields.io/github/license/mcp-use/mcp-use-ts" /></a>
    <a href="https://eslint.org" alt="Code style: ESLint">
        <img src="https://img.shields.io/badge/code%20style-eslint-4B32C3.svg" /></a>
    <a href="https://github.com/mcp-use/mcp-use-ts/stargazers" alt="GitHub stars">
        <img src="https://img.shields.io/github/stars/mcp-use/mcp-use-ts?style=social" /></a>
    <a href="https://discord.gg/XkNkSkMz3V" alt="Discord">
        <img src="https://dcbadge.limes.pink/api/server/XkNkSkMz3V?style=flat" /></a>
</p>

🌐 **MCP Client** is the open-source way to connect **any LLM to any MCP server** in TypeScript/Node.js, letting you build custom agents with tool access without closed-source dependencies.

💡 Let developers easily connect any LLM via LangChain.js to tools like web browsing, file operations, 3D modeling, and more.

---

## ✨ Key Features

| Feature                         | Description                                                                |
| ------------------------------- | -------------------------------------------------------------------------- |
| 🔄 **Ease of use**              | Create an MCP-capable agent in just a few lines of TypeScript.             |
| 🤖 **LLM Flexibility**          | Works with any LangChain.js-supported LLM that supports tool calling.      |
| 🌐 **HTTP Support**             | Direct SSE/HTTP connection to MCP servers.                                 |
| ⚙️ **Dynamic Server Selection** | Agents select the right MCP server from a pool on the fly.                 |
| 🧩 **Multi-Server Support**     | Use multiple MCP servers in one agent.                                     |
| 🛡️ **Tool Restrictions**        | Restrict unsafe tools like filesystem or network.                          |
| 🔧 **Custom Agents**            | Build your own agents with LangChain.js adapter or implement new adapters. |

---

## 🚀 Quick Start

### Requirements

- Node.js 22.0.0 or higher
- npm, yarn, or pnpm (examples use pnpm)

### Installation

```bash
# Install from npm
npm install mcp-use
# LangChain.js and your LLM provider (e.g., OpenAI)
npm install langchain @langchain/openai dotenv
```

Create a `.env`:

```ini
OPENAI_API_KEY=your_api_key
```

### Basic Usage

```ts
import { ChatOpenAI } from '@langchain/openai'
import { MCPAgent, MCPClient } from 'mcp-use'
import 'dotenv/config'

async function main() {
  // 1. Configure MCP servers
  const config = {
    mcpServers: {
      playwright: { command: 'npx', args: ['@playwright/mcp@latest'] }
    }
  }
  const client = MCPClient.fromDict(config)

  // 2. Create LLM
  const llm = new ChatOpenAI({ modelName: 'gpt-4o' })

  // 3. Instantiate agent
  const agent = new MCPAgent({ llm, client, maxSteps: 20 })

  // 4. Run query
  const result = await agent.run('Find the best restaurant in Tokyo using Google Search')
  console.log('Result:', result)
}

main().catch(console.error)
```

---

## 🔧 API Methods

### MCPAgent Methods

The `MCPAgent` class provides several methods for executing queries with different output formats:

#### `run(query: string, maxSteps?: number): Promise<string>`

Executes a query and returns the final result as a string.

```ts
const result = await agent.run('What tools are available?')
console.log(result)
```

#### `stream(query: string, maxSteps?: number): AsyncGenerator<AgentStep, string, void>`

Yields intermediate steps during execution, providing visibility into the agent's reasoning process.

```ts
const stream = agent.stream('Search for restaurants in Tokyo')
for await (const step of stream) {
  console.log(`Tool: ${step.action.tool}, Input: ${step.action.toolInput}`)
  console.log(`Result: ${step.observation}`)
}
```

#### `streamEvents(query: string, maxSteps?: number): AsyncGenerator<StreamEvent, void, void>`

Yields fine-grained LangChain StreamEvent objects, enabling token-by-token streaming and detailed event tracking.

```ts
const eventStream = agent.streamEvents('What is the weather today?')
for await (const event of eventStream) {
  // Handle different event types
  switch (event.event) {
    case 'on_chat_model_stream':
      // Token-by-token streaming from the LLM
      if (event.data?.chunk?.content) {
        process.stdout.write(event.data.chunk.content)
      }
      break
    case 'on_tool_start':
      console.log(`\nTool started: ${event.name}`)
      break
    case 'on_tool_end':
      console.log(`Tool completed: ${event.name}`)
      break
  }
}
```

### Key Differences

- **`run()`**: Best for simple queries where you only need the final result
- **`stream()`**: Best for debugging and understanding the agent's tool usage
- **`streamEvents()`**: Best for real-time UI updates with token-level streaming

## 🔄 AI SDK Integration

The library provides built-in utilities for integrating with [Vercel AI SDK](https://sdk.vercel.ai/), making it easy to build streaming UIs with React hooks like `useCompletion` and `useChat`.

### Installation

```bash
npm install ai @langchain/anthropic
```

### Basic Usage

```ts
import { ChatAnthropic } from '@langchain/anthropic'
import { LangChainAdapter } from 'ai'
import { createReadableStreamFromGenerator, MCPAgent, MCPClient, streamEventsToAISDK } from 'mcp-use'

async function createApiHandler() {
  const config = {
    mcpServers: {
      everything: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] }
    }
  }

  const client = new MCPClient(config)
  const llm = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
  const agent = new MCPAgent({ llm, client, maxSteps: 5 })

  return async (request: { prompt: string }) => {
    const streamEvents = agent.streamEvents(request.prompt)
    const aiSDKStream = streamEventsToAISDK(streamEvents)
    const readableStream = createReadableStreamFromGenerator(aiSDKStream)

    return LangChainAdapter.toDataStreamResponse(readableStream)
  }
}
```

### Enhanced Usage with Tool Visibility

```ts
import { streamEventsToAISDKWithTools } from 'mcp-use'

async function createEnhancedApiHandler() {
  const config = {
    mcpServers: {
      everything: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] }
    }
  }

  const client = new MCPClient(config)
  const llm = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
  const agent = new MCPAgent({ llm, client, maxSteps: 8 })

  return async (request: { prompt: string }) => {
    const streamEvents = agent.streamEvents(request.prompt)
    // Enhanced stream includes tool usage notifications
    const enhancedStream = streamEventsToAISDKWithTools(streamEvents)
    const readableStream = createReadableStreamFromGenerator(enhancedStream)

    return LangChainAdapter.toDataStreamResponse(readableStream)
  }
}
```

### Next.js API Route Example

```ts
// pages/api/chat.ts or app/api/chat/route.ts
import { ChatAnthropic } from '@langchain/anthropic'
import { LangChainAdapter } from 'ai'
import { createReadableStreamFromGenerator, MCPAgent, MCPClient, streamEventsToAISDK } from 'mcp-use'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  const config = {
    mcpServers: {
      everything: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'] }
    }
  }

  const client = new MCPClient(config)
  const llm = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
  const agent = new MCPAgent({ llm, client, maxSteps: 10 })

  try {
    const streamEvents = agent.streamEvents(prompt)
    const aiSDKStream = streamEventsToAISDK(streamEvents)
    const readableStream = createReadableStreamFromGenerator(aiSDKStream)

    return LangChainAdapter.toDataStreamResponse(readableStream)
  }
  finally {
    await client.closeAllSessions()
  }
}
```

### Frontend Integration

```tsx
// components/Chat.tsx
import { useCompletion } from 'ai/react'

export function Chat() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    api: '/api/chat',
  })

  return (
    <div>
      <div>{completion}</div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me anything..."
        />
      </form>
    </div>
  )
}
```

### Available AI SDK Utilities

- **`streamEventsToAISDK()`**: Converts streamEvents to basic text stream
- **`streamEventsToAISDKWithTools()`**: Enhanced stream with tool usage notifications
- **`createReadableStreamFromGenerator()`**: Converts async generator to ReadableStream

---

## 📂 Configuration File

You can store servers in a JSON file:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Load it:

```ts
import { MCPClient } from 'mcp-use'

const client = MCPClient.fromConfigFile('./mcp-config.json')
```

---

## 📚 Examples

We provide a comprehensive set of examples demonstrating various use cases. All examples are located in the `examples/` directory with a dedicated README.

### Running Examples

```bash
# Install dependencies
npm install

# Run any example
npm run example:airbnb      # Search accommodations with Airbnb
npm run example:browser     # Browser automation with Playwright
npm run example:chat        # Interactive chat with memory
npm run example:stream      # Demonstrate streaming methods (stream & streamEvents)
npm run example:stream_events # Comprehensive streamEvents() examples
npm run example:ai_sdk      # AI SDK integration with streaming
npm run example:filesystem  # File system operations
npm run example:http        # HTTP server connection
npm run example:everything  # Test MCP functionalities
npm run example:multi       # Multiple servers in one session
```

### Example Highlights

- **Browser Automation**: Control browsers to navigate websites and extract information
- **File Operations**: Read, write, and manipulate files through MCP
- **Multi-Server**: Combine multiple MCP servers (Airbnb + Browser) in a single task
- **Sandboxed Execution**: Run MCP servers in isolated E2B containers
- **OAuth Flows**: Authenticate with services like Linear using OAuth2
- **Streaming Methods**: Demonstrate both step-by-step and token-level streaming
- **AI SDK Integration**: Build streaming UIs with Vercel AI SDK and React hooks

See the [examples README](./examples/README.md) for detailed documentation and prerequisites.

---

## 🔄 Multi-Server Example

```ts
const config = {
  mcpServers: {
    airbnb: { command: 'npx', args: ['@openbnb/mcp-server-airbnb'] },
    playwright: { command: 'npx', args: ['@playwright/mcp@latest'] }
  }
}
const client = MCPClient.fromDict(config)
const agent = new MCPAgent({ llm, client, useServerManager: true })
await agent.run('Search Airbnb in Barcelona, then Google restaurants nearby')
```

---

## 🔒 Tool Access Control

```ts
const agent = new MCPAgent({
  llm,
  client,
  disallowedTools: ['file_system', 'network']
})
```

## 👥 Contributors

<table>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/pietrozullo>
            <img src=https://avatars.githubusercontent.com/u/62951181?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Pietro Zullo/>
            <br />
            <sub style="font-size:14px"><b>Pietro Zullo</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/zandko>
            <img src=https://avatars.githubusercontent.com/u/37948383?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Zane/>
            <br />
            <sub style="font-size:14px"><b>Zane</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/Pederzh>
            <img src=https://avatars.githubusercontent.com/u/11487621?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Luigi Pederzani/>
            <br />
            <sub style="font-size:14px"><b>Luigi Pederzani</b></sub>
        </a>
    </td>
</tr>
</table>

<!-- Contributors section will be automatically generated here -->

## 📜 License

MIT © [Zane](https://github.com/zandko)
