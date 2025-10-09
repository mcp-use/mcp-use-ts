import type { UIResourceContent, InputDefinition } from './types.js'

/**
 * Create a properly formatted MCP-UI resource
 * This wraps the resource for use with @mcp-ui/server's createUIResource
 * @param options - UI resource configuration
 * @returns Configuration object for @mcp-ui/server's createUIResource
 */
export function formatUIResourceOptions(options: {
  uri: string
  content: UIResourceContent
  encoding?: 'text' | 'blob'
  metadata?: Record<string, any>
}): any {
  const { uri, content, encoding = 'text', metadata = {} } = options

  // Format content based on type for @mcp-ui/server
  let formattedContent: any

  if (content.type === 'externalUrl') {
    formattedContent = {
      type: 'externalUrl',
      iframeUrl: content.iframeUrl,
      ...(content.iframeUrls && { iframeUrls: content.iframeUrls }),
    }
  } else if (content.type === 'html') {
    formattedContent = {
      type: 'rawHtml',
      htmlString: content.html,
    }
  } else if (content.type === 'rawHtml') {
    formattedContent = {
      type: 'rawHtml',
      htmlString: content.htmlString || content.html,
    }
  } else if (content.type === 'remoteDom') {
    formattedContent = {
      type: 'remoteDom',
      script: content.script,
      framework: 'react', // default to React
    }
  }

  // Return options for @mcp-ui/server's createUIResource
  return {
    uri,
    content: formattedContent,
    encoding,
    metadata,
    ...(content.preferredFrameSize && {
      uiMetadata: {
        'preferred-frame-size': content.preferredFrameSize
      }
    })
  }
}

/**
 * Build query parameters from widget inputs
 * @param params - Input parameters
 * @returns URL search params string
 */
export function buildWidgetQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        searchParams.set(key, JSON.stringify(value))
      } else {
        searchParams.set(key, String(value))
      }
    }
  }

  return searchParams.toString()
}

/**
 * Validate and transform parameters based on input definitions
 * @param params - Raw parameters
 * @param inputs - Input definitions for validation
 * @returns Validated and transformed parameters
 */
export function validateWidgetParams(
  params: Record<string, any>,
  inputs?: InputDefinition[]
): Record<string, any> {
  if (!inputs || inputs.length === 0) {
    return params
  }

  const validated: Record<string, any> = {}

  for (const input of inputs) {
    const value = params[input.name]

    // Check required fields
    if (input.required && (value === undefined || value === null)) {
      if (input.default !== undefined) {
        validated[input.name] = input.default
      } else {
        throw new Error(`Missing required parameter: ${input.name}`)
      }
      continue
    }

    // Skip undefined optional fields
    if (value === undefined || value === null) {
      if (input.default !== undefined) {
        validated[input.name] = input.default
      }
      continue
    }

    // Type validation and conversion
    switch (input.type) {
      case 'string':
        validated[input.name] = String(value)
        break
      case 'number':
        validated[input.name] = Number(value)
        if (isNaN(validated[input.name])) {
          throw new Error(`Parameter ${input.name} must be a valid number`)
        }
        break
      case 'boolean':
        validated[input.name] = Boolean(value)
        break
      case 'object':
        if (typeof value === 'string') {
          try {
            validated[input.name] = JSON.parse(value)
          } catch {
            throw new Error(`Parameter ${input.name} must be valid JSON`)
          }
        } else {
          validated[input.name] = value
        }
        break
      case 'array':
        if (typeof value === 'string') {
          try {
            validated[input.name] = JSON.parse(value)
            if (!Array.isArray(validated[input.name])) {
              throw new Error(`Parameter ${input.name} must be an array`)
            }
          } catch {
            throw new Error(`Parameter ${input.name} must be a valid JSON array`)
          }
        } else if (Array.isArray(value)) {
          validated[input.name] = value
        } else {
          throw new Error(`Parameter ${input.name} must be an array`)
        }
        break
      default:
        validated[input.name] = value
    }
  }

  return validated
}

/**
 * Generate iframe URL for a widget
 * @param baseUrl - Base server URL
 * @param widgetName - Name of the widget
 * @param params - Widget parameters
 * @param inputs - Input definitions for validation
 * @returns Complete iframe URL
 */
export function generateWidgetIframeUrl(
  baseUrl: string,
  widgetName: string,
  params?: Record<string, any>,
  inputs?: InputDefinition[]
): string {
  const widgetPath = `/mcp-use/widgets/${widgetName}`

  if (!params || Object.keys(params).length === 0) {
    return `${baseUrl}${widgetPath}`
  }

  // Validate parameters if inputs are provided
  const validatedParams = inputs ? validateWidgetParams(params, inputs) : params
  const queryString = buildWidgetQueryParams(validatedParams)

  return `${baseUrl}${widgetPath}${queryString ? `?${queryString}` : ''}`
}