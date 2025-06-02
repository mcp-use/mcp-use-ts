import type { BaseLanguageModelInterface, LanguageModelLike } from '@langchain/core/language_models/base'
import type {
  BaseMessage,
} from '@langchain/core/messages'
import type { StructuredToolInterface, ToolInterface } from '@langchain/core/tools'
import type { AgentFinish, AgentStep } from 'langchain/agents'
import type { MCPClient } from '../client.js'
import type { BaseConnector } from '../connectors/base.js'
import type { ServerManager } from '../managers/server_manager.js'
import type { MCPSession } from '../session.js'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
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
import { LangChainAdapter } from '../adapters/langchain_adapter.js'
import { logger } from '../logging.js'
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
  private useServerManager: boolean
  private verbose: boolean
  private systemPrompt?: string | null
  private systemPromptTemplateOverride?: string | null
  private additionalInstructions?: string | null

  private initialized = false
  private conversationHistory: BaseMessage[] = []
  private agentExecutor: AgentExecutor | null = null
  private sessions: Record<string, MCPSession> = {}
  private systemMessage: SystemMessage | null = null
  private tools: StructuredToolInterface[] = []
  private adapter: LangChainAdapter
  private serverManager: ServerManager | null = null

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
    this.useServerManager = options.useServerManager ?? false
    this.verbose = options.verbose ?? false

    if (!this.client && this.connectors.length === 0) {
      throw new Error('Either \'client\' or at least one \'connector\' must be provided.')
    }

    if (this.useServerManager) {
      if (!this.client) {
        throw new Error('\'client\' must be provided when \'useServerManager\' is true.')
      }
      if (options.serverManagerFactory) {
        this.serverManager = options.serverManagerFactory(this.client)
      }
      else {
        throw new Error('No serverManagerFactory passed to MCPAgent constructor.')
      }
    }
    // Let consumers swap allowed tools dynamically
    this.adapter = options.adapter ?? new LangChainAdapter(this.disallowedTools)
  }

  public async initialize(): Promise<void> {
    logger.info('🚀 Initializing MCP agent and connecting to services...')

    // If using server manager, initialize it
    if (this.useServerManager && this.serverManager) {
      await this.serverManager.initialize()

      // Get server management tools
      const managementTools = this.serverManager.tools
      this.tools = managementTools
      logger.info(
        `🔧 Server manager mode active with ${managementTools.length} management tools`,
      )

      // Create the system message based on available tools
      await this.createSystemMessageFromTools(this.tools)
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
        this.tools = await LangChainAdapter.createTools(this.client)
        logger.info(`🛠️ Created ${this.tools.length} LangChain tools from client`)
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
        this.tools = await this.adapter.createToolsFromConnectors(this.connectors)
        logger.info(`🛠️ Created ${this.tools.length} LangChain tools from connectors`)
      }

      // Get all tools for system message generation
      logger.info(`🧰 Found ${this.tools.length} tools across all connectors`)

      // Create the system message based on available tools
      await this.createSystemMessageFromTools(this.tools)
    }

    // Create the agent executor and mark initialized
    this.agentExecutor = this.createAgent()
    this.initialized = true
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
      tools: this.tools,
      prompt,
    })

    return new AgentExecutor({
      agent,
      tools: this.tools,
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

    if (this.initialized && this.tools.length) {
      this.agentExecutor = this.createAgent()
      logger.debug('Agent recreated with new system message')
    }
  }

  public setDisallowedTools(disallowedTools: string[]): void {
    this.disallowedTools = disallowedTools
    this.adapter = new LangChainAdapter(this.disallowedTools)
    if (this.initialized) {
      logger.debug('Agent already initialized. Changes will take effect on next initialization.')
    }
  }

  public getDisallowedTools(): string[] {
    return this.disallowedTools
  }

  public async run(
    query: string,
    maxSteps?: number,
    manageConnector = true,
    externalHistory?: BaseMessage[],
  ): Promise<string> {
    let result = ''
    let initializedHere = false

    try {
      if (manageConnector && !this.initialized) {
        await this.initialize()
        initializedHere = true
      }
      else if (!this.initialized && this.autoInitialize) {
        await this.initialize()
        initializedHere = true
      }

      if (!this.agentExecutor) {
        throw new Error('MCP agent failed to initialize')
      }

      const steps = maxSteps ?? this.maxSteps
      this.agentExecutor.maxIterations = steps

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

      let nameToToolMap: Record<string, StructuredToolInterface> = Object.fromEntries(this.tools.map(t => [t.name, t]))
      logger.info(`🏁 Starting agent execution with max_steps=${steps}`)

      for (let stepNum = 0; stepNum < steps; stepNum++) {
        if (this.useServerManager && this.serverManager) {
          const currentTools = this.serverManager.tools
          const currentToolNames = new Set(currentTools.map(t => t.name))
          const existingToolNames = new Set(this.tools.map(t => t.name))

          const changed
            = currentTools.length !== this.tools.length
              || [...currentToolNames].some(n => !existingToolNames.has(n))

          if (changed) {
            logger.info(
              `🔄 Tools changed before step ${stepNum + 1}, updating agent. New tools: ${[...currentToolNames].join(', ')}`,
            )
            this.tools = currentTools
            await this.createSystemMessageFromTools(this.tools)
            this.agentExecutor = this.createAgent()
            this.agentExecutor.maxIterations = steps
            nameToToolMap = Object.fromEntries(this.tools.map(t => [t.name, t]))
          }
        }

        logger.info(`👣 Step ${stepNum + 1}/${steps}`)

        try {
          logger.debug('Starting agent step execution')
          const nextStepOutput = await this.agentExecutor._takeNextStep(
            nameToToolMap as Record<string, ToolInterface>,
            inputs,
            intermediateSteps,
          )

          if ((nextStepOutput as AgentFinish).returnValues) {
            logger.info(`✅ Agent finished at step ${stepNum + 1}`)
            result = (nextStepOutput as AgentFinish).returnValues?.output ?? 'No output generated'
            break
          }

          const stepArray = nextStepOutput as AgentStep[]
          intermediateSteps.push(...stepArray)

          for (const step of stepArray) {
            const { action, observation } = step
            const toolName = action.tool
            let toolInputStr = String(action.toolInput)
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
            const toolReturn = await this.agentExecutor._getToolReturn(lastStep)
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

      if (this.memoryEnabled) {
        this.addToHistory(new AIMessage(result))
      }

      logger.info('🎉 Agent execution complete')
      return result
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
      if (manageConnector && !this.client && initializedHere) {
        logger.info('🧹 Closing agent after query completion')
        await this.close()
      }
    }
  }

  public async close(): Promise<void> {
    logger.info('🔌 Closing MCPAgent resources…')
    try {
      this.agentExecutor = null
      this.tools = []
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
      this.initialized = false
      logger.info('👋 Agent closed successfully')
    }
  }
}
