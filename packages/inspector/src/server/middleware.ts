import type { Express, Request, Response } from 'express'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkClientFiles, fetchFavicon, getClientDistPath, getContentType, handleChatRequest } from './shared-utils.js'

/**
 * Mount the MCP Inspector UI at a specified path on an Express app
 * Similar to how FastAPI mounts Swagger UI at /docs
 *
 * @param app - Express application instance
 * @param path - Mount path (default: '/inspector')
 * @param mcpServerUrl - Optional MCP server URL to auto-connect to
 *
 * @example
 * ```typescript
 * import { createMCPServer } from 'mcp-use'
 * import { mountInspector } from '@mcp-use/inspector'
 *
 * const server = createMCPServer('my-server')
 * mountInspector(server) // Mounts at /inspector
 * ```
 */
export function mountInspector(app: Express, path: string = '/inspector', mcpServerUrl?: string): void {
  // Ensure path starts with /
  const basePath = path.startsWith('/') ? path : `/${path}`

  // Find the built client files
  const clientDistPath = getClientDistPath()

  if (!checkClientFiles(clientDistPath)) {
    console.warn(`⚠️  MCP Inspector client files not found at ${clientDistPath}`)
    console.warn(`   Run 'yarn build' in the inspector package to build the UI`)
    return
  }

  // Serve inspector config endpoint
  app.get(`${basePath}/config.json`, (_req: Request, res: Response) => {
    res.json({
      autoConnectUrl: mcpServerUrl || null,
    })
  })

  // Chat API endpoint - handles MCP agent chat with custom LLM key
  app.post(`${basePath}/api/chat`, async (req: Request, res: Response) => {
    try {
      const result = await handleChatRequest(req.body)
      res.json(result)
    }
    catch (error) {
      console.error('Chat API error:', error)
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to process chat request',
      })
    }
  })

  // Favicon proxy endpoint
  app.get(`${basePath}/api/favicon/:url`, async (req: Request, res: Response) => {
    const url = req.params.url

    if (!url) {
      res.status(400).json({ error: 'URL parameter is required' })
      return
    }

    try {
      const result = await fetchFavicon(url)

      if (result) {
        res.setHeader('Content-Type', result.contentType)
        res.setHeader('Cache-Control', 'public, max-age=86400')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.send(Buffer.from(result.data))
        return
      }

      // If no favicon found, return 404
      res.status(404).json({ error: 'No favicon found' })
    }
    catch (error) {
      console.error('Favicon proxy error:', error)
      res.status(400).json({ error: 'Invalid URL or fetch failed' })
    }
  })

  // Serve static assets
  app.use(`${basePath}/assets`, (_req: Request, res: Response) => {
    const assetPath = join(clientDistPath, 'assets', _req.path)
    if (existsSync(assetPath)) {
      // Set appropriate content type
      const contentType = getContentType(assetPath)
      res.setHeader('Content-Type', contentType)
      res.sendFile(assetPath)
    }
    else {
      res.status(404).send('Asset not found')
    }
  })

  // Handle OAuth callback redirects - redirect /oauth/callback to /inspector/oauth/callback
  // This helps when OAuth providers are configured with the wrong redirect URL
  if (basePath !== '') {
    app.get('/oauth/callback', (req: Request, res: Response) => {
      const queryString = req.url.split('?')[1] || ''
      const redirectUrl = queryString
        ? `${basePath}/oauth/callback?${queryString}`
        : `${basePath}/oauth/callback`
      res.redirect(302, redirectUrl)
    })
  }

  // Serve the main HTML file for the root inspector path (exact match)
  app.get(basePath, (_req: Request, res: Response) => {
    const indexPath = join(clientDistPath, 'index.html')

    if (!existsSync(indexPath)) {
      res.status(500).send('Inspector UI not found. Please build the inspector package.')
      return
    }

    // Serve the HTML file (Vite built with base: '/inspector')
    res.sendFile(indexPath)
  })

  // Redirect /inspector/ to /inspector (remove trailing slash)
  app.get(`${basePath}/`, (_req: Request, res: Response) => {
    res.redirect(301, basePath)
  })

  // Serve the main HTML file for all other inspector routes (SPA routing)
  app.get(`${basePath}/*`, (_req: Request, res: Response) => {
    const indexPath = join(clientDistPath, 'index.html')

    if (!existsSync(indexPath)) {
      res.status(500).send('Inspector UI not found. Please build the inspector package.')
      return
    }

    // Serve the HTML file (Vite built with base: '/inspector')
    res.sendFile(indexPath)
  })
}
