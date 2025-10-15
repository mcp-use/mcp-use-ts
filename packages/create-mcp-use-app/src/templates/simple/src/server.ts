import { MCPServer } from 'mcp-use/server'

// Create MCP server
const server = new MCPServer({
  name: 'simple-calculator',
  version: '1.0.0',
  description: 'A simple MCP server with basic calculator tools',
})

// Add a tool to add two numbers
server.addTool({
  name: 'add_numbers',
  description: 'Add two numbers together and return the sum',
  parameters: {
    type: 'object',
    properties: {
      a: {
        type: 'number',
        description: 'The first number',
      },
      b: {
        type: 'number',
        description: 'The second number',
      },
    },
    required: ['a', 'b'],
  },
  execute: async ({ a, b }: { a: number; b: number }) => {
    const sum = a + b
    return {
      result: sum,
      message: `${a} + ${b} = ${sum}`,
    }
  },
})

export default server

