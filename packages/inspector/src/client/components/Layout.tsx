import type { ReactNode } from 'react'
import { FolderOpen, MessageSquare, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LogoAnimated from '@/components/LogoAnimated'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { useMcpContext } from '../context/McpContext'
import { ServerIcon } from './ServerIcon'
import { ToolsTab } from './ToolsTab'

interface LayoutProps {
  children: ReactNode
}

// Pulsing emerald dot component
function StatusDot({ status }: { status: string }) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ready':
        return { color: 'bg-emerald-500', ringColor: 'ring-emerald-500', tooltip: 'Connected' }
      case 'failed':
        return { color: 'bg-red-500', ringColor: 'ring-red-500', tooltip: 'Failed' }
      default:
        return { color: 'bg-yellow-500', ringColor: 'ring-yellow-500', tooltip: status }
    }
  }

  const { color, ringColor, tooltip } = getStatusInfo(status)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          {/* Pulsing ring */}
          <div className={`absolute w-2 h-2 rounded-full ${ringColor} animate-ping`} />
          {/* Solid dot */}
          <div className={`relative w-2 h-2 rounded-full ${color}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { connections } = useMcpContext()
  const [activeTab, setActiveTab] = useState('tools')
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)

  const tabs = [
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'prompts', label: 'Prompts', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: FolderOpen },
  ]

  const handleServerSelect = (serverId: string) => {
    setSelectedServerId(serverId)
    navigate(`/servers/${serverId}`)
  }

  const selectedServer = connections.find(c => c.id === selectedServerId)

  // Handle navigation logic based on current route and server selection
  useEffect(() => {
    const isServerRoute = location.pathname.startsWith('/servers/')
    const serverIdFromRoute = location.pathname.split('/servers/')[1]

    if (isServerRoute && serverIdFromRoute) {
      // If we're on a server route, set the selected server
      setSelectedServerId(serverIdFromRoute)
    }
    else if (!isServerRoute) {
      // If we're not on a server route, clear the selected server
      setSelectedServerId(null)
    }
  }, [location.pathname])

  // If no server is selected and we're on a server route, navigate to root
  useEffect(() => {
    if (!selectedServer && location.pathname.startsWith('/servers/')) {
      navigate('/')
    }
  }, [selectedServer, location.pathname, navigate])

  return (
    <TooltipProvider>
      <div className="h-screen bg-zinc-100 flex flex-col px-4 py-4 gap-4">
        {/* Header */}
        <header className="max-w-screen-2xl w-full mx-auto">
          <div className="flex items-center justify-between">
            {/* Left side: Server dropdown + Tabs */}
            <div className="flex items-center space-x-6">
              {/* Server Selection Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ShimmerButton
                    className={
                      cn('min-w-[200px] p-0 px-1 pr-4 text-sm h-11 justify-start bg-black text-white border-black hover:bg-gray-800 hover:border-gray-800', !selectedServer && 'pl-4',
                      )
                    }
                  >
                    {selectedServer && (
                      <ServerIcon
                        serverUrl={selectedServer.url}
                        serverName={selectedServer.name}
                        size="md"
                        className="mr-2"
                      />
                    )}
                    <span className="truncate">
                      {selectedServer ? selectedServer.name : 'Choose server to inspect'}
                    </span>
                  </ShimmerButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px]" align="start">
                  <DropdownMenuLabel>MCP Servers</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {connections.length === 0
                    ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No servers connected. Go to the dashboard to add one.
                        </div>
                      )
                    : (
                        connections.map(connection => (
                          <DropdownMenuItem
                            key={connection.id}
                            onClick={() => handleServerSelect(connection.id)}
                            className="flex items-center gap-3"
                          >
                            <ServerIcon
                              serverUrl={connection.url}
                              serverName={connection.name}
                              size="sm"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <div className="font-medium">{connection.name}</div>
                              <StatusDot status={connection.state} />
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/')}>
                    <span className="text-blue-600">+ Add new server</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tabs */}
              {selectedServer && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    {tabs.map(tab => (
                      <TabsTrigger key={tab.id} value={tab.id} icon={tab.icon}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </div>

            {/* Right side: Logo + Text */}
            <LogoAnimated state="expanded" />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-screen-2xl w-full mx-auto bg-white rounded-2xl p-6 overflow-auto">
          {selectedServer && activeTab === 'tools'
            ? (
                <ToolsTab
                  tools={selectedServer.tools}
                  callTool={selectedServer.callTool}
                  isConnected={selectedServer.state === 'ready'}
                />
              )
            : (
                children
              )}
        </main>
      </div>
    </TooltipProvider>
  )
}
