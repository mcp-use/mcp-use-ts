import { createServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { globby } from 'globby'

const ROUTE_PREFIX = '/mcp-use/widgets'
const SRC_DIR = 'resources'

interface WidgetEntry {
  name: string
  path: string
  route: string
}

async function discoverWidgets(projectPath: string): Promise<WidgetEntry[]> {
  const srcDir = path.join(projectPath, SRC_DIR)
  const entries = await globby([`${srcDir}/**/*.tsx`])
  
  return entries.map(entry => {
    const relativePath = path.relative(path.join(projectPath, SRC_DIR), entry)
    const name = path.parse(entry).name
    const route = `${ROUTE_PREFIX}/${relativePath.replace(/\.tsx?$/, '')}`
    
    return { name, path: entry, route }
  })
}

function htmlTemplate(scriptPath: string, title: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title} Widget</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: #f5f5f5;
      }
      #widget-root {
        max-width: 1200px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <div id="widget-root"></div>
    <script type="module" src="${scriptPath}"></script>
  </body>
</html>`
}

export async function startDevServer(projectPath: string, port: number = 5173): Promise<{ server: ViteDevServer; port: number }> {
  const widgets = await discoverWidgets(projectPath)
  
  const server = await createServer({
    root: projectPath,
    server: {
      port,
      strictPort: false,
      cors: true,
      hmr: {
        overlay: true,
      },
    },
    plugins: [
      react(),
      {
        name: 'mcp-widget-html',
        apply: 'serve',
        configureServer(server) {
          // Serve widget HTML pages
          server.middlewares.use(async (req, res, next) => {
            // Early check before processing
            if (!req.url?.startsWith(ROUTE_PREFIX)) {
              return next()
            }
            
            // Find matching widget (strip query string for matching)
            const urlWithoutQuery = req.url?.split('?')[0]
            const widget = widgets.find(w => urlWithoutQuery === w.route)
            
            if (!widget) {
              return next()
            }
            
            // Serve HTML with the widget entry point
            const relativeWidgetPath = '/' + path.relative(projectPath, widget.path)
            const html = htmlTemplate(relativeWidgetPath, widget.name)
            
            // Transform HTML to inject Vite's HMR client
            const transformedHtml = await server.transformIndexHtml(req.url, html)
            
            res.setHeader('Content-Type', 'text/html')
            res.end(transformedHtml)
          })
        },
      },
    ],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  })
  
  await server.listen()
  
  const actualPort = server.config.server.port || port
  
  console.log(`\x1b[32m✓\x1b[0m Vite dev server with HMR started on port ${actualPort}`)
  console.log(`\x1b[90m  ${widgets.length} widget(s) available:\x1b[0m`)
  for (const widget of widgets) {
    console.log(`\x1b[90m  - http://localhost:${actualPort}${widget.route}\x1b[0m`)
  }
  
  return { server, port: actualPort }
}

