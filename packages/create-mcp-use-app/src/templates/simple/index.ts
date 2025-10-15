import express from 'express'
import cors from 'cors'
import server from './src/server.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Mount MCP server at /mcp
server.mount(app, '/mcp')

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'simple-calculator' })
})

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] Listening on http://localhost:${PORT}`)
  console.log(`[MCP] Server mounted at http://localhost:${PORT}/mcp`)
})

