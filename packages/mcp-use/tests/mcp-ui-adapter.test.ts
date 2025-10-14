/**
 * Tests for MCP-UI Adapter
 *
 * These tests verify that the adapter correctly generates UIResource objects
 * matching the @mcp-ui/server format for all content types.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { type McpUiAdapter, createMcpUiAdapter } from '../src/server/adapters/mcp-ui-adapter.js'
import type { ExtendedUIResourceDefinition } from '../src/server/adapters/mcp-ui-adapter.js'

describe('MCP-UI Adapter', () => {
  let adapter: McpUiAdapter

  beforeEach(() => {
    adapter = createMcpUiAdapter({
      baseUrl: 'http://localhost',
      port: 3000
    })
  })

  describe('External URL Resources', () => {
    it('should create external URL resource with text encoding', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'kanban-board',
        widget: 'kanban-board',
        title: 'Kanban Board',
        contentType: 'externalUrl',
        encoding: 'text'
      }

      const resource = adapter.createWidgetUIResource(definition, {
        theme: 'dark',
        initialTasks: ['task1', 'task2']
      })

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/kanban-board',
          mimeType: 'text/uri-list',
          text: 'http://localhost:3000/mcp-use/widgets/kanban-board?theme=dark&initialTasks=%5B%22task1%22%2C%22task2%22%5D'
        }
      })
    })

    it('should create external URL resource with blob encoding', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'chart-widget',
        widget: 'chart',
        contentType: 'externalUrl',
        encoding: 'blob'
      }

      const resource = adapter.createWidgetUIResource(definition, {
        data: [1, 2, 3]
      })

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/chart-widget',
          mimeType: 'text/uri-list',
          // Base64 encoded URL
          blob: expect.stringMatching(/^[A-Za-z0-9+/=]+$/)
        }
      })

      // Decode and verify the blob content
      const decodedUrl = Buffer.from(resource.resource.blob!, 'base64').toString()
      expect(decodedUrl).toBe('http://localhost:3000/mcp-use/widgets/chart?data=%5B1%2C2%2C3%5D')
    })

    it('should handle complex object parameters', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'dashboard',
        widget: 'dashboard',
        contentType: 'externalUrl'
      }

      const resource = adapter.createWidgetUIResource(definition, {
        config: {
          layout: 'grid',
          columns: 3,
          widgets: ['chart', 'table', 'metrics']
        }
      })

      expect(resource.resource.text).toContain('config=%7B%22layout%22%3A%22grid%22')
    })

    it('should default to externalUrl with text encoding', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'todo-list',
        widget: 'todo-list'
        // No contentType or encoding specified
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/todo-list',
          mimeType: 'text/uri-list',
          text: 'http://localhost:3000/mcp-use/widgets/todo-list'
        }
      })
    })
  })

  describe('Raw HTML Resources', () => {
    it('should create raw HTML resource with text encoding', () => {
      const htmlContent = '<div><h1>Hello World</h1></div>'
      const definition: ExtendedUIResourceDefinition = {
        name: 'static-widget',
        widget: 'static',
        contentType: 'rawHtml',
        encoding: 'text',
        htmlContent
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/static-widget',
          mimeType: 'text/html',
          text: htmlContent
        }
      })
    })

    it('should create raw HTML resource with blob encoding', () => {
      const htmlContent = '<h1>Complex HTML</h1><script>console.log("test")</script>'
      const definition: ExtendedUIResourceDefinition = {
        name: 'complex-widget',
        widget: 'complex',
        contentType: 'rawHtml',
        encoding: 'blob',
        htmlContent
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/complex-widget',
          mimeType: 'text/html',
          blob: Buffer.from(htmlContent).toString('base64')
        }
      })
    })

    it('should throw error if HTML content is missing', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'broken-widget',
        widget: 'broken',
        contentType: 'rawHtml'
        // Missing htmlContent
      }

      expect(() => adapter.createWidgetUIResource(definition, {})).toThrow(
        'HTML content required for rawHtml type in widget broken-widget'
      )
    })

    it('should generate HTML content with widget metadata', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'generated-widget',
        widget: 'generated',
        title: 'Generated Widget',
        description: 'A dynamically generated widget',
        size: ['800px', '600px']
      }

      const html = adapter.generateWidgetHtml(definition, {
        value: 42,
        items: ['a', 'b', 'c']
      })

      expect(html).toContain('Generated Widget')
      expect(html).toContain('A dynamically generated widget')
      expect(html).toContain('width: 800px')
      expect(html).toContain('height: 600px')
      expect(html).toContain('"value":42')
      expect(html).toContain('"items":["a","b","c"]')
    })
  })

  describe('Remote DOM Resources', () => {
    it('should create remote DOM resource with React framework', () => {
      const script = `
        const button = document.createElement('ui-button');
        button.setAttribute('label', 'Click me');
        root.appendChild(button);
      `
      const definition: ExtendedUIResourceDefinition = {
        name: 'remote-button',
        widget: 'button',
        contentType: 'remoteDom',
        encoding: 'text',
        remoteDomScript: script,
        remoteDomFramework: 'react'
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/remote-button',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
          text: script
        }
      })
    })

    it('should create remote DOM resource with webcomponents framework', () => {
      const script = `
        class MyComponent extends HTMLElement {
          connectedCallback() {
            this.innerHTML = '<h1>Web Component</h1>';
          }
        }
        customElements.define('my-component', MyComponent);
      `
      const definition: ExtendedUIResourceDefinition = {
        name: 'web-component',
        widget: 'component',
        contentType: 'remoteDom',
        remoteDomScript: script,
        remoteDomFramework: 'webcomponents'
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/web-component',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents',
          text: script
        }
      })
    })

    it('should create remote DOM resource with blob encoding', () => {
      const script = 'root.appendChild(document.createElement("div"));'
      const definition: ExtendedUIResourceDefinition = {
        name: 'blob-dom',
        widget: 'blob-dom',
        contentType: 'remoteDom',
        encoding: 'blob',
        remoteDomScript: script
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://widget/blob-dom',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
          blob: Buffer.from(script).toString('base64')
        }
      })
    })

    it('should throw error if script is missing', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'no-script',
        widget: 'no-script',
        contentType: 'remoteDom'
        // Missing remoteDomScript
      }

      expect(() => adapter.createWidgetUIResource(definition, {})).toThrow(
        'Remote DOM script required for remoteDom type in widget no-script'
      )
    })

    it('should generate remote DOM script with widget metadata', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'interactive-widget',
        widget: 'interactive',
        title: 'Interactive Widget',
        description: 'An interactive remote DOM widget'
      }

      const script = adapter.generateRemoteDomScript(definition, {
        enabled: true,
        count: 5
      })

      expect(script).toContain('Interactive Widget')
      expect(script).toContain('An interactive remote DOM widget')
      expect(script).toContain('"enabled":true')
      expect(script).toContain('"count":5')
      expect(script).toContain('ui_interactive')
      expect(script).toContain('ui-button')
    })

    it('should default to React framework if not specified', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'default-framework',
        widget: 'default',
        contentType: 'remoteDom',
        remoteDomScript: 'const div = document.createElement("div");'
        // No remoteDomFramework specified
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource.resource.mimeType).toContain('framework=react')
    })
  })

  describe('Direct Method Calls', () => {
    it('should create external URL resource directly', () => {
      const resource = adapter.createExternalUrlResource(
        'ui://dashboard/main',
        'https://my.analytics.com/dashboard/123',
        'text'
      )

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://dashboard/main',
          mimeType: 'text/uri-list',
          text: 'https://my.analytics.com/dashboard/123'
        }
      })
    })

    it('should create raw HTML resource directly', () => {
      const resource = adapter.createRawHtmlResource(
        'ui://content/page',
        '<p>Hello World</p>',
        'text'
      )

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://content/page',
          mimeType: 'text/html',
          text: '<p>Hello World</p>'
        }
      })
    })

    it('should create remote DOM resource directly', () => {
      const resource = adapter.createRemoteDomResource(
        'ui://component/button',
        'const btn = document.createElement("button");',
        'webcomponents',
        'text'
      )

      expect(resource).toEqual({
        type: 'resource',
        resource: {
          uri: 'ui://component/button',
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents',
          text: 'const btn = document.createElement("button");'
        }
      })
    })
  })

  describe('URL Building', () => {
    it('should handle null and undefined values in parameters', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'test-widget',
        widget: 'test'
      }

      const resource = adapter.createWidgetUIResource(definition, {
        valid: 'value',
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        falseBool: false
      })

      const url = resource.resource.text
      expect(url).toContain('valid=value')
      expect(url).not.toContain('nullValue')
      expect(url).not.toContain('undefinedValue')
      expect(url).toContain('emptyString=')
      expect(url).toContain('zero=0')
      expect(url).toContain('falseBool=false')
    })

    it('should JSON stringify complex objects in URL parameters', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: 'complex-params',
        widget: 'complex'
      }

      const resource = adapter.createWidgetUIResource(definition, {
        nested: {
          array: [1, 2, { key: 'value' }],
          bool: true,
          number: 42
        }
      })

      const url = resource.resource.text
      expect(url).toContain('nested=%7B%22array')

      // Decode and verify the parameter
      expect(url).toBeDefined()
      const urlObj = new URL(url!)
      const nestedParam = urlObj.searchParams.get('nested')
      expect(nestedParam).toBeDefined()
      const parsed = JSON.parse(nestedParam!)
      expect(parsed).toEqual({
        array: [1, 2, { key: 'value' }],
        bool: true,
        number: 42
      })
    })
  })

  describe('Error Handling', () => {
    it('should throw error for unknown content type', () => {
      const definition: any = {
        name: 'unknown',
        widget: 'unknown',
        contentType: 'invalid-type'
      }

      expect(() => adapter.createWidgetUIResource(definition, {})).toThrow(
        'Unknown content type: invalid-type'
      )
    })

    it('should handle empty widget name', () => {
      const definition: ExtendedUIResourceDefinition = {
        name: '',
        widget: ''
      }

      const resource = adapter.createWidgetUIResource(definition, {})

      expect(resource.resource.uri).toBe('ui://widget/')
      expect(resource.resource.text).toBe('http://localhost:3000/mcp-use/widgets/')
    })
  })
})