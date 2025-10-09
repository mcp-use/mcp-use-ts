import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { Check, Copy, Play, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { isMcpUIResource, McpUIRenderer } from './McpUIRenderer'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('tools')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the search input when the component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  const handleToolSelect = useCallback((tool: Tool) => {
    setSelectedTool(tool)
    // Initialize args with default values based on tool input schema
    const initialArgs: Record<string, unknown> = {}
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, prop]) => {
        const typedProp = prop as any
        if (typedProp.default !== undefined) {
          initialArgs[key] = typedProp.default
        }
        else if (typedProp.type === 'string') {
          initialArgs[key] = ''
        }
        else if (typedProp.type === 'number') {
          initialArgs[key] = 0
        }
        else if (typedProp.type === 'boolean') {
          initialArgs[key] = false
        }
        else if (typedProp.type === 'array') {
          initialArgs[key] = []
        }
        else if (typedProp.type === 'object') {
          initialArgs[key] = {}
        }
      })
    }
    setToolArgs(initialArgs)
  }, [])

  // Handle auto-selection from command palette
  useEffect(() => {
    const selectedToolName = sessionStorage.getItem('selected-tools')
    if (selectedToolName) {
      const tool = tools.find(t => t.name === selectedToolName)
      if (tool) {
        handleToolSelect(tool)
        sessionStorage.removeItem('selected-tools')
      }
    }
  }, [tools, handleToolSelect])

  const handleArgChange = useCallback((key: string, value: string) => {
    setToolArgs((prev) => {
      const newArgs = { ...prev }

      // Try to parse as JSON first, fallback to string
      try {
        newArgs[key] = JSON.parse(value)
      }
      catch {
        newArgs[key] = value
      }

      return newArgs
    })
  }, [])

  const executeTool = useCallback(async () => {
    if (!selectedTool || !isConnected)
      return

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
    }
    catch (error) {
      const newResult: ToolResult = {
        toolName: selectedTool.name,
        args: toolArgs,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
      }
      setResults(prev => [newResult, ...prev])
    }
    finally {
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
    }
    catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [results])

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim())
      return tools

    const query = searchQuery.toLowerCase()
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(query)
      || tool.description?.toLowerCase().includes(query),
    )
  }, [tools, searchQuery])

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
              onChange={e => handleArgChange(key, e.target.checked.toString())}
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
            onChange={e => handleArgChange(key, e.target.value)}
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
          onChange={e => handleArgChange(key, e.target.value)}
          placeholder={typedProp?.description || `Enter ${key}`}
        />
        {typedProp?.description && (
          <p className="text-xs text-gray-500">{typedProp.description}</p>
        )}
      </div>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={60}>
        {/* Left pane: Tools list with search */}
        <div className="flex flex-col h-full border-r dark:border-zinc-700 p-6 bg-white dark:bg-zinc-800">
          <div className="p-0 ">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                <TabsTrigger value="tools">
                  Tools
                  <Badge className="ml-2" variant="outline">{filteredTools.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="saved">Saved Requests</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 border-none transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search tools by name or description "
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-all border-none rounded-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-visible mt-6 space-y-5 p-2">
            {filteredTools.length === 0
              ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No tools available</p>
                    <p className="text-sm">Connect to a server to see tools</p>
                  </div>
                )
              : (
                  filteredTools.map(tool => (
                    <div
                      key={tool.name}
                      className={cn(
                        'cursor-pointer transition-all rounded-md border-none hover:bg-zinc-100 shadow-none p-2',
                        selectedTool?.name === tool.name && 'ring-2 ring-zinc-200 bg-zinc-100',
                      )}
                      onClick={() => handleToolSelect(tool)}
                    >
                      <div className="px-2">
                        <div className="text-sm font-medium">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs">
                            {tool.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={40}>

        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={40}>

            {/* Right pane: Tool form */}
            <div className="flex flex-col h-full bg-white dark:bg-zinc-800">
              {selectedTool
                ? (
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{selectedTool.name}</Badge>
                            <Button
                              onClick={executeTool}
                              disabled={!isConnected || isExecuting}
                              size="sm"
                            >
                              {isExecuting
                                ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Executing...
                                    </>
                                  )
                                : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Execute
                                    </>
                                  )}
                            </Button>
                          </div>
                          <Button variant="outline" size="sm">
                            Save
                          </Button>
                        </div>
                        {selectedTool.description && (
                          <p className="text-sm text-gray-600 mt-2">{selectedTool.description}</p>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-4">
                        {selectedTool.inputSchema?.properties
                          ? (
                              <div className="space-y-4">
                                {Object.entries(selectedTool.inputSchema.properties).map(([key, prop]) =>
                                  renderInputField(key, prop),
                                )}
                              </div>
                            )
                          : (
                              <div className="text-center py-8">
                                <p className="text-gray-500">This tool has no parameters</p>
                              </div>
                            )}
                      </div>
                    </div>
                  )
                : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-gray-500 text-lg">Select a tool to get started</p>
                        <p className="text-gray-400 text-sm">Choose a tool from the list to configure and execute it</p>
                      </div>
                    </div>
                  )}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={60}>

            {/* Bottom section: Results */}
            <div className="flex flex-col h-full bg-white dark:bg-zinc-800 border-t dark:border-zinc-700">
              <div className="p-4 border-b dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700">
                <h3 className="font-semibold">Response</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {results.length > 0
                  ? (
                      <div className="space-y-4">
                        {results.map((result, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={result.error ? 'destructive' : 'default'}>
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
                                {copiedResult === index
                                  ? (
                                      <Check className="h-4 w-4" />
                                    )
                                  : (
                                      <Copy className="h-4 w-4" />
                                    )}
                              </Button>
                            </div>

                            {result.error
                              ? (
                                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                    <p className="text-red-800 dark:text-red-300 font-medium">Error:</p>
                                    <p className="text-red-700 dark:text-red-400 text-sm">{result.error}</p>
                                  </div>
                                )
                              : (() => {
                                  // Check if result contains MCP UI resources
                                  const content = result.result?.content || []
                                  const mcpUIResources = content.filter((item: any) =>
                                    item.type === 'resource' && isMcpUIResource(item.resource),
                                  )

                                  if (mcpUIResources.length > 0) {
                                    return (
                                      <div className="space-y-4">
                                        {mcpUIResources.map((item: any, idx: number) => (
                                          <div key={idx} className="border rounded-lg overflow-hidden">
                                            <div className="bg-gray-100 dark:bg-zinc-700 px-3 py-2 text-xs text-gray-600 dark:text-zinc-300 border-b dark:border-zinc-600">
                                              <span className="font-medium">MCP UI Resource:</span>
                                              {' '}
                                              {item.resource.uri || 'No URI'}
                                            </div>
                                            <McpUIRenderer
                                              resource={item.resource}
                                              onUIAction={(_action) => {
                                                // Handle UI actions here if needed
                                              }}
                                              className="p-4"
                                            />
                                          </div>
                                        ))}
                                        {/* Show JSON for non-UI content */}
                                        {content.filter((item: any) =>
                                          !(item.type === 'resource' && isMcpUIResource(item.resource)),
                                        ).length > 0 && (
                                          <div className="bg-gray-50 dark:bg-zinc-700 rounded">
                                            <SyntaxHighlighter
                                              language="json"
                                              style={tomorrow}
                                              customStyle={{
                                                margin: 0,
                                                borderRadius: '0.375rem',
                                                fontSize: '0.875rem',
                                              }}
                                            >
                                              {JSON.stringify(
                                                content.filter((item: any) =>
                                                  !(item.type === 'resource' && isMcpUIResource(item.resource)),
                                                ),
                                                null,
                                                2,
                                              )}
                                            </SyntaxHighlighter>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  // Default: show JSON
                                  return (
                                    <div className="bg-gray-50 dark:bg-zinc-700 rounded">
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
                                  )
                                })()}
                          </div>
                        ))}
                      </div>
                    )
                  : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-500">No results yet</p>
                          <p className="text-gray-400 text-sm">Execute a tool to see results here</p>
                        </div>
                      </div>
                    )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
