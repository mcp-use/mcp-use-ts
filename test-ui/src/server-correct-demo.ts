import { createMCPServer } from 'mcp-use'
import { createUIResource } from '@mcp-ui/server'

// Create an MCP server with correct UI resource implementation
const server = createMCPServer('correct-demo-server', {
  version: '1.0.0',
  description: 'Demonstrates correct MCP-UI implementation',
})

const PORT = process.env.PORT || 3000

// ===== CORRECT: Simple UI Resource =====
server.uiResource({
  name: 'simple-widget',
  description: 'A simple widget without parameters',
})

// ===== CORRECT: UI Resource with Validated Inputs =====
server.uiResource({
  name: 'validated-widget',
  description: 'Widget with automatic parameter validation',
  inputs: [
    {
      name: 'items',
      type: 'array',
      description: 'Array of items',
      required: false,
      default: []
    },
    {
      name: 'count',
      type: 'number',
      description: 'Number of items to display',
      required: false,
      default: 10
    }
  ],
  returnTextContent: true,
})

// ===== CORRECT: Traditional MCP Resource =====
server.resource({
  uri: 'demo://status',
  name: 'Server Status',
  description: 'Server status information',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      server: 'correct-demo-server',
      status: 'running',
      port: PORT,
      timestamp: new Date().toISOString()
    }, null, 2)
  }
})

// ===== CORRECT: Tool that returns text (not resource) =====
server.tool({
  name: 'create-ui-element',
  description: 'Creates a UI element and returns its information',
  inputs: [
    {
      name: 'type',
      type: 'string',
      description: 'Type of UI element',
      required: true,
    }
  ],
  fn: async (params) => {
    // Create UI resource using @mcp-ui/server
    const uiResource = createUIResource({
      uri: `ui://element/${params.type}`,
      content: {
        type: 'externalUrl',
        iframeUrl: `http://localhost:${PORT}/mcp-use/widgets/${params.type}`
      },
      encoding: 'text'
    })

    // CORRECT: Return as text content, not resource
    return {
      content: [
        {
          type: 'text',
          text: `Created ${params.type} UI element\nResource data: ${JSON.stringify(uiResource)}`
        }
      ]
    }
  }
})

// ===== CORRECT: Tool that generates HTML =====
server.tool({
  name: 'generate-html-view',
  description: 'Generates an HTML view',
  inputs: [
    {
      name: 'title',
      type: 'string',
      required: true,
    }
  ],
  fn: async (params) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${params.title}</title>
    <style>
        body {
            font-family: system-ui;
            padding: 40px;
            background: linear-gradient(135deg, #42e695 0%, #3bb2b8 100%);
            color: white;
        }
        h1 { margin: 0 0 20px 0; }
    </style>
</head>
<body>
    <h1>${params.title}</h1>
    <p>This is a correctly generated HTML view.</p>
    <p>Generated at: ${new Date().toLocaleString()}</p>
</body>
</html>`

    // Create UI resource with rawHtml type
    const uiResource = createUIResource({
      uri: 'ui://view/generated',
      content: {
        type: 'rawHtml',  // CORRECT: Use 'rawHtml'
        htmlString: html   // CORRECT: Use 'htmlString'
      },
      encoding: 'text'
    })

    // CORRECT: Return as text
    return {
      content: [
        {
          type: 'text',
          text: `Generated HTML view: ${params.title}\nUI Resource: ${JSON.stringify(uiResource)}`
        }
      ]
    }
  }
})

console.log('✅ Starting Correct Demo Server...')
console.log('📋 This server demonstrates the CORRECT implementation')
console.log('')
console.log('Key Points:')
console.log('  1. Resources use text/plain MIME type')
console.log('  2. Tools return text content, not resource type')
console.log('  3. UI resources use rawHtml with htmlString')
console.log('  4. Parameters are validated automatically')
console.log('  5. uiResource() method simplifies implementation')
console.log('')
console.log(`📡 Server running at http://localhost:${PORT}`)
console.log(`🔌 Connect to MCP at http://localhost:${PORT}/mcp`)
console.log('')
console.log('Test Commands:')
console.log('  - Call "show-simple-widget" (no params needed)')
console.log('  - Call "show-validated-widget" with items as JSON string')
console.log('  - Call "create-ui-element" with type parameter')
console.log('  - Call "generate-html-view" with title parameter')

// Start server
server.listen(PORT)