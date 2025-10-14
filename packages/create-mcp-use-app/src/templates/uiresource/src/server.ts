import { createMCPServer, type UIResourceDefinition } from 'mcp-use'

// Create an MCP server with UIResource support
const server = createMCPServer('uiresource-mcp-server', {
  version: '1.0.0',
  description: 'MCP server with UIResource widget integration',
})

const PORT = process.env.PORT || 3000

/**
 * Main Kanban Board Widget
 *
 * This demonstrates the new uiResource method which automatically:
 * 1. Creates a tool (ui_kanban-board) that accepts parameters
 * 2. Creates a resource (ui://widget/kanban-board) for static access
 * 3. Handles parameter passing via URL query strings
 */
server.uiResource({
  name: 'kanban-board',
  widget: 'kanban-board',
  title: 'Kanban Board',
  description: 'Interactive task management board with drag-and-drop support',
  props: {
    initialTasks: {
      type: 'array',
      description: 'Initial tasks to display on the board',
      required: false,
    },
    theme: {
      type: 'string',
      description: 'Visual theme for the board (light/dark)',
      required: false,
      default: 'light'
    },
    columns: {
      type: 'array',
      description: 'Column configuration for the board',
      required: false,
    }
  },
  size: ['900px', '600px'],
  annotations: {
    audience: ['user', 'assistant'],
    priority: 0.8
  }
})

// Example: Additional widget registrations
// Uncomment to add more widgets to your server

/*
// Data visualization widget
server.uiResource({
  name: 'chart-widget',
  widget: 'chart',
  title: 'Data Chart',
  description: 'Interactive data visualization',
  props: {
    data: {
      type: 'array',
      description: 'Chart data points',
      required: true
    },
    chartType: {
      type: 'string',
      description: 'Type of chart (line/bar/pie)',
      default: 'line'
    }
  },
  size: ['800px', '400px']
})

// Todo list widget
server.uiResource({
  name: 'todo-list',
  widget: 'todo-list',
  title: 'Todo List',
  description: 'Simple todo list manager',
  props: {
    items: {
      type: 'array',
      description: 'Initial todo items',
      default: []
    }
  }
})
*/

// Example: Programmatic widget registration
// You can also register widgets from an array programmatically
const additionalWidgets: UIResourceDefinition[] = [
  // Add your widget definitions here
]

// Register all additional widgets
additionalWidgets.forEach(widget => server.uiResource(widget))

/**
 * Traditional MCP Tool
 *
 * You can still add regular tools alongside UIResources.
 * This example shows how to mix both approaches.
 */
server.tool({
  name: 'get-widget-info',
  description: 'Get information about available UI widgets',
  fn: async () => {
    const widgets = [
      {
        name: 'kanban-board',
        tool: 'ui_kanban-board',
        resource: 'ui://widget/kanban-board',
        url: `http://localhost:${PORT}/mcp-use/widgets/kanban-board`
      }
    ]

    return {
      content: [{
        type: 'text',
        text: `Available UI Widgets:\n\n${widgets.map(w =>
          `📦 ${w.name}\n` +
          `  Tool: ${w.tool}\n` +
          `  Resource: ${w.resource}\n` +
          `  Browser: ${w.url}`
        ).join('\n\n')}\n\n` +
        `Each widget can be:\n` +
        `1. Called as a tool with parameters\n` +
        `2. Accessed as a resource for static version\n` +
        `3. Viewed directly in browser`
      }]
    }
  }
})

/**
 * Traditional MCP Resource
 *
 * Example of a non-UI resource for configuration data.
 * Shows how UIResources work alongside regular resources.
 */
server.resource({
  name: 'server-config',
  uri: 'config://server',
  title: 'Server Configuration',
  description: 'Current server configuration and status',
  mimeType: 'application/json',
  fn: async () => ({
    contents: [{
      uri: 'config://server',
      mimeType: 'application/json',
      text: JSON.stringify({
        port: PORT,
        version: '1.0.0',
        widgets: {
          registered: ['kanban-board'],
          baseUrl: `http://localhost:${PORT}/mcp-use/widgets/`
        },
        endpoints: {
          mcp: `http://localhost:${PORT}/mcp`,
          inspector: `http://localhost:${PORT}/inspector`,
          widgets: `http://localhost:${PORT}/mcp-use/widgets/`
        }
      }, null, 2)
    }]
  })
})

// Start the server
server.listen(PORT)

// Display helpful startup message
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  🚀 UIResource MCP Server                      ║
╚═══════════════════════════════════════════════════════════════╝

Server is running on port ${PORT}

📍 Endpoints:
   MCP Protocol:  http://localhost:${PORT}/mcp
   Inspector UI:  http://localhost:${PORT}/inspector
   Widgets Base:  http://localhost:${PORT}/mcp-use/widgets/

🎯 Available UIResources:
   • kanban-board
     Tool:      ui_kanban-board (accepts props as parameters)
     Resource:  ui://widget/kanban-board (static with defaults)
     Browser:   http://localhost:${PORT}/mcp-use/widgets/kanban-board

📝 Usage Examples:

   // Call as tool with parameters
   await client.callTool('ui_kanban-board', {
     initialTasks: [...],
     theme: 'dark'
   })

   // Access as resource
   await client.readResource('ui://widget/kanban-board')

💡 Tip: Open the Inspector UI to test your widgets interactively!
`)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...')
  process.exit(0)
})

export default server