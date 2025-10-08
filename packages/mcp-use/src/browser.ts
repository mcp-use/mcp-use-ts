/**
 * Browser-compatible exports for mcp-use
 *
 * This module provides browser-safe versions of mcp-use components
 * that avoid Node.js-specific dependencies (like fs, path for file operations).
 *
 * The actual MCP protocol connectors (WebSocket, HTTP/SSE) work fine in browsers.
 */

import type { BaseConnector } from './connectors/base.js'
import { BaseMCPClient } from './client/base.js'
import { HttpConnector } from './connectors/http.js'
import { WebSocketConnector } from './connectors/websocket.js'
import { logger } from './logging.js'
import { MCPSession } from './session.js'

/**
 * Browser-compatible MCP Client
 *
 * Unlike the Node.js version, this doesn't support:
 * - Loading config from files (loadConfigFile)
 * - Saving config to files (saveConfig)
 * - StdioConnector (requires child_process)
 *
 * Supported connectors:
 * - WebSocketConnector: Connect to MCP servers via WebSocket
 * - HttpConnector: Connect to MCP servers via HTTP/SSE
 */
export class MCPClient extends BaseMCPClient {
  constructor(config?: Record<string, any>) {
    super(config)
  }

  public static fromDict(cfg: Record<string, any>): MCPClient {
    return new MCPClient(cfg)
  }

  /**
   * Create a connector from server configuration (browser-safe version)
   *
   * Supports:
   * - WebSocket connections: { ws_url: "ws://..." }
   * - HTTP connections: { url: "http://..." }
   *
   * Does NOT support:
   * - Stdio connections: { command: "...", args: [...] }
   */
  protected createConnectorFromConfig(serverConfig: Record<string, any>): BaseConnector {
    // WebSocket connector
    if ('ws_url' in serverConfig) {
      return new WebSocketConnector(serverConfig.ws_url, {
        headers: serverConfig.headers,
        authToken: serverConfig.auth_token || serverConfig.authToken,
      })
    }

    // HTTP/SSE connector
    if ('url' in serverConfig) {
      const transport = serverConfig.transport || 'http'

      return new HttpConnector(serverConfig.url, {
        headers: serverConfig.headers,
        authToken: serverConfig.auth_token || serverConfig.authToken,
        preferSse: serverConfig.preferSse || transport === 'sse',
      })
    }

    // Stdio is not supported in browser
    if ('command' in serverConfig && 'args' in serverConfig) {
      throw new Error(
        'StdioConnector is not supported in browser environments. '
        + 'Use WebSocket (ws_url) or HTTP (url) connectors instead.',
      )
    }

    throw new Error('Cannot determine connector type from config. Use "url" for HTTP or "ws_url" for WebSocket.')
  }
}

// Re-export browser-safe connectors
export { HttpConnector, WebSocketConnector }

// Re-export session
export { MCPSession }

// Re-export logger (already browser-safe)
export { logger }

// Re-export OAuth helper for browser authentication
export { createOAuthMCPConfig, LINEAR_OAUTH_CONFIG, OAuthHelper } from './oauth-helper.js'
export type { ClientRegistration, OAuthConfig, OAuthDiscovery, OAuthResult, OAuthState } from './oauth-helper.js'

// Re-export types that are safe for browser
export type { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
export type { StreamEvent } from '@langchain/core/tracers/log_stream'
