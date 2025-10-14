/**
 * Centralized type exports for MCP server
 */

// Common types
export {
  ServerConfig,
  InputDefinition,
  ResourceAnnotations
} from './common.js'

// Resource types including UIResource
export {
  ResourceHandler,
  ResourceTemplateHandler,
  ResourceTemplateConfig,
  ResourceTemplateDefinition,
  ResourceDefinition,
  // UIResource specific types
  UIResourceContent,
  WidgetProps,
  UIContentType,
  UIEncoding,
  RemoteDomFramework,
  UIResourceDefinition,
  WidgetConfig,
  WidgetManifest,
  DiscoverWidgetsOptions
} from './resource.js'

// Tool types
export {
  ToolHandler,
  ToolDefinition
} from './tool.js'

// Prompt types
export {
  PromptHandler,
  PromptDefinition
} from './prompt.js'