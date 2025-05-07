import type { Client, ClientOptions } from '@modelcontextprotocol/sdk/client/index.js'
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js'
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ConnectionManager } from '../task_managers/base.js'
import { logger } from '../logging.js'

export interface ConnectorInitOptions {
  /**
   * Options forwarded to the underlying MCP `Client` instance.
   */
  clientOptions?: ClientOptions
  /**
   * Arbitrary request options (timeouts, cancellation, etc.) used by helper
   * methods when they issue SDK requests. Can be overridden per‑call.
   */
  defaultRequestOptions?: RequestOptions
}

/**
 * Base class for MCP connectors.
 */
export abstract class BaseConnector {
  protected client: Client | null = null
  protected connectionManager: ConnectionManager<any> | null = null
  protected toolsCache: Tool[] | null = null
  protected connected = false
  protected readonly opts: ConnectorInitOptions

  constructor(opts: ConnectorInitOptions = {}) {
    this.opts = opts
  }

  /** Establish the connection and create the SDK client. */
  abstract connect(): Promise<void>

  /** Disconnect and release resources. */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      logger.debug('Not connected to MCP implementation')
      return
    }

    logger.debug('Disconnecting from MCP implementation')
    await this.cleanupResources()
    this.connected = false
    logger.debug('Disconnected from MCP implementation')
  }

  /** Check if the client is connected */
  get isClientConnected(): boolean {
    return this.client != null
  }

  /**
   * Initialise the MCP session **after** `connect()` has succeeded.
   *
   * In the SDK, `Client.connect(transport)` automatically performs the
   * protocol‑level `initialize` handshake, so we only need to cache the list of
   * tools and expose some server info.
   */
  async initialize(defaultRequestOptions: RequestOptions = this.opts.defaultRequestOptions ?? {}): Promise<ReturnType<Client['getServerCapabilities']>> {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug('Caching server capabilities & tools')

    // Cache server capabilities for callers who need them.
    const capabilities = this.client.getServerCapabilities()

    // Fetch and cache tools
    const listToolsRes = await this.client.listTools(undefined, defaultRequestOptions)
    this.toolsCache = (listToolsRes.tools ?? []) as Tool[]

    logger.debug(`Fetched ${this.toolsCache.length} tools from server`)
    return capabilities
  }

  /** Lazily expose the cached tools list. */
  get tools(): Tool[] {
    if (!this.toolsCache) {
      throw new Error('MCP client is not initialized; call initialize() first')
    }
    return this.toolsCache
  }

  /** Call a tool on the server. */
  async callTool(name: string, args: Record<string, any>, options?: RequestOptions): Promise<CallToolResult> {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug(`Calling tool '${name}' with args`, args)
    const res = await this.client.callTool({ name, arguments: args }, undefined, options)
    logger.debug(`Tool '${name}' returned`, res)
    return res as CallToolResult
  }

  /** List resources from the server. */
  async listResources(options?: RequestOptions) {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug('Listing resources')
    return await this.client.listResources(undefined, options)
  }

  /** Read a resource by URI. */
  async readResource(uri: string, options?: RequestOptions) {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug(`Reading resource ${uri}`)
    const res = await this.client.readResource({ uri }, options)
    return { content: res.content, mimeType: res.mimeType }
  }

  async listPrompts() {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug('Listing prompt')
    return await this.client.listPrompts()
  }

  async getPrompt(name: string, args: Record<string, any>) {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug(`Getting prompt ${name}`)
    return await this.client.getPrompt({ name, arguments: args })
  }

  /** Send a raw request through the client. */
  async request(method: string, params: Record<string, any> | null = null, options?: RequestOptions) {
    if (!this.client) {
      throw new Error('MCP client is not connected')
    }

    logger.debug(`Sending raw request '${method}' with params`, params)
    return await this.client.request({ method, params: params ?? {} }, undefined as any, options)
  }

  /**
   * Helper to tear down the client & connection manager safely.
   */
  protected async cleanupResources(): Promise<void> {
    const issues: string[] = []

    if (this.client) {
      try {
        if (typeof this.client.close === 'function') {
          await this.client.close()
        }
      }
      catch (e) {
        const msg = `Error closing client: ${e}`
        logger.warn(msg)
        issues.push(msg)
      }
      finally {
        this.client = null
      }
    }

    if (this.connectionManager) {
      try {
        await this.connectionManager.stop()
      }
      catch (e) {
        const msg = `Error stopping connection manager: ${e}`
        logger.warn(msg)
        issues.push(msg)
      }
      finally {
        this.connectionManager = null
      }
    }

    this.toolsCache = null
    if (issues.length) {
      logger.warn(`Resource cleanup finished with ${issues.length} issue(s)`)
    }
  }
}
