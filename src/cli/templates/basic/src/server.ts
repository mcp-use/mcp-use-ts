import { create } from 'mcp-use/server'

// Create an MCP server
const mcp = create('my-mcp-server', {
  version: '1.0.0',
  description: 'A simple MCP server',
})

// Define a resource
mcp.resource({
  uri: 'info://server',
  name: 'Server Information',
  description: 'Basic server information',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      name: 'my-mcp-server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'running',
    }, null, 2)
  },
})

// Define a tool
mcp.tool({
  name: 'echo',
  description: 'Echo back the input message',
  inputs: [
    {
      name: 'message',
      type: 'string',
      description: 'Message to echo back',
      required: true,
    },
  ],
  fn: async ({ message }: { message: string }) => {
    return `Echo: ${message}`
  },
})

// Define a prompt
mcp.prompt({
  name: 'greeting',
  description: 'Generate a personalized greeting',
  args: [
    {
      name: 'name',
      type: 'string',
      description: 'Name to greet',
      required: true,
    },
  ],
  fn: async ({ name }: { name: string }) => {
    return `Hello, ${name}! Welcome to the MCP server.`
  },
})

console.log('🚀 Starting MCP server...')
console.log('📋 Server: my-mcp-server v1.0.0')
console.log('📦 Resources: info://server')
console.log('🛠️  Tools: echo')
console.log('💬 Prompts: greeting')
console.log('✅ Server ready!')

// Start the server
mcp.serve().catch(console.error)
