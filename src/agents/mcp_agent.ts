import type { BaseLanguageModelInterface, LanguageModelLike } from '@langchain/core/language_models/base'
import type {
  BaseMessage,
} from '@langchain/core/messages'
import type { StructuredToolInterface, ToolInterface } from '@langchain/core/tools'
import type { StreamEvent } from '@langchain/core/tracers/log_stream'
import type { AgentFinish, AgentStep } from 'langchain/agents'

import type { ZodSchema } from 'zod'
import type { MCPClient } from '../client.js'
import type { BaseConnector } from '../connectors/base.js'
import type { MCPSession } from '../session.js'
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
import {
  AgentExecutor,
  createToolCallingAgent,
} from 'langchain/agents'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { LangChainAdapter } from '../adapters/langchain_adapter.js'
import { logger } from '../logging.js'
import { ServerManager } from '../managers/server_manager.js'
import { extractModelInfo, Telemetry } from '../telemetry/index.js'
import { createSystemMessage } from './prompts/system_prompt_builder.js'
import { DEFAULT_SYSTEM_PROMPT_TEMPLATE, SERVER_MANAGER_SYSTEM_PROMPT_TEMPLATE } from './prompts/templates.js'

export class MCPAgent {
  private llm: BaseLanguageModelInterface
  private client?: MCPClient
  private connectors: BaseConnector[]
  private maxSteps: number
  private autoInitialize: boolean
  private memoryEnabled: boolean
  private disallowedTools: string[]
  private additionalTools: StructuredToolInterface[]
  private useServerManager: boolean
  private verbose: boolean
  private systemPrompt?: string | null
  private systemPromptTemplateOverride?: string | null
  private additionalInstructions?: string | null

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

  constructor(options: {
    llm: BaseLanguageModelInterface
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
    adapter?: LangChainAdapter
    serverManagerFactory?: (client: MCPClient) => ServerManager
  }) {
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
    const [provider, name] = extractModelInfo(this.llm as any)
    this.modelProvider = provider
    this.modelName = name

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

  public async initialize(): Promise<void> {
    logger.info('🚀 Initializing MCP agent and connecting to services...')

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
        this.sessions = await this.client.getAllActiveSessions()
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
      if ('withStructuredOutput' in this.llm && typeof (this.llm as any).withStructuredOutput === 'function') {
        structuredLlm = (this.llm as any).withStructuredOutput(outputSchema)
      }
      else {
        // Fallback: use the same LLM but we'll handle structure in our helper method
        structuredLlm = this.llm
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

      // —–– Record user message
      if (this.memoryEnabled) {
        this.addToHistory(new HumanMessage(query))
      }

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
          const nextStepOutput = await this._agentExecutor._takeNextStep(
            nameToToolMap as Record<string, ToolInterface>,
            inputs,
            intermediateSteps,
          )
          // Agent finish handling
          if ((nextStepOutput as AgentFinish).returnValues) {
            logger.info(`✅ Agent finished at step ${stepNum + 1}`)
            result = (nextStepOutput as AgentFinish).returnValues?.output ?? 'No output generated'

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
            const toolReturn = await this._agentExecutor._getToolReturn(lastStep)
            if (toolReturn) {
              logger.info(`🏆 Tool returned directly at step ${stepNum + 1}`)
              result = (toolReturn as unknown as AgentFinish).returnValues?.output ?? 'No output generated'
              break
            }
          }
        }
        catch (e) {
          if (e instanceof OutputParserException) {
            logger.error(`❌ Output parsing error during step ${stepNum + 1}: ${e}`)
            result = `Agent stopped due to a parsing error: ${e}`
            break
          }
          logger.error(`❌ Error during agent execution step ${stepNum + 1}: ${e}`)
          console.error(e)
          result = `Agent stopped due to an error: ${e}`
          break
        }
      }

      // —–– Post‑loop handling
      if (!result) {
        logger.warn(`⚠️ Agent stopped after reaching max iterations (${steps})`)
        result = `Agent stopped after reaching the maximum number of steps (${steps}).`
      }

      logger.info('🎉 Agent execution complete')
      success = true

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
        serverCount = Object.keys(await this.client.getAllActiveSessions()).length
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
    logger.info('🔌 Closing MCPAgent resources…')
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

      // Add user message to history if memory enabled
      if (this.memoryEnabled) {
        logger.info(`🔄 Adding user message to history: ${query}`)
        this.addToHistory(new HumanMessage(query))
      }

      // Prepare history
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

      // Stream events from the agent executor
      const eventStream = agentExecutor.streamEvents(
        inputs,
        { version: 'v2' },
      )

      // Yield each event
      for await (const event of eventStream) {
        eventCount++

        // Skip null or invalid events
        if (!event || typeof event !== 'object') {
          continue
        }

        // Track response length for telemetry
        if (event.event === 'on_chat_model_stream' && event.data?.chunk?.content) {
          totalResponseLength += event.data.chunk.content.length
        }

        yield event

        // Capture final response from chain end event
        if (event.event === 'on_chain_end' && event.data?.output) {
          const output = event.data.output
          if (Array.isArray(output) && output.length > 0 && output[0]?.text) {
            finalResponse = output[0].text
          }
        }
      }

      // Add the final AI response to conversation history if memory is enabled
      if (this.memoryEnabled && finalResponse) {
        this.addToHistory(new AIMessage(finalResponse))
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
        serverCount = Object.keys(await this.client.getAllActiveSessions()).length
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
