import { Activity, Plus, Server, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface MCPConnection {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  lastActivity: Date
  tools: number
  resources: number
}

export function InspectorDashboard() {
  const [connections, setConnections] = useState<MCPConnection[]>([])
  const [newServerUrl, setNewServerUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // Load saved connections from localStorage
    const saved = localStorage.getItem('mcp-connections')
    if (saved) {
      setConnections(JSON.parse(saved))
    }
  }, [])

  const handleAddConnection = async () => {
    if (!newServerUrl.trim())
      return

    setIsConnecting(true)
    try {
      // Simulate connection attempt
      await new Promise(resolve => setTimeout(resolve, 1000))

      const newConnection: MCPConnection = {
        id: Date.now().toString(),
        name: newServerUrl,
        status: 'connected',
        lastActivity: new Date(),
        tools: Math.floor(Math.random() * 10) + 1,
        resources: Math.floor(Math.random() * 5) + 1,
      }

      const updated = [...connections, newConnection]
      setConnections(updated)
      localStorage.setItem('mcp-connections', JSON.stringify(updated))
      setNewServerUrl('')
    }
    catch (error) {
      console.error('Failed to connect:', error)
    }
    finally {
      setIsConnecting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600'
      case 'disconnected':
        return 'text-gray-500'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">MCP Inspector</h2>
        <p className="text-muted-foreground">
          Inspect and debug MCP (Model Context Protocol) servers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Connections
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.filter(c => c.status === 'connected').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.reduce((sum, c) => sum + c.tools, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Resources
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.reduce((sum, c) => sum + c.resources, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New MCP Server</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter server URL or command..."
              value={newServerUrl}
              onChange={e => setNewServerUrl(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddConnection()}
            />
            <Button
              onClick={handleAddConnection}
              disabled={isConnecting || !newServerUrl.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Connected Servers</h3>
        {connections.length === 0
          ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Server className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No servers connected yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add a server above to get started
                  </p>
                </CardContent>
              </Card>
            )
          : (
              <div className="grid gap-4">
                {connections.map(connection => (
                  <Card key={connection.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{connection.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span
                              className={`font-medium ${getStatusColor(
                                connection.status,
                              )}`}
                            >
                              {connection.status}
                            </span>
                            <span>
                              {connection.tools}
                              {' '}
                              tools
                            </span>
                            <span>
                              {connection.resources}
                              {' '}
                              resources
                            </span>
                            <span>
                              Last activity:
                              {' '}
                              {connection.lastActivity.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Inspect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}
