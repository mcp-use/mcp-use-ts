import type { CallToolResult, GetPromptResult, ReadResourceResult, ResourceTemplate} from '@modelcontextprotocol/sdk/types.js'
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

export interface ResourceTemplateDefinition {
  name: string
  resourceTemplate: ResourceTemplate
  title?: string
  description?: string
  fn: ResourceTemplateHandler
}

export interface ResourceDefinition {
  name: string
  uri: string
  resource: {
    title?: string
    description?: string
    mimeType: string
  }
  fn: ResourceHandler
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

export type ResourceHandler = () => Promise<ReadResourceResult>
export type ResourceTemplateHandler = (uri: URL, params: Record<string, any>) => Promise<ReadResourceResult>
export type ToolHandler = (params: Record<string, any>) => Promise<CallToolResult>
export type PromptHandler = (params: Record<string, any>) => Promise<GetPromptResult>
