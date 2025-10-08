import { promises as fs } from 'node:fs'
import path from 'node:path'
import { build, context } from 'esbuild'
import { globby } from 'globby'

const ROUTE_PREFIX = '/mcp-use/widgets'
const SRC_DIR = 'resources'
const OUT_DIR = 'dist/resources'

function toRoute(file: string) {
  const rel = file.replace(new RegExp(`^${SRC_DIR}/`), '').replace(/\.tsx?$/, '')
  return `${ROUTE_PREFIX}/${rel}`
}

function outDirForRoute(route: string) {
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

async function buildWidget(entry: string, projectPath: string, minify = true) {
  const relativePath = path.relative(projectPath, entry)
  const route = toRoute(relativePath)
  const pageOutDir = path.join(projectPath, outDirForRoute(route))
  const baseName = path.parse(entry).name

  // Build JS/CSS chunks for this page
  await build({
    entryPoints: [entry],
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2018',
    sourcemap: !minify,
    minify,
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
    entryNames: `[name]-[hash]`,
    chunkNames: `chunk-[hash]`,
    assetNames: `asset-[hash]`,
    define: {
      'process.env.NODE_ENV': minify ? '"production"' : '"development"',
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

  return { baseName, route }
}

export async function buildWidgets(projectPath: string, watch = false) {
  console.log(`🔨 Building UI widgets with esbuild${watch ? ' (watch mode)' : ''}...`)

  const srcDir = path.join(projectPath, SRC_DIR)
  const outDir = path.join(projectPath, OUT_DIR)

  // Clean dist
  await fs.rm(outDir, { recursive: true, force: true })

  // Find all TSX entries
  const entries = await globby([`${srcDir}/**/*.tsx`])
  console.log(`📦 Found ${entries.length} widget files`)

  if (watch) {
    // Watch mode
    for (const entry of entries) {
      const relativePath = path.relative(projectPath, entry)
      const route = toRoute(relativePath)
      const pageOutDir = path.join(projectPath, outDirForRoute(route))
      const baseName = path.parse(entry).name

      const ctx = await context({
        entryPoints: [entry],
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2018',
        sourcemap: true,
        minify: false,
        outdir: path.join(pageOutDir, 'assets'),
        logLevel: 'info',
        loader: {
          '.svg': 'file',
          '.png': 'file',
          '.jpg': 'file',
          '.jpeg': 'file',
          '.gif': 'file',
          '.css': 'css',
        },
        entryNames: `[name]-[hash]`,
        chunkNames: `chunk-[hash]`,
        assetNames: `asset-[hash]`,
        define: {
          'process.env.NODE_ENV': '"development"',
        },
        plugins: [{
          name: 'html-writer',
          setup(build) {
            build.onEnd(async () => {
              try {
                const files = await fs.readdir(path.join(pageOutDir, 'assets'))
                const mainJs = files.find(f => f.startsWith(`${baseName}-`) && f.endsWith('.js'))
                if (mainJs) {
                  await fs.mkdir(pageOutDir, { recursive: true })
                  await fs.writeFile(
                    path.join(pageOutDir, 'index.html'),
                    htmlTemplate({
                      title: baseName,
                      scriptPath: `./assets/${mainJs}`,
                    }),
                    'utf8',
                  )
                }
              } catch (err) {
                console.error(`Error writing HTML for ${baseName}:`, err)
              }
            })
          },
        }],
      })

      await ctx.watch()
      console.log(`👀 Watching ${baseName}...`)
    }

    console.log('👀 Watching for changes... Press Ctrl+C to stop.')
  }
  else {
    // Build once
    for (const entry of entries) {
      console.log(`🔨 Building ${path.parse(entry).name}...`)
      const { baseName, route } = await buildWidget(entry, projectPath)
      console.log(`✅ Built ${baseName} -> ${route}`)
    }

    console.log('🎉 Build complete!')
  }
}


