import { createOAuthMCPConfig, LINEAR_OAUTH_CONFIG, MCPClient, OAuthHelper } from 'mcp-use/browser'
import React, { useEffect, useState } from 'react'

interface Tool {
  name: string
  description?: string
  inputSchema?: any
}

interface MCPToolsProps {
  config?: Record<string, any>
}

const MCPTools: React.FC<MCPToolsProps> = ({ config }) => {
  const [client, setClient] = useState<MCPClient | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedServers, setConnectedServers] = useState<string[]>([])
  const [oauthHelper] = useState(() => new OAuthHelper(LINEAR_OAUTH_CONFIG))
  const [oauthState, setOAuthState] = useState(oauthHelper.getState())
  const [serverUrl] = useState('https://mcp.linear.app')

  useEffect(() => {
    if (config) {
      const mcpClient = new MCPClient(config)
      setClient(mcpClient)
    }
  }, [config])

  // Handle OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const callback = oauthHelper.handleCallback()
      if (callback) {
        try {
          const tokenResult = await oauthHelper.completeOAuthFlow(serverUrl, callback.code)
          setOAuthState(oauthHelper.getState())

          // Create new config with the access token
          const oauthConfig = createOAuthMCPConfig(`${serverUrl}/sse`, tokenResult.access_token)
          const mcpClient = new MCPClient(oauthConfig)
          setClient(mcpClient)
        }
        catch (err) {
          setError(`OAuth authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setOAuthState(oauthHelper.getState())
        }
      }
    }

    handleOAuthCallback()
  }, [oauthHelper, serverUrl])

  // Check if authentication is required on mount
  useEffect(() => {
    const checkAuthRequirement = async () => {
      try {
        const requiresAuth = await oauthHelper.checkAuthRequired(`${serverUrl}/sse`)
        if (requiresAuth) {
          setOAuthState(oauthHelper.getState())
        }
      }
      catch (err) {
        console.warn('Could not check auth requirement:', err)
      }
    }

    checkAuthRequirement()
  }, [oauthHelper, serverUrl])

  const loadTools = async () => {
    if (!client) {
      setError('MCP Client not initialized')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get all server names from config
      const serverNames = client.getServerNames()

      if (serverNames.length === 0) {
        setError('No MCP servers configured')
        setLoading(false)
        return
      }

      // Create sessions for all servers
      const sessions = await client.createAllSessions()
      setConnectedServers(Object.keys(sessions))

      // Collect tools from all sessions
      const allTools: Tool[] = []

      for (const [serverName, session] of Object.entries(sessions)) {
        try {
          const sessionTools = session.connector.tools
          const toolsWithServer = sessionTools.map(tool => ({
            ...tool,
            server: serverName,
          }))
          allTools.push(...toolsWithServer)
        }
        catch (err) {
          console.warn(`Failed to get tools from server ${serverName}:`, err)
        }
      }

      setTools(allTools)
    }
    catch (err) {
      setError(`Failed to load tools: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    if (client) {
      await client.closeAllSessions()
      setConnectedServers([])
      setTools([])
    }
  }

  const startOAuthFlow = async () => {
    setError(null)
    try {
      await oauthHelper.startOAuthFlow(serverUrl)
      setOAuthState(oauthHelper.getState())
    }
    catch (err) {
      setError(`Failed to start OAuth flow: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setOAuthState(oauthHelper.getState())
    }
  }

  const clearAuth = () => {
    oauthHelper.resetAuth()
    setOAuthState(oauthHelper.getState())
    setClient(null)
    setConnectedServers([])
    setTools([])
    setError(null)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>MCP Tools Explorer</h1>

      <div style={{ marginBottom: '20px' }}>
        {!oauthState.isAuthenticated
          ? (
              <button
                onClick={startOAuthFlow}
                disabled={oauthState.isAuthenticating || oauthState.isCompletingOAuth}
                style={{
                  padding: '10px 20px',
                  marginRight: '10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (oauthState.isAuthenticating || oauthState.isCompletingOAuth) ? 'not-allowed' : 'pointer',
                }}
              >
                {oauthState.isAuthenticating
                  ? 'Opening OAuth...'
                  : oauthState.isCompletingOAuth
                    ? 'Completing OAuth...'
                    : 'Authenticate with Linear'}
              </button>
            )
          : (
              <>
                <button
                  onClick={loadTools}
                  disabled={loading || !client}
                  style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading || !client ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Loading...' : 'Load Tools'}
                </button>

                <button
                  onClick={disconnect}
                  disabled={connectedServers.length === 0}
                  style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: connectedServers.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Disconnect
                </button>

                <button
                  onClick={clearAuth}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Clear Auth
                </button>
              </>
            )}
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
        >
          Error:
          {' '}
          {error}
        </div>
      )}

      {oauthState.isAuthenticated && oauthState.oauthTokens && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
        }}
        >
          <h3 style={{ margin: '0 0 5px 0', color: '#155724' }}>✓ Authenticated with Linear</h3>
          <p style={{ margin: '0', color: '#155724', fontSize: '0.9em' }}>
            Access token:
            {' '}
            {oauthState.oauthTokens.access_token.substring(0, 20)}
            ...
            {oauthState.oauthTokens.expires_at && (
              <span>
                {' '}
                (expires:
                {new Date(oauthState.oauthTokens.expires_at * 1000).toLocaleString()}
                )
              </span>
            )}
          </p>
        </div>
      )}

      {oauthState.authError && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
        }}
        >
          OAuth Error:
          {' '}
          {oauthState.authError}
        </div>
      )}

      {connectedServers.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Connected Servers:</h3>
          <ul>
            {connectedServers.map(server => (
              <li key={server} style={{ color: '#28a745' }}>
                ✓
                {server}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3>
          Available Tools (
          {tools.length}
          )
        </h3>
        {tools.length === 0 && !loading && (
          <p style={{ color: '#6c757d' }}>No tools loaded. Click "Load Tools" to get started.</p>
        )}

        {tools.map((tool, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
              {tool.name}
              {tool.server && (
                <span style={{
                  fontSize: '0.8em',
                  color: '#6c757d',
                  marginLeft: '10px',
                  backgroundColor: '#e9ecef',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
                >
                  from
                  {' '}
                  {tool.server}
                </span>
              )}
            </h4>

            {tool.description && (
              <p style={{ margin: '0 0 10px 0', color: '#6c757d' }}>
                {tool.description}
              </p>
            )}

            {tool.inputSchema && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  Input Schema
                </summary>
                <pre style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.9em',
                }}
                >
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Example usage component
const ReactExample: React.FC = () => {
  return (
    <div>
      <MCPTools />

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
      }}
      >
        <h3>🔐 OAuth Authentication Required</h3>
        <p>
          This example demonstrates OAuth authentication with Linear's MCP server.
          Click "Authenticate with Linear" to start the OAuth flow.
        </p>
        <p>
          <strong>Note:</strong>
          {' '}
          You'll need to register this application with Linear to get a proper client ID.
          For this demo, we're using a placeholder client ID.
        </p>
        <p>
          <strong>Browser limitations:</strong>
          {' '}
          Stdio connections (using
          <code>command</code>
          {' '}
          and
          <code>args</code>
          )
          are not supported in the browser. Use
          <code>ws_url</code>
          {' '}
          for WebSocket or
          <code>url</code>
          {' '}
          for HTTP/SSE connections.
        </p>
      </div>
    </div>
  )
}

export default ReactExample
