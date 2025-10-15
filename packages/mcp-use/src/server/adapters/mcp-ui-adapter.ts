/**
 * MCP-UI Adapter Utilities
 *
 * Pure functions to convert mcp-use high-level UIResource definitions
 * into @mcp-ui/server compatible resource objects.
 *
 * Ref: https://mcpui.dev/guide/server/typescript/usage-examples
 */

import { createUIResource } from '@mcp-ui/server'
import type {
  UIResourceContent,
  UIResourceDefinition,
  UIEncoding
} from '../types/resource.js'

/**
 * Configuration for building widget URLs
 */
export interface UrlConfig {
  baseUrl: string
  port: number | string
}

/**
 * Build the full URL for a widget including query parameters
 * Automatically uses Vite dev server in development mode
 *
 * @param widget - Widget identifier
 * @param props - Parameters to pass as query params
 * @param config - URL configuration (baseUrl and port)
 * @returns Complete widget URL with encoded parameters
 */
export function buildWidgetUrl(
  widget: string,
  props: Record<string, any> | undefined,
  config: UrlConfig
): string {
  // In dev mode, use Vite dev server directly for HMR
  const isDevMode = process.env.MCP_USE_DEV_MODE === 'true'
  const viteDevServer = process.env.VITE_DEV_SERVER || 'http://localhost:5173'
  
  const baseUrl = isDevMode ? viteDevServer : `${config.baseUrl}:${config.port}`
  const url = new URL(`/mcp-use/widgets/${widget}`, baseUrl)

  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
        url.searchParams.set(key, stringValue)
      }
    })
  }

  return url.toString()
}

/**
 * Create a widget UI resource that automatically uses the correct URL for dev/prod
 * 
 * @param widgetName - Name of the widget file (without .tsx extension)
 * @param serverPort - Port the MCP server is running on
 * @param props - Optional props to pass to the widget
 * @returns UIResourceContent object
 * 
 * @example
 * ```typescript
 * const resource = createWidgetUIResource('kanban-board', 3000)
 * // In dev mode: uses http://localhost:5173/mcp-use/widgets/kanban-board
 * // In prod mode: uses http://localhost:3000/mcp-use/widgets/kanban-board
 * ```
 */
export function createWidgetUIResource(
  widgetName: string,
  serverPort: number | string,
  props?: Record<string, any>
): UIResourceContent {
  const widgetUrl = buildWidgetUrl(widgetName, props, {
    baseUrl: 'http://localhost',
    port: serverPort
  })
  
  return createExternalUrlResource(
    `ui://widget/${widgetName}`,
    widgetUrl,
    'text'
  )
}

/**
 * Create a UIResource for an external URL (iframe)
 *
 * @param uri - Resource URI (must start with ui://)
 * @param iframeUrl - URL to load in iframe
 * @param encoding - Encoding type ('text' or 'blob')
 * @returns UIResourceContent object
 */
export function createExternalUrlResource(
  uri: string,
  iframeUrl: string,
  encoding: UIEncoding = 'text'
): UIResourceContent {
  return createUIResource({
    uri: uri as `ui://${string}`,
    content: { type: 'externalUrl', iframeUrl },
    encoding
  })
}

/**
 * Create a UIResource for raw HTML content
 *
 * @param uri - Resource URI (must start with ui://)
 * @param htmlString - HTML content to render
 * @param encoding - Encoding type ('text' or 'blob')
 * @returns UIResourceContent object
 */
export function createRawHtmlResource(
  uri: string,
  htmlString: string,
  encoding: UIEncoding = 'text'
): UIResourceContent {
  return createUIResource({
    uri: uri as `ui://${string}`,
    content: { type: 'rawHtml', htmlString },
    encoding
  })
}

/**
 * Create a UIResource for Remote DOM scripting
 *
 * @param uri - Resource URI (must start with ui://)
 * @param script - JavaScript code for remote DOM manipulation
 * @param framework - Framework for remote DOM ('react' or 'webcomponents')
 * @param encoding - Encoding type ('text' or 'blob')
 * @returns UIResourceContent object
 */
export function createRemoteDomResource(
  uri: string,
  script: string,
  framework: 'react' | 'webcomponents' = 'react',
  encoding: UIEncoding = 'text'
): UIResourceContent {
  return createUIResource({
    uri: uri as `ui://${string}`,
    content: { type: 'remoteDom', script, framework },
    encoding
  })
}

/**
 * Create a UIResource from a high-level definition
 *
 * This is the main function that routes to the appropriate resource creator
 * based on the discriminated union type.
 *
 * @param definition - UIResource definition (discriminated union)
 * @param params - Runtime parameters for the widget (for externalUrl type)
 * @param config - URL configuration for building widget URLs
 * @returns UIResourceContent object
 */
export function createUIResourceFromDefinition(
  definition: UIResourceDefinition,
  params: Record<string, any>,
  config: UrlConfig
): UIResourceContent {
  const uri = `ui://widget/${definition.name}` as `ui://${string}`
  const encoding = definition.encoding || 'text'

  switch (definition.type) {
    case 'externalUrl': {
      const widgetUrl = buildWidgetUrl(definition.widget, params, config)
      return createExternalUrlResource(uri, widgetUrl, encoding)
    }

    case 'rawHtml': {
      return createRawHtmlResource(uri, definition.htmlContent, encoding)
    }

    case 'remoteDom': {
      const framework = definition.framework || 'react'
      return createRemoteDomResource(uri, definition.script, framework, encoding)
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = definition
      throw new Error(`Unknown UI resource type: ${(_exhaustive as any).type}`)
    }
  }
}

