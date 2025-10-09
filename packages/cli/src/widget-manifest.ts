import { promises as fs } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

interface PropDefinition {
  type: string
  required: boolean
  description?: string
  default?: any
}

interface WidgetManifest {
  name: string
  description?: string
  props: Record<string, PropDefinition>
}

/**
 * Extract props from a TypeScript/React component file
 * @param filePath - Path to the component file
 * @returns Widget manifest with extracted props
 */
export async function extractWidgetProps(filePath: string): Promise<WidgetManifest | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    )

    const widgetName = path.parse(filePath).name
    const manifest: WidgetManifest = {
      name: widgetName,
      props: {}
    }

    // Find interface definitions for props
    function visit(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node)) {
        const interfaceName = node.name.text

        // Look for interfaces that end with 'Props'
        if (interfaceName.endsWith('Props')) {
          node.members.forEach(member => {
            if (ts.isPropertySignature(member) && member.name) {
              const propName = member.name.getText(sourceFile)
              const isOptional = member.questionToken !== undefined

              // Extract type
              let propType = 'string'
              if (member.type) {
                const typeText = member.type.getText(sourceFile)
                if (typeText.includes('number')) propType = 'number'
                else if (typeText.includes('boolean')) propType = 'boolean'
                else if (typeText.includes('[]') || typeText.includes('Array')) propType = 'array'
                else if (typeText.includes('{')) propType = 'object'
              }

              // Extract JSDoc comments for description
              const jsDoc = ts.getJSDocCommentsAndTags(member)
              let description = ''
              if (jsDoc.length > 0) {
                description = jsDoc[0].comment?.toString() || ''
              }

              manifest.props[propName] = {
                type: propType,
                required: !isOptional,
                ...(description && { description })
              }
            }
          })
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    // Try to find a default export component to get description
    sourceFile.forEachChild(node => {
      if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
        const jsDoc = ts.getJSDocCommentsAndTags(node)
        if (jsDoc.length > 0 && jsDoc[0].comment) {
          manifest.description = jsDoc[0].comment.toString()
        }
      }
    })

    return manifest
  } catch (error) {
    console.error(`Error extracting props from ${filePath}:`, error)
    return null
  }
}

/**
 * Generate manifest files for all widgets during build
 * @param srcDir - Source directory containing widget .tsx files
 * @param outDir - Output directory for built widgets
 */
export async function generateWidgetManifests(srcDir: string, outDir: string): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.tsx')) {
      const filePath = path.join(srcDir, entry.name)
      const manifest = await extractWidgetProps(filePath)

      if (manifest) {
        const widgetName = path.parse(entry.name).name
        const manifestPath = path.join(outDir, 'mcp-use', 'widgets', widgetName, 'manifest.json')

        await fs.mkdir(path.dirname(manifestPath), { recursive: true })
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

        console.log(`📝 Generated manifest for ${widgetName}`)
      }
    }
  }
}