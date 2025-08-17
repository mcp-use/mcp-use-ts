/**
 * Laminar observability integration for MCP-use.
 *
 * This module provides automatic instrumentation and optional callback handler
 * for Laminar AI observability platform.
 */

import type { AgentAction, AgentFinish } from '@langchain/core/agents'
import type { Serialized } from '@langchain/core/load/serializable'
import type { LLMResult } from '@langchain/core/outputs'
import type { ChainValues } from '@langchain/core/utils/types'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { config } from 'dotenv'
import { logger } from '../logging.js'

config()

// Check if Laminar is disabled via environment variable
const laminarDisabled = process.env.MCP_USE_LAMINAR?.toLowerCase() === 'false'

// Track if Laminar is initialized for other modules to check
let laminarInitialized = false
let laminarHandler: BaseCallbackHandler | null = null
// Initialize based on environment
const initializationPromise: Promise<void> | null = (() => {
  // Only initialize if not disabled and API key is present
  if (laminarDisabled) {
    logger.debug('Laminar tracing disabled via MCP_USE_LAMINAR environment variable')
    return null
  }
  else if (!process.env.LAMINAR_PROJECT_API_KEY && !process.env.LMNR_PROJECT_API_KEY) {
    logger.debug(
      'Laminar API key not found - tracing disabled. Set LAMINAR_PROJECT_API_KEY or LMNR_PROJECT_API_KEY to enable',
    )
    return null
  }
  else {
    // Create initialization promise to ensure handlers are ready when needed
    return (async () => {
      try {
      // Dynamically import to avoid errors if package not installed
        const laminarModule = await import('@lmnr-ai/lmnr').catch(() => null)
        if (!laminarModule) {
          logger.debug('Laminar package not installed - tracing disabled. Install with: npm install @lmnr-ai/lmnr')
          return
        }

        const { Laminar, observe } = laminarModule
        // Initialize Laminar with automatic instrumentation
        logger.debug('Laminar: Initializing automatic instrumentation for LangChain')

        const config = {
          projectApiKey: process.env.LAMINAR_PROJECT_API_KEY || process.env.LMNR_PROJECT_API_KEY,
          baseUrl: process.env.LAMINAR_BASE_URL || process.env.LMNR_BASE_URL,
        }

        Laminar.initialize(config)
        laminarInitialized = true
        logger.debug('Laminar observability initialized successfully with LangChain instrumentation')

        // Create a simple LangChain callback handler for Laminar (optional, as auto-instrumentation handles most)
        class LaminarCallbackHandler extends BaseCallbackHandler {
          name = 'LaminarCallbackHandler'

          constructor() {
            super()
            logger.debug('Laminar: Created custom LangChain callback handler')
          }

          async handleLLMStart(
            llm: Serialized,
            prompts: string[],
            _runId?: string,
            _parentRunId?: string,
            _extraParams?: Record<string, unknown>,
            _tags?: string[],
            _metadata?: Record<string, unknown>,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: LLM start')
            if (prompts && prompts.length > 0) {
              const preview = prompts[0].slice(0, 100)
              logger.debug(`Laminar CallbackHandler: Prompts preview: ${preview}${prompts[0].length > 100 ? '...' : ''}`)
            }
          }

          async handleLLMEnd(
            _output: LLMResult,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: LLM end')
          }

          async handleLLMError(
            err: Error | unknown,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug(`Laminar CallbackHandler: LLM error: ${err}`)
          }

          async handleChainStart(
            chain: Serialized,
            inputs: ChainValues,
            _runId?: string,
            _parentRunId?: string,
            _tags?: string[],
            _metadata?: Record<string, unknown>,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Chain start')
            if (inputs) {
              const inputStr = JSON.stringify(inputs).slice(0, 100)
              logger.debug(`Laminar CallbackHandler: Inputs preview: ${inputStr}${JSON.stringify(inputs).length > 100 ? '...' : ''}`)
            }
          }

          async handleChainEnd(
            _outputs: ChainValues,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Chain end')
          }

          async handleChainError(
            err: Error | unknown,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug(`Laminar CallbackHandler: Chain error: ${err}`)
          }

          async handleToolStart(
            tool: Serialized,
            input: string,
            _runId?: string,
            _parentRunId?: string,
            _tags?: string[],
            _metadata?: Record<string, unknown>,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Tool start')
            if (input) {
              const preview = input.slice(0, 100)
              logger.debug(`Laminar CallbackHandler: Tool input: ${preview}${input.length > 100 ? '...' : ''}`)
            }
          }

          async handleToolEnd(
            _output: string,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Tool end')
          }

          async handleToolError(
            err: Error | unknown,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug(`Laminar CallbackHandler: Tool error: ${err}`)
          }

          async handleAgentAction(
            action: AgentAction,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Agent action')
            const actionStr = JSON.stringify(action).slice(0, 100)
            logger.debug(`Laminar CallbackHandler: Action: ${actionStr}...`)
          }

          async handleAgentEnd(
            _action: AgentFinish,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Agent end')
          }

          async handleRetrieverStart(
            _retriever: Serialized,
            _query: string,
            _runId?: string,
            _parentRunId?: string,
            _tags?: string[],
            _metadata?: Record<string, unknown>,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Retriever start')
          }

          async handleRetrieverEnd(
            _documents: any[],
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug('Laminar CallbackHandler: Retriever end')
          }

          async handleRetrieverError(
            err: Error | unknown,
            _runId?: string,
            _parentRunId?: string,
          ): Promise<void> {
            logger.debug(`Laminar CallbackHandler: Retriever error: ${err}`)
          }
        }

        // Export the handler for use in MCPAgent
        laminarHandler = new LaminarCallbackHandler()
        logger.debug('Laminar: Custom callback handler created and ready for use');

        // Export observe function for wrapping custom functions
        (globalThis as any).laminarObserve = observe
      }
      catch (error) {
        logger.error(`Failed to initialize Laminar: ${error}`)
      }
    })()
  }
})()

// Export getters to avoid exporting mutable bindings
export const getLaminarHandler = () => laminarHandler
export const isLaminarInitialized = () => laminarInitialized
export const getLaminarInitPromise = () => initializationPromise
