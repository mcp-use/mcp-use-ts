import type { BaseConnector } from './connectors/base.js'
import { logger } from './logging.js'

export class MCPSession {
  readonly connector: BaseConnector
  private autoConnect: boolean
  private _sessionInfo: Record<string, any> | null = null
  private _tools: Record<string, any>[] = []

  constructor(connector: BaseConnector, autoConnect = true) {
    this.connector = connector
    this.autoConnect = autoConnect
  }

  async open(): Promise<this> {
    await this.connect()
    return this
  }

  async close(): Promise<void> {
    await this.disconnect()
  }

  async connect(): Promise<void> {
    await this.connector.connect()
  }

  async disconnect(): Promise<void> {
    await this.connector.disconnect()
  }

  async initialize(): Promise<Record<string, any>> {
    if (!this.isConnected && this.autoConnect) {
      await this.connect()
    }

    this._sessionInfo = await this.connector.initialize() ?? {}
    await this.discoverTools()
    return this._sessionInfo
  }

  get isConnected(): boolean {
    return this.connector && this.connector.isClientConnected
  }

  get sessionInfo(): Record<string, any> | null {
    return this._sessionInfo
  }

  get tools(): Record<string, any>[] {
    return this._tools
  }

  async discoverTools(): Promise<Record<string, any>[]> {
    this._tools = this.connector.tools
    return this._tools
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.isConnected && this.autoConnect) {
      await this.connect()
    }
    logger.debug(`MCPSession calling tool '${name}'`)
    return await this.connector.callTool(name, args)
  }
}
