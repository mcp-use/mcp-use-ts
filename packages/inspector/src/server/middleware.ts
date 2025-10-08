import type { Express, Request, Response } from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  const clientDistPath = join(__dirname, '../../dist/client')

  if (!existsSync(clientDistPath)) {
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

  // Serve static assets
  app.use(`${basePath}/assets`, (_req: Request, res: Response) => {
    const assetPath = join(clientDistPath, 'assets', _req.path)
    if (existsSync(assetPath)) {
      // Set appropriate content type
      if (assetPath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript')
      }
      else if (assetPath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css')
      }
      res.sendFile(assetPath)
    }
    else {
      res.status(404).send('Asset not found')
    }
  })

  // Serve the main HTML file for all inspector routes
  app.get(`${basePath}*`, (_req: Request, res: Response) => {
    const indexPath = join(clientDistPath, 'index.html')

    if (!existsSync(indexPath)) {
      res.status(500).send('Inspector UI not found. Please build the inspector package.')
      return
    }

    // Serve the HTML file (Vite built with base: '/inspector/')
    res.sendFile(indexPath)
  })

  console.log(`🔍 MCP Inspector mounted at ${basePath}`)
}
