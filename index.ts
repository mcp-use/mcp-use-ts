import { MCPAgent } from './src/agents/mcp_agent.js'
import { RemoteAgent } from './src/agents/remote.js'
import { MCPClient } from './src/client.js'
import { BaseConnector } from './src/connectors/base.js'
import { HttpConnector } from './src/connectors/http.js'
import { WebSocketConnector } from './src/connectors/websocket.js'

import { Logger, logger } from './src/logging.js'
import { MCPSession } from './src/session.js'

export { BaseAdapter, LangChainAdapter } from './src/adapters/index.js'
// Export AI SDK utilities
export * from './src/agents/utils/index.js'
export { ServerManager } from './src/managers/server_manager.js'

export * from './src/managers/tools/index.js'

// Export telemetry utilities
export { setTelemetrySource, Telemetry } from './src/telemetry/index.js'

// Re-export message classes to ensure a single constructor instance is shared by consumers
export { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

// Re-export StreamEvent type from LangChain for convenience
export type { StreamEvent } from '@langchain/core/tracers/log_stream'

export { BaseConnector, HttpConnector, Logger, logger, MCPAgent, MCPClient, MCPSession, RemoteAgent, WebSocketConnector }

// Conditionally export Node.js-specific functionality
// Check if we're in a Node.js environment
const isNodeJS = typeof process !== 'undefined'
  && process.versions
  && process.versions.node
  && typeof window === 'undefined'

// Only export these in Node.js environments to prevent browser import errors
export const StdioConnector = isNodeJS ? undefined : undefined
export const loadConfigFile = isNodeJS ? undefined : undefined

// Note: The actual Node.js implementations are loaded by the config.ts module
// when needed, avoiding import-time errors in browser environments
