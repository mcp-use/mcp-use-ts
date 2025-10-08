import { create } from 'mcp-use/server'
import { readFileSync } from 'node:fs'
import { z } from 'zod'

// Create an MCP server
const mcp = create('kanban-server', {
  version: '1.0.0',
  description: 'A Kanban board MCP server with UI widgets'
})

// Load locally built assets (produced by your component build)
const KANBAN_JS = readFileSync('web/dist/kanban.js', 'utf8')
const KANBAN_CSS = (() => {
  try {
    return readFileSync('web/dist/kanban.css', 'utf8')
  } catch {
    return '' // CSS optional
  }
})()

// UI resource (no inline data assignment; host will inject data)
mcp.resource({
  uri: 'ui://widget/kanban-board.html',
  name: 'Kanban Board Widget',
  description: 'Interactive Kanban board widget',
  mimeType: 'text/html+skybridge',
  fn: async () => {
    return `
<div id="kanban-root"></div>
${KANBAN_CSS ? `<style>${KANBAN_CSS}</style>` : ''}
<script type="module">${KANBAN_JS}</script>
    `.trim()
  }
})

// Define a tool for showing the kanban board
mcp.tool({
  name: 'kanban-board',
  description: 'Show Kanban Board',
  inputs: [
    {
      name: 'tasks',
      type: 'string',
      description: 'JSON string of tasks to display',
      required: true
    }
  ],
  fn: async ({ tasks }) => {
    // Parse and validate tasks
    try {
      const taskData = JSON.parse(tasks)
      return `Displayed the kanban board with ${taskData.length || 0} tasks!`
    } catch (error) {
      return `Error parsing tasks: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    }
  }
})

// Define a prompt for task management
mcp.prompt({
  name: 'task-planning',
  description: 'Generate a task planning prompt',
  args: [
    {
      name: 'project',
      type: 'string',
      description: 'Project name',
      required: true
    },
    {
      name: 'deadline',
      type: 'string',
      description: 'Project deadline',
      required: false
    }
  ],
  fn: async ({ project, deadline }) => {
    const deadlineText = deadline ? ` with a deadline of ${deadline}` : ''
    return `Let's plan the ${project} project${deadlineText}. Please break down the work into manageable tasks and organize them by priority.`
  }
})

// Start the server
mcp.serve().catch(console.error)
