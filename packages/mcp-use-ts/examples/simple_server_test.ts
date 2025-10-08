import { create } from 'mcp-use/server'

// Create an MCP server
const mcp = create('test-server', {
  version: '0.1.0',
  description: 'A simple test MCP server',
})

// Define a simple resource
mcp.resource({
  uri: 'test://hello',
  name: 'Hello Resource',
  description: 'A simple hello world resource',
  mimeType: 'text/plain',
  fn: async () => {
    return 'Hello, World!'
  },
})

// Define a simple tool
mcp.tool({
  name: 'echo',
  description: 'Echo back the input',
  inputs: [
    {
      name: 'message',
      type: 'string',
      description: 'Message to echo',
      required: true,
    },
  ],
  fn: async ({ message }) => {
    return `Echo: ${message}`
  },
})

// Define a simple prompt
mcp.prompt({
  name: 'greeting',
  description: 'Generate a greeting',
  args: [
    {
      name: 'name',
      type: 'string',
      description: 'Name to greet',
      required: true,
    },
  ],
  fn: async ({ name }) => {
    return `Hello, ${name}! Nice to meet you.`
  },
})

console.log('🚀 Starting MCP server...')
console.log('Server name: test-server')
console.log('Version: 0.1.0')
console.log('Available resources: test://hello')
console.log('Available tools: echo')
console.log('Available prompts: greeting')

// Start the server
mcp.serve().catch(console.error)
