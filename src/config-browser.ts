/**
 * Browser-safe configuration module that excludes Node.js-specific functionality
 */

import type { BaseConnector } from './connectors/base.js'
import { HttpConnector } from './connectors/http.js'
import { WebSocketConnector } from './connectors/websocket.js'

export function createConnectorFromConfig(
  serverConfig: Record<string, any>,
): BaseConnector {
  // Only support HTTP and WebSocket connectors in browser environments
  if ('url' in serverConfig) {
    // HttpConnector automatically handles streamable HTTP with SSE fallback
    const transport = serverConfig.transport || 'http'

    return new HttpConnector(serverConfig.url, {
      headers: serverConfig.headers,
      authToken: serverConfig.auth_token || serverConfig.authToken,
      // Only force SSE if explicitly requested
      preferSse: serverConfig.preferSse || transport === 'sse',
    })
  }

  if ('ws_url' in serverConfig) {
    return new WebSocketConnector(serverConfig.ws_url, {
      headers: serverConfig.headers,
      authToken: serverConfig.auth_token,
    })
  }

  if ('command' in serverConfig && 'args' in serverConfig) {
    throw new Error('StdioConnector is not available in browser environments. Use HTTP or WebSocket connectors instead.')
  }

  throw new Error('Cannot determine connector type from config. Browser environments only support HTTP and WebSocket connectors.')
}
