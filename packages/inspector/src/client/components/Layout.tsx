import type { ReactNode } from 'react'
import { FolderOpen, MessageSquare, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import LogoAnimated from '@/components/LogoAnimated'
import { ServerSelectionModal } from '@/components/ui/server-selection-modal'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'

interface ServerOption {
  id: string
  name: string
  color?: string
  url?: string
  type?: string
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [selectedServer, setSelectedServer] = useState('')
  const [activeTab, setActiveTab] = useState('tools')
  const [servers, setServers] = useState<ServerOption[]>([
    { id: 'server-1', name: 'Local Server', color: 'oklch(0.6 0.2 120)' },
    { id: 'server-2', name: 'Production', color: 'oklch(0.5 0.3 200)' },
    { id: 'server-3', name: 'Staging', color: 'oklch(0.7 0.2 60)' },
  ])
  const [isInitializing, setIsInitializing] = useState(false)

  const tabs = [
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'prompts', label: 'Prompts', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: FolderOpen },
  ]

  // MCP Client state
  const [mcpClient, setMcpClient] = useState<any>(null)

  // Initialize MCP client
  useEffect(() => {
    const initializeMcpClient = async () => {
      try {
        const { MCPClient } = await import('mcp-use/browser')
        const client = MCPClient.fromDict({ mcpServers: {} })
        setMcpClient(client)
      }
      catch (error) {
        console.error('Failed to initialize MCP client:', error)
      }
    }
    initializeMcpClient()
  }, [])

  // Handle server addition
  const handleServerAdded = async (server: ServerOption) => {
    setServers(prev => [...prev, server])

    // Add server to MCP client if available
    if (mcpClient && server.url) {
      try {
        const serverConfig
          = server.type === 'websocket'
            ? { ws_url: server.url }
            : { url: server.url }

        mcpClient.addServer(server.id, serverConfig)
        console.warn(`Added server ${server.name} to MCP client`)
      }
      catch (error) {
        console.error('Failed to add server to MCP client:', error)
      }
    }
  }

  // Handle server selection and connection
  const handleServerChange = async (serverId: string) => {
    if (!mcpClient) {
      console.warn('MCP client not initialized')
      setSelectedServer(serverId)
      return
    }

    const server = servers.find(s => s.id === serverId)
    if (!server || !server.url) {
      setSelectedServer(serverId)
      return
    }

    setIsInitializing(true)
    try {
      // Create session for the selected server
      await mcpClient.createSession(serverId, true)
      console.warn(`Connected to server: ${server.name}`)
      setSelectedServer(serverId)
    }
    catch (error) {
      console.error(`Failed to connect to server ${server.name}:`, error)
      // Still set the selection even if connection fails
      setSelectedServer(serverId)
    }
    finally {
      setIsInitializing(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="h-screen bg-zinc-100 flex flex-col px-4 py-4 gap-4">
        {/* Header */}
        <header className="max-w-screen-2xl w-full mx-auto">
          <div className="flex items-center justify-between">
            {/* Left side: Server dropdown + Tabs */}
            <div className="flex items-center space-x-6">
              {/* Server Selection Modal */}
              <ServerSelectionModal
                servers={servers}
                selectedServer={selectedServer}
                onServerChange={handleServerChange}
                onServerAdded={handleServerAdded}
                isInitializing={isInitializing}
              />

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {tabs.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id} icon={tab.icon}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Right side: Logo + Text */}
            <LogoAnimated state="expanded" />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-screen-2xl w-full mx-auto bg-white rounded-2xl p-6 overflow-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  )
}
