# UI Template Usage Guide

The UI template provides a complete development environment for creating interactive MCP widgets with React components, hot reloading, and production builds.

## Quick Start

```bash
# Create a new UI MCP server
npx create-mcp-app my-ui-server --template ui

# Navigate to the project
cd my-ui-server

# Install dependencies
npm install

# Start development with hot reloading
npm run dev
```

This will start:

- **MCP Server** on `http://localhost:3000`
- **Vite Dev Server** on `http://localhost:3001` (with hot reloading)

## Development Workflow

### 1. Widget Development

Visit your widgets during development:

- Kanban Board: `http://localhost:3001/kanban-board.html`
- Todo List: `http://localhost:3001/todo-list.html`
- Data Visualization: `http://localhost:3001/data-visualization.html`

### 2. Hot Reloading

Edit any `.tsx` file in the `resources/` folder and see changes instantly!

```typescript
// resources/my-widget.tsx
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'

const MyWidget: React.FC = () => {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px' }}>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}

// Render the component
const container = document.getElementById('my-widget-root')
if (container) {
  const root = createRoot(container)
  root.render(<MyWidget />)
}
```

### 3. Production Build

```bash
# Build everything for production
npm run build

# Start production server
npm start
```

## Available Widgets

### 1. Kanban Board

**Features:**

- Drag and drop tasks between columns
- Add/remove tasks with priority levels
- Assignee management
- Real-time updates

**Usage:**

```typescript
// MCP Tool
mcp.tool({
  name: 'show-kanban',
  inputs: [{ name: 'tasks', type: 'string', required: true }],
  fn: async ({ tasks }) => {
    const taskData = JSON.parse(tasks)
    return `Displayed Kanban board with ${taskData.length} tasks`
  }
})

// Example task data
const tasks = [
  {
    id: '1',
    title: 'Design UI mockups',
    description: 'Create wireframes for the new dashboard',
    status: 'todo',
    priority: 'high',
    assignee: 'Alice'
  },
  {
    id: '2',
    title: 'Implement authentication',
    description: 'Add login and registration functionality',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Bob'
  }
]
```

### 2. Todo List

**Features:**

- Add/complete/delete todos
- Filter by status (all/active/completed)
- Sort by priority, due date, or creation time
- Progress tracking with visual indicators
- Categories and due dates

**Usage:**

```typescript
// MCP Tool
mcp.tool({
  name: 'show-todo-list',
  inputs: [{ name: 'todos', type: 'string', required: true }],
  fn: async ({ todos }) => {
    const todoData = JSON.parse(todos)
    return `Displayed Todo list with ${todoData.length} items`
  }
})

// Example todo data
const todos = [
  {
    id: '1',
    text: 'Complete project proposal',
    completed: false,
    priority: 'high',
    dueDate: '2024-01-15',
    category: 'Work'
  },
  {
    id: '2',
    text: 'Buy groceries',
    completed: false,
    priority: 'medium',
    dueDate: '2024-01-12',
    category: 'Personal'
  }
]
```

### 3. Data Visualization

**Features:**

- Bar charts, line charts, and pie charts
- Add/remove data points dynamically
- Interactive legends and tooltips
- Data table view
- Multiple chart types with smooth transitions

**Usage:**

```typescript
// MCP Tool
mcp.tool({
  name: 'show-data-viz',
  inputs: [
    { name: 'data', type: 'string', required: true },
    { name: 'chartType', type: 'string', required: false }
  ],
  fn: async ({ data, chartType = 'bar' }) => {
    const chartData = JSON.parse(data)
    return `Displayed ${chartType} chart with data`
  }
})

// Example chart data
const chartData = [
  { label: 'January', value: 65, color: '#3498db' },
  { label: 'February', value: 59, color: '#e74c3c' },
  { label: 'March', value: 80, color: '#2ecc71' },
  { label: 'April', value: 81, color: '#f39c12' }
]
```

## Creating Custom Widgets

### 1. Create Widget Files

```bash
# Create the React component
touch resources/my-custom-widget.tsx

# Create the HTML entry point
touch resources/my-custom-widget.html
```

### 2. Widget Component Structure

```typescript
// resources/my-custom-widget.tsx
import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

interface MyWidgetProps {
  initialData?: any
}

const MyCustomWidget: React.FC<MyWidgetProps> = ({ initialData = [] }) => {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  // Load data from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const dataParam = urlParams.get('data')

    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam))
        setData(parsedData)
      } catch (error) {
        console.error('Error parsing data:', error)
      }
    }
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Custom Widget</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {/* Your widget content */}
          {data.map((item: any, index: number) => (
            <div key={index}>
              {item.name}: {item.value}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Render the component
const container = document.getElementById('my-custom-widget-root')
if (container) {
  const root = createRoot(container)
  root.render(<MyCustomWidget />)
}
```

### 3. HTML Entry Point

```html
<!-- resources/my-custom-widget.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Custom Widget</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: #f5f5f5;
      }
      #my-custom-widget-root {
        max-width: 1200px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <div id="my-custom-widget-root"></div>
    <script type="module" src="./my-custom-widget.tsx"></script>
  </body>
</html>
```

### 4. Update Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  root: 'resources',
  build: {
    outDir: '../dist/resources',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'kanban-board': resolve(__dirname, 'resources/kanban-board.html'),
        'todo-list': resolve(__dirname, 'resources/todo-list.html'),
        'data-visualization': resolve(__dirname, 'resources/data-visualization.html'),
        'my-custom-widget': resolve(__dirname, 'resources/my-custom-widget.html')
      }
    }
  }
})
```

### 5. Add MCP Resource

```typescript
// src/server.ts
mcp.resource({
  uri: 'ui://widget/my-custom-widget',
  name: 'My Custom Widget',
  description: 'Interactive custom widget',
  mimeType: 'text/html+skybridge',
  fn: async () => {
    const widgetUrl = `http://localhost:${PORT}/mcp-use/widgets/my-custom-widget`
    return `
<div id="my-custom-widget-root"></div>
<script type="module" src="${widgetUrl}"></script>
    `.trim()
  }
})
```

### 6. Add MCP Tool

```typescript
// src/server.ts
mcp.tool({
  name: 'show-my-widget',
  description: 'Display my custom widget',
  inputs: [
    {
      name: 'data',
      type: 'string',
      description: 'JSON string of data to display',
      required: true
    }
  ],
  fn: async ({ data }: { data: string }) => {
    try {
      const widgetData = JSON.parse(data)
      return `Displayed custom widget with ${widgetData.length} items at http://localhost:${PORT}/mcp-use/widgets/my-custom-widget`
    }
    catch (error) {
      return `Error parsing data: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    }
  }
})
```

## Development Scripts

### Available Commands

```bash
# Development
npm run dev          # Start both MCP server and Vite dev server
npm run dev:server   # Start only MCP server
npm run dev:ui       # Start only Vite dev server

# Production
npm run build        # Build everything
npm start           # Start production server
npm run preview     # Preview built files
```

### Development URLs

- **MCP Server**: `http://localhost:3000`
- **Vite Dev Server**: `http://localhost:3001`
- **Widgets**:
  - `http://localhost:3001/kanban-board.html`
  - `http://localhost:3001/todo-list.html`
  - `http://localhost:3001/data-visualization.html`
  - `http://localhost:3001/my-custom-widget.html`

## Production Deployment

### Build Process

```bash
# Build everything
npm run build

# This creates:
# - dist/server.js (MCP server)
# - dist/resources/ (UI widgets)
```

### Production URLs

- **MCP Server**: `http://localhost:3000`
- **Widgets**: `http://localhost:3000/mcp-use/widgets/{widget-name}`

### Environment Variables

```bash
# .env
PORT=3000
NODE_ENV=production
```

## Advanced Features

### Data Passing

Pass data to widgets via URL parameters:

```typescript
// Example: Pass tasks to Kanban board
const tasks = [
  { id: '1', title: 'Task 1', status: 'todo', priority: 'high' },
  { id: '2', title: 'Task 2', status: 'in-progress', priority: 'medium' }
]

const widgetUrl = `http://localhost:3001/kanban-board.html?tasks=${encodeURIComponent(JSON.stringify(tasks))}`
```

### Styling Guidelines

```typescript
// Use consistent styling
const styles = {
  container: {
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  button: {
    padding: '8px 16px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  }
}
```

### Error Handling

```typescript
const MyWidget: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState([])

  useEffect(() => {
    try {
      // Load data
      const urlParams = new URLSearchParams(window.location.search)
      const dataParam = urlParams.get('data')

      if (dataParam) {
        const parsedData = JSON.parse(decodeURIComponent(dataParam))
        setData(parsedData)
      }
    } catch (error) {
      setError('Failed to load data')
      console.error('Error:', error)
    }
  }, [])

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#e74c3c' }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div>
      {/* Widget content */}
    </div>
  )
}
```

## Troubleshooting

### Common Issues

1. **Hot reloading not working**

   - Check that Vite dev server is running on port 3001
   - Verify the widget HTML file exists
   - Check browser console for errors

2. **Widget not loading**

   - Ensure the widget is added to vite.config.ts
   - Check that the MCP resource is properly configured
   - Verify the HTML entry point exists

3. **Build errors**

   - Run `npm run build` to see detailed errors
   - Check that all imports are correct
   - Verify TypeScript configuration

4. **Data not loading**
   - Check URL parameter format
   - Verify JSON parsing
   - Use browser dev tools to debug

### Development Tips

- Use React DevTools browser extension
- Check Network tab for failed requests
- Monitor console for errors
- Use TypeScript for better error catching

## Learn More

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [MCP Documentation](https://modelcontextprotocol.io)
- [mcp-use Documentation](https://docs.mcp-use.io)

Happy coding! 🚀
