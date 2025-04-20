import type { ConnectorInitOptions } from './base.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { logger } from '../logging.js'
import { SseConnectionManager } from '../task_managers/sse.js'
import { BaseConnector } from './base.js'

export interface HttpConnectorOptions extends ConnectorInitOptions {
  authToken?: string
  headers?: Record<string, string>
  timeout?: number // HTTP request timeout (s)
  sseReadTimeout?: number // SSE read timeout (s)
  clientInfo?: { name: string, version: string }
}

export class HttpConnector extends BaseConnector {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>
  private readonly timeout: number
  private readonly sseReadTimeout: number
  private readonly clientInfo: { name: string, version: string }

  constructor(baseUrl: string, opts: HttpConnectorOptions = {}) {
    super(opts)

    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.headers = { ...(opts.headers ?? {}) }
    if (opts.authToken) {
      this.headers.Authorization = `Bearer ${opts.authToken}`
    }

    this.timeout = opts.timeout ?? 5
    this.sseReadTimeout = opts.sseReadTimeout ?? 60 * 5
    this.clientInfo = opts.clientInfo ?? { name: 'http-connector', version: '1.0.0' }
  }

  /** Establish connection to the MCP implementation via SSE. */
  async connect(): Promise<void> {
    if (this.connected) {
      logger.debug('Already connected to MCP implementation')
      return
    }

    logger.debug(`Connecting to MCP implementation via HTTP/SSE: ${this.baseUrl}`)

    try {
      // Build the SSE URL (root of server endpoint)
      const sseUrl = this.baseUrl

      // Create and start the connection manager -> returns an SSE transport
      this.connectionManager = new SseConnectionManager(
        sseUrl,
        {
          requestInit: {
            headers: this.headers,
          },
        },
      )
      const transport = await this.connectionManager.start()

      // Create and connect the client
      this.client = new Client(this.clientInfo, this.opts.clientOptions)
      await this.client.connect(transport)

      this.connected = true
      logger.debug(`Successfully connected to MCP implementation via HTTP/SSE: ${this.baseUrl}`)
    }
    catch (err) {
      logger.error(`Failed to connect to MCP implementation via HTTP/SSE: ${err}`)
      await this.cleanupResources()
      throw err
    }
  }
}
