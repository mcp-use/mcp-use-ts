import { create } from 'mcp-use/server'

// Create an MCP server
const mcp = create('my-mcp-server', {
  version: '0.1.0',
  description: 'A simple MCP server example'
})

// Define a resource
mcp.resource({
  uri: 'dir://desktop',
  name: 'Desktop Directory',
  description: 'Lists files on the desktop',
  mimeType: 'text/plain',
  fn: async () => {
    return 'file://desktop/file1.txt\nfile://desktop/file2.txt'
  }
})

// Define a resource template
mcp.template({
  uriTemplate: 'file://{filename}',
  name: 'File Template',
  description: 'Template for accessing files',
  mimeType: 'text/plain',
  fn: async ({ filename }) => {
    return `Contents of ${filename}`
  }
})

// Define a tool
mcp.tool({
  name: 'greet',
  description: 'Greets a person',
  inputs: [
    {
      name: 'name',
      type: 'string',
      description: 'The name to greet',
      required: true
    }
  ],
  fn: async ({ name }) => {
    return `Hello, ${name}!`
  }
})

// Define a prompt
mcp.prompt({
  name: 'introduction',
  description: 'Generates an introduction',
  args: [
    {
      name: 'name',
      type: 'string',
      description: 'Your name',
      required: true
    }
  ],
  fn: async ({ name }) => {
    return `Hi there! My name is ${name}. It's nice to meet you!`
  }
})

// Start the server
mcp.serve().catch(console.error)
