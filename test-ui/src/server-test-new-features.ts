import { createMCPServer } from 'mcp-use'
import { createUIResource } from '@mcp-ui/server'

// Create an MCP server with the new UI resource features
const server = createMCPServer('ui-test-server', {
  version: '2.0.0',
  description: 'Test server for new MCP-UI features',
})

const PORT = process.env.PORT || 3000

// ===== TEST 1: Basic uiResource with no inputs =====
server.uiResource({
  name: 'simple-dashboard',
  description: 'A simple dashboard widget without parameters',
  widgetPath: 'data-visualization', // This will auto-generate the URL
})

// ===== TEST 2: uiResource with validated inputs =====
server.uiResource({
  name: 'kanban-board',
  description: 'Kanban board with validated task inputs',
  inputs: [
    {
      name: 'tasks',
      type: 'array',
      description: 'Array of task objects',
      required: false,
      default: []
    },
    {
      name: 'columns',
      type: 'array',
      description: 'Column configuration',
      required: false,
      default: ['todo', 'in-progress', 'done']
    },
    {
      name: 'maxTasksPerColumn',
      type: 'number',
      description: 'Maximum tasks per column',
      required: false,
      default: 10
    }
  ],
  returnTextContent: true, // Return both text and UI resource
})

// ===== TEST 3: uiResource with custom handler =====
server.uiResource({
  name: 'todo-list-advanced',
  description: 'Todo list with advanced filtering and validation',
  inputs: [
    {
      name: 'todos',
      type: 'array',
      description: 'Array of todo items with title, completed, priority',
      required: false,
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Filter mode: all, active, completed, high-priority',
      required: false,
      default: 'all'
    },
    {
      name: 'sortBy',
      type: 'string',
      description: 'Sort by: date, priority, alphabetical',
      required: false,
      default: 'date'
    },
    {
      name: 'showCompleted',
      type: 'boolean',
      description: 'Whether to show completed items',
      required: false,
      default: true
    }
  ],
  fn: async (params) => {
    // Custom validation and processing
    const todos = params.todos || []
    const filter = params.filter || 'all'
    const sortBy = params.sortBy || 'date'
    const showCompleted = params.showCompleted !== false

    // Apply filtering
    let filteredTodos = [...todos]
    if (!showCompleted) {
      filteredTodos = filteredTodos.filter((t: any) => !t.completed)
    }
    if (filter === 'active') {
      filteredTodos = filteredTodos.filter((t: any) => !t.completed)
    } else if (filter === 'completed') {
      filteredTodos = filteredTodos.filter((t: any) => t.completed)
    } else if (filter === 'high-priority') {
      filteredTodos = filteredTodos.filter((t: any) => t.priority === 'high')
    }

    // Apply sorting
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      filteredTodos.sort((a: any, b: any) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
      )
    } else if (sortBy === 'alphabetical') {
      filteredTodos.sort((a: any, b: any) =>
        (a.title || '').localeCompare(b.title || '')
      )
    }

    // Generate the iframe URL with all parameters
    const queryParams = new URLSearchParams({
      todos: JSON.stringify(filteredTodos),
      filter,
      sortBy,
      showCompleted: String(showCompleted)
    })

    return {
      content: {
        type: 'externalUrl',
        iframeUrl: `http://localhost:${PORT}/mcp-use/widgets/todo-list?${queryParams}`,
        preferredFrameSize: {
          width: 700,
          height: 500
        }
      },
      text: `Displaying ${filteredTodos.length} todos (filter: ${filter}, sort: ${sortBy}, show completed: ${showCompleted})`
    }
  },
  returnTextContent: true,
})

// ===== TEST 4: Raw HTML UI Resource =====
server.uiResource({
  name: 'custom-html-widget',
  description: 'A widget that generates custom HTML',
  inputs: [
    {
      name: 'title',
      type: 'string',
      description: 'Widget title',
      required: true,
    },
    {
      name: 'data',
      type: 'object',
      description: 'Data to display',
      required: false,
      default: {}
    }
  ],
  fn: async (params) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${params.title}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .data-display {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${params.title}</h1>
        <div class="data-display">
            <pre>${JSON.stringify(params.data, null, 2)}</pre>
        </div>
        <p>Generated at: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
    `

    return {
      content: {
        type: 'rawHtml',  // Changed from 'html' to 'rawHtml' for MCP-UI
        htmlString: html,  // Changed from 'html' to 'htmlString'
        preferredFrameSize: {
          width: 650,
          height: 400
        }
      },
      text: `Generated HTML widget: ${params.title}`
    }
  },
  returnTextContent: true,
})

// ===== TEST 5: Auto-discover widgets (commented out to avoid conflicts) =====
// Uncomment this to test auto-discovery of all widgets in dist/resources/mcp-use/widgets
// server.autoDiscoverWidgets()

// ===== TEST 6: Tool that returns proper MCP-UI resource =====
server.tool({
  name: 'create-multi-widget-dashboard',
  description: 'Creates a dashboard with multiple widgets using proper MCP-UI format',
  inputs: [
    {
      name: 'widgets',
      type: 'array',
      description: 'Array of widget configurations',
      required: true,
    },
    {
      name: 'layout',
      type: 'string',
      description: 'Layout type: grid, column, row',
      required: false,
      default: 'grid'
    }
  ],
  fn: async (params) => {
    const widgets = params.widgets || []
    const layout = params.layout || 'grid'

    // Generate dashboard HTML
    const layoutStyles = {
      grid: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;',
      column: 'display: flex; flex-direction: column; gap: 20px;',
      row: 'display: flex; flex-direction: row; gap: 20px; overflow-x: auto;'
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Multi-Widget Dashboard</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            background: #f0f2f5;
        }
        .dashboard {
            ${layoutStyles[layout as keyof typeof layoutStyles]}
        }
        .widget-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            min-width: 350px;
        }
        .widget-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #1a1a1a;
        }
        .widget-content {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            min-height: 200px;
        }
        iframe {
            width: 100%;
            height: 400px;
            border: none;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <h1>Dashboard (${layout} layout)</h1>
    <div class="dashboard">
        ${widgets.map((widget: any) => `
        <div class="widget-container">
            <div class="widget-title">${widget.title || 'Widget'}</div>
            <div class="widget-content">
                ${widget.type === 'iframe'
                  ? `<iframe src="${widget.url || `http://localhost:${PORT}/mcp-use/widgets/${widget.name}`}"></iframe>`
                  : `<div>${widget.content || 'No content'}</div>`
                }
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>
    `

    // Create the UI resource using proper MCP-UI format
    const uiResource = createUIResource({
      uri: 'ui://dashboard/multi',
      content: {
        type: 'rawHtml',
        htmlString: html
      },
      encoding: 'text',
      metadata: {
        title: 'Multi-Widget Dashboard',
        description: `Dashboard with ${widgets.length} widgets in ${layout} layout`
      }
    })

    // Return the UI resource information as text
    // MCP tools can't directly return 'resource' type in content
    return {
      content: [
        {
          type: 'text',
          text: `Created dashboard with ${widgets.length} widgets in ${layout} layout\n\nUI Resource: ui://dashboard/multi\n${JSON.stringify(uiResource)}`
        }
      ]
    }
  }
})

// ===== TEST 7: Tool that validates parameters =====
server.tool({
  name: 'test-parameter-validation',
  description: 'Tests parameter validation and transformation',
  inputs: [
    {
      name: 'stringParam',
      type: 'string',
      description: 'A string parameter',
      required: true,
    },
    {
      name: 'numberParam',
      type: 'number',
      description: 'A number parameter',
      required: false,
      default: 42
    },
    {
      name: 'booleanParam',
      type: 'boolean',
      description: 'A boolean parameter',
      required: false,
      default: false
    },
    {
      name: 'arrayParam',
      type: 'array',
      description: 'An array parameter',
      required: false,
      default: []
    },
    {
      name: 'objectParam',
      type: 'object',
      description: 'An object parameter',
      required: false,
      default: {}
    }
  ],
  fn: async (params) => {
    // All parameters are already validated and have correct types
    const validation = {
      stringParam: {
        value: params.stringParam,
        type: typeof params.stringParam,
        isString: typeof params.stringParam === 'string'
      },
      numberParam: {
        value: params.numberParam,
        type: typeof params.numberParam,
        isNumber: typeof params.numberParam === 'number'
      },
      booleanParam: {
        value: params.booleanParam,
        type: typeof params.booleanParam,
        isBoolean: typeof params.booleanParam === 'boolean'
      },
      arrayParam: {
        value: params.arrayParam,
        type: Array.isArray(params.arrayParam) ? 'array' : typeof params.arrayParam,
        isArray: Array.isArray(params.arrayParam)
      },
      objectParam: {
        value: params.objectParam,
        type: typeof params.objectParam,
        isObject: typeof params.objectParam === 'object' && !Array.isArray(params.objectParam)
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Parameter validation results:\n${JSON.stringify(validation, null, 2)}`
        }
      ]
    }
  }
})

// ===== TEST 8: Traditional resources for comparison =====
server.resource({
  uri: 'test://server-info',
  name: 'Test Server Info',
  description: 'Information about the test server',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      name: 'ui-test-server',
      version: '2.0.0',
      status: 'running',
      port: PORT,
      features: [
        'uiResource method',
        'Parameter validation',
        'Auto widget discovery',
        'MCP-UI format support',
        'Multiple content types (externalUrl, rawHtml)',
        'Custom handlers',
        'Hybrid text/UI responses'
      ],
      testEndpoints: {
        widgets: `http://localhost:${PORT}/mcp-use/widgets`,
        mcp: `http://localhost:${PORT}/mcp`,
      },
      timestamp: new Date().toISOString(),
    }, null, 2)
  }
})

console.log('🚀 Starting UI Test Server with New Features...')
console.log('📋 Server: ui-test-server v2.0.0')
console.log('')
console.log('✨ New Features Being Tested:')
console.log('  1. uiResource() method with automatic widget serving')
console.log('  2. Input validation and type transformation')
console.log('  3. Custom handlers for UI resources')
console.log('  4. Raw HTML and external URL content types')
console.log('  5. Hybrid text/UI responses')
console.log('  6. Proper MCP-UI format (application/vnd.mcp-ui.resource)')
console.log('')
console.log('🧪 UI Resources Registered:')
console.log('  - simple-dashboard (no inputs)')
console.log('  - kanban-board (with array/number validation)')
console.log('  - todo-list-advanced (with custom handler)')
console.log('  - custom-html-widget (generates raw HTML)')
console.log('')
console.log('🛠️ Test Tools:')
console.log('  - show-simple-dashboard')
console.log('  - show-kanban-board')
console.log('  - show-todo-list-advanced')
console.log('  - show-custom-html-widget')
console.log('  - create-multi-widget-dashboard')
console.log('  - test-parameter-validation')
console.log('')
console.log(`📡 Server running at http://localhost:${PORT}`)
console.log(`📦 Widgets served at http://localhost:${PORT}/mcp-use/widgets`)
console.log(`🔌 MCP endpoint at http://localhost:${PORT}/mcp`)

// Start the server
server.listen(PORT)