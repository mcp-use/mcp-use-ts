/**
 * HTTP Example for mcp-use.
 *
 * This example demonstrates how to use the mcp-use library with MCPClient
 * to connect to an MCP server running on a specific HTTP port.
 *
 * Before running this example, you need to start the Playwright MCP server
 * in another terminal with:
 *
 *     npx @playwright/mcp@latest --port 8931
 *
 * This will start the server on port 8931. Resulting in the config you find below.
 * Of course you can run this with any server you want at any URL.
 *
 * Special thanks to https://github.com/microsoft/playwright-mcp for the server.
 */

import { ChatOpenAI } from '@langchain/openai'
import { config } from 'dotenv'
import { MCPAgent, MCPClient } from '../index.js'

// Load environment variables from .env file
config()

async function main() {
  const config = { mcpServers: { http: { url: 'https://hf.com/mcp' } } }

  // Create MCPClient from config
  const client = MCPClient.fromDict(config)

  // Create LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o' })

  // Create agent with the client
  const agent = new MCPAgent({ llm, client, maxSteps: 30 })

  // Run the query
  const result = await agent.run(
    'Find the best restaurant in San Francisco USING GOOGLE SEARCH',
    30,
  )
  console.log(`\nResult: ${result}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
