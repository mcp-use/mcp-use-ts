import { MCPAgent } from './src/agents/mcp_agent.js'
import { MCPClient } from './src/client.js'
import { loadConfigFile } from './src/config.js'
import { BaseConnector } from './src/connectors/base.js'
import { HttpConnector } from './src/connectors/http.js'
import { StdioConnector } from './src/connectors/stdio.js'
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

export { BaseConnector, HttpConnector, loadConfigFile, Logger, logger, MCPAgent, MCPClient, MCPSession, StdioConnector, WebSocketConnector }
