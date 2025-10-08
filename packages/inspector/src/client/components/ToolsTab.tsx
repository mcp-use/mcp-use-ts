import { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Play, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

interface ToolsTabProps {
  tools: Tool[]
  callTool: (name: string, args?: Record<string, unknown>) => Promise<any>
  isConnected: boolean
}

interface ToolResult {
  toolName: string
  args: Record<string, unknown>
  result: any
  error?: string
  timestamp: number
}

export function ToolsTab({ tools, callTool, isConnected }: ToolsTabProps) {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [toolArgs, setToolArgs] = useState<Record<string, unknown>>({})
  const [results, setResults] = useState<ToolResult[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [copiedResult, setCopiedResult] = useState<number | null>(null)

  const handleToolSelect = useCallback((tool: Tool) => {
    setSelectedTool(tool)
    // Initialize args with default values based on tool input schema
    const initialArgs: Record<string, unknown> = {}
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, prop]) => {
        const typedProp = prop as any
        if (typedProp.default !== undefined) {
          initialArgs[key] = typedProp.default
        } else if (typedProp.type === 'string') {
          initialArgs[key] = ''
        } else if (typedProp.type === 'number') {
          initialArgs[key] = 0
        } else if (typedProp.type === 'boolean') {
          initialArgs[key] = false
        } else if (typedProp.type === 'array') {
          initialArgs[key] = []
        } else if (typedProp.type === 'object') {
          initialArgs[key] = {}
        }
      })
    }
    setToolArgs(initialArgs)
  }, [])

  const handleArgChange = useCallback((key: string, value: string) => {
    setToolArgs(prev => {
      const newArgs = { ...prev }
      
      // Try to parse as JSON first, fallback to string
      try {
        newArgs[key] = JSON.parse(value)
      } catch {
        newArgs[key] = value
      }
      
      return newArgs
    })
  }, [])

  const executeTool = useCallback(async () => {
    if (!selectedTool || !isConnected) return

    setIsExecuting(true)
    const startTime = Date.now()

    try {
      const result = await callTool(selectedTool.name, toolArgs)
      const newResult: ToolResult = {
        toolName: selectedTool.name,
        args: toolArgs,
        result,
        timestamp: startTime,
      }
      setResults(prev => [newResult, ...prev])
    } catch (error) {
      const newResult: ToolResult = {
        toolName: selectedTool.name,
        args: toolArgs,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
      }
      setResults(prev => [newResult, ...prev])
    } finally {
      setIsExecuting(false)
    }
  }, [selectedTool, toolArgs, callTool, isConnected])

  const copyResult = useCallback(async (index: number) => {
    const result = results[index]
    const textToCopy = result.error 
      ? `Error: ${result.error}` 
      : JSON.stringify(result.result, null, 2)
    
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedResult(index)
      setTimeout(() => setCopiedResult(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [results])

  const renderInputField = (key: string, prop: any) => {
    const value = toolArgs[key]
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    const typedProp = prop as any

    if (typedProp?.type === 'boolean') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {key}
            {typedProp?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="flex items-center space-x-2">
            <input
              id={key}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleArgChange(key, e.target.checked.toString())}
              className="rounded border-gray-300"
              aria-label={`${key} checkbox`}
            />
            <span className="text-sm text-gray-600">{typedProp?.description || ''}</span>
          </div>
        </div>
      )
    }

    if (typedProp?.type === 'string' && (typedProp?.format === 'multiline' || stringValue.length > 50)) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="text-sm font-medium">
            {key}
            {typedProp?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={key}
            value={stringValue}
            onChange={(e) => handleArgChange(key, e.target.value)}
            placeholder={typedProp?.description || `Enter ${key}`}
            className="min-h-[100px]"
          />
          {typedProp?.description && (
            <p className="text-xs text-gray-500">{typedProp.description}</p>
          )}
        </div>
      )
    }

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="text-sm font-medium">
          {key}
          {typedProp?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={key}
          value={stringValue}
          onChange={(e) => handleArgChange(key, e.target.value)}
          placeholder={typedProp?.description || `Enter ${key}`}
        />
        {typedProp?.description && (
          <p className="text-xs text-gray-500">{typedProp.description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex gap-6">
      {/* Left side - Tools list */}
      <div className="w-1/3 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tools</h2>
          <Badge variant="secondary">{tools.length} available</Badge>
        </div>
        
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {tools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tools available</p>
              <p className="text-sm">Connect to a server to see tools</p>
            </div>
          ) : (
            tools.map((tool) => (
              <Card 
                key={tool.name}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedTool?.name === tool.name && "ring-2 ring-blue-500"
                )}
                onClick={() => handleToolSelect(tool)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
                  {tool.description && (
                    <CardDescription className="text-xs">
                      {tool.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right side - Tool editor and results */}
      <div className="flex-1 space-y-4">
        {selectedTool ? (
          <>
            {/* Tool details and form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedTool.name}
                  <Badge variant="outline">{selectedTool.name}</Badge>
                </CardTitle>
                {selectedTool.description && (
                  <CardDescription>{selectedTool.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTool.inputSchema?.properties ? (
                  <div className="space-y-4">
                    <h4 className="font-medium">Parameters</h4>
                    <div className="grid gap-4">
                      {Object.entries(selectedTool.inputSchema.properties).map(([key, prop]) => 
                        renderInputField(key, prop)
                      )}
                    </div>
                    <Button 
                      onClick={executeTool}
                      disabled={!isConnected || isExecuting}
                      className="w-full"
                    >
                      {isExecuting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute Tool
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">This tool has no parameters</p>
                    <Button 
                      onClick={executeTool}
                      disabled={!isConnected || isExecuting}
                      className="mt-4"
                    >
                      {isExecuting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute Tool
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Execution Results</CardTitle>
                  <CardDescription>
                    Results from tool executions (most recent first)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {results.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={result.error ? "destructive" : "default"}>
                              {result.toolName}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyResult(index)}
                          >
                            {copiedResult === index ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {result.error ? (
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-red-800 font-medium">Error:</p>
                            <p className="text-red-700 text-sm">{result.error}</p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded">
                            <SyntaxHighlighter
                              language="json"
                              style={tomorrow}
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                              }}
                            >
                              {JSON.stringify(result.result, null, 2)}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Select a tool to get started</p>
              <p className="text-gray-400 text-sm">Choose a tool from the list to configure and execute it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
