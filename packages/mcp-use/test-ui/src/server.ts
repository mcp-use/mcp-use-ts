import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import cors from 'cors'
import express from 'express'
import { create } from '../../dist/index.js'

// Create an MCP server with UI support
const mcp = create('ui-mcp-server', {
  version: '1.0.0',
  description: 'An MCP server with React UI widgets',
})

// Express server for serving UI resources
const app = express()
app.use(cors())
app.use(express.json())

// Serve UI widgets using file-based routing
// Serve static assets (JS, CSS) from the assets directory
app.get('/mcp-use/widgets/:widget/assets/*', (req, res, next) => {
  const widget = req.params.widget
  const assetFile = (req.params as any)[0]
  const assetPath = join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets', widget, 'assets', assetFile)
  res.sendFile(assetPath, err => (err ? next() : undefined))
})

// Handle assets served from the wrong path (browser resolves ./assets/ relative to /mcp-use/widgets/)
app.get('/mcp-use/widgets/assets/*', (req, res, next) => {
  const assetFile = (req.params as any)[0]
  // Try to find which widget this asset belongs to by checking all widget directories
  const widgetsDir = join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets')

  try {
    const widgets = readdirSync(widgetsDir)
    for (const widget of widgets) {
      const assetPath = join(widgetsDir, widget, 'assets', assetFile)
      if (existsSync(assetPath)) {
        return res.sendFile(assetPath)
      }
    }
    next()
  }
  catch {
    next()
  }
})

// Serve each widget's index.html at its route
// e.g. GET /mcp-use/widgets/kanban-board -> dist/resources/mcp-use/widgets/kanban-board/index.html
app.get('/mcp-use/widgets/:widget', (req, res, next) => {
  const filePath = join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets', req.params.widget, 'index.html')
  res.sendFile(filePath, err => (err ? next() : undefined))
})

// Pass the Express app to MCP for SSE transport
mcp.setExpressApp(app)

// Start Express server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🌐 UI server running on http://localhost:${PORT}`)
})

// MCP Resource for server status
mcp.resource({
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
mcp.resource({
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
mcp.resource({
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
mcp.resource({
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
mcp.tool({
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
      return `Displayed Kanban board with ${taskData.length || 0} tasks at http://localhost:${PORT}/mcp-use/widgets/kanban-board`
    }
    catch (error) {
      return `Error parsing tasks: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    }
  },
})

// Tool for showing Todo List
mcp.tool({
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
      return `Displayed Todo list with ${todoData.length || 0} items at http://localhost:${PORT}/mcp-use/widgets/todo-list`
    }
    catch (error) {
      return `Error parsing todos: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    }
  },
})

// Tool for showing Data Visualization
mcp.tool({
  name: 'show-data-viz',
  description: 'Display an interactive data visualization',
  inputs: [
    {
      name: 'data',
      type: 'string',
      description: 'JSON string of data to visualize',
      required: true,
    },
    {
      name: 'chartType',
      type: 'string',
      description: 'Type of chart (bar, line, pie)',
      required: false,
    },
  ],
  fn: async (params: Record<string, any>) => {
    const { data, chartType = 'bar' } = params
    try {
      const _chartData = JSON.parse(data)
      return `Displayed ${chartType} chart with data at http://localhost:${PORT}/mcp-use/widgets/data-visualization`
    }
    catch (error) {
      return `Error parsing data: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    }
  },
})

// Prompt for UI development
mcp.prompt({
  name: 'ui-development',
  description: 'Generate UI development prompts',
  args: [
    {
      name: 'component',
      type: 'string',
      description: 'Component name to develop',
      required: true,
    },
    {
      name: 'framework',
      type: 'string',
      description: 'UI framework (react, vue, svelte)',
      required: false,
    },
  ],
  fn: async (params: Record<string, any>) => {
    const { component, framework = 'react' } = params
    return `# ${framework} Component Development

## Component: ${component}

### Development Setup
1. Create your component in \`resources/${component}.tsx\`
2. Add an HTML entry point in \`resources/${component}.html\`
3. Run \`yarn dev\` to start development server
4. Visit http://localhost:3001/${component}.html for hot reloading

### Best Practices
- Use TypeScript for type safety
- Implement proper error boundaries
- Add loading states
- Make components responsive
- Test with different data sets

### MCP Integration
- Use \`ui://widget/${component}\` as the resource URI
- Implement proper data binding
- Add interactive features
- Ensure accessibility compliance`
  },
})

console.log('🚀 Starting UI MCP Server...')
console.log('📋 Server: ui-mcp-server v1.0.0')
console.log(`🌐 UI Server: http://localhost:${PORT}`)
console.log('📦 Resources: ui://status, ui://widget/kanban-board, ui://widget/todo-list, ui://widget/data-visualization')
console.log('🛠️  Tools: show-kanban, show-todo-list, show-data-viz')
console.log('💬 Prompts: ui-development')

// Start the MCP server with HTTP by default (use MCP_TRANSPORT=stdio env var for stdio)
console.log('📡 Setting up MCP server...')
mcp.serve({
  transport: (process.env.MCP_TRANSPORT as 'http' | 'stdio') || 'http',
  endpoint: '/mcp'
}).then(() => {
  const transport = process.env.MCP_TRANSPORT || 'http'
  if (transport === 'http') {
    console.log(`📡 MCP server accessible at: http://localhost:${PORT}/mcp`)
    console.log('✅ Server ready! Connect with MCP clients via HTTP (StreamableHTTP transport)')
  } else {
    console.log('✅ Server ready! Connect with MCP clients via stdio')
  }
}).catch((error) => {
  console.error('❌ Failed to start MCP server:', error)
})
