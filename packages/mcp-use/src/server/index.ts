export {
  createMCPServer,
  type McpServerInstance
} from './mcp-server.js'

export * from './types/index.js'

// MCP-UI adapter utility functions
export {
  buildWidgetUrl,
  createExternalUrlResource,
  createRawHtmlResource,
  createRemoteDomResource,
  createUIResourceFromDefinition,
  generateWidgetHtml,
  generateRemoteDomScript,
  type UrlConfig
} from './adapters/mcp-ui-adapter.js'
