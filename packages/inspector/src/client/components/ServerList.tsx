import { Activity, Database, Server, Trash2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface MCPConnection {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  lastActivity: Date
  tools: number
  resources: number
}

export function ServerList() {
  const [connections, setConnections] = useState<MCPConnection[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('mcp-connections')
    if (saved) {
      setConnections(JSON.parse(saved))
    }
  }, [])

  const handleDeleteConnection = (id: string) => {
    const updated = connections.filter(c => c.id !== id)
    setConnections(updated)
    localStorage.setItem('mcp-connections', JSON.stringify(updated))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50'
      case 'disconnected':
        return 'text-gray-500 bg-gray-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-500 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">MCP Servers</h2>
        <p className="text-muted-foreground">
          Manage and inspect your MCP server connections
        </p>
      </div>

      {connections.length === 0
        ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No servers found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't connected to any MCP servers yet.
                </p>
                <Button asChild>
                  <Link to="/">Add your first server</Link>
                </Button>
              </CardContent>
            </Card>
          )
        : (
            <div className="grid gap-4">
              {connections.map(connection => (
                <Card key={connection.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Server className="w-6 h-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">
                            {connection.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                connection.status,
                              )}`}
                            >
                              {connection.status}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Zap className="w-4 h-4" />
                              <span>
                                {connection.tools}
                                {' '}
                                tools
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Database className="w-4 h-4" />
                              <span>
                                {connection.resources}
                                {' '}
                                resources
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="w-4 h-4" />
                              <span>
                                Last activity:
                                {' '}
                                {connection.lastActivity.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/servers/${connection.id}`}>Inspect</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConnection(connection.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
    </div>
  )
}
