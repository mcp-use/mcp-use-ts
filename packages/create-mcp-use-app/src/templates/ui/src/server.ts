import { createMCPServer } from 'mcp-use/server'

// Create an MCP server (which is also an Express app)
// The MCP Inspector is automatically mounted at /inspector
const server = createMCPServer('ui-mcp-server', {
  version: '1.0.0',
  description: 'An MCP server with React UI widgets',
})

const PORT = process.env.PORT || 3000


server.tool({
  name: 'test-tool',
  description: 'Test tool',
  inputs: [
    {
      name: 'test',
      type: 'string',
      description: 'Test input',
      required: true,
    },
  ],
  fn: async () => {
    // Automatically uses Vite dev server (localhost:5173) in dev mode
    // and built files (localhost:PORT) in production
    const uiResource = server.createWidgetUIResource('kanban-board')
    
    return {
      content: [uiResource]
    }
  },
})


// MCP Resource for Kanban Board widget (simplified!)
server.widgetResource('kanban-board', {
  title: 'Kanban Board',
  description: 'Interactive task management board with drag-and-drop',
  annotations: {
    audience: ['user', 'assistant'],
    priority: 0.7
  }
})



// Start the server (MCP endpoints auto-mounted at /mcp)
server.listen(PORT)
