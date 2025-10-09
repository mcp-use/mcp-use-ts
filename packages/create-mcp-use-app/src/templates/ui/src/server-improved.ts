import { createMCPServer } from 'mcp-use'

// Create an MCP server with UI resource support
const server = createMCPServer('ui-mcp-server', {
  version: '2.0.0',
  description: 'MCP server with enhanced UI widget integration',
})

const PORT = process.env.PORT || 3000

// Method 1: Manual UI resource registration with inputs
server.uiResource({
  name: 'kanban-board',
  description: 'Interactive Kanban board for task management',
  inputs: [
    {
      name: 'tasks',
      type: 'string',
      description: 'JSON array of task objects',
      required: false,
    },
    {
      name: 'columns',
      type: 'string',
      description: 'JSON array of column definitions',
      required: false,
    },
  ],
  returnTextContent: true, // Return both text and UI resource
})

// Method 2: UI resource with custom handler and automatic validation
server.uiResource({
  name: 'todo-list',
  description: 'Interactive todo list with real-time updates',
  inputs: [
    {
      name: 'todos',
      type: 'array',  // Changed to array type for proper validation
      description: 'Array of todo items',
      required: false,
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Filter: all, active, or completed',
      required: false,
      default: 'all',
    },
  ],
  fn: async (params) => {
    // Parameters are now automatically validated and transformed
    // todos will be parsed from JSON string to array if needed
    const todos = params.todos || []
    const filter = params.filter || 'all'

    let filteredTodos = todos
    if (filter === 'active') {
      filteredTodos = todos.filter((t: any) => !t.completed)
    } else if (filter === 'completed') {
      filteredTodos = todos.filter((t: any) => t.completed)
    }

    return {
      content: {
        type: 'externalUrl',
        iframeUrl: `http://localhost:${PORT}/mcp-use/widgets/todo-list?todos=${encodeURIComponent(JSON.stringify(filteredTodos))}&filter=${filter}`,
        preferredFrameSize: {
          width: 600,
          height: 400,
        },
      },
      text: `Showing ${filteredTodos.length} todos (filter: ${filter})`
    }
  },
  returnTextContent: true,
})

// Method 3: Simple UI resource without inputs
server.uiResource({
  name: 'data-visualization',
  description: 'Data visualization dashboard',
  widgetPath: 'data-visualization', // Explicitly set the widget path
})

// Method 4: Auto-discover and register all widgets in the dist directory
// This will automatically scan dist/resources/mcp-use/widgets and register all found widgets
server.autoDiscoverWidgets()

// Traditional MCP resource for server status
server.resource({
  uri: 'status://server',
  name: 'Server Status',
  description: 'Current server status and configuration',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      name: 'ui-mcp-server',
      version: '2.0.0',
      status: 'running',
      transport: process.env.MCP_TRANSPORT || 'http',
      port: PORT,
      features: {
        uiResources: true,
        autoDiscovery: true,
        widgetProps: true,
        hybridResponses: true,
      },
      endpoints: {
        ui: `http://localhost:${PORT}/mcp-use/widgets`,
        mcp: process.env.MCP_TRANSPORT === 'stdio' ? 'stdio' : `http://localhost:${PORT}/mcp`,
      },
      timestamp: new Date().toISOString(),
    }, null, 2)
  },
})

// Custom tool that returns UI resource programmatically using proper MCP-UI format
server.tool({
  name: 'create-dashboard',
  description: 'Create a custom dashboard with specified widgets',
  inputs: [
    {
      name: 'widgets',
      type: 'string',
      description: 'Comma-separated list of widgets to display',
      required: true,
    },
  ],
  fn: async (params) => {
    // Import @mcp-ui/server for proper resource creation
    const { createUIResource } = await import('@mcp-ui/server')
    const widgets = params.widgets.split(',').map((w: string) => w.trim())

    // Create a custom HTML page with multiple widgets
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Custom Dashboard</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            background: #f5f5f5;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        .widget {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        iframe {
            width: 100%;
            height: 400px;
            border: none;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Custom Dashboard</h1>
    <div class="dashboard">
        ${widgets.map(widget => `
        <div class="widget">
            <h2>${widget}</h2>
            <iframe src="http://localhost:${PORT}/mcp-use/widgets/${widget}"></iframe>
        </div>
        `).join('')}
    </div>
</body>
</html>
    `

    // Create UI resource using the proper MCP-UI format
    const uiResource = createUIResource({
      uri: 'ui://dashboard/custom',
      content: {
        type: 'rawHtml',
        htmlString: html
      },
      encoding: 'text',
      metadata: {
        title: 'Custom Dashboard',
        description: `Dashboard with widgets: ${widgets.join(', ')}`
      }
    })

    return {
      content: [
        {
          type: 'text',
          text: `Created dashboard with widgets: ${widgets.join(', ')}`
        },
        {
          type: 'resource',
          resource: {
            uri: 'ui://dashboard/custom',
            text: JSON.stringify(uiResource),
            mimeType: 'application/vnd.mcp-ui.resource'
          }
        }
      ]
    }
  },
})

console.log('🚀 Starting Enhanced UI MCP Server...')
console.log('📋 Server: ui-mcp-server v2.0.0')
console.log('✨ Features:')
console.log('  - UI Resources with automatic widget discovery')
console.log('  - Widget prop passing via query parameters')
console.log('  - Hybrid text/UI responses')
console.log('  - Custom UI resource handlers')
console.log('')
console.log('📦 Widgets are auto-discovered from: dist/resources/mcp-use/widgets/')
console.log('🔧 To add a widget: Place .tsx files in resources/ and run "mcp-use build"')

// Start the server
server.listen(PORT)