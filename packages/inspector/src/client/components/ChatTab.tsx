import { ArrowUp, Check, Copy, Key, Loader2, MessageCircle, Send, Settings, Trash2, User } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { AuroraBackground } from '@/components/ui/aurora-background'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/ui/blur-fade'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { UserMessage } from './chat/UserMessage'
import { AssistantMessage } from './chat/AssistantMessage'
import { ToolCallDisplay } from './chat/ToolCallDisplay'
import { MCPUIResource } from './chat/MCPUIResource'
import { extractMCPResources } from '@/client/utils/mcpResourceUtils'

interface ChatTabProps {
  mcpServerUrl: string
  isConnected: boolean
  // OAuth state from the main Inspector connection
  oauthState?: 'ready' | 'authenticating' | 'failed' | 'pending_auth'
  oauthError?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | Array<{ index: number, type: string, text: string }>
  timestamp: number
  toolCalls?: Array<{
    toolName: string
    args: Record<string, unknown>
    result?: any
  }>
}

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google'
  apiKey: string
  model: string
}

interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth'
  username?: string
  password?: string
  token?: string
  oauthTokens?: {
    access_token?: string
    refresh_token?: string
    token_type?: string
  }
}

const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-2.0-flash-exp',
}

// Hash function to match BrowserOAuthClientProvider
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

export function ChatTab({ mcpServerUrl, isConnected, oauthState, oauthError }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [llmConfig, setLLMConfig] = useState<LLMConfig | null>(null)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)

  // LLM Config form state
  const [tempProvider, setTempProvider] = useState<'openai' | 'anthropic' | 'google'>('openai')
  const [tempApiKey, setTempApiKey] = useState('')
  const [tempModel, setTempModel] = useState(DEFAULT_MODELS.openai)

  // Auth Config form state
  const [tempAuthType, setTempAuthType] = useState<'none' | 'basic' | 'bearer' | 'oauth'>('none')
  const [tempUsername, setTempUsername] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [tempToken, setTempToken] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus the textarea when landing form is shown
  useEffect(() => {
    if (llmConfig && messages.length === 0 && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [llmConfig, messages.length])

  // Load saved LLM config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mcp-inspector-llm-config')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        setLLMConfig(config)
        setTempProvider(config.provider)
        setTempApiKey(config.apiKey)
        setTempModel(config.model)
      }
      catch (error) {
        console.error('Failed to load LLM config:', error)
      }
    }
  }, [])

  // Load auth config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mcp-inspector-auth-config')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        setAuthConfig(config)
        setTempAuthType(config.type)
        if (config.username)
          setTempUsername(config.username)
        if (config.password)
          setTempPassword(config.password)
        if (config.token)
          setTempToken(config.token)
      }
      catch (error) {
        console.error('Failed to load auth config:', error)
      }
    }
    else {
      // Check if OAuth tokens exist for this server
      try {
        const storageKeyPrefix = 'mcp:auth'
        const serverUrlHash = hashString(mcpServerUrl)
        const storageKey = `${storageKeyPrefix}_${serverUrlHash}_tokens`
        const tokensStr = localStorage.getItem(storageKey)
        if (tokensStr) {
          // OAuth tokens exist, default to OAuth mode
          const defaultAuthConfig: AuthConfig = { type: 'oauth' }
          setAuthConfig(defaultAuthConfig)
          setTempAuthType('oauth')
        }
      }
      catch (error) {
        console.error('Failed to check for OAuth tokens:', error)
      }
    }
  }, [mcpServerUrl])

  // Update model when provider changes
  useEffect(() => {
    setTempModel(DEFAULT_MODELS[tempProvider])
  }, [tempProvider])

  const saveLLMConfig = useCallback(() => {
    if (!tempApiKey.trim()) {
      return
    }

    const newLlmConfig: LLMConfig = {
      provider: tempProvider,
      apiKey: tempApiKey,
      model: tempModel,
    }

    const newAuthConfig: AuthConfig = {
      type: tempAuthType,
      ...(tempAuthType === 'basic' && {
        username: tempUsername.trim(),
        password: tempPassword.trim(),
      }),
      ...(tempAuthType === 'bearer' && {
        token: tempToken.trim(),
      }),
    }

    setLLMConfig(newLlmConfig)
    setAuthConfig(newAuthConfig)
    localStorage.setItem('mcp-inspector-llm-config', JSON.stringify(newLlmConfig))
    localStorage.setItem('mcp-inspector-auth-config', JSON.stringify(newAuthConfig))
    setConfigDialogOpen(false)
  }, [tempProvider, tempApiKey, tempModel, tempAuthType, tempUsername, tempPassword, tempToken])

  const clearConfig = useCallback(() => {
    setLLMConfig(null)
    setAuthConfig(null)
    setTempApiKey('')
    setTempUsername('')
    setTempPassword('')
    setTempToken('')
    setTempAuthType('none')
    localStorage.removeItem('mcp-inspector-llm-config')
    localStorage.removeItem('mcp-inspector-auth-config')
    setMessages([])
  }, [])

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !llmConfig || !isConnected) {
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // If using OAuth, retrieve tokens from localStorage
      let authConfigWithTokens = authConfig
      if (authConfig?.type === 'oauth') {
        try {
          // Get OAuth tokens from localStorage (same pattern as BrowserOAuthClientProvider)
          // The key format is: `${storageKeyPrefix}_${serverUrlHash}_tokens`
          const storageKeyPrefix = 'mcp:auth'
          const serverUrlHash = hashString(mcpServerUrl)
          const storageKey = `${storageKeyPrefix}_${serverUrlHash}_tokens`
          const tokensStr = localStorage.getItem(storageKey)
          if (tokensStr) {
            const tokens = JSON.parse(tokensStr)
            authConfigWithTokens = {
              ...authConfig,
              oauthTokens: tokens,
            }
          }
          else {
            console.warn('No OAuth tokens found in localStorage for key:', storageKey)
          }
        }
        catch (error) {
          console.warn('Failed to retrieve OAuth tokens:', error)
        }
      }

      // Call the chat API endpoint
      const response = await fetch('/inspector/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mcpServerUrl,
          llmConfig,
          authConfig: authConfigWithTokens,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        toolCalls: data.toolCalls,
      }

      setMessages(prev => [...prev, assistantMessage])
    }
    catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
    finally {
      setIsLoading(false)
    }
  }, [inputValue, llmConfig, isConnected, mcpServerUrl, messages])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  // Show landing form when there are no messages and LLM is configured
  if (llmConfig && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with config dialog */}
        <div className="absolute top-4 right-4 z-10">
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Change API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>LLM Provider Configuration</DialogTitle>
                <DialogDescription>
                  Configure your LLM provider and API key to start chatting with the MCP server
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={tempProvider} onValueChange={(v: any) => setTempProvider(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={tempModel}
                    onChange={e => setTempModel(e.target.value)}
                    placeholder="e.g., gpt-4o"
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={tempApiKey}
                      onChange={e => setTempApiKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored locally and never sent to our servers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>MCP Server Authentication (Optional)</Label>
                  <Select value={tempAuthType} onValueChange={(v: any) => setTempAuthType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="oauth">OAuth (Use Inspector's OAuth)</SelectItem>
                      <SelectItem value="basic">Basic Auth (Username/Password)</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                    </SelectContent>
                  </Select>

                  {tempAuthType === 'basic' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Username"
                        value={tempUsername}
                        onChange={e => setTempUsername(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={tempPassword}
                        onChange={e => setTempPassword(e.target.value)}
                      />
                    </div>
                  )}

                  {tempAuthType === 'bearer' && (
                    <Input
                      type="password"
                      placeholder="Bearer token"
                      value={tempToken}
                      onChange={e => setTempToken(e.target.value)}
                    />
                  )}

                  {tempAuthType === 'oauth' && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      <p className="font-medium">OAuth Authentication</p>
                      <p className="text-xs mt-1">
                        This will use the same OAuth flow as the Inspector's main connection.
                        If the MCP server requires OAuth, the Inspector will handle the authentication automatically.
                      </p>
                      {oauthState === 'authenticating' && (
                        <div className="mt-2 flex items-center gap-2 text-blue-600">
                          <Spinner className="h-3 w-3" />
                          <span className="text-xs">Authenticating...</span>
                        </div>
                      )}
                      {oauthState === 'failed' && oauthError && (
                        <div className="mt-2 text-xs text-destructive">
                          Auth failed:
                          {' '}
                          {oauthError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={clearConfig}
                  >
                    Clear Config
                  </Button>
                  <Button
                    onClick={saveLLMConfig}
                    disabled={!tempApiKey.trim()}
                    className="ml-auto"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Landing Form */}
        <AuroraBackground>
          <BlurFade className="w-full max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-light mb-2 dark:text-white">
                Chat with MCP Agent
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light">
                {llmConfig.provider}
                {' / '}
                {llmConfig.model}
                {' - '}
                Ask questions or request actions
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="relative w-full max-w-2xl">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isConnected ? 'Ask a question or request an action...' : 'Server not connected'}
                    className="p-4 min-h-[150px] rounded-xl bg-white/80 dark:text-white dark:bg-black backdrop-blur-sm border-gray-200 dark:border-zinc-800"
                    disabled={!isConnected || isLoading}
                  />
                  <div className="absolute left-0 p-3 bottom-0 w-full flex justify-end items-end">
                    <Button
                      type="submit"
                      size="sm"
                      className={cn(
                        'h-10 w-10 rounded-full',
                        (isLoading) && 'animate-spin',
                        !inputValue.trim() && 'bg-zinc-400',
                      )}
                      disabled={isLoading || !inputValue.trim() || !isConnected}
                    >
                      {isLoading
                        ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )
                        : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </BlurFade>
        </AuroraBackground>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Chat with MCP Agent</h3>
          {llmConfig && (
            <Badge variant="outline" className="ml-2">
              {llmConfig.provider}
              {' '}
              /
              {llmConfig.model}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear chat</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                {llmConfig ? 'Change API Key' : 'Configure API Key'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>LLM Provider Configuration</DialogTitle>
                <DialogDescription>
                  Configure your LLM provider and API key to start chatting with the MCP server
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={tempProvider} onValueChange={(v: any) => setTempProvider(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={tempModel}
                    onChange={e => setTempModel(e.target.value)}
                    placeholder="e.g., gpt-4o"
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={tempApiKey}
                      onChange={e => setTempApiKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored locally and never sent to our servers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>MCP Server Authentication (Optional)</Label>
                  <Select value={tempAuthType} onValueChange={(v: any) => setTempAuthType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="oauth">OAuth (Use Inspector's OAuth)</SelectItem>
                      <SelectItem value="basic">Basic Auth (Username/Password)</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                    </SelectContent>
                  </Select>

                  {tempAuthType === 'basic' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Username"
                        value={tempUsername}
                        onChange={e => setTempUsername(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={tempPassword}
                        onChange={e => setTempPassword(e.target.value)}
                      />
                    </div>
                  )}

                  {tempAuthType === 'bearer' && (
                    <Input
                      type="password"
                      placeholder="Bearer token"
                      value={tempToken}
                      onChange={e => setTempToken(e.target.value)}
                    />
                  )}

                  {tempAuthType === 'oauth' && (
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      <p className="font-medium">OAuth Authentication</p>
                      <p className="text-xs mt-1">
                        This will use the same OAuth flow as the Inspector's main connection.
                        If the MCP server requires OAuth, the Inspector will handle the authentication automatically.
                      </p>
                      {oauthState === 'authenticating' && (
                        <div className="mt-2 flex items-center gap-2 text-blue-600">
                          <Spinner className="h-3 w-3" />
                          <span className="text-xs">Authenticating...</span>
                        </div>
                      )}
                      {oauthState === 'failed' && oauthError && (
                        <div className="mt-2 text-xs text-destructive">
                          Auth failed:
                          {' '}
                          {oauthError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  {llmConfig && (
                    <Button
                      variant="outline"
                      onClick={clearConfig}
                    >
                      Clear Config
                    </Button>
                  )}
                  <Button
                    onClick={saveLLMConfig}
                    disabled={!tempApiKey.trim()}
                    className={llmConfig ? 'ml-auto' : ''}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!llmConfig
          ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configure Your LLM Provider</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  To start chatting with the MCP server, you need to configure your LLM provider and API key.
                  Your credentials are stored locally and used only for this chat.
                </p>
                <Button onClick={() => setConfigDialogOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure API Key
                </Button>
              </div>
            )
          : (
              messages.map(message => {
                const contentStr = typeof message.content === 'string'
                  ? message.content
                  : Array.isArray(message.content)
                    ? message.content.map(item =>
                        typeof item === 'string'
                          ? item
                          : item.text || JSON.stringify(item),
                      ).join('')
                    : JSON.stringify(message.content)

                if (message.role === 'user') {
                  return (
                    <UserMessage
                      key={message.id}
                      content={contentStr}
                      timestamp={message.timestamp}
                    />
                  )
                }

                return (
                  <div key={message.id} className="space-y-4">
                    <AssistantMessage
                      content={contentStr}
                      timestamp={message.timestamp}
                    />
                    
                    {/* Tool Calls */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="space-y-2">
                        {message.toolCalls.map((toolCall, idx) => {
                          // Extract MCP-UI resources from tool result
                          const resources = extractMCPResources(toolCall.result)
                          
                          return (
                            <div key={`${toolCall.toolName}-${idx}`}>
                              <ToolCallDisplay
                                toolName={toolCall.toolName}
                                args={toolCall.args}
                                result={toolCall.result}
                                state={toolCall.result ? 'result' : 'call'}
                              />
                              {/* Render extracted MCP-UI resources */}
                              {resources.map((resource, resourceIndex) => (
                                <MCPUIResource
                                  key={`${message.id}-tool-${idx}-resource-${resourceIndex}`}
                                  resource={resource}
                                />
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
              <Spinner className="h-4 w-4" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {llmConfig && (
        <div className="border-t dark:border-zinc-700 p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Ask a question or request an action...' : 'Server not connected'}
              className="resize-none"
              rows={2}
              disabled={!isConnected || isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || !isConnected || isLoading}
              className="self-end"
            >
              {isLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
