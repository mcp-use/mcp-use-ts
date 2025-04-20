<h1 align="center">Unified MCP Client Library</h1>

[![](https://img.shields.io/npm/dw/@modelcontextprotocol/mcp-client.svg)](https://www.npmjs.com/package/@modelcontextprotocol/mcp-client)
[![npm version](https://img.shields.io/npm/v/@modelcontextprotocol/mcp-client.svg)](https://www.npmjs.com/package/@modelcontextprotocol/mcp-client)
[![License](https://img.shields.io/github/license/zandko/mcp-use)](https://github.com/zandko/mcp-use/blob/main/LICENSE)
[![Code style: ESLint](https://img.shields.io/badge/code%20style-eslint-4B32C3.svg)](https://eslint.org)
[![GitHub stars](https://img.shields.io/github/stars/zandko/mcp-use?style=social)](https://github.com/zandko/mcp-use/stargazers)

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

## 📜 License

MIT © [Zane](https://github.com/zandko)
