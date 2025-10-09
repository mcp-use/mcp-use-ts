import { createMCPServer } from 'mcp-use'
import { createUIResource } from '@mcp-ui/server';
// Create an MCP server (which is also an Express app)
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
    const uiResource = createUIResource({
      uri: 'ui://widget/kanban-board',
      content: {
        type: 'externalUrl',
        iframeUrl: 'http://localhost:3000/mcp-use/widgets/kanban-board'
      },
      encoding: 'text',
    })
    // Tools should return text content, not raw UI resources
    return {
      content: [
        {
          type: 'text',
          text: `UI Resource: ui://widget/kanban-board\n${JSON.stringify(uiResource)}`
        }
      ]
    }
  },
})

// MCP Resource for server status
server.resource({
  uri: 'ui://status',
  name: 'UI Server Status',
  description: 'Status of the UI MCP server',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      name: 'ui-mcp-server',
      version: '1.0.0',
      status: 'running',
      transport: process.env.MCP_TRANSPORT || 'http',
      uiEndpoint: `http://localhost:${PORT}/mcp-use/widgets`,
      mcpEndpoint: process.env.MCP_TRANSPORT === 'stdio' ? 'stdio' : `http://localhost:${PORT}/mcp`,
      availableWidgets: ['kanban-board', 'todo-list', 'data-visualization'],
      timestamp: new Date().toISOString(),
    }, null, 2)
  },
})

// MCP Resource for Kanban Board widget
server.resource({
  uri: 'ui://widget/kanban-board',
  name: 'Kanban Board Widget',
  description: 'Interactive Kanban board widget',
  mimeType: 'text/html+skybridge',
  fn: async () => {
    const widgetUrl = `http://localhost:${PORT}/mcp-use/widgets/kanban-board`
    return `
<div id="kanban-root"></div>
<script type="module" src="${widgetUrl}"></script>
    `.trim()
  },
})

// MCP Resource for Todo List widget
server.resource({
  uri: 'ui://widget/todo-list',
  name: 'Todo List Widget',
  description: 'Interactive todo list widget',
  mimeType: 'text/html+skybridge',
  fn: async () => {
    const widgetUrl = `http://localhost:${PORT}/mcp-use/widgets/todo-list`
    return `
<div id="todo-root"></div>
<script type="module" src="${widgetUrl}"></script>
    `.trim()
  },
})

// MCP Resource for Data Visualization widget
server.resource({
  uri: 'ui://widget/data-visualization',
  name: 'Data Visualization Widget',
  description: 'Interactive data visualization widget',
  mimeType: 'text/html+skybridge',
  fn: async () => {
    const widgetUrl = `http://localhost:${PORT}/mcp-use/widgets/data-visualization`
    return `
<div id="data-viz-root"></div>
<script type="module" src="${widgetUrl}"></script>
    `.trim()
  },
})

// Tool for showing Kanban Board
server.tool({
  name: 'show-kanban',
  description: 'Display an interactive Kanban board',
  inputs: [
    {
      name: 'tasks',
      type: 'string',
      description: 'JSON string of tasks to display',
      required: true,
    },
  ],
  fn: async (params: Record<string, any>) => {
    const { tasks } = params
    try {
      const taskData = JSON.parse(tasks)
      return {
        content: [
          {
            type: 'text',
            text: `Displayed Kanban board with ${taskData.length || 0} tasks at http://localhost:${PORT}/mcp-use/widgets/kanban-board`
          }
        ]
      }
    }
    catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error parsing tasks: ${error instanceof Error ? error.message : 'Invalid JSON'}`
          }
        ]
      }
    }
  },
})

// Tool for showing Todo List
server.tool({
  name: 'show-todo-list',
  description: 'Display an interactive todo list',
  inputs: [
    {
      name: 'todos',
      type: 'string',
      description: 'JSON string of todos to display',
      required: true,
    },
  ],
  fn: async (params: Record<string, any>) => {
    const { todos } = params
    try {
      const todoData = JSON.parse(todos)
      return {
        content: [
          {
            type: 'text',
            text: `Displayed Todo list with ${todoData.length || 0} items at http://localhost:${PORT}/mcp-use/widgets/todo-list`
          }
        ]
      }
    }
    catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error parsing todos: ${error instanceof Error ? error.message : 'Invalid JSON'}`
          }
        ]
      }
    }
  },
})


console.log('🚀 Starting UI MCP Server...')
console.log('📋 Server: ui-mcp-server v1.0.0')
console.log('📦 Resources: ui://status, ui://widget/kanban-board, ui://widget/todo-list, ui://widget/data-visualization')
console.log('🛠️  Tools: show-kanban, show-todo-list, show-data-viz')
console.log('💬 Prompts: ui-development')

// Start the server (MCP endpoints auto-mounted at /mcp)
server.listen(PORT)
