export { createMCPServer, McpServer } from './mcp-server.js'
export { formatUIResourceOptions, generateWidgetIframeUrl, buildWidgetQueryParams, validateWidgetParams } from './ui-resource.js'
export { discoverWidgets, propsToInputs, autoRegisterWidgets } from './widget-discovery.js'
export type {
  InputDefinition,
  PromptDefinition,
  PromptHandler,
  ResourceDefinition,
  ResourceHandler,
  ServerConfig,
  TemplateDefinition,
  TemplateHandler,
  ToolDefinition,
  ToolHandler,
  UIResourceDefinition,
  UIResourceContent,
  UIResourceHandler,
  WidgetManifest,
} from './types.js'
