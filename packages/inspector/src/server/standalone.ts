import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import faviconProxy from './favicon-proxy.js'
import { MCPInspector } from './mcp-inspector.js'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// Mount favicon proxy
app.route('/api/favicon', faviconProxy)

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// MCP Inspector routes
const mcpInspector = new MCPInspector()

// List available MCP servers
app.get('/api/servers', async (c) => {
  try {
    const servers = await mcpInspector.listServers()
    return c.json({ servers })
  }
  catch {
    return c.json({ error: 'Failed to list servers' }, 500)
  }
})

// Connect to an MCP server
app.post('/api/servers/connect', async (c) => {
  try {
    const { url, command } = await c.req.json()
    const server = await mcpInspector.connectToServer(url, command)
    return c.json({ server })
  }
  catch {
    return c.json({ error: 'Failed to connect to server' }, 500)
  }
})

// Get server details
app.get('/api/servers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const server = await mcpInspector.getServer(id)
    if (!server) {
      return c.json({ error: 'Server not found' }, 404)
    }
    return c.json({ server })
  }
  catch {
    return c.json({ error: 'Failed to get server details' }, 500)
  }
})

// Execute a tool on a server
app.post('/api/servers/:id/tools/:toolName/execute', async (c) => {
  try {
    const id = c.req.param('id')
    const toolName = c.req.param('toolName')
    const input = await c.req.json()

    const result = await mcpInspector.executeTool(id, toolName, input)
    return c.json({ result })
  }
  catch {
    return c.json({ error: 'Failed to execute tool' }, 500)
  }
})

// Get server tools
app.get('/api/servers/:id/tools', async (c) => {
  try {
    const id = c.req.param('id')
    const tools = await mcpInspector.getServerTools(id)
    return c.json({ tools })
  }
  catch {
    return c.json({ error: 'Failed to get server tools' }, 500)
  }
})

// Get server resources
app.get('/api/servers/:id/resources', async (c) => {
  try {
    const id = c.req.param('id')
    const resources = await mcpInspector.getServerResources(id)
    return c.json({ resources })
  }
  catch {
    return c.json({ error: 'Failed to get server resources' }, 500)
  }
})

// Disconnect from a server
app.delete('/api/servers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await mcpInspector.disconnectServer(id)
    return c.json({ success: true })
  }
  catch {
    return c.json({ error: 'Failed to disconnect server' }, 500)
  }
})

const port = 3001

// Start the server using Node.js
serve({
  fetch: app.fetch,
  port,
})

// eslint-disable-next-line no-console
console.log(`🚀 MCP Inspector Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
