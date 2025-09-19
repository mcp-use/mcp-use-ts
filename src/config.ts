import type { BaseConnector } from './connectors/base.js'
import { HttpConnector } from './connectors/http.js'
import { WebSocketConnector } from './connectors/websocket.js'

// Check if we're in a Node.js environment
const isNodeJS = typeof process !== 'undefined'
  && process.versions
  && process.versions.node
  && typeof window === 'undefined'

// Conditionally import Node.js-specific modules
let StdioConnector: any
let readFileSync: any

if (isNodeJS) {
  try {
    // Dynamic import for Node.js-specific modules
    Promise.all([
      import('./connectors/stdio.js'),
      import('node:fs'),
    ]).then(([stdioModule, fsModule]) => {
      StdioConnector = stdioModule.StdioConnector
      readFileSync = fsModule.readFileSync
    }).catch((error) => {
      console.warn('Failed to load Node.js modules:', error)
    })
  }
  catch (error) {
    console.warn('Failed to load Node.js modules:', error)
  }
}

export function loadConfigFile(filepath: string): Record<string, any> {
  if (!isNodeJS || !readFileSync) {
    throw new Error('loadConfigFile is only available in Node.js environments')
  }

  const raw = readFileSync(filepath, 'utf-8')
  return JSON.parse(raw)
}

export function createConnectorFromConfig(
  serverConfig: Record<string, any>,
): BaseConnector {
  if ('command' in serverConfig && 'args' in serverConfig) {
    if (!isNodeJS || !StdioConnector) {
      throw new Error('StdioConnector is not available in browser environments. Use HTTP or WebSocket connectors instead.')
    }

    return new StdioConnector({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
    })
  }

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

  throw new Error('Cannot determine connector type from config. Browser environments only support HTTP and WebSocket connectors.')
}
