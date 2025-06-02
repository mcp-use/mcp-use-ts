import type { StructuredToolInterface } from '@langchain/core/tools'
import type { LangChainAdapter } from '../adapters/langchain_adapter.js'
import type { MCPClient } from '../client.js'
import type { BaseConnector } from '../connectors/base.js'
import type { MCPSession } from '../session.js'
import { isEqual } from 'lodash-es'
import { logger } from '../logging.js'
import { AcquireActiveMCPServerTool } from './tools/acquire_active_mcp_server.js'
import { ConnectMCPServerTool } from './tools/connect_mcp_server.js'
import { ListMCPServersTool } from './tools/list_mcp_servers.js'
import { ReleaseMCPServerConnectionTool } from './tools/release_mcp_server_connection.js'

export class ServerManager {
  public readonly initializedServers: Record<string, boolean> = {}
  public readonly serverTools: Record<string, StructuredToolInterface[]> = {}

  public readonly client: MCPClient
  public readonly adapter: LangChainAdapter
  public activeServer: string | null = null

  constructor(client: MCPClient, adapter: LangChainAdapter) {
    this.client = client
    this.adapter = adapter
  }

  initialize(): void {
    const serverNames = this.client.getServerNames?.()
    if (serverNames.length === 0) {
      logger.warning('No MCP servers defined in client configuration')
    }
  }

  async prefetchServerTools(): Promise<void> {
    const servers: string[] = this.client.getServerNames()

    for (const serverName of servers) {
      try {
        let session: MCPSession | null = null

        session = this.client.getSession(serverName)
        logger.debug(`Using existing session for server '${serverName}' to prefetch tools.`)

        if (!session) {
          session = await this.client.createSession(serverName).catch((createSessionError) => {
            logger.warn(`Could not create session for '${serverName}' during prefetch: ${createSessionError}`)
            return null
          })
          logger.debug(`Temporarily created session for '${serverName}' to prefetch tools.`)
        }

        if (session) {
          const connector: BaseConnector = session.connector
          let tools: StructuredToolInterface[] = []

          try {
            tools = await this.adapter.createToolsFromConnectors([connector])
          }
          catch (toolFetchError) {
            logger.error(`Failed to create tools from connector for server '${serverName}': ${toolFetchError}`)
            continue
          }

          const cachedTools = this.serverTools[serverName]
          const toolsChanged
            = !cachedTools || !isEqual(cachedTools, tools)

          if (toolsChanged) {
            this.serverTools[serverName] = tools
            this.initializedServers[serverName] = true
            logger.debug(`Prefetched ${tools.length} tools for server '${serverName}'.`)
          }
          else {
            logger.debug(
              `Tools for server '${serverName}' unchanged, using cached version.`,
            )
          }
        }
      }
      catch (outerError) {
        logger.error(`Error prefetching tools for server '${serverName}': ${outerError}`)
      }
    }
  }

  get tools(): StructuredToolInterface[] {
    return [
      new ListMCPServersTool(this),
      new ConnectMCPServerTool(this),
      new AcquireActiveMCPServerTool(this),
      new ReleaseMCPServerConnectionTool(this),
    ]
  }
}
