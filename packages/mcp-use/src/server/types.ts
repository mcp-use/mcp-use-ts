import type { CallToolResult, GetPromptResult, ReadResourceResult} from '@modelcontextprotocol/sdk/types.js'
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

export type ResourceHandler = () => Promise<ReadResourceResult>
export type TemplateHandler = (params: Record<string, string>) => Promise<ReadResourceResult>
export type ToolHandler = (params: Record<string, any>) => Promise<CallToolResult>
export type PromptHandler = (params: Record<string, any>) => Promise<GetPromptResult>
