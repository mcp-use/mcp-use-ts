import { Activity, AlertCircle, CheckCircle2, Loader2, Plus, Server, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMcpContext } from '../context/McpContext'

export function InspectorDashboard() {
  const { connections, addConnection } = useMcpContext()
  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerName, setNewServerName] = useState('')

  const handleAddConnection = () => {
    if (!newServerUrl.trim())
      return

    addConnection(newServerUrl, newServerName || newServerUrl)
    setNewServerUrl('')
    setNewServerName('')
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'ready':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'connecting':
      case 'discovering':
      case 'loading':
      case 'authenticating':
        return 'text-yellow-600'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'ready':
        return <CheckCircle2 className="w-4 h-4 inline mr-1" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 inline mr-1" />
      case 'connecting':
      case 'discovering':
      case 'loading':
      case 'authenticating':
        return <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
      default:
        return null
    }
  }

  const activeConnections = connections.filter(c => c.state === 'ready').length
  const totalTools = connections.reduce((sum, c) => sum + c.tools.length, 0)
  const totalResources = connections.reduce((sum, c) => sum + c.resources.length, 0)

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
              {activeConnections}
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
              {totalTools}
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
              {totalResources}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New MCP Server</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              placeholder="Server Name (optional)"
              value={newServerName}
              onChange={e => setNewServerName(e.target.value)}
            />
            <div className="flex space-x-2">
              <Input
                placeholder="Enter server URL"
                value={newServerUrl}
                onChange={e => setNewServerUrl(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddConnection()}
              />
              <Button
                onClick={handleAddConnection}
                disabled={!newServerUrl.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect
              </Button>
            </div>
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
                        <div className="space-y-1 flex-1">
                          <h4 className="font-semibold">{connection.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            {connection.url}
                          </p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className={`font-medium ${getStatusColor(connection.state)}`}>
                              {getStatusIcon(connection.state)}
                              {connection.state}
                            </span>
                            {connection.state === 'ready' && (
                              <>
                                <span className="text-muted-foreground">
                                  {connection.tools.length}
                                  {' '}
                                  tools
                                </span>
                                <span className="text-muted-foreground">
                                  {connection.resources.length}
                                  {' '}
                                  resources
                                </span>
                                <span className="text-muted-foreground">
                                  {connection.prompts.length}
                                  {' '}
                                  prompts
                                </span>
                              </>
                            )}
                          </div>
                          {connection.error && (
                            <div className="text-sm text-red-600 mt-2">
                              Error:
                              {' '}
                              {connection.error}
                            </div>
                          )}
                          {connection.state === 'pending_auth' && connection.authUrl && (
                            <div className="text-sm text-yellow-600 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={connection.authenticate}
                              >
                                Authenticate
                              </Button>
                              {' '}
                              or
                              {' '}
                              <a
                                href={connection.authUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                open auth page
                              </a>
                            </div>
                          )}
                          {connection.state === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={connection.retry}
                              className="mt-2"
                            >
                              Retry Connection
                            </Button>
                          )}
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/servers/${encodeURIComponent(connection.id)}`}>
                            Inspect
                          </Link>
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
