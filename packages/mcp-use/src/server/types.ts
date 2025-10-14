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

/**
 * Annotations provide hints to clients about how to use or display resources
 */
export interface ResourceAnnotations {
  /** Intended audience(s) for this resource */
  audience?: ('user' | 'assistant')[]
  /** Priority from 0.0 (least important) to 1.0 (most important) */
  priority?: number
  /** ISO 8601 formatted timestamp of last modification */
  lastModified?: string
}

/**
 * Configuration for a resource template
 */
export interface ResourceTemplateConfig {
  /** URI template with {param} placeholders (e.g., "user://{userId}/profile") */
  uriTemplate: string
  /** Name of the resource */
  name?: string
  /** MIME type of the resource content */
  mimeType?: string
  /** Description of the resource */
  description?: string
}

export interface ResourceTemplateDefinition {
  name: string
  resourceTemplate: ResourceTemplateConfig
  title?: string
  description?: string
  annotations?: ResourceAnnotations
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
  /** Optional annotations for the resource */
  annotations?: ResourceAnnotations
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
