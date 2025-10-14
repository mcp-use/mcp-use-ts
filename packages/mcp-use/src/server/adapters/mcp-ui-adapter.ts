/**
 * MCP-UI Adapter
 *
 * Provides an adapter between mcp-use high-level UIResource definitions
 * and the low-level @mcp-ui/server resource format.
 * Ref: https://mcpui.dev/guide/server/typescript/usage-examples
 */

import { createUIResource } from '@mcp-ui/server'
import type { UIResourceContent, UIResourceDefinition } from '../types/resource.js'

/**
 * Content type options for UI resources
 */
export type UIContentType =
  | 'externalUrl'  // Default: iframe URL for serving widgets
  | 'rawHtml'      // Direct HTML content
  | 'remoteDom'    // Remote DOM scripting

/**
 * Encoding options for UI resources
 */
export type UIEncoding = 'text' | 'blob'

/**
 * Framework options for Remote DOM resources
 */
export type RemoteDomFramework = 'react' | 'webcomponents'

/**
 * Extended UI resource definition with content type support
 */
export interface ExtendedUIResourceDefinition extends UIResourceDefinition {
  contentType?: UIContentType
  encoding?: UIEncoding
  htmlContent?: string
  remoteDomScript?: string
  remoteDomFramework?: RemoteDomFramework
}

/**
 * Configuration for the adapter
 */
export interface AdapterConfig {
  baseUrl: string
  port: number | string
}

/**
 * MCP-UI Adapter class
 */
export class McpUiAdapter {
  private config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  /**
   * Build the full URL for a widget
   */
  private buildWidgetUrl(widget: string, props?: Record<string, any>): string {
    const url = new URL(
      `/mcp-use/widgets/${widget}`,
      `http://localhost:${this.config.port}`
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
   * Create a UIResource for an external URL (default for widgets)
   * @param uri - URI of the resource
   * @param iframeUrl - URL of the iframe
   * @param encoding - Encoding of the resource (text or blob (URL is Base64 encoded))
   * @returns UIResourceContent
   */
  createExternalUrlResource(
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
   * @param uri - URI of the resource
   * @param htmlString - HTML string to embed
   * @param encoding - Encoding of the resource
   * @returns UIResourceContent
   */
  createRawHtmlResource(
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
   */
  createRemoteDomResource(
    uri: string,
    script: string,
    framework: RemoteDomFramework = 'react',
    encoding: UIEncoding = 'text'
  ): UIResourceContent {
    return createUIResource({
      uri: uri as `ui://${string}`,
      content: { type: 'remoteDom', script, framework },
      encoding
    })
  }

  /**
   * Create a UIResource from our high-level definition
   */
  createWidgetUIResource(
    definition: ExtendedUIResourceDefinition,
    props?: Record<string, any>
  ): UIResourceContent {
    const uri = `ui://widget/${definition.name}`
    const contentType = definition.contentType || 'externalUrl'
    const encoding = definition.encoding || 'text'

    switch (contentType) {
      case 'externalUrl': {
        const widgetUrl = this.buildWidgetUrl(definition.widget, props)
        return this.createExternalUrlResource(uri, widgetUrl, encoding)
      }

      case 'rawHtml': {
        if (!definition.htmlContent) {
          throw new Error(`HTML content required for rawHtml type in widget ${definition.name}`)
        }
        return this.createRawHtmlResource(uri, definition.htmlContent, encoding)
      }

      case 'remoteDom': {
        if (!definition.remoteDomScript) {
          throw new Error(`Remote DOM script required for remoteDom type in widget ${definition.name}`)
        }
        const framework = definition.remoteDomFramework || 'react'
        return this.createRemoteDomResource(
          uri,
          definition.remoteDomScript,
          framework,
          encoding
        )
      }

      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }
  }

  /**
   * Generate HTML content for a widget (for rawHtml type)
   */
  generateWidgetHtml(
    definition: UIResourceDefinition,
    props?: Record<string, any>
  ): string {
    const [width = '100%', height = '400px'] = definition.size || []
    const propsJson = props ? JSON.stringify(props) : '{}'

    return `
<!DOCTYPE html>
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
   * Generate a Remote DOM script for a widget
   */
  generateRemoteDomScript(
    definition: UIResourceDefinition,
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
}

/**
 * Factory function to create an adapter instance
 */
export function createMcpUiAdapter(config: AdapterConfig): McpUiAdapter {
  return new McpUiAdapter(config)
}