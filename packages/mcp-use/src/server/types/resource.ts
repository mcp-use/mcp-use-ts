import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import type { ResourceAnnotations } from './common.js'

// Handler types
export type ResourceHandler = () => Promise<ReadResourceResult>
export type ResourceTemplateHandler = (uri: URL, params: Record<string, any>) => Promise<ReadResourceResult>

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

/**
 * UIResource-specific types
 */
export interface WidgetProps {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    default?: any
    description?: string
  }
}

export interface UIResourceDefinition {
  /** Unique identifier for the resource */
  name: string
  /** Widget identifier (e.g., 'kanban-board', 'chart') */
  widget: string
  /** Human-readable title */
  title?: string
  /** Description of what the widget does */
  description?: string
  /** Widget properties/parameters configuration */
  props?: WidgetProps
  /** Preferred frame size [width, height] (e.g., ['800px', '600px']) */
  size?: [string, string]
  /** Resource annotations for discovery and presentation */
  annotations?: ResourceAnnotations
}

export interface WidgetConfig {
  /** Widget directory name */
  name: string
  /** Absolute path to widget directory */
  path: string
  /** Widget manifest if present */
  manifest?: WidgetManifest
  /** Main component file name */
  component?: string
}

export interface WidgetManifest {
  name: string
  title?: string
  description?: string
  version?: string
  props?: WidgetProps
  size?: [string, string]
  assets?: {
    main?: string
    scripts?: string[]
    styles?: string[]
  }
}

export interface DiscoverWidgetsOptions {
  /** Path to widgets directory (defaults to dist/resources/mcp-use/widgets) */
  path?: string
  /** Automatically register widgets without manifests */
  autoRegister?: boolean
  /** Filter widgets by name pattern */
  filter?: string | RegExp
}