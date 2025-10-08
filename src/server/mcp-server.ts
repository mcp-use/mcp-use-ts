import { McpServer as OfficialMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { 
  ServerConfig, 
  ResourceDefinition, 
  TemplateDefinition, 
  ToolDefinition, 
  PromptDefinition 
} from './types.js'

export class McpServer {
  private server: OfficialMcpServer
  private config: ServerConfig

  constructor(config: ServerConfig) {
    this.config = config
    this.server = new OfficialMcpServer({
      name: config.name,
      version: config.version
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
        mimeType: definition.mimeType
      },
      async () => ({
        contents: [
          {
            uri: definition.uri,
            mimeType: definition.mimeType || 'text/plain',
            text: await definition.fn()
          }
        ]
      })
    )
    return this
  }

  /**
   * Define a resource template with parameterized URIs
   */
  template(definition: TemplateDefinition): this {
    // For templates, we'll register them as tools that return resource content
    const toolName = `template_${definition.uriTemplate.replace(/[^a-zA-Z0-9]/g, '_')}`
    
    this.server.tool(
      toolName,
      definition.description || 'Resource Template',
      this.createInputSchema(definition.uriTemplate),
      async (params) => {
        const content = await definition.fn(params as Record<string, string>)
        return {
          content: [
            {
              type: 'text',
              text: content
            }
          ]
        }
      }
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
      async (params) => {
        const result = await definition.fn(params)
        return {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        }
      }
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
      async (params) => {
        const result = await definition.fn(params)
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: result
              }
            }
          ]
        }
      }
    )
    return this
  }

  /**
   * Start the MCP server
   */
  async serve(): Promise<void> {
    // The MCP server needs to be connected to a transport
    // For now, we'll use stdio transport by default
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }

  /**
   * Create input schema for resource templates
   */
  private createInputSchema(uriTemplate: string): Record<string, z.ZodSchema> {
    const params = this.extractTemplateParams(uriTemplate)
    const schema: Record<string, z.ZodSchema> = {}
    
    params.forEach(param => {
      schema[param] = z.string()
    })
    
    return schema
  }

  /**
   * Create input schema for tools
   */
  private createToolInputSchema(inputs: Array<{ name: string; type: string; required?: boolean }>): Record<string, z.ZodSchema> {
    const schema: Record<string, z.ZodSchema> = {}
    
    inputs.forEach(input => {
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
  private createPromptArgsSchema(inputs: Array<{ name: string; type: string; required?: boolean }>): Record<string, z.ZodSchema> {
    const schema: Record<string, z.ZodSchema> = {}
    
    inputs.forEach(input => {
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
    description: config.description
  })
}