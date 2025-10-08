// Removed unused import
import type {UIResource} from '@mcp-ui/server'
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

export type ResourceHandler = () => Promise<string>
export type TemplateHandler = (params: Record<string, string>) => Promise<string>
export type ToolHandler = (params: Record<string, any>) => Promise<string| UIResource>
export type PromptHandler = (params: Record<string, any>) => Promise<string>
