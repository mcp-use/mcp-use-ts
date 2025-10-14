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
  const url = new URL(
    `/mcp-use/widgets/${widget}`,
    `${config.baseUrl}:${config.port}`
  )

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

/**
 * Generate HTML content for a widget (utility function)
 *
 * @param definition - Base UI resource definition
 * @param props - Widget properties to inject
 * @returns Generated HTML string
 */
export function generateWidgetHtml(
  definition: Pick<UIResourceDefinition, 'name' | 'title' | 'description' | 'size'>,
  props?: Record<string, any>
): string {
  const [width = '100%', height = '400px'] = definition.size || []
  const propsJson = props ? JSON.stringify(props) : '{}'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${definition.title || definition.name}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .widget-container {
      width: ${width};
      height: ${height};
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: auto;
      padding: 20px;
      background: white;
    }
    .widget-title {
      font-size: 1.5em;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .widget-description {
      color: #666;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="widget-container">
    <div class="widget-title">${definition.title || definition.name}</div>
    ${definition.description ? `<div class="widget-description">${definition.description}</div>` : ''}
    <div id="widget-root"></div>
  </div>
  <script>
    // Widget props passed from server
    window.__WIDGET_PROPS__ = ${propsJson};

    // Placeholder for widget initialization
    console.log('Widget ${definition.name} loaded with props:', window.__WIDGET_PROPS__);

    // Communication with parent window
    window.addEventListener('message', (event) => {
      console.log('Received message:', event.data);
    });

    // Example tool call
    function callTool(toolName, params) {
      window.parent.postMessage({
        type: 'tool',
        payload: { toolName, params }
      }, '*');
    }
  </script>
</body>
</html>`
}

/**
 * Generate a Remote DOM script for a widget (utility function)
 *
 * @param definition - Base UI resource definition
 * @param props - Widget properties to inject
 * @returns Generated JavaScript string
 */
export function generateRemoteDomScript(
  definition: Pick<UIResourceDefinition, 'name' | 'title' | 'description'>,
  props?: Record<string, any>
): string {
  return `
// Remote DOM script for ${definition.name}
const container = document.createElement('div');
container.style.padding = '20px';

// Create title
const title = document.createElement('h2');
title.textContent = '${definition.title || definition.name}';
container.appendChild(title);

${definition.description ? `
// Add description
const description = document.createElement('p');
description.textContent = '${definition.description}';
description.style.color = '#666';
container.appendChild(description);
` : ''}

// Widget props
const props = ${JSON.stringify(props || {})};

// Create interactive button
const button = document.createElement('ui-button');
button.setAttribute('label', 'Interact with ${definition.name}');
button.addEventListener('press', () => {
  window.parent.postMessage({
    type: 'tool',
    payload: {
      toolName: 'ui_${definition.name}',
      params: props
    }
  }, '*');
});
container.appendChild(button);

// Add custom widget logic here
console.log('Remote DOM widget ${definition.name} initialized with props:', props);

// Append to root
root.appendChild(container);`
}
