/**
 * Langfuse observability integration for MCP-use.
 *
 * This module provides automatic instrumentation and callback handler
 * for Langfuse observability platform.
 */

/// <reference path="./types.d.ts" />

import type { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { config } from 'dotenv'
import { logger } from '../logging.js'

config()

// Check if Langfuse is disabled via environment variable
const langfuseDisabled = process.env.MCP_USE_LANGFUSE?.toLowerCase() === 'false'

// Initialize variables - using const with object to avoid linter issues with mutable exports
const langfuseState = {
  handler: null as BaseCallbackHandler | null,
  client: null as any,
  initPromise: null as Promise<void> | null,
}

async function initializeLangfuse(): Promise<void> {
  try {
    // Dynamically import to avoid errors if package not installed
    const langfuseModule = await import('langfuse-langchain').catch(() => null)
    if (!langfuseModule) {
      logger.debug('Langfuse package not installed - tracing disabled. Install with: npm install langfuse-langchain')
      return
    }

    const { CallbackHandler } = langfuseModule as any
    // Create a custom CallbackHandler wrapper to add logging
    class LoggingCallbackHandler extends CallbackHandler {
      constructor(config?: any) {
        super(config)
      }

      async handleLLMStart(...args: any[]): Promise<void> {
        logger.debug('Langfuse: LLM start intercepted')
        if (this.verbose) {
          logger.debug(`Langfuse: LLM start args: ${JSON.stringify(args)}`)
        }
        return super.handleLLMStart(...args)
      }

      async handleChainStart(...args: any[]): Promise<void> {
        logger.debug('Langfuse: Chain start intercepted')
        if (this.verbose) {
          logger.debug(`Langfuse: Chain start args: ${JSON.stringify(args)}`)
        }
        return super.handleChainStart(...args)
      }

      async handleToolStart(...args: any[]): Promise<void> {
        logger.debug('Langfuse: Tool start intercepted')
        if (this.verbose) {
          logger.debug(`Langfuse: Tool start args: ${JSON.stringify(args)}`)
        }
        return super.handleToolStart(...args)
      }

      async handleRetrieverStart(...args: any[]): Promise<void> {
        logger.debug('Langfuse: Retriever start intercepted')
        if (this.verbose) {
          logger.debug(`Langfuse: Retriever start args: ${JSON.stringify(args)}`)
        }
        return super.handleRetrieverStart(...args)
      }

      async handleAgentAction(...args: any[]): Promise<void> {
        logger.debug('Langfuse: Agent action intercepted')
        if (this.verbose) {
          logger.debug(`Langfuse: Agent action args: ${JSON.stringify(args)}`)
        }
        return super.handleAgentAction(...args)
      }

      async handleAgentEnd(...args: any[]): Promise<void> {
        logger.debug('Langfuse: Agent end intercepted')
        if (this.verbose) {
          logger.debug(`Langfuse: Agent end args: ${JSON.stringify(args)}`)
        }
        return super.handleAgentEnd(...args)
      }
    }

    // Create the handler with configuration
    const config = {
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com',
      flushAt: Number.parseInt(process.env.LANGFUSE_FLUSH_AT || '15'),
      flushInterval: Number.parseInt(process.env.LANGFUSE_FLUSH_INTERVAL || '10000'),
      release: process.env.LANGFUSE_RELEASE,
      requestTimeout: Number.parseInt(process.env.LANGFUSE_REQUEST_TIMEOUT || '10000'),
      enabled: process.env.LANGFUSE_ENABLED !== 'false',
    }

    langfuseState.handler = new LoggingCallbackHandler(config) as BaseCallbackHandler
    logger.debug('Langfuse observability initialized successfully with logging enabled')

    // Also initialize the client for direct usage if needed
    try {
      const langfuseCore = await import('langfuse').catch(() => null)
      if (langfuseCore) {
        const { Langfuse } = langfuseCore as any
        langfuseState.client = new Langfuse({
          publicKey: process.env.LANGFUSE_PUBLIC_KEY,
          secretKey: process.env.LANGFUSE_SECRET_KEY,
          baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
        })
        logger.debug('Langfuse client initialized')
      }
    }
    catch (error) {
      logger.debug(`Langfuse client initialization failed: ${error}`)
    }
  }
  catch (error) {
    logger.debug(`Langfuse initialization error: ${error}`)
  }
}

// Only initialize if not disabled and required keys are present
if (langfuseDisabled) {
  logger.debug('Langfuse tracing disabled via MCP_USE_LANGFUSE environment variable')
}
else if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
  logger.debug(
    'Langfuse API keys not found - tracing disabled. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable',
  )
}
else {
  // Create initialization promise to ensure handlers are ready when needed
  langfuseState.initPromise = initializeLangfuse()
}

// Export getters to access the state
export const langfuseHandler = () => langfuseState.handler
export const langfuseClient = () => langfuseState.client
export const langfuseInitPromise = () => langfuseState.initPromise
