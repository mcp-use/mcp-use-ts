import type {
  PromptDefinition,
  ResourceDefinition,
  ServerConfig,
  TemplateDefinition,
  ToolDefinition,
} from './types.js'
import { McpServer as OfficialMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export class McpServer {
  private server: OfficialMcpServer
  private config: ServerConfig
  private expressApp?: any

  constructor(config: ServerConfig) {
    this.config = config
    this.server = new OfficialMcpServer({
      name: config.name,
      version: config.version,
    })
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
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        }
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
   * Set the Express app for SSE transport
   */
  setExpressApp(app: any): this {
    this.expressApp = app
    return this
  }

  /**
   * Start the MCP server with configurable transport
   * @param options - Transport options (defaults to HTTP)
   */
  async serve(options?: { transport?: 'http' | 'stdio', port?: number, endpoint?: string }): Promise<void> {
    const transport = options?.transport || (process.env.MCP_TRANSPORT as 'http' | 'stdio') || 'http'

    if (transport === 'stdio') {
      // Use stdio transport (for traditional MCP clients)
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
      const stdioTransport = new StdioServerTransport()
      await this.server.connect(stdioTransport)
      console.log('📡 MCP server connected via stdio transport')
    } else {
      // Default to StreamableHTTPServerTransport (for HTTP/web access)
      const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
      const endpoint = options?.endpoint || '/mcp'

      if (!this.expressApp) {
        // Create a standalone Express server if no app provided
        const express = await import('express')
        this.expressApp = express.default()

        // Enable CORS
        this.expressApp.use((req: any, res: any, next: any) => {
          res.header('Access-Control-Allow-Origin', '*')
          res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
          res.header('Access-Control-Allow-Headers', 'Content-Type')
          next()
        })

        const port = options?.port || 3001
        this.expressApp.listen(port, () => {
          console.log(`📡 MCP HTTP server listening on http://localhost:${port}${endpoint}`)
        })
      }

      console.log(`📡 Registering HTTP endpoints on Express app...`)

      // Create StreamableHTTPServerTransport in stateless mode
      const httpTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined // Stateless mode
      })

      // Connect the MCP server to the transport
      await this.server.connect(httpTransport)

      // Add HTTP endpoints for StreamableHTTPServerTransport
      const express = await import('express')

      // GET endpoint for SSE streaming
      this.expressApp.get(endpoint, async (req: any, res: any) => {
        console.log(`📡 HTTP GET request received at ${endpoint}`)
        await httpTransport.handleRequest(req, res)
      })

      // POST endpoint for messages
      this.expressApp.post(endpoint, express.json(), async (req: any, res: any) => {
        console.log(`📡 HTTP POST request received at ${endpoint}`)
        await httpTransport.handleRequest(req, res, req.body)
      })

      // DELETE endpoint for session cleanup (if using stateful mode)
      this.expressApp.delete(endpoint, async (req: any, res: any) => {
        console.log(`📡 HTTP DELETE request received at ${endpoint}`)
        await httpTransport.handleRequest(req, res)
      })

      console.log(`📡 MCP server HTTP endpoints registered at ${endpoint}`)
    }
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

/**
 * Create a new MCP server instance
 */
export function create(name: string, config: Partial<ServerConfig> = {}): McpServer {
  return new McpServer({
    name,
    version: config.version || '1.0.0',
    description: config.description,
  })
}
