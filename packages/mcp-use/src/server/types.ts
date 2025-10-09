import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
export interface ServerConfig {
  name: string
  version: string
  description?: string
}

export interface InputDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  default?: any
}

export interface ResourceDefinition {
  uri: string
  name?: string
  description?: string
  mimeType?: string
  fn: ResourceHandler
}

export interface TemplateDefinition {
  uriTemplate: string
  name?: string
  description?: string
  mimeType?: string
  fn: TemplateHandler
}

export interface ToolDefinition {
  name: string
  description?: string
  inputs?: InputDefinition[]
  fn: ToolHandler
}

export interface PromptDefinition {
  name: string
  description?: string
  args?: InputDefinition[]
  fn: PromptHandler
}

// UI Resource types (aligned with MCP-UI spec)
export interface UIResourceContent {
  type: 'externalUrl' | 'html' | 'rawHtml' | 'remoteDom'
  iframeUrl?: string
  iframeUrls?: string[]
  html?: string
  htmlString?: string  // For rawHtml type
  script?: string
  preferredFrameSize?: {
    width?: number
    height?: number
  }
}

export interface UIResourceDefinition {
  uri?: string
  name: string
  description?: string
  widgetPath?: string  // Auto-serve from filesystem
  iframeUrl?: string   // Manual URL
  inputs?: InputDefinition[] // Widget props as tool inputs
  fn?: UIResourceHandler
  returnTextContent?: boolean // Whether to also return text content
}

export interface WidgetManifest {
  name: string
  path: string
  props?: Record<string, any>
  description?: string
}

export type ResourceHandler = () => Promise<string>
export type TemplateHandler = (params: Record<string, string>) => Promise<string>
export type ToolHandler = (params: Record<string, any>) => Promise<CallToolResult>
export type PromptHandler = (params: Record<string, any>) => Promise<string>
export type UIResourceHandler = (params: Record<string, any>) => Promise<{ content: UIResourceContent, text?: string }>
