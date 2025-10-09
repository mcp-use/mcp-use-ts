import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import faviconProxy from './favicon-proxy.js'
import { MCPInspector } from './mcp-inspector.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const execAsync = promisify(exec)

// Find available port starting from 8080
async function findAvailablePort(startPort = 8080): Promise<number> {
  const net = await import('node:net')

  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer()
        server.listen(port, () => {
          server.close(() => resolve())
        })
        server.on('error', () => reject(new Error(`Port ${port} is in use`)))
      })
      return port
    }
    catch {
      continue
    }
  }
  throw new Error(`No available port found starting from ${startPort}`)
}

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

// Serve static assets from the built client
const clientDistPath = join(__dirname, '../../dist/client')

if (existsSync(clientDistPath)) {
  // Serve static assets from /inspector/assets/* (matching Vite's base path)
  app.get('/inspector/assets/*', async (c) => {
    const path = c.req.path.replace('/inspector/assets/', 'assets/')
    const fullPath = join(clientDistPath, path)

    if (existsSync(fullPath)) {
      const content = await import('node:fs').then(fs => fs.readFileSync(fullPath))

      // Set appropriate content type based on file extension
      if (path.endsWith('.js')) {
        c.header('Content-Type', 'application/javascript')
      }
      else if (path.endsWith('.css')) {
        c.header('Content-Type', 'text/css')
      }
      else if (path.endsWith('.svg')) {
        c.header('Content-Type', 'image/svg+xml')
      }

      return c.body(content)
    }

    return c.notFound()
  })

  // Redirect root path to /inspector
  app.get('/', (c) => {
    return c.redirect('/inspector')
  })

  // Serve the main HTML file for /inspector and all other routes (SPA routing)
  app.get('*', (c) => {
    const indexPath = join(clientDistPath, 'index.html')
    if (existsSync(indexPath)) {
      const content = import('node:fs').then(fs => fs.readFileSync(indexPath, 'utf-8'))
      return c.html(content)
    }
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MCP Inspector</title>
        </head>
        <body>
          <h1>MCP Inspector</h1>
          <p>Client files not found. Please run 'yarn build' to build the UI.</p>
          <p>API is available at <a href="/api/servers">/api/servers</a></p>
        </body>
      </html>
    `)
  })
}
else {
  console.warn(`⚠️  MCP Inspector client files not found at ${clientDistPath}`)
  console.warn(`   Run 'yarn build' in the inspector package to build the UI`)

  // Fallback for when client is not built
  app.get('*', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MCP Inspector</title>
        </head>
        <body>
          <h1>MCP Inspector</h1>
          <p>Client files not found. Please run 'yarn build' to build the UI.</p>
          <p>API is available at <a href="/api/servers">/api/servers</a></p>
        </body>
      </html>
    `)
  })
}

// Start the server with automatic port selection
async function startServer() {
  try {
    const port = await findAvailablePort()

    serve({
      fetch: app.fetch,
      port,
    })

    console.log(`🚀 MCP Inspector running on http://localhost:${port}`)

    // Auto-open browser in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        const command = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
        await execAsync(`${command} http://localhost:${port}`)
        console.log(`🌐 Browser opened automatically`)
      }
      catch (error) {
        console.log(`🌐 Please open http://localhost:${port} in your browser`)
      }
    }

    return { port, fetch: app.fetch }
  }
  catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export default { startServer }
