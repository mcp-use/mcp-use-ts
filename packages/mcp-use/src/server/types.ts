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
  /** Unique identifier for the resource */
  name: string
  /** URI pattern for accessing the resource (e.g., 'config://app-settings') */
  uri: string
  /** Resource metadata including MIME type and description */
  /** Optional title for the resource */
  title?: string
  /** Optional description of the resource */
  description?: string
  /** MIME type of the resource content (required) */
  mimeType: string
  /** Async function that returns the resource content */
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
