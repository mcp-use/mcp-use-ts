import type { CallToolResult, GetPromptResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
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

import type { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js'

export type ResourceHandler = () => Promise<ReadResourceResult>
export type TemplateHandler = (uri: URL, variables: Variables) => Promise<ReadResourceResult>
export type ToolHandler<TInput = Record<string, any>> = (params: TInput) => Promise<CallToolResult>
export type PromptHandler<TInput = Record<string, any>> = (params: TInput) => Promise<GetPromptResult>
