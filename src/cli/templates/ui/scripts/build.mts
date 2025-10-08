import { promises as fs } from 'node:fs'
import path from 'node:path'
// Using: esbuild + node >= 18
import { build } from 'esbuild'
import { globby } from 'globby'

const ROUTE_PREFIX = '/mcp-use/widgets' // <- MCP widget prefix
const SRC_DIR = 'resources'
const OUT_DIR = 'dist/resources'

function toRoute(file: string) {
  // resources/kanban-board.tsx -> /mcp-use/widgets/kanban-board
  // resources/dashboard/stats.tsx -> /mcp-use/widgets/dashboard/stats
  const rel = file.replace(new RegExp(`^${SRC_DIR}/`), '').replace(/\.tsx?$/, '')
  return `${ROUTE_PREFIX}/${rel}`
}

function outDirForRoute(route: string) {
  // dist/resources/mcp-use/widgets/kanban-board
  return path.join(OUT_DIR, route.replace(/^\//, ''))
}

function htmlTemplate({ title, scriptPath }: { title: string, scriptPath: string }) {
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

async function main() {
  console.log('🔨 Building UI widgets with esbuild...')

  // Clean dist
  await fs.rm(OUT_DIR, { recursive: true, force: true })

  // Find all TSX entries
  const entries = await globby([`${SRC_DIR}/**/*.tsx`])
  console.log(`📦 Found ${entries.length} widget files`)

  // Build each entry as an isolated page with hashed output
  for (const entry of entries) {
    const route = toRoute(entry)
    const pageOutDir = outDirForRoute(route)
    const baseName = path.parse(entry).name

    console.log(`🔨 Building ${baseName}...`)

    // Build JS/CSS chunks for this page
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      splitting: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2018',
      sourcemap: false,
      minify: true,
      outdir: path.join(pageOutDir, 'assets'),
      logLevel: 'silent',
      loader: {
        '.svg': 'file',
        '.png': 'file',
        '.jpg': 'file',
        '.jpeg': 'file',
        '.gif': 'file',
        '.css': 'css',
      },
      // Unique chunk names per page to avoid collisions
      entryNames: `[name]-[hash]`,
      chunkNames: `chunk-[hash]`,
      assetNames: `asset-[hash]`,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    })

    // Find the main entry file name
    const files = await fs.readdir(path.join(pageOutDir, 'assets'))
    const mainJs = files.find(f => f.startsWith(`${baseName}-`) && f.endsWith('.js'))
    if (!mainJs)
      throw new Error(`Failed to locate entry JS for ${entry}`)

    // Write an index.html that points to the entry
    await fs.mkdir(pageOutDir, { recursive: true })
    await fs.writeFile(
      path.join(pageOutDir, 'index.html'),
      htmlTemplate({
        title: baseName,
        scriptPath: `./assets/${mainJs}`,
      }),
      'utf8',
    )

    console.log(`✅ Built ${baseName} -> ${route}`)
  }

  console.log('🎉 Build complete!')
}

main().catch((err) => {
  console.error('❌ Build failed:', err)
  process.exit(1)
})
