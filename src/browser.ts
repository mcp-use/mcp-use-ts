/**
 * Browser-safe exports for mcp-use that exclude Node.js-specific functionality
 * This file provides a subset of mcp-use functionality that works in browser environments
 */

import { MCPAgent } from './agents/mcp_agent.js'
import { RemoteAgent } from './agents/remote.js'
import { MCPClient } from './client-browser.js'
import { BaseConnector } from './connectors/base.js'
import { HttpConnector } from './connectors/http.js'
import { WebSocketConnector } from './connectors/websocket.js'

import { Logger, logger } from './logging.js'
import { MCPSession } from './session.js'

export { BaseAdapter, LangChainAdapter } from './adapters/index.js'
// Export AI SDK utilities
export * from './agents/utils/index.js'
export { ServerManager } from './managers/server_manager.js'

export * from './managers/tools/index.js'

// Export telemetry utilities
export { setTelemetrySource, Telemetry } from './telemetry/index.js'

// Re-export message classes to ensure a single constructor instance is shared by consumers
export { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

// Re-export StreamEvent type from LangChain for convenience
export type { StreamEvent } from '@langchain/core/tracers/log_stream'

// Browser-compatible exports only
export {
  BaseConnector,
  HttpConnector,
  Logger,
  logger,
  MCPAgent,
  MCPClient,
  MCPSession,
  RemoteAgent,
  WebSocketConnector,
}

// Note: StdioConnector is not exported as it requires Node.js-specific modules
// Note: loadConfigFile is not exported as it requires fs module
