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

## 👥 Contributors

<table>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/zandko>
            <img src=https://avatars.githubusercontent.com/u/37948383?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Zane/>
            <br />
            <sub style="font-size:14px"><b>Zane</b></sub>
        </a>
    </td>
</tr>
</table>

<!-- Contributors section will be automatically generated here -->

## 📜 License

MIT © [Zane](https://github.com/zandko)
