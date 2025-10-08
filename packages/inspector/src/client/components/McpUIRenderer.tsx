import { UIResourceRenderer } from '@mcp-ui/client'
import type { Resource } from '@modelcontextprotocol/sdk/types.js'

interface McpUIRendererProps {
  resource: Resource
  onUIAction?: (action: any) => void
  className?: string
}

/**
 * Helper function to check if a resource is an MCP UI resource
 */
export function isMcpUIResource(resource: any): boolean {
  if (!resource?.mimeType) return false
  
  const mimeType = resource.mimeType.toLowerCase()
  return (
    mimeType === 'text/html' ||
    mimeType === 'text/uri-list' ||
    mimeType.startsWith('application/vnd.mcp-ui.remote-dom')
  )
}

/**
 * Helper function to convert MCP SDK Resource to MCP UI Resource format
 */
function convertToMcpUIResource(resource: Resource): any {
  return {
    uri: resource.uri,
    mimeType: resource.mimeType,
    text: resource.text,
    blob: resource.blob,
  }
}

/**
 * Component to render MCP UI resources
 */
export function McpUIRenderer({ resource, onUIAction, className }: McpUIRendererProps) {
  const handleUIAction = (action: any) => {
    console.log('MCP UI Action:', action)
    onUIAction?.(action)
  }

  const uiResource = convertToMcpUIResource(resource)

  return (
    <div className={className}>
      <UIResourceRenderer
        resource={uiResource}
        onUIAction={handleUIAction}
        htmlProps={{
          autoResizeIframe: { width: true, height: true },
          style: {
            width: '100%',
            minHeight: '200px',
          },
        }}
      />
    </div>
  )
}

