import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WidgetManifest, InputDefinition } from './types.js'

/**
 * Discover all widgets in a directory
 * @param widgetDir - Directory containing widget builds
 * @returns Array of widget manifests
 */
export function discoverWidgets(widgetDir: string): WidgetManifest[] {
  const manifests: WidgetManifest[] = []

  if (!existsSync(widgetDir)) {
    return manifests
  }

  try {
    const entries = readdirSync(widgetDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const widgetPath = join(widgetDir, entry.name)
        const indexPath = join(widgetPath, 'index.html')

        if (existsSync(indexPath)) {
          // Try to read widget metadata
          const manifest: WidgetManifest = {
            name: entry.name,
            path: entry.name,
            description: `Interactive ${entry.name} widget`,
          }

          // Try to read a manifest file if it exists
          const manifestPath = join(widgetPath, 'manifest.json')
          if (existsSync(manifestPath)) {
            try {
              const manifestData = JSON.parse(readFileSync(manifestPath, 'utf-8'))
              manifest.props = manifestData.props || {}
              manifest.description = manifestData.description || manifest.description
            } catch (err) {
              // Ignore manifest parsing errors
            }
          }

          manifests.push(manifest)
        }
      }
    }
  } catch (err) {
    console.error('Error discovering widgets:', err)
  }

  return manifests
}

/**
 * Convert widget props to input definitions
 * @param props - Widget props object
 * @returns Array of input definitions
 */
export function propsToInputs(props: Record<string, any>): InputDefinition[] {
  const inputs: InputDefinition[] = []

  for (const [name, propDef] of Object.entries(props)) {
    let input: InputDefinition

    if (typeof propDef === 'string') {
      // Simple type string
      input = {
        name,
        type: propDef as InputDefinition['type'],
        required: true,
      }
    } else if (typeof propDef === 'object') {
      // Complex prop definition
      input = {
        name,
        type: propDef.type || 'string',
        description: propDef.description,
        required: propDef.required !== false,
        default: propDef.default,
      }
    } else {
      // Default to string
      input = {
        name,
        type: 'string',
        required: false,
      }
    }

    inputs.push(input)
  }

  return inputs
}

/**
 * Auto-register all widgets in a directory
 * @param server - MCP server instance
 * @param widgetDir - Directory containing widget builds
 */
export function autoRegisterWidgets(server: any, widgetDir: string): void {
  const manifests = discoverWidgets(widgetDir)

  for (const manifest of manifests) {
    const inputs = manifest.props ? propsToInputs(manifest.props) : []

    // Register using the uiResource method
    server.uiResource({
      name: manifest.name,
      description: manifest.description,
      widgetPath: manifest.path,
      inputs: inputs.length > 0 ? inputs : undefined,
      returnTextContent: true,
    })

    console.log(`📦 Auto-registered widget: ${manifest.name}`)
  }
}