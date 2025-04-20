import type { LangChainAdapter } from '../adapters/langchain_adapter.js'
import type { MCPClient } from '../client.js'
import type { BaseConnector } from '../connectors/base.js'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { logger } from '../logging.js'

const ServerActionInputSchema = z.object({
  serverName: z.string().describe('The name of the MCP server'),
})

const DisconnectServerInputSchema = z.object({})
const ListServersInputSchema = z.object({})
const CurrentServerInputSchema = z.object({})

export class ServerManager {
  private activeServer: string | null = null
  private readonly initializedServers: Record<string, boolean> = {}
  private readonly serverTools: Record<string, DynamicStructuredTool[]> = {}

  constructor(
    private readonly client: MCPClient,
    private readonly adapter: LangChainAdapter,
  ) {}

  async initialize(): Promise<void> {
    if (!this.client.getServerNames?.().length) {
      logger.warning('No MCP servers defined in client configuration')
    }
  }

  async getServerManagementTools(): Promise<DynamicStructuredTool[]> {
    const listServersTool = new DynamicStructuredTool({
      name: 'list_mcp_servers',
      description:
        'Lists all available MCP (Model Context Protocol) servers that can be connected to, along with the tools available on each server. Use this tool to discover servers and see what functionalities they offer.',
      schema: ListServersInputSchema,
      func: async () => this.listServers(),
    })

    const connectServerTool = new DynamicStructuredTool({
      name: 'connect_to_mcp_server',
      description: 'Connect to a specific MCP (Model Context Protocol) server to use its tools. Use this tool to connect to a specific server and use its tools.',
      schema: ServerActionInputSchema,
      func: async ({ serverName }) => this.connectToServer(serverName),
    })

    const getActiveServerTool = new DynamicStructuredTool({
      name: 'get_active_mcp_server',
      description: 'Get the currently active MCP (Model Context Protocol) server.',
      schema: CurrentServerInputSchema,
      func: async () => this.getActiveServer(),
    })

    const disconnectServerTool = new DynamicStructuredTool({
      name: 'disconnect_from_mcp_server',
      description: 'Disconnect from the currently active MCP (Model Context Protocol) server.',
      schema: DisconnectServerInputSchema,
      func: async () => this.disconnectFromServer(),
    })

    return [
      listServersTool,
      connectServerTool,
      getActiveServerTool,
      disconnectServerTool,
    ]
  }

  async listServers(): Promise<string> {
    const servers = this.client.getServerNames?.() ?? []
    if (!servers.length)
      return 'No MCP servers are currently defined.'

    let out = 'Available MCP servers:\n'

    for (const [idx, serverName] of servers.entries()) {
      const active = serverName === this.activeServer ? ' (ACTIVE)' : ''
      out += `${idx + 1}. ${serverName}${active}\n`

      try {
        const tools = await this.ensureToolsFetched(serverName)
        out += tools.length
          ? `   Tools: ${tools.map(t => t.name).join(', ')}\n`
          : '   Tools: (Could not retrieve or none available)\n'
      }
      catch (err) {
        logger?.error?.(`Error listing tools for server '${serverName}':`, err)
        out += '   Tools: (Error retrieving tools)\n'
      }
    }

    return out
  }

  async connectToServer(serverName: string): Promise<string> {
    const servers = this.client.getServerNames() ?? []
    if (!servers.includes(serverName)) {
      return `Server '${serverName}' not found. Available servers: ${servers.join(', ') || 'none'}`
    }

    if (this.activeServer === serverName) {
      return `Already connected to MCP server '${serverName}'`
    }

    try {
      const session = await this.ensureSession(serverName, /* create */ true)
      this.activeServer = serverName

      // Ensure tools cached
      await this.ensureToolsFetched(serverName, session?.connector)
      const tools = this.serverTools[serverName] ?? []

      const toolDetails = tools
        .map((t, i) => `${i + 1}. ${t.name}: ${t.description}`)
        .join('\n')

      return (
        `Connected to MCP server '${serverName}'. ${tools.length} tools are now available.${
          tools.length ? `\nAvailable tools for this server:\n${toolDetails}` : ''}`
      )
    }
    catch (err) {
      logger.error(`Error connecting to server '${serverName}':`, err)
      return `Failed to connect to server '${serverName}': ${String(err)}`
    }
  }

  async getActiveServer(): Promise<string> {
    return this.activeServer
      ? `Currently active MCP server: ${this.activeServer}`
      : 'No MCP server is currently active. Use connect_to_mcp_server to connect.'
  }

  async disconnectFromServer(): Promise<string> {
    if (!this.activeServer) {
      return 'No MCP server is currently active, so there\'s nothing to disconnect from.'
    }

    const was = this.activeServer
    this.activeServer = null
    return `Successfully disconnected from MCP server '${was}'.`
  }

  async getActiveServerTools(): Promise<DynamicStructuredTool[]> {
    return this.activeServer ? this.serverTools[this.activeServer] ?? [] : []
  }

  async getAllTools(): Promise<DynamicStructuredTool[]> {
    return [...(await this.getServerManagementTools()), ...(await this.getActiveServerTools())]
  }

  private async ensureSession(serverName: string, createIfMissing = false) {
    try {
      return this.client.getSession(serverName)
    }
    catch {
      if (!createIfMissing)
        return undefined
      return this.client.createSession ? await this.client.createSession(serverName) : undefined
    }
  }

  private async ensureToolsFetched(serverName: string, connector?: BaseConnector): Promise<DynamicStructuredTool[]> {
    if (this.serverTools[serverName])
      return this.serverTools[serverName]

    const session = connector ? { connector } : await this.ensureSession(serverName, true)
    if (!session) {
      this.serverTools[serverName] = []
      return []
    }

    try {
      const tools = await this.adapter.createToolsFromConnectors([session.connector])
      this.serverTools[serverName] = tools
      this.initializedServers[serverName] = true
      logger.debug(`Fetched ${tools.length} tools for server '${serverName}'.`)
      return tools
    }
    catch (err) {
      logger.warning(`Could not fetch tools for server '${serverName}':`, err)
      this.serverTools[serverName] = []
      return []
    }
  }
}
