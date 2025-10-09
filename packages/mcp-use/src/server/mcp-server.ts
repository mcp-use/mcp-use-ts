import type {
  PromptDefinition,
  ResourceDefinition,
  ServerConfig,
  TemplateDefinition,
  ToolDefinition,
  UIResourceDefinition,
} from './types.js'
import { McpServer as OfficialMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import express, { type Express } from 'express'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { formatUIResourceOptions, generateWidgetIframeUrl, validateWidgetParams } from './ui-resource.js'
import { autoRegisterWidgets } from './widget-discovery.js'

export class McpServer {
  private server: OfficialMcpServer
  private config: ServerConfig
  private app: Express
  private mcpMounted = false

  constructor(config: ServerConfig) {
    this.config = config
    this.server = new OfficialMcpServer({
      name: config.name,
      version: config.version,
    })
    this.app = express()
    
    // TODO enable override
    // Enable CORS by default
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      next()
    })

    // Setup default widget serving routes
    this.setupWidgetRoutes()

    // Proxy all Express methods to the underlying app
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return (target as any)[prop]
        }
        const value = (target.app as any)[prop]
        return typeof value === 'function' ? value.bind(target.app) : value
      }
    }) as McpServer
  }

  /**
   * Define a resource that can be accessed by clients
   */
  resource(definition: ResourceDefinition): this {
    this.server.resource(
      definition.name || definition.uri,
      definition.uri,
      {
        name: definition.name,
        description: definition.description,
        mimeType: definition.mimeType,
      },
      async () => ({
        contents: [
          {
            uri: definition.uri,
            mimeType: definition.mimeType || 'text/plain',
            text: await definition.fn(),
          },
        ],
      }),
    )
    return this
  }

  /**
   * Define a resource template with parameterized URIs
   */
  template(definition: TemplateDefinition): this {
    // For templates, we'll register them as tools that return resource content
    const toolName = `template_${definition.uriTemplate.replace(/[^a-z0-9]/gi, '_')}`

    this.server.tool(
      toolName,
      definition.description || 'Resource Template',
      this.createInputSchema(definition.uriTemplate),
      async (params: any) => {
        const content = await definition.fn(params as Record<string, string>)
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        }
      },
    )
    return this
  }

  /**
   * Define a tool that can be called by clients
   */
  tool(definition: ToolDefinition): this {
    const inputSchema = this.createToolInputSchema(definition.inputs || [])

    this.server.tool(
      definition.name,
      definition.description || definition.name,
      inputSchema,
      async (params: any) => {
        const result = await definition.fn(params)
        return result
      },
    )
    return this
  }

  /**
   * Define a prompt template
   */
  prompt(definition: PromptDefinition): this {
    const argsSchema = this.createPromptArgsSchema(definition.args || [])

    this.server.prompt(
      definition.name,
      definition.description || definition.name,
      argsSchema,
      async (params: any) => {
        const result = await definition.fn(params)
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: result,
              },
            },
          ],
        }
      },
    )
    return this
  }

  /**
   * Define a UI resource with automatic widget serving
   */
  uiResource(definition: UIResourceDefinition): this {
    const uri = definition.uri || `ui://widget/${definition.name}`
    const port = process.env.PORT || 3001
    const baseUrl = `http://localhost:${port}`

    // Register as a resource
    this.server.resource(
      definition.name,
      uri,
      {
        name: definition.name,
        description: definition.description || `UI widget: ${definition.name}`,
        mimeType: 'text/html+mcp-ui',
      },
      async () => {
        // Dynamically import @mcp-ui/server to use the proper createUIResource
        const { createUIResource } = await import('@mcp-ui/server')

        // Generate iframe URL based on widget path or provided URL
        let iframeUrl: string
        if (definition.iframeUrl) {
          iframeUrl = definition.iframeUrl
        } else if (definition.widgetPath) {
          iframeUrl = generateWidgetIframeUrl(baseUrl, definition.widgetPath, undefined, definition.inputs)
        } else {
          // Default to widget name
          iframeUrl = generateWidgetIframeUrl(baseUrl, definition.name, undefined, definition.inputs)
        }

        const uiContent = {
          type: 'externalUrl' as const,
          iframeUrl,
          preferredFrameSize: {
            width: 800,
            height: 600,
          },
        }

        // Use the proper @mcp-ui/server createUIResource
        const resourceOptions = formatUIResourceOptions({
          uri,
          content: uiContent,
          encoding: 'text',
          metadata: {
            name: definition.name,
            description: definition.description,
          }
        })

        const uiResource = createUIResource(resourceOptions)

        // Return the UI resource directly as text content
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: typeof uiResource === 'string' ? uiResource : JSON.stringify(uiResource)
            }
          ]
        }
      }
    )

    // If inputs are defined, also register as a tool
    if (definition.inputs && definition.inputs.length > 0) {
      const inputSchema = this.createToolInputSchema(definition.inputs)

      this.server.tool(
        `show-${definition.name}`,
        definition.description || `Display ${definition.name} widget`,
        inputSchema,
        async (params: any) => {
          // Dynamically import @mcp-ui/server
          const { createUIResource } = await import('@mcp-ui/server')

          // Validate parameters
          const validatedParams = validateWidgetParams(params, definition.inputs)

          // Generate iframe URL with validated parameters
          let iframeUrl: string
          if (definition.iframeUrl) {
            // Add params to existing URL
            const url = new URL(definition.iframeUrl)
            Object.entries(validatedParams).forEach(([key, value]) => {
              if (value !== undefined) {
                url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
              }
            })
            iframeUrl = url.toString()
          } else {
            const widgetName = definition.widgetPath || definition.name
            iframeUrl = generateWidgetIframeUrl(baseUrl, widgetName, validatedParams, definition.inputs)
          }

          const uiContent = {
            type: 'externalUrl' as const,
            iframeUrl,
            preferredFrameSize: {
              width: 800,
              height: 600,
            },
          }

          // If custom handler is provided, use it
          if (definition.fn) {
            const result = await definition.fn(validatedParams)

            const resourceOptions = formatUIResourceOptions({
              uri,
              content: result.content || uiContent,
              encoding: 'text',
              metadata: {
                name: definition.name,
                description: definition.description,
                params: validatedParams,
              }
            })

            const uiResource = createUIResource(resourceOptions)

            // Return both text and UI resource as text content
            const uiResourceText = typeof uiResource === 'string' ? uiResource : JSON.stringify(uiResource)

            if (definition.returnTextContent && result.text) {
              return {
                content: [
                  { type: 'text', text: `${result.text}\n\nUI Resource: ${uri}\n${uiResourceText}` }
                ]
              }
            }

            return {
              content: [
                { type: 'text', text: `UI Resource: ${uri}\n${uiResourceText}` }
              ]
            }
          }

          // Default response - create UI resource with validated params
          const resourceOptions = formatUIResourceOptions({
            uri,
            content: uiContent,
            encoding: 'text',
            metadata: {
              name: definition.name,
              description: definition.description,
              params: validatedParams,
            }
          })

          const uiResource = createUIResource(resourceOptions)
          const uiResourceText = typeof uiResource === 'string' ? uiResource : JSON.stringify(uiResource)
          const textContent = `Displayed ${definition.name} widget with parameters: ${JSON.stringify(validatedParams)}`

          if (definition.returnTextContent) {
            return {
              content: [
                { type: 'text', text: `${textContent}\n\nUI Resource: ${uri}\n${uiResourceText}` }
              ]
            }
          }

          return {
            content: [
              { type: 'text', text: `UI Resource: ${uri}\n${uiResourceText}` }
            ]
          }
        },
      )
    }

    return this
  }

  /**
   * Auto-register widgets from a directory
   * @param widgetDir - Directory containing built widgets (default: dist/resources/mcp-use/widgets)
   */
  autoDiscoverWidgets(widgetDir?: string): this {
    const dir = widgetDir || join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets')

    autoRegisterWidgets(this, dir)
    return this
  }

  /**
   * Mount MCP server endpoints at /mcp
   */
  private async mountMcp(): Promise<void> {
    if (this.mcpMounted) return
    
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    
    // Create StreamableHTTPServerTransport in stateless mode
    const httpTransport = new StreamableHTTPServerTransport({
      // TODO implement session
      sessionIdGenerator: undefined // Stateless mode
    })

    // Connect the MCP server to the transport
    await this.server.connect(httpTransport)

    const endpoint = '/mcp'

    // GET endpoint for SSE streaming
    this.app.get(endpoint, async (req, res) => {
      console.log(`📡 HTTP GET request received at ${endpoint}`)
      await httpTransport.handleRequest(req, res)
    })

    // POST endpoint for messages
    this.app.post(endpoint, express.json(), async (req, res) => {
      console.log(`📡 HTTP POST request received at ${endpoint}`)
      await httpTransport.handleRequest(req, res, req.body)
    })

    // DELETE endpoint for session cleanup
    this.app.delete(endpoint, async (req, res) => {
      console.log(`📡 HTTP DELETE request received at ${endpoint}`)
      await httpTransport.handleRequest(req, res)
    })

    this.mcpMounted = true
    console.log(`📡 MCP server mounted at ${endpoint}`)
  }

  /**
   * Start the Express server with MCP endpoints
   * @param port - Port to listen on (defaults to 3001)
   */
  async listen(port?: number): Promise<void> {
    await this.mountMcp()
    const serverPort = port || 3001
    this.app.listen(serverPort, () => {
      console.log(`📡 Server listening on http://localhost:${serverPort}`)
      console.log(`📡 MCP endpoints available at http://localhost:${serverPort}/mcp`)
    })
  }

  /**
   * Setup default widget serving routes
   */
  private setupWidgetRoutes(): void {
    // Serve static assets (JS, CSS) from the assets directory
    this.app.get('/mcp-use/widgets/:widget/assets/*', (req, res, next) => {
      const widget = req.params.widget
      const assetFile = (req.params as any)[0]
      const assetPath = join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets', widget, 'assets', assetFile)
      res.sendFile(assetPath, err => (err ? next() : undefined))
    })

    // Handle assets served from the wrong path (browser resolves ./assets/ relative to /mcp-use/widgets/)
    this.app.get('/mcp-use/widgets/assets/*', (req, res, next) => {
      const assetFile = (req.params as any)[0]
      // Try to find which widget this asset belongs to by checking all widget directories
      const widgetsDir = join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets')

      try {
        const widgets = readdirSync(widgetsDir)
        for (const widget of widgets) {
          const assetPath = join(widgetsDir, widget, 'assets', assetFile)
          if (existsSync(assetPath)) {
            return res.sendFile(assetPath)
          }
        }
        next()
      }
      catch {
        next()
      }
    })

    // Serve each widget's index.html at its route
    // e.g. GET /mcp-use/widgets/kanban-board -> dist/resources/mcp-use/widgets/kanban-board/index.html
    this.app.get('/mcp-use/widgets/:widget', (req, res, next) => {
      const filePath = join(process.cwd(), 'dist', 'resources', 'mcp-use', 'widgets', req.params.widget, 'index.html')
      res.sendFile(filePath, err => (err ? next() : undefined))
    })
  }

  /**
   * Create input schema for resource templates
   */
  private createInputSchema(uriTemplate: string): Record<string, z.ZodSchema> {
    const params = this.extractTemplateParams(uriTemplate)
    const schema: Record<string, z.ZodSchema> = {}

    params.forEach((param) => {
      schema[param] = z.string()
    })

    return schema
  }

  /**
   * Create input schema for tools
   */
  private createToolInputSchema(inputs: Array<{ name: string, type: string, required?: boolean }>): Record<string, z.ZodSchema> {
    const schema: Record<string, z.ZodSchema> = {}

    inputs.forEach((input) => {
      let zodType: z.ZodSchema
      switch (input.type) {
        case 'string':
          zodType = z.string()
          break
        case 'number':
          zodType = z.number()
          break
        case 'boolean':
          zodType = z.boolean()
          break
        case 'object':
          zodType = z.object({})
          break
        case 'array':
          zodType = z.array(z.any())
          break
        default:
          zodType = z.any()
      }

      if (!input.required) {
        zodType = zodType.optional()
      }

      schema[input.name] = zodType
    })

    return schema
  }

  /**
   * Create arguments schema for prompts
   */
  private createPromptArgsSchema(inputs: Array<{ name: string, type: string, required?: boolean }>): Record<string, z.ZodSchema> {
    const schema: Record<string, z.ZodSchema> = {}

    inputs.forEach((input) => {
      let zodType: z.ZodSchema
      switch (input.type) {
        case 'string':
          zodType = z.string()
          break
        case 'number':
          zodType = z.number()
          break
        case 'boolean':
          zodType = z.boolean()
          break
        case 'object':
          zodType = z.object({})
          break
        case 'array':
          zodType = z.array(z.any())
          break
        default:
          zodType = z.any()
      }

      if (!input.required) {
        zodType = zodType.optional()
      }

      schema[input.name] = zodType
    })

    return schema
  }

  /**
   * Extract parameter names from URI template
   */
  private extractTemplateParams(uriTemplate: string): string[] {
    const matches = uriTemplate.match(/\{([^}]+)\}/g)
    return matches ? matches.map(match => match.slice(1, -1)) : []
  }
}

export type McpServerInstance = Omit<McpServer, keyof Express> & Express

/**
 * Create a new MCP server instance
 */
export function createMCPServer(name: string, config: Partial<ServerConfig> = {}): McpServerInstance {
  const instance = new McpServer({
    name,
    version: config.version || '1.0.0',
    description: config.description,
  })
  return instance as unknown as McpServerInstance
}
