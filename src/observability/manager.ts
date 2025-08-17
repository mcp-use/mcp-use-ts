/**
 * Observability callbacks manager for MCP-use.
 *
 * This module provides a centralized manager for handling observability callbacks
 * from various platforms (Langfuse, Laminar, etc.) in a clean and extensible way.
 */

import type { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { logger } from '../logging.js'

export interface ObservabilityConfig {
  /** Custom callbacks to use instead of defaults */
  customCallbacks?: BaseCallbackHandler[]
  /** Whether to enable verbose logging */
  verbose?: boolean
}

export class ObservabilityManager {
  private customCallbacks?: BaseCallbackHandler[]
  private availableHandlers: BaseCallbackHandler[] = []
  private handlerNames: string[] = []
  private initialized = false
  private verbose: boolean

  constructor(config: ObservabilityConfig = {}) {
    this.customCallbacks = config.customCallbacks
    this.verbose = config.verbose ?? false
  }

  /**
   * Collect all available observability handlers from configured platforms.
   */
  private async collectAvailableHandlers(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Import handlers lazily to avoid circular imports
    try {
      const { langfuseHandler, langfuseInitPromise } = await import('./langfuse.js')
      // Wait for initialization to complete
      const initPromise = langfuseInitPromise()
      if (initPromise) {
        await initPromise
      }
      const handler = langfuseHandler()
      if (handler) {
        this.availableHandlers.push(handler)
        this.handlerNames.push('Langfuse')
        logger.debug('ObservabilityManager: Langfuse handler available')
      }
    }
    catch {
      logger.debug('ObservabilityManager: Langfuse module not available')
    }

    // Future: Add more platforms here...

    this.initialized = true
  }

  /**
   * Get the list of callbacks to use.
   * @returns List of callbacks - either custom callbacks if provided, or all available observability handlers.
   */
  async getCallbacks(): Promise<BaseCallbackHandler[]> {
    // If custom callbacks were provided, use those
    if (this.customCallbacks) {
      logger.debug(`ObservabilityManager: Using ${this.customCallbacks.length} custom callbacks`)
      return this.customCallbacks
    }

    // Otherwise, collect and return all available handlers
    await this.collectAvailableHandlers()

    if (this.availableHandlers.length > 0) {
      logger.debug(`ObservabilityManager: Using ${this.availableHandlers.length} handlers`)
    }
    else {
      logger.debug('ObservabilityManager: No callbacks configured')
    }

    return this.availableHandlers
  }

  /**
   * Get the names of available handlers.
   * @returns List of handler names (e.g., ["Langfuse", "Laminar"])
   */
  async getHandlerNames(): Promise<string[]> {
    if (this.customCallbacks) {
      // For custom callbacks, try to get their class names
      return this.customCallbacks.map(cb => cb.constructor.name)
    }

    await this.collectAvailableHandlers()
    return this.handlerNames
  }

  /**
   * Check if any callbacks are available.
   * @returns True if callbacks are available, False otherwise.
   */
  async hasCallbacks(): Promise<boolean> {
    const callbacks = await this.getCallbacks()
    return callbacks.length > 0
  }

  /**
   * Add a callback to the custom callbacks list.
   * @param callback The callback to add.
   */
  addCallback(callback: BaseCallbackHandler): void {
    if (!this.customCallbacks) {
      this.customCallbacks = []
    }
    this.customCallbacks.push(callback)
    logger.debug(`ObservabilityManager: Added custom callback: ${callback.constructor.name}`)
  }

  /**
   * Clear all custom callbacks.
   */
  clearCallbacks(): void {
    this.customCallbacks = []
    logger.debug('ObservabilityManager: Cleared all custom callbacks')
  }

  /**
   * Flush all pending traces to observability platforms.
   * Important for serverless environments and short-lived processes.
   */
  async flush(): Promise<void> {
    // Flush Langfuse traces
    const callbacks = await this.getCallbacks()
    for (const callback of callbacks) {
      if ('flushAsync' in callback && typeof callback.flushAsync === 'function') {
        await callback.flushAsync()
      }
    }
    logger.debug('ObservabilityManager: All traces flushed')
  }

  /**
   * Shutdown all handlers gracefully (for serverless environments).
   */
  async shutdown(): Promise<void> {
    // Flush before shutdown
    await this.flush()

    // Shutdown other callbacks
    const callbacks = await this.getCallbacks()
    for (const callback of callbacks) {
      // Check if the callback has a shutdown method (like Langfuse)
      if ('shutdownAsync' in callback && typeof callback.shutdownAsync === 'function') {
        await callback.shutdownAsync()
      }
      else if ('shutdown' in callback && typeof callback.shutdown === 'function') {
        await (callback as any).shutdown()
      }
    }
    logger.debug('ObservabilityManager: All handlers shutdown')
  }

  /**
   * String representation of the ObservabilityManager.
   */
  toString(): string {
    const names = this.handlerNames
    if (names.length > 0) {
      return `ObservabilityManager(handlers=${names.join(', ')})`
    }
    return 'ObservabilityManager(no handlers)'
  }
}

// Singleton instance for easy access
let defaultManager: ObservabilityManager | null = null

/**
 * Get the default ObservabilityManager instance.
 * @returns The default ObservabilityManager instance (singleton).
 */
export function getDefaultManager(): ObservabilityManager {
  if (!defaultManager) {
    defaultManager = new ObservabilityManager()
  }
  return defaultManager
}

/**
 * Create a new ObservabilityManager instance.
 * @param config Configuration options
 * @returns A new ObservabilityManager instance.
 */
export function createManager(config: ObservabilityConfig = {}): ObservabilityManager {
  return new ObservabilityManager(config)
}
