import type { CustomHeader } from './CustomHeadersEditor'
import { CircleMinus, Cog, Copy, FileText, RotateCcw, Server, Shield } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RandomGradientBackground } from '@/components/ui/random-gradient-background'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMcpContext } from '../context/McpContext'
import { CustomHeadersEditor } from './CustomHeadersEditor'

export function InspectorDashboard() {
  const { connections, addConnection, removeConnection } = useMcpContext()
  const navigate = useNavigate()

  // Form state
  const [transportType, setTransportType] = useState('SSE')
  const [url, setUrl] = useState('')
  const [connectionType, setConnectionType] = useState('Direct')
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([])
  const [requestTimeout, setRequestTimeout] = useState('10000')
  const [resetTimeoutOnProgress, setResetTimeoutOnProgress] = useState('True')
  const [maxTotalTimeout, setMaxTotalTimeout] = useState('60000')
  const [proxyAddress, setProxyAddress] = useState('')
  const [proxyToken, setProxyToken] = useState('c96aeb0c195aa9c7d3846b90aec9bc5fcdd5df97b3049aaede8f5dd1a15d2d87')

  // OAuth fields
  const [clientId, setClientId] = useState('')
  const [redirectUrl, setRedirectUrl] = useState(
    typeof window !== 'undefined'
      ? new URL('/oauth/callback', window.location.origin).toString()
      : 'http://localhost:3000/oauth/callback',
  )
  const [scope, setScope] = useState('')

  // UI state
  const [headersDialogOpen, setHeadersDialogOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)

  const handleAddConnection = () => {
    if (!url.trim())
      return

    // For now, use URL as both ID and name - this will need proper implementation
    addConnection(url, url)

    // Reset form
    setUrl('')
    setCustomHeaders([])
    setClientId('')
    setScope('')
  }

  const handleClearAllConnections = () => {
    // Remove all connections
    connections.forEach((connection) => {
      removeConnection(connection.id)
    })
  }

  const handleCopyError = async (errorMessage: string) => {
    try {
      await navigator.clipboard.writeText(errorMessage)
      toast.success('Error message copied to clipboard')
    }
    catch {
      toast.error('Failed to copy error message')
    }
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const handleServerClick = (connection: any) => {
    if (connection.state !== 'ready') {
      toast.error('Server is not connected and cannot be inspected')
      return
    }
    navigate(`/servers/${encodeURIComponent(connection.id)}`)
  }

  const handleExportServerEntry = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL first')
      return
    }

    const serverEntry = {
      type: 'streamable-http',
      url,
      note: 'For Streamable HTTP connections, add this URL directly in your MCP Client',
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(serverEntry, null, 2))
      toast.success('Streamable HTTP URL has been copied. Use this URL directly in your MCP Client.')
    }
    catch {
      toast.error('Failed to copy server entry to clipboard')
    }
  }

  const handleExportServersFile = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL first')
      return
    }

    const serversFile = {
      mcpServers: {
        'default-server': {
          type: 'streamable-http',
          url,
          note: 'For Streamable HTTP connections, add this URL directly in your MCP Client',
        },
      },
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(serversFile, null, 2))
      toast.success('Servers configuration has been copied to clipboard. Add this to your mcp.json file. Current testing server will be added as \'default-server\'')
    }
    catch {
      toast.error('Failed to copy servers file to clipboard')
    }
  }

  const enabledHeadersCount = customHeaders.filter(h => h.name && h.value).length

  return (
    <div className="flex items-start justify-start gap-4 h-full relative">

      <div className="w-full px-6 pt-6 overflow-auto">
        <div className="flex items-center gap-3 relative z-10">
          <h2 className="text-2xl font-medium tracking-tight">MCP Inspector</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/mcp-use/mcp-use-ts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors">
                  v
                  {__INSPECTOR_VERSION__}
                </Badge>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Visit GitHub</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-muted-foreground relative z-10">
          Inspect and debug MCP (Model Context Protocol) servers
        </p>

        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Connected Servers</h3>
            <div className="flex gap-2">
              {connections.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllConnections}
                >
                  Clear All
                </Button>
              )}

            </div>
          </div>
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
                <div className="grid gap-3">
                  {connections.map(connection => (
                    <div
                      key={connection.id}
                      onClick={() => handleServerClick(connection)}
                      className="rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 p-4 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-sm">{connection.name}</h4>
                            <div className="flex items-center gap-2">
                              {connection.error
                                ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleCopyError(connection.error!)
                                          }}
                                          className="w-2 h-2 rounded-full bg-rose-500 animate-status-pulse-red hover:bg-rose-600 transition-colors"
                                          title="Click to copy error message"
                                          aria-label="Copy error message to clipboard"
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">{connection.error}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                : (
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        connection.state === 'ready'
                                          ? 'bg-emerald-600 animate-status-pulse'
                                          : connection.state === 'failed'
                                            ? 'bg-rose-600 animate-status-pulse-red'
                                            : 'bg-yellow-500 animate-status-pulse-yellow'
                                      }`}
                                    />
                                  )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-zinc-400 font-mono mt-1">
                            {connection.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={e => handleActionClick(e, () => removeConnection(connection.id))}
                                className="h-8 w-8 p-0"
                              >
                                <CircleMinus className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove connection</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={e => handleActionClick(e, connection.retry)}
                                className="h-8 w-8 p-0"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Resync connection</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {connection.state === 'pending_auth' && connection.authUrl && (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
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
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>

      <div className="w-full relative overflow-hidden h-full p-10 items-center justify-center flex">
        <div className="relative w-full max-w-xl mx-auto z-10 flex flex-col gap-3 rounded-3xl p-6 bg-black/70 dark:bg-zinc-900/90 shadow-2xl shadow-black/50 backdrop-blur-md">
          <h3 className="text-xl font-semibold text-white mb-2">Connect</h3>

          {/* Transport Type */}
          <div className="space-y-2">
            <Label className="text-white/90">Transport Type</Label>
            <Select value={transportType} onValueChange={setTransportType}>
              <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSE">Streamable HTTP</SelectItem>
                <SelectItem value="WebSocket">WebSocket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label className="text-white/90">URL</Label>
            <Input
              placeholder="http://localhost:3001/sse"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          {/* Connection Type */}
          <div className="space-y-2">
            <Label className="text-white/90">Connection Type</Label>
            <Select value={connectionType} onValueChange={setConnectionType}>
              <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Via Proxy">Via Proxy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="absolute top-2 right-2 text-white  hover:bg-white/20 z-10 dark:hover:bg-white/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleExportServerEntry}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Server Entry
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportServersFile}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Servers File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Configuration Buttons Row */}
          <div className="flex gap-3">
            {/* Authentication Button */}
            <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-center bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Authentication
                  {(clientId || scope) && (
                    <Badge variant="secondary" className="ml-2">
                      OAuth 2.0
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Authentication</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">OAuth 2.0 Flow</h4>

                  {/* Client ID */}
                  <div className="space-y-2">
                    <Label className="text-sm">Client ID</Label>
                    <Input
                      placeholder="Client ID"
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                    />
                  </div>

                  {/* Redirect URL */}
                  <div className="space-y-2">
                    <Label className="text-sm">Redirect URL</Label>
                    <Input
                      value={redirectUrl}
                      onChange={e => setRedirectUrl(e.target.value)}
                    />
                  </div>

                  {/* Scope */}
                  <div className="space-y-2">
                    <Label className="text-sm">Scope</Label>
                    <Input
                      placeholder="Scope (space-separated)"
                      value={scope}
                      onChange={e => setScope(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setAuthDialogOpen(false)}>
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Custom Headers Button */}
            <Dialog open={headersDialogOpen} onOpenChange={setHeadersDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-center bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Custom Headers
                  {enabledHeadersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {enabledHeadersCount}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Custom Headers</DialogTitle>
                </DialogHeader>
                <CustomHeadersEditor
                  headers={customHeaders}
                  onChange={setCustomHeaders}
                  onSave={() => setHeadersDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            {/* Configuration Button */}
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-center bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Cog className="w-4 h-4 mr-2" />
                  Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Request Timeout */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      Request Timeout
                      <span className="text-muted-foreground text-xs">(?)</span>
                    </Label>
                    <Input
                      type="number"
                      value={requestTimeout}
                      onChange={e => setRequestTimeout(e.target.value)}
                    />
                  </div>

                  {/* Reset Timeout on Progress */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      Reset Timeout on Progress
                      <span className="text-muted-foreground text-xs">(?)</span>
                    </Label>
                    <Select value={resetTimeoutOnProgress} onValueChange={setResetTimeoutOnProgress}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="True">True</SelectItem>
                        <SelectItem value="False">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Maximum Total Timeout */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      Maximum Total Timeout
                      <span className="text-muted-foreground text-xs">(?)</span>
                    </Label>
                    <Input
                      type="number"
                      value={maxTotalTimeout}
                      onChange={e => setMaxTotalTimeout(e.target.value)}
                    />
                  </div>

                  {/* Inspector Proxy Address */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      Inspector Proxy Address
                      <span className="text-muted-foreground text-xs">(?)</span>
                    </Label>
                    <Input
                      value={proxyAddress}
                      onChange={e => setProxyAddress(e.target.value)}
                      placeholder=""
                    />
                  </div>

                  {/* Proxy Session Token */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      Proxy Session Token
                      <span className="text-muted-foreground text-xs">(?)</span>
                    </Label>
                    <Input
                      value={proxyToken}
                      onChange={e => setProxyToken(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setConfigDialogOpen(false)}>
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleAddConnection}
            disabled={!url.trim()}
            className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect
          </Button>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-status-pulse-red"></div>
            Disconnected
          </div>
        </div>
        <RandomGradientBackground className="absolute inset-0" />
      </div>

    </div>
  )
}
