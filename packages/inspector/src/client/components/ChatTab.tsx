import { Check, Copy, Key, MessageCircle, Send, Settings, Trash2, User } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { usePrismTheme } from '@/client/hooks/usePrismTheme'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
  const { prismStyle } = usePrismTheme()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [llmConfig, setLLMConfig] = useState<LLMConfig | null>(null)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

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
          console.log('Auto-detected OAuth tokens for this MCP server')
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
            console.log('Retrieved OAuth tokens from localStorage')
          }
          else {
            console.warn('No OAuth tokens found in localStorage for key:', storageKey)
          }
        }
        catch (error) {
          console.warn('Failed to retrieve OAuth tokens:', error)
        }
      }

      // Log auth config for debugging
      if (authConfigWithTokens) {
        console.log('Sending chat request with auth type:', authConfigWithTokens.type)
        if (authConfigWithTokens.type === 'oauth' && authConfigWithTokens.oauthTokens) {
          console.log('OAuth token present:', !!authConfigWithTokens.oauthTokens.access_token)
        }
      }
      else {
        console.log('No auth config - attempting connection without authentication')
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

  const copyMessage = useCallback(async (messageId: string, content: any) => {
    try {
      // Handle different content formats
      const textContent = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map(item => typeof item === 'string' ? item : item.text || JSON.stringify(item)).join('')
          : JSON.stringify(content)

      await navigator.clipboard.writeText(textContent)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    }
    catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!llmConfig ? (
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
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask questions or request actions. The MCP agent will use the available tools, prompts, and resources to help you.
            </p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                    {typeof message.content === 'string'
                      ? message.content
                      : Array.isArray(message.content)
                        ? message.content.map((item, idx) =>
                            typeof item === 'string'
                              ? item
                              : item.text || JSON.stringify(item),
                          ).join('')
                        : JSON.stringify(message.content)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMessage(message.id, message.content)}
                    className={cn(
                      'h-6 w-6 p-0 flex-shrink-0',
                      message.role === 'user' ? 'hover:bg-blue-600' : '',
                    )}
                  >
                    {copiedMessageId === message.id
                      ? (
                          <Check className="h-3 w-3" />
                        )
                      : (
                          <Copy className="h-3 w-3" />
                        )}
                  </Button>
                </div>

                {/* Tool Calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold opacity-70">Tool Calls:</p>
                    {message.toolCalls.map((toolCall, idx) => (
                      <details key={idx} className="text-xs">
                        <summary className="cursor-pointer hover:opacity-80 font-mono">
                          {toolCall.toolName}
                          (
                          {Object.keys(toolCall.args).length}
                          {' '}
                          args)
                        </summary>
                        <div className="mt-2 p-2 bg-black/10 dark:bg-white/10 rounded">
                          <SyntaxHighlighter
                            language="json"
                            style={prismStyle}
                            customStyle={{
                              margin: 0,
                              padding: 0,
                              background: 'transparent',
                              fontSize: '0.75rem',
                            }}
                          >
                            {JSON.stringify({ args: toolCall.args, result: toolCall.result }, null, 2)}
                          </SyntaxHighlighter>
                        </div>
                      </details>
                    ))}
                  </div>
                )}

                <div className="text-xs opacity-50 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
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
