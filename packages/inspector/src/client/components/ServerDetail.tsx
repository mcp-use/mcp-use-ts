import { Code, Copy, Database, Play, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Tool {
  name: string
  description: string
  inputSchema: any
}

interface Resource {
  uri: string
  name: string
  description: string
  mimeType: string
}

interface ServerDetailData {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  tools: Tool[]
  resources: Resource[]
}

export function ServerDetail() {
  const { serverId } = useParams()
  const [server, setServer] = useState<ServerDetailData | null>(null)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [toolInput, setToolInput] = useState('')
  const [toolResult, setToolResult] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    // Mock server data - in real implementation, fetch from API
    const mockServer: ServerDetailData = {
      id: serverId || '',
      name: 'Example MCP Server',
      status: 'connected',
      tools: [
        {
          name: 'get_weather',
          description: 'Get current weather for a location',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City name' },
            },
            required: ['location'],
          },
        },
        {
          name: 'search_files',
          description: 'Search for files in the filesystem',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              path: { type: 'string', description: 'Directory path' },
            },
            required: ['query'],
          },
        },
      ],
      resources: [
        {
          uri: 'file:///home/user/documents',
          name: 'Documents',
          description: 'User documents directory',
          mimeType: 'application/x-directory',
        },
        {
          uri: 'file:///home/user/projects',
          name: 'Projects',
          description: 'User projects directory',
          mimeType: 'application/x-directory',
        },
      ],
    }
    setServer(mockServer)
  }, [serverId])

  const handleExecuteTool = async (toolName: string) => {
    setIsExecuting(true)
    try {
      // Simulate tool execution
      await new Promise(resolve => setTimeout(resolve, 1000))
      setToolResult({
        tool: toolName,
        input: toolInput,
        result: `Mock result for ${toolName} with input: ${toolInput}`,
        timestamp: new Date().toISOString(),
      })
    }
    catch {
      setToolResult({
        tool: toolName,
        input: toolInput,
        error: 'Tool execution failed',
        timestamp: new Date().toISOString(),
      })
    }
    finally {
      setIsExecuting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!server) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{server.name}</h2>
        <p className="text-muted-foreground">
          Server ID:
          {server.id}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>
                Tools (
                {server.tools.length}
                )
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {server.tools.map(tool => (
              <div key={tool.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{tool.name}</h4>
                  <Button size="sm" onClick={() => setSelectedTool(tool.name)}>
                    <Play className="w-4 h-4 mr-1" />
                    Execute
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {tool.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <Code className="w-3 h-3 inline mr-1" />
                  Schema:
                  {' '}
                  {JSON.stringify(tool.inputSchema, null, 2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>
                Resources (
                {server.resources.length}
                )
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {server.resources.map(resource => (
              <div key={resource.uri} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{resource.name}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(resource.uri)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {resource.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{resource.uri}</span>
                  <span className="ml-2">
                    (
                    {resource.mimeType}
                    )
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedTool && (
        <Card>
          <CardHeader>
            <CardTitle>
              Execute Tool:
              {selectedTool}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Input (JSON):</label>
              <Input
                placeholder='{"location": "New York"}'
                value={toolInput}
                onChange={e => setToolInput(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleExecuteTool(selectedTool)}
                disabled={isExecuting}
              >
                {isExecuting ? 'Executing...' : 'Execute'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedTool(null)}>
                Cancel
              </Button>
            </div>
            {toolResult && (
              <div className="border rounded-lg p-4 bg-muted">
                <h4 className="font-semibold mb-2">Result:</h4>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(toolResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
