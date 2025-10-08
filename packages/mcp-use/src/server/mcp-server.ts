import type {
  PromptDefinition,
  ResourceDefinition,
  ServerConfig,
  TemplateDefinition,
  ToolDefinition,
} from './types.js'
import { McpServer as OfficialMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import express, { type Express } from 'express'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export class McpServer {
  private server: OfficialMcpServer
  private config: ServerConfig
  private app: Express
  private mcpMounted = false
  private inspectorMounted = false
  private serverPort?: number

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
   * Mount MCP server endpoints at /mcp
   */
  private async mountMcp(): Promise<void> {
    if (this.mcpMounted) return
    
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    
    // Create StreamableHTTPServerTransport in stateless mode
    const httpTransport = new StreamableHTTPServerTransport({
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
    this.serverPort = port || 3001
    
    // Mount inspector after we know the port
    this.mountInspector()
    
    this.app.listen(this.serverPort, () => {
      console.log(`📡 Server listening on http://localhost:${this.serverPort}`)
      console.log(`📡 MCP endpoints available at http://localhost:${this.serverPort}/mcp`)
    })
  }

  /**
   * Mount MCP Inspector UI at /inspector
   */
  private mountInspector(): void {
    if (this.inspectorMounted) return
    
    try {
      // Try to dynamically import the inspector package
      import('@mcp-use/inspector').then(({ mountInspector }) => {
        // Auto-connect to the local MCP server at /mcp
        const mcpServerUrl = `http://localhost:${this.serverPort}/mcp`
        mountInspector(this.app, '/inspector', mcpServerUrl)
        this.inspectorMounted = true
      }).catch(() => {
        // Inspector package not installed, skip mounting silently
        // This allows the server to work without the inspector in production
      })
    } catch {
      // Inspector not available, skip
    }
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
