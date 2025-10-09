import { createMCPServer } from 'mcp-use'

// Create an MCP server using the new UI resource features
const server = createMCPServer('ui-mcp-server', {
  version: '2.0.0',
  description: 'MCP server with enhanced UI widget support',
})

const PORT = process.env.PORT || 3000

// ===== Use the new uiResource method instead of manual resource/tool creation =====

// Kanban Board - with proper input validation
server.uiResource({
  name: 'kanban-board',
  description: 'Interactive Kanban board for task management',
  inputs: [
    {
      name: 'tasks',
      type: 'array',  // Will validate and parse JSON strings to arrays
      description: 'Array of task objects',
      required: false,
      default: [
        { id: '1', title: 'Design UI', status: 'todo', priority: 'high' },
        { id: '2', title: 'Implement API', status: 'in-progress', priority: 'high' },
        { id: '3', title: 'Write tests', status: 'done', priority: 'medium' }
      ]
    }
  ],
  returnTextContent: true,  // Returns both text and UI resource
})

// Todo List - with advanced filtering
server.uiResource({
  name: 'todo-list',
  description: 'Interactive todo list with filtering',
  inputs: [
    {
      name: 'todos',
      type: 'array',
      description: 'Array of todo items',
      required: false,
      default: [
        { id: 1, title: 'Learn MCP-UI', completed: false },
        { id: 2, title: 'Build a widget', completed: false },
        { id: 3, title: 'Test integration', completed: true }
      ]
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Filter: all, active, or completed',
      required: false,
      default: 'all'
    }
  ],
  fn: async (params) => {
    // Custom handler with validation already applied
    const todos = params.todos || []
    const filter = params.filter || 'all'

    let filteredTodos = todos
    if (filter === 'active') {
      filteredTodos = todos.filter((t: any) => !t.completed)
    } else if (filter === 'completed') {
      filteredTodos = todos.filter((t: any) => t.completed)
    }

    const queryParams = new URLSearchParams({
      todos: JSON.stringify(filteredTodos),
      filter
    })

    return {
      content: {
        type: 'externalUrl',
        iframeUrl: `http://localhost:${PORT}/mcp-use/widgets/todo-list?${queryParams}`,
        preferredFrameSize: {
          width: 600,
          height: 400
        }
      },
      text: `Showing ${filteredTodos.length} ${filter} todos`
    }
  },
  returnTextContent: true,
})

// Data Visualization - simple widget without parameters
server.uiResource({
  name: 'data-visualization',
  description: 'Interactive data visualization dashboard',
  widgetPath: 'data-visualization',  // Explicit widget path
})

// Auto-discover all widgets in the dist directory
// This will automatically find and register any widgets not manually defined above
try {
  server.autoDiscoverWidgets()
  console.log('✅ Auto-discovery completed')
} catch (err) {
  console.log('ℹ️  Auto-discovery skipped (widgets may not be built yet)')
}

// Traditional MCP resource for server status (for comparison)
server.resource({
  uri: 'server://status',
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
        parameterValidation: true,
        autoDiscovery: true,
        customHandlers: true,
        hybridResponses: true,
      },
      endpoints: {
        widgets: `http://localhost:${PORT}/mcp-use/widgets`,
        mcp: `http://localhost:${PORT}/mcp`,
      },
      registeredWidgets: [
        'kanban-board (with validation)',
        'todo-list (with custom handler)',
        'data-visualization (simple)',
      ],
      timestamp: new Date().toISOString(),
    }, null, 2)
  },
})

// Example of a tool that returns proper MCP-UI resources
server.tool({
  name: 'create-widget-comparison',
  description: 'Shows the difference between old and new approaches',
  inputs: [],
  fn: async () => {
    // Import @mcp-ui/server for proper resource creation
    const { createUIResource } = await import('@mcp-ui/server')

    const comparisonHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Old vs New Approach</title>
    <style>
        body { font-family: system-ui; padding: 20px; }
        .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .method { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .method h2 { color: #333; }
        .old { border-left: 4px solid #ff6b6b; }
        .new { border-left: 4px solid #51cf66; }
        pre { background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .benefits { background: #e3f9e5; padding: 15px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>MCP-UI Integration: Old vs New Approach</h1>
    <div class="comparison">
        <div class="method old">
            <h2>❌ Old Approach</h2>
            <pre>// Manual tool creation
server.tool({
  name: 'show-kanban',
  inputs: [{
    name: 'tasks',
    type: 'string',  // No validation
  }],
  fn: async (params) => {
    // Manual parsing needed
    const tasks = JSON.parse(params.tasks)
    // Manual URL building
    return \`Displayed at ...\`
  }
})</pre>
        </div>
        <div class="method new">
            <h2>✅ New Approach</h2>
            <pre>// Automatic with validation
server.uiResource({
  name: 'kanban-board',
  inputs: [{
    name: 'tasks',
    type: 'array',  // Auto-validated
  }],
  returnTextContent: true
})

// Automatically creates:
// - Resource: ui://widget/kanban-board
// - Tool: show-kanban-board
// - Validation & type conversion
// - Proper MCP-UI format</pre>
        </div>
    </div>
    <div class="benefits">
        <h3>✨ Benefits of New Approach:</h3>
        <ul>
            <li>🎯 Type-safe parameter validation</li>
            <li>🔄 Automatic string-to-type conversion</li>
            <li>📦 Follows MCP-UI specification</li>
            <li>🚀 Less boilerplate code</li>
            <li>⚡ Auto-discovery of widgets</li>
            <li>💬 Clear error messages</li>
        </ul>
    </div>
</body>
</html>`

    // Create proper MCP-UI resource
    const uiResource = createUIResource({
      uri: 'ui://comparison/old-vs-new',
      content: {
        type: 'rawHtml',
        htmlString: comparisonHtml
      },
      encoding: 'text',
      metadata: {
        title: 'Approach Comparison',
        description: 'Visual comparison of old vs new MCP-UI integration'
      }
    })

    // Return UI resource as text (tools can't directly return 'resource' type)
    return {
      content: [
        {
          type: 'text',
          text: `Created comparison showing the improvements in the new approach\n\nUI Resource: ui://comparison/old-vs-new\n${JSON.stringify(uiResource)}`
        }
      ]
    }
  }
})

console.log('🚀 Starting Upgraded UI MCP Server...')
console.log('📋 Server: ui-mcp-server v2.0.0')
console.log('')
console.log('✨ Key Improvements:')
console.log('  ✅ uiResource() method - cleaner API')
console.log('  ✅ Automatic parameter validation')
console.log('  ✅ Type conversion (string → array/number/boolean)')
console.log('  ✅ Proper MCP-UI format (application/vnd.mcp-ui.resource)')
console.log('  ✅ Auto-discovery of widgets')
console.log('  ✅ Custom handlers with validated params')
console.log('')
console.log('🧪 Testing the New Features:')
console.log('  1. Call "show-kanban-board" with tasks as a JSON string')
console.log('     → It will be automatically parsed to an array')
console.log('  2. Call "show-todo-list" with invalid filter value')
console.log('     → It will use the default value')
console.log('  3. Call "create-widget-comparison"')
console.log('     → See a visual comparison of old vs new approach')
console.log('')
console.log(`📡 Server running at http://localhost:${PORT}`)
console.log(`🔌 Connect via MCP Inspector to: http://localhost:${PORT}/mcp`)

// Start the server
server.listen(PORT)