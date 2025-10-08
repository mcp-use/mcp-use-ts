import type { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import type { CallbackManagerForChainRun } from '@langchain/core/callbacks/manager'
import type { BaseLanguageModelInterface, LanguageModelLike } from '@langchain/core/language_models/base'
import type { Serialized } from '@langchain/core/load/serializable'
import type {
  BaseMessage,
} from '@langchain/core/messages'
import type { ToolCall } from '@langchain/core/messages/tool'
import type { StructuredToolInterface, ToolInterface } from '@langchain/core/tools'
import type { StreamEvent } from '@langchain/core/tracers/log_stream'
import type { AgentAction, AgentFinish, AgentStep } from 'langchain/agents'
import type { ZodSchema } from 'zod'
import type { MCPClient } from '../client.js'
import type { BaseConnector } from '../connectors/base.js'
import type { MCPSession } from '../session.js'
import { CallbackManager } from '@langchain/core/callbacks/manager'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { OutputParserException } from '@langchain/core/output_parsers'
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { LangChainAdapter } from '../adapters/langchain_adapter.js'
import { logger } from '../logging.js'
import { ServerManager } from '../managers/server_manager.js'
import { ObservabilityManager } from '../observability/index.js'
import { extractModelInfo, Telemetry } from '../telemetry/index.js'
import { createSystemMessage } from './prompts/system_prompt_builder.js'
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE, SERVER_MANAGER_SYSTEM_PROMPT_TEMPLATE } from './prompts/templates.js'
import { RemoteAgent } from './remote.js'

// Configuration interfaces
interface TruncationConfig {
  maxCharacters: number
  maxBytes: number
  warnThreshold: number
  method: 'end' | 'middle' | 'smart' | 'structured'
  preserveLines: number
  preserveStructure: boolean
  truncationMarker: string
  includeSizeInfo: boolean
  includeHash: boolean
}

interface PlaceholderMessages {
  toolExecutionNoResponse?: string
  toolExecutionError?: string
  toolExecutionTimeout?: string
}

export class MCPAgent {
  private llm?: BaseLanguageModelInterface
  private client?: MCPClient
  private connectors: BaseConnector[]
  private maxSteps: number
  private autoInitialize: boolean
  private memoryEnabled: boolean
  private disallowedTools: string[]
  private additionalTools: StructuredToolInterface[]
  private useServerManager: boolean
  private verbose: boolean
  private observe: boolean
  private systemPrompt?: string | null
  private systemPromptTemplateOverride?: string | null
  private additionalInstructions?: string | null

  // Tool history preservation configuration
  private placeholderMessages: Required<PlaceholderMessages>
  private truncationConfig: TruncationConfig
  private perToolTruncation: Record<string, Partial<TruncationConfig>>

  private _initialized = false
  private conversationHistory: BaseMessage[] = []
  private _agentExecutor: AgentExecutor | null = null
  private sessions: Record<string, MCPSession> = {}
  private systemMessage: SystemMessage | null = null
  private _tools: StructuredToolInterface[] = []
  private adapter: LangChainAdapter
  private serverManager: ServerManager | null = null
  private telemetry: Telemetry
  private modelProvider: string
  private modelName: string

  // Observability support
  private observabilityManager: ObservabilityManager
  private callbacks: BaseCallbackHandler[] = []
  private metadata: Record<string, any> = {}
  private tags: string[] = []

  // Remote agent support
  private isRemote = false
  private remoteAgent: RemoteAgent | null = null

  constructor(options: {
    llm?: BaseLanguageModelInterface
    client?: MCPClient
    connectors?: BaseConnector[]
    maxSteps?: number
    autoInitialize?: boolean
    memoryEnabled?: boolean
    systemPrompt?: string | null
    systemPromptTemplate?: string | null
    additionalInstructions?: string | null
    disallowedTools?: string[]
    additionalTools?: StructuredToolInterface[]
    useServerManager?: boolean
    verbose?: boolean
    observe?: boolean
    adapter?: LangChainAdapter
    serverManagerFactory?: (client: MCPClient) => ServerManager
    callbacks?: BaseCallbackHandler[]
    // Remote agent parameters
    agentId?: string
    apiKey?: string
    baseUrl?: string
    // Tool history preservation configuration
    placeholderMessages?: PlaceholderMessages
    truncationConfig?: Partial<TruncationConfig>
    perToolTruncation?: Record<string, Partial<TruncationConfig>>
  }) {
    // Handle remote execution
    if (options.agentId) {
      this.isRemote = true
      this.remoteAgent = new RemoteAgent({
        agentId: options.agentId,
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
      })
      // Set default values for remote agent
      this.maxSteps = options.maxSteps ?? 5
      this.memoryEnabled = options.memoryEnabled ?? true
      this.autoInitialize = options.autoInitialize ?? false
      this.verbose = options.verbose ?? false
      this.observe = options.observe ?? true
      this.connectors = []
      this.disallowedTools = []
      this.additionalTools = []
      this.useServerManager = false
      this.adapter = new LangChainAdapter()
      this.telemetry = Telemetry.getInstance()
      this.modelProvider = 'remote'
      this.modelName = 'remote-agent'
      this.observabilityManager = new ObservabilityManager({
        customCallbacks: options.callbacks,
        agentId: options.agentId,
      })
      this.callbacks = []

      // Initialize defaults for remote agents
      this.placeholderMessages = {
        toolExecutionNoResponse: '[Tool execution completed - no final response]',
        toolExecutionError: '[Tool execution failed]',
        toolExecutionTimeout: '[Tool execution timed out]',
      }
      this.truncationConfig = this.getDefaultTruncationConfig()
      this.perToolTruncation = {}
      return
    }

    // Validate requirements for local execution
    if (!options.llm) {
      throw new Error('llm is required for local execution. For remote execution, provide agentId instead.')
    }

    this.llm = options.llm

    this.client = options.client
    this.connectors = options.connectors ?? []
    this.maxSteps = options.maxSteps ?? 5
    this.autoInitialize = options.autoInitialize ?? false
    this.memoryEnabled = options.memoryEnabled ?? true
    this.systemPrompt = options.systemPrompt ?? null
    this.systemPromptTemplateOverride = options.systemPromptTemplate ?? null
    this.additionalInstructions = options.additionalInstructions ?? null
    this.disallowedTools = options.disallowedTools ?? []
    this.additionalTools = options.additionalTools ?? []
    this.useServerManager = options.useServerManager ?? false
    this.verbose = options.verbose ?? false
    this.observe = options.observe ?? true

    // Initialize tool history preservation configuration
    this.placeholderMessages = {
      toolExecutionNoResponse: '[Tool execution completed - no final response]',
      toolExecutionError: '[Tool execution failed]',
      toolExecutionTimeout: '[Tool execution timed out]',
      ...(options.placeholderMessages || {}),
    }
    this.truncationConfig = { ...this.getDefaultTruncationConfig(), ...(options.truncationConfig || {}) }
    this.perToolTruncation = options.perToolTruncation || {}

    if (!this.client && this.connectors.length === 0) {
      throw new Error('Either \'client\' or at least one \'connector\' must be provided.')
    }

    if (this.useServerManager) {
      if (!this.client) {
        throw new Error('\'client\' must be provided when \'useServerManager\' is true.')
      }
      this.adapter = options.adapter ?? new LangChainAdapter(this.disallowedTools)
      this.serverManager = options.serverManagerFactory?.(this.client) ?? new ServerManager(this.client, this.adapter)
    }
    // Let consumers swap allowed tools dynamically
    else {
      this.adapter = options.adapter ?? new LangChainAdapter(this.disallowedTools)
    }

    // Initialize telemetry
    this.telemetry = Telemetry.getInstance()
    // Track model info for telemetry
    if (this.llm) {
      const [provider, name] = extractModelInfo(this.llm as any)
      this.modelProvider = provider
      this.modelName = name
    }
    else {
      this.modelProvider = 'unknown'
      this.modelName = 'unknown'
    }

    // Set up observability callbacks using the ObservabilityManager
    this.observabilityManager = new ObservabilityManager({
      customCallbacks: options.callbacks,
      verbose: this.verbose,
      observe: this.observe,
      agentId: options.agentId,
      metadataProvider: () => this.getMetadata(),
      tagsProvider: () => this.getTags(),
    })

    // Make getters configurable for test mocking
    Object.defineProperty(this, 'agentExecutor', {
      get: () => this._agentExecutor,
      configurable: true,
    })
    Object.defineProperty(this, 'tools', {
      get: () => this._tools,
      configurable: true,
    })
    Object.defineProperty(this, 'initialized', {
      get: () => this._initialized,
      configurable: true,
    })
  }

  private getDefaultTruncationConfig(): TruncationConfig {
    return {
      maxCharacters: 50_000,
      maxBytes: 1_024_000,
      warnThreshold: 10_000,
      method: 'smart',
      preserveLines: 5,
      preserveStructure: true,
      truncationMarker: '\n\n[... CONTENT TRUNCATED ...]\n\n',
      includeSizeInfo: true,
      includeHash: false,
    }
  }

  private getToolExecutionPlaceholder(scenario: 'noResponse' | 'error' | 'timeout' = 'noResponse'): string {
    switch (scenario) {
      case 'noResponse':
        return this.placeholderMessages.toolExecutionNoResponse
      case 'error':
        return this.placeholderMessages.toolExecutionError
      case 'timeout':
        return this.placeholderMessages.toolExecutionTimeout
      default:
        return this.placeholderMessages.toolExecutionNoResponse
    }
  }

  private getEffectiveTruncationConfig(toolName: string): TruncationConfig {
    const toolSpecific = this.perToolTruncation[toolName] || {}
    return { ...this.truncationConfig, ...toolSpecific }
  }

  // Type guard to check if action has toolCallId (from ToolsAgentAction)
  private isToolsAgentAction(action: AgentAction): action is AgentAction & { toolCallId: string } {
    return 'toolCallId' in action && typeof (action as any).toolCallId === 'string'
  }

  // Type-safe tool call ID generation
  private getToolCallId(action: AgentAction): string {
    return this.isToolsAgentAction(action) ? action.toolCallId : crypto.randomUUID()
  }

  private applyTruncation(content: string, config: TruncationConfig): string {
    if (content.length <= config.maxCharacters && content.length <= config.maxBytes) {
      return content
    }

    // Log truncation event for monitoring
    if (content.length > config.warnThreshold) {
      const wasActuallyTruncated = content.length > Math.min(config.maxCharacters, config.maxBytes)
      logger.info(`🔍 Content size: ${content.length.toLocaleString()} chars${
        wasActuallyTruncated ? ` → truncating (limit: ${Math.min(config.maxCharacters, config.maxBytes).toLocaleString()})` : ' (within limits)'
      }`, {
        originalSize: content.length,
        truncated: wasActuallyTruncated,
      })
    }

    switch (config.method) {
      case 'end':
        return this.truncateEnd(content, config)
      case 'middle':
        return this.truncateMiddle(content, config)
      case 'smart':
        return this.truncateSmart(content, config)
      case 'structured':
        return this.truncateStructured(content, config)
      default:
        return this.truncateEnd(content, config)
    }
  }

  private truncateEnd(content: string, config: TruncationConfig): string {
    const maxChars = Math.min(config.maxCharacters, config.maxBytes)
    if (content.length <= maxChars)
      return content

    const truncated = content.slice(0, maxChars)
    const sizeInfo = config.includeSizeInfo
      ? ` (${content.length.toLocaleString()} → ${maxChars.toLocaleString()} chars)`
      : ''

    return truncated + config.truncationMarker + sizeInfo
  }

  private truncateMiddle(content: string, config: TruncationConfig): string {
    const maxChars = Math.min(config.maxCharacters, config.maxBytes)
    if (content.length <= maxChars)
      return content

    const keepStart = Math.floor(maxChars * 0.4) // 40% at start
    const keepEnd = Math.floor(maxChars * 0.4) // 40% at end
    // 20% for truncation marker and size info

    const start = content.slice(0, keepStart)
    const end = content.slice(-keepEnd)
    const sizeInfo = config.includeSizeInfo
      ? ` (${content.length.toLocaleString()} chars total)`
      : ''

    return start + config.truncationMarker + sizeInfo + end
  }

  private truncateSmart(content: string, config: TruncationConfig): string {
    const maxChars = Math.min(config.maxCharacters, config.maxBytes)
    if (content.length <= maxChars)
      return content

    // Detect content type and apply appropriate strategy
    if (this.isJsonLike(content)) {
      return this.truncateJson(content, config)
    }
    else if (this.isXmlLike(content)) {
      return this.truncateMiddle(content, config) // Fallback for XML
    }
    else if (this.isLogLike(content)) {
      return this.truncateByLines(content, config)
    }
    else {
      // Fall back to line-aware truncation
      return this.truncateByLines(content, config)
    }
  }

  private truncateStructured(content: string, config: TruncationConfig): string {
    if (this.isJsonLike(content)) {
      return this.truncateJson(content, config)
    }
    else {
      return this.truncateSmart(content, config)
    }
  }

  private isJsonLike(content: string): boolean {
    const trimmed = content.trim()
    return (trimmed.startsWith('{') && trimmed.endsWith('}'))
      || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  }

  private isXmlLike(content: string): boolean {
    const trimmed = content.trim()
    return trimmed.startsWith('<') && trimmed.endsWith('>')
  }

  private isLogLike(content: string): boolean {
    const lines = content.split('\n')
    if (lines.length < 3)
      return false

    // Check if multiple lines match common log patterns
    const logPatterns = [
      /^\d{4}-\d{2}-\d{2}/, // Date
      /^\[\d{2}:\d{2}:\d{2}\]/, // Timestamp
      /^(INFO|DEBUG|WARN|ERROR|TRACE)/, // Log levels
      /^\d+:\d+:\d+/, // Time
    ]

    const logLikeLines = lines.slice(0, 10).filter(line =>
      logPatterns.some(pattern => pattern.test(line.trim())),
    ).length

    return logLikeLines >= lines.slice(0, 10).length * 0.3 // 30% of first 10 lines
  }

  private truncateByLines(content: string, config: TruncationConfig): string {
    const lines = content.split('\n')
    const preserveLines = config.preserveLines

    if (lines.length <= preserveLines * 2) {
      // Too few lines, use end truncation
      return this.truncateEnd(content, config)
    }

    const startLines = lines.slice(0, preserveLines).join('\n')
    const endLines = lines.slice(-preserveLines).join('\n')
    const markerInfo = config.truncationMarker
      + (config.includeSizeInfo
        ? ` (${lines.length} lines, ${content.length.toLocaleString()} chars total)`
        : '')

    const result = startLines + markerInfo + endLines

    // If still too long, fall back to character truncation
    const maxChars = Math.min(config.maxCharacters, config.maxBytes)
    return result.length > maxChars ? this.truncateEnd(result, config) : result
  }

  private truncateJson(content: string, config: TruncationConfig): string {
    try {
      const parsed = JSON.parse(content)

      if (Array.isArray(parsed)) {
        // Truncate array while maintaining structure
        const truncated = this.truncateArray(parsed, config)
        return JSON.stringify(truncated, null, 2)
      }
      else if (typeof parsed === 'object' && parsed !== null) {
        // Truncate object properties
        const truncated = this.truncateObject(parsed, config)
        return JSON.stringify(truncated, null, 2)
      }
    }
    catch {
      // Not valid JSON, fall back to smart truncation
    }

    return this.truncateMiddle(content, config)
  }

  private truncateArray(arr: any[], config: TruncationConfig): any[] {
    const maxChars = Math.min(config.maxCharacters, config.maxBytes)
    const baseSize = JSON.stringify([]).length
    let currentSize = baseSize
    const result = []

    for (const item of arr) {
      const itemSize = JSON.stringify(item).length + 1 // +1 for comma

      if (currentSize + itemSize > maxChars * 0.8) { // Leave room for metadata
        result.push({
          _truncated: true,
          _originalLength: arr.length,
          _showingFirst: result.length,
          _message: `Array truncated: showing ${result.length} of ${arr.length} items`,
        })
        break
      }

      result.push(item)
      currentSize += itemSize
    }

    return result
  }

  private truncateObject(obj: any, config: TruncationConfig): any {
    const maxChars = Math.min(config.maxCharacters, config.maxBytes)
    const entries = Object.entries(obj)
    const result: any = {}
    let currentSize = JSON.stringify({}).length
    let _truncated = false

    for (const [key, value] of entries) {
      const entrySize = JSON.stringify({ [key]: value }).length

      if (currentSize + entrySize > maxChars * 0.8) {
        result._truncated = true
        result._originalKeys = entries.length
        result._showingKeys = Object.keys(result).length - 1 // Subtract metadata keys
        result._message = `Object truncated: showing ${Object.keys(result).length - 1} of ${entries.length} keys`
        _truncated = true
        break
      }

      result[key] = value
      currentSize += entrySize
    }

    return result
  }

  public async initialize(): Promise<void> {
    // Skip initialization for remote agents
    if (this.isRemote) {
      this._initialized = true
      return
    }

    logger.info('🚀 Initializing MCP agent and connecting to services...')

    // Initialize observability callbacks
    this.callbacks = await this.observabilityManager.getCallbacks()
    const handlerNames = await this.observabilityManager.getHandlerNames()
    if (handlerNames.length > 0) {
      logger.info(`📊 Observability enabled with: ${handlerNames.join(', ')}`)
    }

    // If using server manager, initialize it
    if (this.useServerManager && this.serverManager) {
      await this.serverManager.initialize()

      // Get server management tools
      const managementTools = this.serverManager.tools
      this._tools = managementTools
      this._tools.push(...this.additionalTools)
      logger.info(
        `🔧 Server manager mode active with ${managementTools.length} management tools`,
      )

      // Create the system message based on available tools
      await this.createSystemMessageFromTools(this._tools)
    }
    else {
      // Standard initialization - if using client, get or create sessions
      if (this.client) {
        // First try to get existing sessions
        this.sessions = this.client.getAllActiveSessions()
        logger.info(`🔌 Found ${Object.keys(this.sessions).length} existing sessions`)

        // If no active sessions exist, create new ones
        if (Object.keys(this.sessions).length === 0) {
          logger.info('🔄 No active sessions found, creating new ones...')
          this.sessions = await this.client.createAllSessions()
          logger.info(`✅ Created ${Object.keys(this.sessions).length} new sessions`)
        }

        // Create LangChain tools directly from the client using the adapter
        this._tools = await LangChainAdapter.createTools(this.client)
        this._tools.push(...this.additionalTools)
        logger.info(`🛠️ Created ${this._tools.length} LangChain tools from client`)
      }
      else {
        // Using direct connector - only establish connection
        logger.info(`🔗 Connecting to ${this.connectors.length} direct connectors...`)
        for (const connector of this.connectors) {
          if (!connector.isClientConnected) {
            await connector.connect()
          }
        }

        // Create LangChain tools using the adapter with connectors
        this._tools = await this.adapter.createToolsFromConnectors(this.connectors)
        this._tools.push(...this.additionalTools)
        logger.info(`🛠️ Created ${this._tools.length} LangChain tools from connectors`)
      }

      // Get all tools for system message generation
      logger.info(`🧰 Found ${this._tools.length} tools across all connectors`)

      // Create the system message based on available tools
      await this.createSystemMessageFromTools(this._tools)
    }

    // Create the agent executor and mark initialized
    this._agentExecutor = this.createAgent()
    this._initialized = true

    // Add MCP server information to observability metadata
    const mcpServerInfo = this.getMCPServerInfo()
    if (Object.keys(mcpServerInfo).length > 0) {
      this.setMetadata(mcpServerInfo)
      logger.debug(`MCP server info added to metadata: ${JSON.stringify(mcpServerInfo)}`)
    }

    logger.info('✨ Agent initialization complete')
  }

  private async createSystemMessageFromTools(tools: StructuredToolInterface[]): Promise<void> {
    const systemPromptTemplate
      = this.systemPromptTemplateOverride
        ?? DEFAULT_SYSTEM_PROMPT_TEMPLATE

    this.systemMessage = createSystemMessage(
      tools,
      systemPromptTemplate,
      SERVER_MANAGER_SYSTEM_PROMPT_TEMPLATE,
      this.useServerManager,
      this.disallowedTools,
      this.systemPrompt ?? undefined,
      this.additionalInstructions ?? undefined,
    )

    if (this.memoryEnabled) {
      this.conversationHistory = [
        this.systemMessage,
        ...this.conversationHistory.filter(m => !(m instanceof SystemMessage)),
      ]
    }
  }

  private createAgent(): AgentExecutor {
    if (!this.llm) {
      throw new Error('LLM is required to create agent')
    }

    const systemContent = this.systemMessage?.content ?? 'You are a helpful assistant.'

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemContent],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ])

    const agent = createToolCallingAgent({
      llm: this.llm as unknown as LanguageModelLike,
      tools: this._tools,
      prompt,
    })

    return new AgentExecutor({
      agent,
      tools: this._tools,
      maxIterations: this.maxSteps,
      verbose: this.verbose,
      returnIntermediateSteps: true,
      callbacks: this.callbacks,
    })
  }

  public getConversationHistory(): BaseMessage[] {
    return [...this.conversationHistory]
  }

  public clearConversationHistory(): void {
    this.conversationHistory = this.memoryEnabled && this.systemMessage ? [this.systemMessage] : []
  }

  private addToHistory(message: BaseMessage): void {
    if (this.memoryEnabled)
      this.conversationHistory.push(message)
  }

  public getSystemMessage(): SystemMessage | null {
    return this.systemMessage
  }

  public setSystemMessage(message: string): void {
    this.systemMessage = new SystemMessage(message)
    if (this.memoryEnabled) {
      this.conversationHistory = this.conversationHistory.filter(m => !(m instanceof SystemMessage))
      this.conversationHistory.unshift(this.systemMessage)
    }

    if (this._initialized && this._tools.length) {
      this._agentExecutor = this.createAgent()
      logger.debug('Agent recreated with new system message')
    }
  }

  public setDisallowedTools(disallowedTools: string[]): void {
    this.disallowedTools = disallowedTools
    this.adapter = new LangChainAdapter(this.disallowedTools)
    if (this._initialized) {
      logger.debug('Agent already initialized. Changes will take effect on next initialization.')
    }
  }

  public getDisallowedTools(): string[] {
    return this.disallowedTools
  }

  /**
   * Set metadata for observability traces
   * @param newMetadata - Key-value pairs to add to metadata. Keys should be strings, values should be serializable.
   */
  public setMetadata(newMetadata: Record<string, any>): void {
    // Validate and sanitize metadata
    const sanitizedMetadata = this.sanitizeMetadata(newMetadata)

    // Merge with existing metadata instead of replacing it
    this.metadata = { ...this.metadata, ...sanitizedMetadata }
    logger.debug(`Metadata set: ${JSON.stringify(this.metadata)}`)
  }

  /**
   * Get current metadata
   * @returns A copy of the current metadata object
   */
  public getMetadata(): Record<string, any> {
    return { ...this.metadata }
  }

  /**
   * Set tags for observability traces
   * @param newTags - Array of tag strings to add. Duplicates will be automatically removed.
   */
  public setTags(newTags: string[]): void {
    // Validate and sanitize tags
    const sanitizedTags = this.sanitizeTags(newTags)
    this.tags = [...new Set([...this.tags, ...sanitizedTags])] // Remove duplicates
    logger.debug(`Tags set: ${JSON.stringify(this.tags)}`)
  }

  /**
   * Get current tags
   * @returns A copy of the current tags array
   */
  public getTags(): string[] {
    return [...this.tags]
  }

  /**
   * Sanitize metadata to ensure compatibility with observability platforms
   * @param metadata - Raw metadata object
   * @returns Sanitized metadata object
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(metadata)) {
      // Validate key
      if (typeof key !== 'string' || key.length === 0) {
        logger.warn(`Invalid metadata key: ${key}. Skipping.`)
        continue
      }

      // Sanitize key (remove special characters that might cause issues)
      const sanitizedKey = key.replace(/[^\w-]/g, '_')

      // Validate and sanitize value
      if (value === null || value === undefined) {
        sanitized[sanitizedKey] = value
      }
      else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value
      }
      else if (Array.isArray(value)) {
        // Only allow arrays of primitives
        const sanitizedArray = value.filter(item =>
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
        )
        if (sanitizedArray.length > 0) {
          sanitized[sanitizedKey] = sanitizedArray
        }
      }
      else if (typeof value === 'object') {
        // Try to serialize objects, but limit depth to prevent circular references
        try {
          const serialized = JSON.stringify(value)
          if (serialized.length > 1000) {
            logger.warn(`Metadata value for key '${sanitizedKey}' is too large. Truncating.`)
            sanitized[sanitizedKey] = `${serialized.substring(0, 1000)}...`
          }
          else {
            sanitized[sanitizedKey] = value
          }
        }
        catch (error) {
          logger.warn(`Failed to serialize metadata value for key '${sanitizedKey}': ${error}. Skipping.`)
        }
      }
      else {
        logger.warn(`Unsupported metadata value type for key '${sanitizedKey}': ${typeof value}. Skipping.`)
      }
    }

    return sanitized
  }

  /**
   * Sanitize tags to ensure compatibility with observability platforms
   * @param tags - Array of tag strings
   * @returns Array of sanitized tag strings
   */
  private sanitizeTags(tags: string[]): string[] {
    return tags
      .filter(tag => typeof tag === 'string' && tag.length > 0)
      .map(tag => tag.replace(/[^\w:-]/g, '_'))
      .filter(tag => tag.length <= 50) // Limit tag length
  }

  /**
   * Get MCP server information for observability metadata
   */
  private getMCPServerInfo(): Record<string, any> {
    const serverInfo: Record<string, any> = {}

    try {
      if (this.client) {
        const serverNames = this.client.getServerNames()
        serverInfo.mcp_servers_count = serverNames.length
        serverInfo.mcp_server_names = serverNames

        // Get server types and configurations
        const serverConfigs: Record<string, any> = {}
        for (const serverName of serverNames) {
          try {
            const config = this.client.getServerConfig(serverName)
            if (config) {
              // Determine server type based on configuration
              let serverType = 'unknown'
              if (config.command) {
                serverType = 'command'
              }
              else if (config.url) {
                serverType = 'http'
              }
              else if (config.ws_url) {
                serverType = 'websocket'
              }

              serverConfigs[serverName] = {
                type: serverType,
                // Include safe configuration details (avoid sensitive data)
                has_args: !!config.args,
                has_env: !!config.env,
                has_headers: !!config.headers,
                url: config.url || null,
                command: config.command || null,
              }
            }
          }
          catch (error) {
            logger.warn(`Failed to get config for server '${serverName}': ${error}`)
            serverConfigs[serverName] = { type: 'error', error: 'config_unavailable' }
          }
        }
        serverInfo.mcp_server_configs = serverConfigs
      }
      else if (this.connectors && this.connectors.length > 0) {
        // Handle direct connectors
        serverInfo.mcp_servers_count = this.connectors.length
        serverInfo.mcp_server_names = this.connectors.map(c => c.publicIdentifier)
        serverInfo.mcp_server_types = this.connectors.map(c => c.constructor.name)
      }
    }
    catch (error) {
      logger.warn(`Failed to collect MCP server info: ${error}`)
      serverInfo.error = 'collection_failed'
    }

    return serverInfo
  }

  private async _consumeAndReturn<T>(
    generator: AsyncGenerator<AgentStep, string | T, void>,
  ): Promise<string | T> {
    // Manually iterate through the generator to consume the steps.
    // The for-await-of loop is not used because it discards the generator's
    // final return value. We need to capture that value when `done` is true.
    while (true) {
      const { done, value } = await generator.next()
      if (done) {
        return value
      }
    }
  }

  /**
   * Runs the agent and returns a promise for the final result.
   */
  public async run(
    query: string,
    maxSteps?: number,
    manageConnector?: boolean,
    externalHistory?: BaseMessage[],
  ): Promise<string>

  /**
   * Runs the agent with structured output and returns a promise for the typed result.
   */
  public async run<T>(
    query: string,
    maxSteps?: number,
    manageConnector?: boolean,
    externalHistory?: BaseMessage[],
    outputSchema?: ZodSchema<T>,
  ): Promise<T>

  public async run<T>(
    query: string,
    maxSteps?: number,
    manageConnector?: boolean,
    externalHistory?: BaseMessage[],
    outputSchema?: ZodSchema<T>,
  ): Promise<string | T> {
    // Delegate to remote agent if in remote mode
    if (this.isRemote && this.remoteAgent) {
      return this.remoteAgent.run(query, maxSteps, manageConnector, externalHistory, outputSchema)
    }

    const generator = this.stream<T>(
      query,
      maxSteps,
      manageConnector,
      externalHistory,
      outputSchema,
    )
    return this._consumeAndReturn(generator)
  }

  /**
   * Runs the agent and yields intermediate steps as an async generator.
   * If outputSchema is provided, returns structured output of type T.
   */
  public async* stream<T = string>(
    query: string,
    maxSteps?: number,
    manageConnector = true,
    externalHistory?: BaseMessage[],
    outputSchema?: ZodSchema<T>,
  ): AsyncGenerator<AgentStep, string | T, void> {
    // Delegate to remote agent if in remote mode
    if (this.isRemote && this.remoteAgent) {
      const result = await this.remoteAgent.run(query, maxSteps, manageConnector, externalHistory, outputSchema)
      return result as string | T
    }

    let result = ''
    let initializedHere = false
    const startTime = Date.now()
    const toolsUsedNames: string[] = []
    let stepsTaken = 0
    let success = false

    // Schema-aware setup for structured output
    let structuredLlm: BaseLanguageModelInterface | null = null
    let schemaDescription = ''
    if (outputSchema) {
      query = this._enhanceQueryWithSchema(query, outputSchema)
      logger.debug(`🔄 Structured output requested, schema: ${JSON.stringify(zodToJsonSchema(outputSchema), null, 2)}`)
      // Check if withStructuredOutput method exists
      if (this.llm && 'withStructuredOutput' in this.llm && typeof (this.llm as any).withStructuredOutput === 'function') {
        structuredLlm = (this.llm as any).withStructuredOutput(outputSchema)
      }
      else if (this.llm) {
        // Fallback: use the same LLM but we'll handle structure in our helper method
        structuredLlm = this.llm
      }
      else {
        throw new Error('LLM is required for structured output')
      }
      schemaDescription = JSON.stringify(zodToJsonSchema(outputSchema), null, 2)
    }

    try {
      if (manageConnector && !this._initialized) {
        await this.initialize()
        initializedHere = true
      }
      else if (!this._initialized && this.autoInitialize) {
        await this.initialize()
        initializedHere = true
      }

      if (!this._agentExecutor) {
        throw new Error('MCP agent failed to initialize')
      }

      const steps = maxSteps ?? this.maxSteps
      this._agentExecutor.maxIterations = steps

      const display_query
        = query.length > 50 ? `${query.slice(0, 50).replace(/\n/g, ' ')}...` : query.replace(/\n/g, ' ')
      logger.info(`💬 Received query: '${display_query}'`)

      // Prepare history (WITHOUT adding current message yet)
      const historyToUse = externalHistory ?? this.conversationHistory
      const langchainHistory: BaseMessage[] = []
      for (const msg of historyToUse) {
        if (msg instanceof HumanMessage || msg instanceof AIMessage) {
          langchainHistory.push(msg)
        }
      }

      const intermediateSteps: AgentStep[] = []
      const inputs = { input: query, chat_history: langchainHistory } as Record<string, unknown>

      let nameToToolMap: Record<string, StructuredToolInterface> = Object.fromEntries(this._tools.map(t => [t.name, t]))
      logger.info(`🏁 Starting agent execution with max_steps=${steps}`)

      // Create a run manager with our callbacks if we have any - ONCE for the entire execution
      let runManager: CallbackManagerForChainRun | undefined
      if (this.callbacks?.length > 0) {
        // Create an async callback manager with our callbacks
        const callbackManager = new CallbackManager(undefined, {
          handlers: this.callbacks,
          inheritableHandlers: this.callbacks,
        })
        // Create a run manager for this chain execution
        runManager = await callbackManager.handleChainStart({
          name: 'MCPAgent (mcp-use)',
          id: ['MCPAgent (mcp-use)'],
          lc: 1,
          type: 'not_implemented',
        } as Serialized, inputs)
      }

      for (let stepNum = 0; stepNum < steps; stepNum++) {
        stepsTaken = stepNum + 1
        if (this.useServerManager && this.serverManager) {
          const currentTools = this.serverManager.tools
          const currentToolNames = new Set(currentTools.map(t => t.name))
          const existingToolNames = new Set(this._tools.map(t => t.name))

          const changed
            = currentTools.length !== this._tools.length
              || [...currentToolNames].some(n => !existingToolNames.has(n))

          if (changed) {
            logger.info(
              `🔄 Tools changed before step ${stepNum + 1}, updating agent. New tools: ${[...currentToolNames].join(', ')}`,
            )
            this._tools = currentTools
            this._tools.push(...this.additionalTools)
            await this.createSystemMessageFromTools(this._tools)
            this._agentExecutor = this.createAgent()
            this._agentExecutor.maxIterations = steps
            nameToToolMap = Object.fromEntries(this._tools.map(t => [t.name, t]))
          }
        }

        logger.info(`👣 Step ${stepNum + 1}/${steps}`)

        try {
          logger.debug('Starting agent step execution')
          const nextStepOutput: AgentStep[] | AgentFinish = await this._agentExecutor._takeNextStep(
            nameToToolMap as Record<string, ToolInterface>,
            inputs,
            intermediateSteps,
            runManager,
          )
          // Agent finish handling (AgentFinish contains returnValues property)
          if ('returnValues' in nextStepOutput) {
            logger.info(`✅ Agent finished at step ${stepNum + 1}`)
            result = nextStepOutput.returnValues?.output ?? 'No output generated'
            runManager?.handleChainEnd({ output: result })

            // If structured output is requested, attempt to create it
            if (outputSchema && structuredLlm) {
              try {
                logger.info('🔧 Attempting structured output...')
                const structuredResult = await this._attemptStructuredOutput<T>(
                  result,
                  structuredLlm,
                  outputSchema,
                  schemaDescription,
                )
                logger.debug(`🔄 Structured result: ${JSON.stringify(structuredResult)}`)

                // Add the final response to conversation history if memory is enabled
                if (this.memoryEnabled) {
                  this.addToHistory(new AIMessage(`Structured result: ${JSON.stringify(structuredResult)}`))
                }

                logger.info('✅ Structured output successful')
                success = true
                return structuredResult as string | T
              }
              catch (e) {
                logger.warn(`⚠️ Structured output failed: ${e}`)
                // Continue execution to gather missing information
                const failedStructuredOutputPrompt = `
                The current result cannot be formatted into the required structure.
                Error: ${String(e)}
                
                Current information: ${result}
                
                If information is missing, please continue working to gather the missing information needed for:
                ${schemaDescription}

                If the information is complete, please return the result in the required structure.
                `

                // Add this as feedback and continue the loop
                inputs.input = failedStructuredOutputPrompt
                if (this.memoryEnabled) {
                  this.addToHistory(new HumanMessage(failedStructuredOutputPrompt))
                }

                logger.info('🔄 Continuing execution to gather missing information...')
                continue
              }
            }
            else {
              // Regular execution without structured output
              break
            }
          }

          const stepArray = nextStepOutput as AgentStep[]
          intermediateSteps.push(...stepArray)

          for (const step of stepArray) {
            yield step
            const { action, observation } = step
            const toolName = action.tool
            toolsUsedNames.push(toolName)
            let toolInputStr = typeof action.toolInput === 'string'
              ? action.toolInput
              : JSON.stringify(action.toolInput, null, 2)
            if (toolInputStr.length > 100)
              toolInputStr = `${toolInputStr.slice(0, 97)}...`
            logger.info(`🔧 Tool call: ${toolName} with input: ${toolInputStr}`)

            let outputStr = String(observation)
            if (outputStr.length > 100)
              outputStr = `${outputStr.slice(0, 97)}...`
            outputStr = outputStr.replace(/\n/g, ' ')
            logger.info(`📄 Tool result: ${outputStr}`)
          }

          // Detect direct return
          if (stepArray.length) {
            const lastStep = stepArray[stepArray.length - 1]
            const toolReturn: AgentFinish | null = await this._agentExecutor._getToolReturn(lastStep)
            if (toolReturn) {
              logger.info(`🏆 Tool returned directly at step ${stepNum + 1}`)
              result = toolReturn.returnValues?.output ?? 'No output generated'
              break
            }
          }
        }
        catch (e) {
          if (e instanceof OutputParserException) {
            logger.error(`❌ Output parsing error during step ${stepNum + 1}: ${e}`)
            result = `Agent stopped due to a parsing error: ${e}`
            runManager?.handleChainError(result)
            break
          }
          logger.error(`❌ Error during agent execution step ${stepNum + 1}: ${e}`)
          console.error(e)
          result = `Agent stopped due to an error: ${e}`
          runManager?.handleChainError(result)
          break
        }
      }

      // —–– Post‑loop handling
      if (!result) {
        logger.warn(`⚠️ Agent stopped after reaching max iterations (${steps})`)
        result = `Agent stopped after reaching the maximum number of steps (${steps}).`
        runManager?.handleChainEnd({ output: result })
      }

      logger.info('🎉 Agent execution complete')
      success = true

      // Add BOTH the user message and AI response to conversation history if memory is enabled
      if (this.memoryEnabled) {
        try {
          this.addToHistory(new HumanMessage(query))

          // CRITICAL: Preserve tool calls even if there's no result text
          if (result || intermediateSteps.length > 0) {
            // Convert intermediateSteps to tool_calls format with error handling
            const toolCalls: ToolCall[] = []
            const toolCallIdMap = new Map<AgentStep, string>() // Use step object as key to avoid collisions

            intermediateSteps.forEach((step, index) => {
              try {
                // Validate step structure
                if (!step || !step.action || !step.action.tool) {
                  logger.warn(`⚠️ Invalid step structure at index ${index}:`, step)
                  return
                }

                // Use type-safe tool call ID generation
                const toolCallId = this.getToolCallId(step.action)
                toolCallIdMap.set(step, toolCallId) // Use step object as key for uniqueness

                // Validate tool input
                let toolArgs: any
                try {
                  toolArgs = step.action.toolInput || {}
                }
                catch (argsError) {
                  logger.warn(`⚠️ Invalid tool args for ${step.action.tool}:`, argsError)
                  toolArgs = {}
                }

                toolCalls.push({
                  id: toolCallId,
                  name: step.action.tool,
                  args: toolArgs,
                } as ToolCall)
              }
              catch (stepError) {
                logger.error(`❌ Error processing step ${index}:`, stepError)
                // Continue with other steps
              }
            })

            // Create AIMessage with tool_calls (with error handling)
            try {
              // Use result if available, otherwise use configurable placeholder for tool execution without final response
              const responseContent = (result as string) || this.getToolExecutionPlaceholder()

              const aiMessage = toolCalls.length > 0
                ? new AIMessage({ content: responseContent, tool_calls: toolCalls })
                : new AIMessage(responseContent)

              this.addToHistory(aiMessage)
            }
            catch (aiMessageError) {
              logger.error('❌ Error creating AIMessage:', aiMessageError)
              // Fallback to simple AIMessage without tool_calls
              try {
                const fallbackContent = (result as string) || this.getToolExecutionPlaceholder()
                this.addToHistory(new AIMessage(fallbackContent))
              }
              catch (fallbackError) {
                logger.error('❌ Error creating fallback AIMessage:', fallbackError)
              }
            }

            // Add ToolMessages for observations with individual error handling
            intermediateSteps.forEach((step, index) => {
              try {
                // Validate step structure
                if (!step || !step.action || !step.action.tool) {
                  return // Already logged above
                }

                const toolCallId = toolCallIdMap.get(step)
                if (!toolCallId) {
                  logger.warn(`⚠️ No toolCallId found for step ${index}`)
                  return
                }

                // Ensure observation is serialized as string for ToolMessage content with safe serialization and truncation
                let observationContent: string
                try {
                  const rawContent = typeof step.observation === 'string'
                    ? step.observation
                    : JSON.stringify(step.observation || 'No observation', null, 2)

                  // Apply tool-specific or default truncation
                  const toolName = step.action.tool
                  const config = this.getEffectiveTruncationConfig(toolName)

                  observationContent = this.applyTruncation(rawContent, config)
                }
                catch (jsonError) {
                  logger.warn(`⚠️ Failed to serialize observation for ${step.action.tool}:`, jsonError)
                  const fallbackContent = String(step.observation || 'Serialization failed')

                  // Still apply truncation to fallback content
                  const config = this.getEffectiveTruncationConfig(step.action.tool)
                  observationContent = this.applyTruncation(fallbackContent, config)
                }

                this.addToHistory(new ToolMessage({
                  content: observationContent,
                  tool_call_id: toolCallId,
                }))
              }
              catch (toolMessageError) {
                logger.error(`❌ Error creating ToolMessage for step ${index}:`, toolMessageError)
                // Continue with other tool messages
              }
            })
          }
        }
        catch (historyError) {
          logger.error('❌ Error adding to conversation history in stream():', historyError)
          // Don't throw - this shouldn't break the stream execution
        }
      }

      // Return regular result
      return result as string | T
    }
    catch (e) {
      logger.error(`❌ Error running query: ${e}`)
      if (initializedHere && manageConnector) {
        logger.info('🧹 Cleaning up resources after initialization error in run')
        await this.close()
      }
      throw e
    }
    finally {
      // Track comprehensive execution data
      const executionTimeMs = Date.now() - startTime

      let serverCount = 0
      if (this.client) {
        serverCount = Object.keys(this.client.getAllActiveSessions()).length
      }
      else if (this.connectors) {
        serverCount = this.connectors.length
      }

      const conversationHistoryLength = this.memoryEnabled ? this.conversationHistory.length : 0

      await this.telemetry.trackAgentExecution({
        executionMethod: 'stream',
        query,
        success,
        modelProvider: this.modelProvider,
        modelName: this.modelName,
        serverCount,
        serverIdentifiers: this.connectors.map(connector => connector.publicIdentifier),
        totalToolsAvailable: this._tools.length,
        toolsAvailableNames: this._tools.map(t => t.name),
        maxStepsConfigured: this.maxSteps,
        memoryEnabled: this.memoryEnabled,
        useServerManager: this.useServerManager,
        maxStepsUsed: maxSteps ?? null,
        manageConnector,
        externalHistoryUsed: externalHistory !== undefined,
        stepsTaken,
        toolsUsedCount: toolsUsedNames.length,
        toolsUsedNames,
        response: result,
        executionTimeMs,
        errorType: success ? null : 'execution_error',
        conversationHistoryLength,
      })

      if (manageConnector && !this.client && initializedHere) {
        logger.info('🧹 Closing agent after query completion')
        await this.close()
      }
    }
  }

  public async close(): Promise<void> {
    // Delegate to remote agent if in remote mode
    if (this.isRemote && this.remoteAgent) {
      await this.remoteAgent.close()
      return
    }

    logger.info('🔌 Closing MCPAgent resources…')

    // Shutdown observability handlers (important for serverless)
    await this.observabilityManager.shutdown()
    try {
      this._agentExecutor = null
      this._tools = []
      if (this.client) {
        logger.info('🔄 Closing sessions through client')
        await this.client.closeAllSessions()
        this.sessions = {}
      }
      else {
        for (const connector of this.connectors) {
          logger.info('🔄 Disconnecting connector')
          await connector.disconnect()
        }
      }
      if ('connectorToolMap' in this.adapter) {
        this.adapter = new LangChainAdapter()
      }
    }
    finally {
      this._initialized = false
      logger.info('👋 Agent closed successfully')
    }
  }

  /**
   * Yields LangChain StreamEvent objects from the underlying streamEvents() method.
   * This provides token-level streaming and fine-grained event updates.
   */
  public async* streamEvents(
    query: string,
    maxSteps?: number,
    manageConnector = true,
    externalHistory?: BaseMessage[],
  ): AsyncGenerator<StreamEvent, void, void> {
    let initializedHere = false
    const startTime = Date.now()
    let success = false
    let eventCount = 0
    let totalResponseLength = 0
    let finalResponse = ''

    // Track tool calls during streaming
    const toolCalls: ToolCall[] = []
    const toolResults: Array<{ tool_call_id: string, content: string }> = []
    const toolStartEvents = new Map<string, any>() // run_id -> start event

    try {
      // Initialize if needed
      if (manageConnector && !this._initialized) {
        await this.initialize()
        initializedHere = true
      }
      else if (!this._initialized && this.autoInitialize) {
        await this.initialize()
        initializedHere = true
      }

      const agentExecutor = (this as any).agentExecutor
      if (!agentExecutor) {
        throw new Error('MCP agent failed to initialize')
      }

      // Set max iterations
      const steps = maxSteps ?? this.maxSteps
      agentExecutor.maxIterations = steps

      const display_query
        = query.length > 50 ? `${query.slice(0, 50).replace(/\n/g, ' ')}...` : query.replace(/\n/g, ' ')
      logger.info(`💬 Received query for streamEvents: '${display_query}'`)

      // Prepare history (WITHOUT adding current message yet)
      const historyToUse = externalHistory ?? this.conversationHistory
      const langchainHistory: BaseMessage[] = []
      for (const msg of historyToUse) {
        if (msg instanceof HumanMessage || msg instanceof AIMessage || msg instanceof ToolMessage) {
          langchainHistory.push(msg)
        }
        else {
          logger.info(`⚠️ Skipped message of type: ${msg.constructor.name}`)
        }
      }

      // Prepare inputs
      const inputs = { input: query, chat_history: langchainHistory }

      logger.info('callbacks', this.callbacks)

      // Stream events from the agent executor
      const eventStream = agentExecutor.streamEvents(
        inputs,
        {
          version: 'v2',
          callbacks: this.callbacks.length > 0 ? this.callbacks : undefined,
        },
      )

      // Yield each event
      for await (const event of eventStream) {
        try {
          eventCount++

          // Validate event structure
          if (!event || typeof event !== 'object' || !event.event) {
            logger.warn('⚠️ Invalid event structure:', event)
            continue
          }

          // Track tool start events
          if (event.event === 'on_tool_start') {
            if (event.run_id && event.name) {
              toolStartEvents.set(event.run_id, event)
            }
            else {
              logger.warn('⚠️ Invalid on_tool_start event - missing run_id or name:', event)
            }
          }

          // Track tool end events and create tool call history
          if (event.event === 'on_tool_end') {
            if (!event.run_id) {
              logger.warn('⚠️ on_tool_end event missing run_id:', event)
            }
            else {
              const startEvent = toolStartEvents.get(event.run_id)
              if (startEvent) {
                // Validate required fields
                if (!startEvent.name || !startEvent.data?.input) {
                  logger.warn('⚠️ Invalid tool start event data:', startEvent)
                }
                else {
                  // CRITICAL: Use consistent ID generation strategy with stream() method
                  // Try to extract toolCallId from events, fallback to UUID generation
                  const toolCallId = (startEvent.data?.toolCallId || event.data?.toolCallId) || crypto.randomUUID()

                  // Create ToolCall from start event
                  toolCalls.push({
                    id: toolCallId,
                    name: startEvent.name,
                    args: startEvent.data.input,
                  } as ToolCall)

                  // Store tool result for ToolMessage (with safe serialization and truncation)
                  let outputContent: string
                  try {
                    const rawContent = typeof event.data?.output === 'string'
                      ? event.data.output
                      : JSON.stringify(event.data?.output || 'No output', null, 2)

                    // Apply tool-specific or default truncation
                    const config = this.getEffectiveTruncationConfig(startEvent.name)
                    outputContent = this.applyTruncation(rawContent, config)
                  }
                  catch (jsonError) {
                    logger.warn('⚠️ Failed to serialize tool output:', jsonError)
                    const fallbackContent = String(event.data?.output || 'Serialization failed')

                    // Still apply truncation to fallback content
                    const config = this.getEffectiveTruncationConfig(startEvent.name)
                    outputContent = this.applyTruncation(fallbackContent, config)
                  }

                  toolResults.push({
                    tool_call_id: toolCallId,
                    content: outputContent,
                  })

                  // Clean up to prevent memory leaks
                  toolStartEvents.delete(event.run_id)
                }
              }
              else {
                logger.warn('⚠️ on_tool_end event without matching on_tool_start:', event.run_id)
              }
            }
          }

          // Track response length for telemetry
          if (event.event === 'on_chat_model_stream' && event.data?.chunk?.content) {
            totalResponseLength += event.data.chunk.content.length
          }

          yield event

          // Capture final response from chain end event (enhanced to handle all output formats)
          if (event.event === 'on_chain_end' && event.data?.output) {
            const output = event.data.output
            try {
              if (typeof output === 'string') {
                finalResponse = output
              }
              else if (Array.isArray(output) && output.length > 0 && output[0]?.text) {
                finalResponse = output[0].text
              }
              else if (output && typeof output === 'object' && output.output) {
                finalResponse = typeof output.output === 'string' ? output.output : JSON.stringify(output.output)
              }
              else if (output && typeof output === 'object') {
                // For custom structured outputs, try common text fields or stringify
                finalResponse = output.answer || output.text || output.content || JSON.stringify(output)
              }
              else {
                logger.warn('⚠️ Unexpected chain end output format:', typeof output, output)
              }
            }
            catch (error) {
              logger.warn('⚠️ Error processing chain end output:', error)
            }
          }
        }
        catch (eventError) {
          logger.error('❌ Error processing event:', eventError, 'Event:', event)
          // Continue processing other events despite individual failures
          continue
        }
      }

      // Add to conversation history with proper tool call information and error handling
      if (this.memoryEnabled) {
        try {
          this.addToHistory(new HumanMessage(query))

          // CRITICAL: Preserve tool calls even if there's no final response
          if (finalResponse || toolCalls.length > 0) {
            // Use finalResponse if available, otherwise use configurable placeholder for tool execution without final response
            const responseContent = finalResponse || this.getToolExecutionPlaceholder()

            // Create AIMessage with tool_calls if any tools were used
            const aiMessage = toolCalls.length > 0
              ? new AIMessage({ content: responseContent, tool_calls: toolCalls })
              : new AIMessage(responseContent)

            this.addToHistory(aiMessage)

            // Add ToolMessages for each tool result with individual error handling
            toolResults.forEach((result, index) => {
              try {
                this.addToHistory(new ToolMessage({
                  content: result.content,
                  tool_call_id: result.tool_call_id,
                }))
              }
              catch (toolMessageError) {
                logger.error(`❌ Failed to add ToolMessage ${index}:`, toolMessageError)
              }
            })
          }
        }
        catch (historyError) {
          logger.error('❌ Error adding to conversation history:', historyError)
          // Don't throw - this shouldn't break the streaming
        }
      }

      // Log any orphaned tool start events (potential memory leaks or missed events)
      if (toolStartEvents.size > 0) {
        logger.warn(`⚠️ ${toolStartEvents.size} orphaned tool start events:`, Array.from(toolStartEvents.keys()))
      }

      logger.info(`🎉 StreamEvents complete - ${eventCount} events emitted`)
      success = true
    }
    catch (e) {
      logger.error(`❌ Error during streamEvents: ${e}`)
      if (initializedHere && manageConnector) {
        logger.info('🧹 Cleaning up resources after initialization error in streamEvents')
        await this.close()
      }
      throw e
    }
    finally {
      // Track telemetry
      const executionTimeMs = Date.now() - startTime

      let serverCount = 0
      if (this.client) {
        serverCount = Object.keys(this.client.getAllActiveSessions()).length
      }
      else if (this.connectors) {
        serverCount = this.connectors.length
      }

      const conversationHistoryLength = this.memoryEnabled ? this.conversationHistory.length : 0

      await this.telemetry.trackAgentExecution({
        executionMethod: 'streamEvents',
        query,
        success,
        modelProvider: this.modelProvider,
        modelName: this.modelName,
        serverCount,
        serverIdentifiers: this.connectors.map(connector => connector.publicIdentifier),
        totalToolsAvailable: this._tools.length,
        toolsAvailableNames: this._tools.map(t => t.name),
        maxStepsConfigured: this.maxSteps,
        memoryEnabled: this.memoryEnabled,
        useServerManager: this.useServerManager,
        maxStepsUsed: maxSteps ?? null,
        manageConnector,
        externalHistoryUsed: externalHistory !== undefined,
        response: `[STREAMED RESPONSE - ${totalResponseLength} chars]`,
        executionTimeMs,
        errorType: success ? null : 'streaming_error',
        conversationHistoryLength,
      })

      // Clean up if needed
      if (manageConnector && !this.client && initializedHere) {
        logger.info('🧹 Closing agent after streamEvents completion')
        await this.close()
      }
    }
  }

  /**
   * Attempt to create structured output from raw result with validation and retry logic.
   */
  private async _attemptStructuredOutput<T>(
    rawResult: string | any,
    structuredLlm: BaseLanguageModelInterface,
    outputSchema: ZodSchema<T>,
    schemaDescription: string,
  ): Promise<T> {
    logger.info(`🔄 Attempting structured output with schema: ${outputSchema}`)
    logger.info(`🔄 Schema description: ${schemaDescription}`)
    logger.info(`🔄 Raw result: ${JSON.stringify(rawResult, null, 2)}`)

    // Handle different input formats - rawResult might be an array or object from the agent
    let textContent: string = ''
    if (typeof rawResult === 'string') {
      textContent = rawResult
    }
    else if (rawResult && typeof rawResult === 'object') {
      // Handle object format
      textContent = JSON.stringify(rawResult)
    }

    // If we couldn't extract text, use the stringified version
    if (!textContent) {
      textContent = JSON.stringify(rawResult)
    }

    // Get detailed schema information for better prompting
    const maxRetries = 3
    let lastError: string = ''

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`🔄 Structured output attempt ${attempt}/${maxRetries}`)

      let formatPrompt = `
      Please format the following information according to the EXACT schema specified below.
      You must use the exact field names and types as shown in the schema.
      
      Required schema format:
      ${schemaDescription}
      
      Content to extract from:
      ${textContent}
      
      IMPORTANT: 
      - Use ONLY the field names specified in the schema
      - Match the data types exactly (string, number, boolean, array, etc.)
      - Include ALL required fields
      - Return valid JSON that matches the schema structure exactly
      `

      // Add specific error feedback for retry attempts
      if (attempt > 1) {
        formatPrompt += `
        
        PREVIOUS ATTEMPT FAILED with error: ${lastError}
        Please fix the issues mentioned above and ensure the output matches the schema exactly.
        `
      }

      try {
        const structuredResult = await structuredLlm.invoke(formatPrompt)
        logger.info(`🔄 Structured result attempt ${attempt}: ${JSON.stringify(structuredResult, null, 2)}`)

        // Validate the structured result
        const validatedResult = this._validateStructuredResult(structuredResult, outputSchema)
        logger.info(`✅ Structured output successful on attempt ${attempt}`)
        return validatedResult
      }
      catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
        logger.warn(`⚠️ Structured output attempt ${attempt} failed: ${lastError}`)

        if (attempt === maxRetries) {
          logger.error(`❌ All ${maxRetries} structured output attempts failed`)
          throw new Error(`Failed to generate valid structured output after ${maxRetries} attempts. Last error: ${lastError}`)
        }

        // Continue to next attempt
        continue
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in structured output generation')
  }

  /**
   * Validate the structured result against the schema with detailed error reporting
   */
  private _validateStructuredResult<T>(structuredResult: any, outputSchema: ZodSchema<T>): T {
    // Use Zod to validate the structured result
    try {
      // Use Zod to validate the structured result
      const validatedResult = outputSchema.parse(structuredResult)

      // Additional validation for required fields
      const schemaType = outputSchema as any
      if (schemaType._def && schemaType._def.shape) {
        for (const [fieldName, fieldSchema] of Object.entries(schemaType._def.shape)) {
          const field = fieldSchema as any
          const isOptional = field.isOptional?.() ?? field._def?.typeName === 'ZodOptional'
          const isNullable = field.isNullable?.() ?? field._def?.typeName === 'ZodNullable'
          if (!isOptional && !isNullable) {
            const value = (validatedResult as any)[fieldName]
            if (value === null || value === undefined
              || (typeof value === 'string' && !value.trim())
              || (Array.isArray(value) && value.length === 0)) {
              throw new Error(`Required field '${fieldName}' is missing or empty`)
            }
          }
        }
      }

      return validatedResult
    }
    catch (e) {
      logger.debug(`Validation details: ${e}`)
      throw e // Re-raise to trigger retry logic
    }
  }

  /**
   * Enhance the query with schema information to make the agent aware of required fields.
   */
  private _enhanceQueryWithSchema<T>(query: string, outputSchema: ZodSchema<T>): string {
    try {
      const schemaDescription = JSON.stringify(zodToJsonSchema(outputSchema), null, 2)

      // Enhance the query with schema awareness
      const enhancedQuery = `
      ${query}
      
      IMPORTANT: Your response must include sufficient information to populate the following structured output:
      
      ${schemaDescription}
      
      Make sure you gather ALL the required information during your task execution.
      If any required information is missing, continue working to find it.
      `

      return enhancedQuery
    }
    catch (e) {
      logger.warn(`Could not extract schema details: ${e}`)
      return query
    }
  }
}
