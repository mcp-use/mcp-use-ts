import type { ReactNode } from 'react'
import { useMcp } from 'mcp-use/react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface MCPConnection {
  id: string
  url: string
  name: string
  state: string
  tools: any[]
  resources: any[]
  prompts: any[]
  error: string | null
  authUrl: string | null
  callTool: (toolName: string, args: any) => Promise<any>
  authenticate: () => void
  retry: () => void
  clearStorage: () => void
}

interface McpContextType {
  connections: MCPConnection[]
  addConnection: (url: string, name?: string) => void
  removeConnection: (id: string) => void
  getConnection: (id: string) => MCPConnection | undefined
}

const McpContext = createContext<McpContextType | undefined>(undefined)

interface SavedConnection {
  id: string
  url: string
  name: string
}

function McpConnectionWrapper({ url, name, onUpdate, onRemove: _onRemove }: {
  url: string
  name: string
  onUpdate: (connection: MCPConnection) => void
  onRemove: () => void
}) {
  const mcpHook = useMcp({ url })
  const onUpdateRef = useRef(onUpdate)
  const prevConnectionRef = useRef<MCPConnection | null>(null)

  // Keep ref up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // Create a stable connection object
  // Only update when data actually changes
  useEffect(() => {
    const connection: MCPConnection = {
      id: url,
      url,
      name,
      state: mcpHook.state,
      tools: mcpHook.tools,
      resources: mcpHook.resources,
      prompts: mcpHook.prompts,
      error: mcpHook.error ?? null,
      authUrl: mcpHook.authUrl ?? null,
      callTool: mcpHook.callTool,
      authenticate: mcpHook.authenticate,
      retry: mcpHook.retry,
      clearStorage: mcpHook.clearStorage,
    }

    // Only update if something actually changed
    const prev = prevConnectionRef.current
    if (!prev
      || prev.state !== connection.state
      || prev.error !== connection.error
      || prev.authUrl !== connection.authUrl
      || prev.tools.length !== connection.tools.length
      || prev.resources.length !== connection.resources.length
      || prev.prompts.length !== connection.prompts.length
    ) {
      prevConnectionRef.current = connection
      onUpdateRef.current(connection)
    }
  }, [
    url,
    name,
    mcpHook.state,
    mcpHook.tools,
    mcpHook.resources,
    mcpHook.prompts,
    mcpHook.error,
    mcpHook.authUrl,
  ])

  return null
}

export function McpProvider({ children }: { children: ReactNode }) {
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([])
  const [activeConnections, setActiveConnections] = useState<Map<string, MCPConnection>>(new Map())

  // Load saved connections from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mcp-inspector-connections')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Validate and filter out invalid connections
        const validConnections = Array.isArray(parsed)
          ? parsed.filter((conn: any) => {
              // Ensure connection has valid structure with string url and id
              return conn
                && typeof conn === 'object'
                && typeof conn.id === 'string'
                && typeof conn.url === 'string'
                && typeof conn.name === 'string'
            })
          : []

        // If we filtered out any invalid connections, update localStorage
        if (validConnections.length !== parsed.length) {
          console.warn('Cleaned up invalid connections from localStorage')
          localStorage.setItem('mcp-inspector-connections', JSON.stringify(validConnections))
        }

        setSavedConnections(validConnections)
      }
      catch (error) {
        console.error('Failed to parse saved connections:', error)
        // Clear corrupted localStorage
        localStorage.removeItem('mcp-inspector-connections')
      }
    }
  }, [])

  const updateConnection = useCallback((connection: MCPConnection) => {
    setActiveConnections(prev => new Map(prev).set(connection.id, connection))
  }, [])

  const addConnection = useCallback((url: string, name?: string) => {
    const connectionName = name || url
    const newConnection: SavedConnection = {
      id: url,
      url,
      name: connectionName,
    }

    setSavedConnections((prev) => {
      // Check if connection already exists
      if (prev.some(c => c.id === url)) {
        return prev
      }
      const updated = [...prev, newConnection]
      localStorage.setItem('mcp-inspector-connections', JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeConnection = useCallback((id: string) => {
    setSavedConnections((prev) => {
      const updated = prev.filter(c => c.id !== id)
      localStorage.setItem('mcp-inspector-connections', JSON.stringify(updated))
      return updated
    })

    setActiveConnections((prev) => {
      const next = new Map(prev)
      const connection = next.get(id)
      if (connection) {
        // Clear storage and remove connection
        try {
          connection.clearStorage()
        }
        catch (error) {
          console.error('Failed to clear storage:', error)
        }
        next.delete(id)
      }
      return next
    })
  }, [])

  const getConnection = useCallback((id: string) => {
    return activeConnections.get(id)
  }, [activeConnections])

  const connections = Array.from(activeConnections.values())

  return (
    <McpContext.Provider value={{ connections, addConnection, removeConnection, getConnection }}>
      {savedConnections.map(saved => (
        <McpConnectionWrapper
          key={saved.id}
          url={saved.url}
          name={saved.name}
          onUpdate={updateConnection}
          onRemove={() => removeConnection(saved.id)}
        />
      ))}
      {children}
    </McpContext.Provider>
  )
}

export function useMcpContext() {
  const context = useContext(McpContext)
  if (!context) {
    throw new Error('useMcpContext must be used within McpProvider')
  }
  return context
}
