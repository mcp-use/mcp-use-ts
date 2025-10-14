import { createMCPServer } from 'mcp-use/server'
import type {
  ExternalUrlUIResource,
  RawHtmlUIResource,
  RemoteDomUIResource
} from 'mcp-use/server'

// Create an MCP server with UIResource support
const server = createMCPServer('uiresource-mcp-server', {
  version: '1.0.0',
  description: 'MCP server demonstrating all UIResource types',
})

const PORT = process.env.PORT || 3000

/**
 * ════════════════════════════════════════════════════════════════════
 * Type 1: External URL (Iframe Widget)
 * ════════════════════════════════════════════════════════════════════
 *
 * Serves a widget from your local filesystem via iframe.
 * Best for: Complex interactive widgets with their own assets
 *
 * This automatically:
 * 1. Creates a tool (ui_kanban-board) that accepts parameters
 * 2. Creates a resource (ui://widget/kanban-board) for static access
 * 3. Serves the widget from dist/resources/mcp-use/widgets/kanban-board/
 */
server.uiResource({
  type: 'externalUrl',
  name: 'kanban-board',
  widget: 'kanban-board',
  title: 'Kanban Board',
  description: 'Interactive task management board with drag-and-drop support',
  props: {
    initialTasks: {
      type: 'array',
      description: 'Initial tasks to display on the board',
      required: false,
    },
    theme: {
      type: 'string',
      description: 'Visual theme for the board (light/dark)',
      required: false,
      default: 'light'
    },
    columns: {
      type: 'array',
      description: 'Column configuration for the board',
      required: false,
    }
  }
} satisfies ExternalUrlUIResource)

/**
 * ════════════════════════════════════════════════════════════════════
 * Type 2: Raw HTML
 * ════════════════════════════════════════════════════════════════════
 *
 * Renders HTML content directly without an iframe.
 * Best for: Simple visualizations, status displays, formatted text
 *
 * This creates:
 * - Tool: ui_welcome-card
 * - Resource: ui://widget/welcome-card
 */
server.uiResource({
  type: 'rawHtml',
  name: 'welcome-card',
  title: 'Welcome Message',
  description: 'A welcoming card with server information',
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        h1 {
          margin: 0 0 10px 0;
          font-size: 2em;
        }
        p {
          margin: 10px 0;
          opacity: 0.9;
        }
        .stats {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        .stat {
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 8px;
          flex: 1;
        }
        .stat-value {
          font-size: 1.5em;
          font-weight: bold;
        }
        .stat-label {
          font-size: 0.9em;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🎉 Welcome to MCP-UI</h1>
        <p>Your server is running and ready to serve interactive widgets!</p>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">3</div>
            <div class="stat-label">Widget Types</div>
          </div>
          <div class="stat">
            <div class="stat-value">∞</div>
            <div class="stat-label">Possibilities</div>
          </div>
          <div class="stat">
            <div class="stat-value">⚡</div>
            <div class="stat-label">Fast & Simple</div>
          </div>
        </div>

        <p style="margin-top: 20px; font-size: 0.9em;">
          Server: <strong>uiresource-mcp-server v1.0.0</strong><br>
          Port: <strong>${PORT}</strong>
        </p>
      </div>
    </body>
    </html>
  `,
  encoding: 'text',
  size: ['600px', '400px']
} satisfies RawHtmlUIResource)

/**
 * ════════════════════════════════════════════════════════════════════
 * Type 3: Remote DOM (React Components)
 * ════════════════════════════════════════════════════════════════════
 *
 * Uses Remote DOM to render interactive components.
 * Best for: Lightweight interactive UIs using MCP-UI React components
 *
 * This creates:
 * - Tool: ui_quick-poll
 * - Resource: ui://widget/quick-poll
 */
server.uiResource({
  type: 'remoteDom',
  name: 'quick-poll',
  title: 'Quick Poll',
  description: 'Create instant polls with interactive voting',
  script: `
// Remote DOM script for quick-poll widget
// Note: Remote DOM only supports registered MCP-UI components like ui-stack, ui-text, ui-button
// Standard HTML elements (div, h2, p, etc.) are NOT available

// Get props (passed from tool parameters)
const props = ${JSON.stringify({ question: 'What is your favorite framework?', options: ['React', 'Vue', 'Svelte', 'Angular'] })};

// Create main container stack (vertical layout)
const container = document.createElement('ui-stack');
container.setAttribute('direction', 'column');
container.setAttribute('spacing', 'medium');
container.setAttribute('padding', 'large');

// Title text
const title = document.createElement('ui-text');
title.setAttribute('size', 'xlarge');
title.setAttribute('weight', 'bold');
title.textContent = '📊 Quick Poll';
container.appendChild(title);

// Description text
const description = document.createElement('ui-text');
description.textContent = 'Cast your vote below!';
container.appendChild(description);

// Question text
const questionText = document.createElement('ui-text');
questionText.setAttribute('size', 'large');
questionText.setAttribute('weight', 'semibold');
questionText.textContent = props.question || 'What is your preference?';
container.appendChild(questionText);

// Button stack (horizontal layout)
const buttonStack = document.createElement('ui-stack');
buttonStack.setAttribute('direction', 'row');
buttonStack.setAttribute('spacing', 'small');
buttonStack.setAttribute('wrap', 'true');

// Create vote tracking
const votes = {};
let feedbackText = null;

// Create buttons for each option
const options = props.options || ['Option 1', 'Option 2', 'Option 3'];
options.forEach((option) => {
  const button = document.createElement('ui-button');
  button.setAttribute('label', option);
  button.setAttribute('variant', 'secondary');

  button.addEventListener('press', () => {
    // Record vote
    votes[option] = (votes[option] || 0) + 1;

    // Send vote to parent (for tracking)
    window.parent.postMessage({
      type: 'tool',
      payload: {
        toolName: 'record_vote',
        params: {
          question: props.question,
          selected: option,
          votes: votes
        }
      }
    }, '*');

    // Update or create feedback text
    if (feedbackText) {
      feedbackText.textContent = \`✓ Voted for \${option}! (Total votes: \${votes[option]})\`;
    } else {
      feedbackText = document.createElement('ui-text');
      feedbackText.setAttribute('emphasis', 'high');
      feedbackText.textContent = \`✓ Voted for \${option}!\`;
      container.appendChild(feedbackText);
    }
  });

  buttonStack.appendChild(button);
});

container.appendChild(buttonStack);

// Results section
const resultsTitle = document.createElement('ui-text');
resultsTitle.setAttribute('size', 'medium');
resultsTitle.setAttribute('weight', 'semibold');
resultsTitle.textContent = 'Vote to see results!';
container.appendChild(resultsTitle);

// Append to root
root.appendChild(container);
  `,
  framework: 'react',
  encoding: 'text',
  size: ['500px', '450px'],
  props: {
    question: {
      type: 'string',
      description: 'The poll question',
      default: 'What is your favorite framework?'
    },
    options: {
      type: 'array',
      description: 'Poll options',
      default: ['React', 'Vue', 'Svelte']
    }
  }
} satisfies RemoteDomUIResource)

/**
 * ════════════════════════════════════════════════════════════════════
 * Traditional MCP Tools and Resources
 * ════════════════════════════════════════════════════════════════════
 *
 * You can mix UIResources with traditional MCP tools and resources
 */

server.tool({
  name: 'get-widget-info',
  description: 'Get information about available UI widgets',
  fn: async () => {
    const widgets = [
      {
        name: 'kanban-board',
        type: 'externalUrl',
        tool: 'ui_kanban-board',
        resource: 'ui://widget/kanban-board',
        url: `http://localhost:${PORT}/mcp-use/widgets/kanban-board`
      },
      {
        name: 'welcome-card',
        type: 'rawHtml',
        tool: 'ui_welcome-card',
        resource: 'ui://widget/welcome-card'
      },
      {
        name: 'quick-poll',
        type: 'remoteDom',
        tool: 'ui_quick-poll',
        resource: 'ui://widget/quick-poll'
      }
    ]

    return {
      content: [{
        type: 'text',
        text: `Available UI Widgets:\n\n${widgets.map(w =>
          `📦 ${w.name} (${w.type})\n` +
          `  Tool: ${w.tool}\n` +
          `  Resource: ${w.resource}\n` +
          (w.url ? `  Browser: ${w.url}\n` : '')
        ).join('\n')}\n` +
        `\nTypes Explained:\n` +
        `• externalUrl: Iframe widget from filesystem\n` +
        `• rawHtml: Direct HTML rendering\n` +
        `• remoteDom: React/Web Components scripting`
      }]
    }
  }
})

server.resource({
  name: 'server-config',
  uri: 'config://server',
  title: 'Server Configuration',
  description: 'Current server configuration and status',
  mimeType: 'application/json',
  fn: async () => ({
    contents: [{
      uri: 'config://server',
      mimeType: 'application/json',
      text: JSON.stringify({
        port: PORT,
        version: '1.0.0',
        widgets: {
          total: 3,
          types: {
            externalUrl: ['kanban-board'],
            rawHtml: ['welcome-card'],
            remoteDom: ['quick-poll']
          },
          baseUrl: `http://localhost:${PORT}/mcp-use/widgets/`
        },
        endpoints: {
          mcp: `http://localhost:${PORT}/mcp`,
          inspector: `http://localhost:${PORT}/inspector`,
          widgets: `http://localhost:${PORT}/mcp-use/widgets/`
        }
      }, null, 2)
    }]
  })
})

// Start the server
server.listen(PORT)

// Display helpful startup message
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            🎨 UIResource MCP Server (All Types)                ║
╚═══════════════════════════════════════════════════════════════╝

Server is running on port ${PORT}

📍 Endpoints:
   MCP Protocol:  http://localhost:${PORT}/mcp
   Inspector UI:  http://localhost:${PORT}/inspector
   Widgets Base:  http://localhost:${PORT}/mcp-use/widgets/

🎯 Available UIResources (3 types demonstrated):

   1️⃣  External URL Widget (Iframe)
   • kanban-board
     Tool:      ui_kanban-board
     Resource:  ui://widget/kanban-board
     Browser:   http://localhost:${PORT}/mcp-use/widgets/kanban-board

   2️⃣  Raw HTML Widget (Direct Rendering)
   • welcome-card
     Tool:      ui_welcome-card
     Resource:  ui://widget/welcome-card

   3️⃣  Remote DOM Widget (React Components)
   • quick-poll
     Tool:      ui_quick-poll
     Resource:  ui://widget/quick-poll

📝 Usage Examples:

   // External URL - Call with dynamic parameters
   await client.callTool('ui_kanban-board', {
     initialTasks: [{id: 1, title: 'Task 1'}],
     theme: 'dark'
   })

   // Raw HTML - Access as resource
   await client.readResource('ui://widget/welcome-card')

   // Remote DOM - Interactive component
   await client.callTool('ui_quick-poll', {
     question: 'Favorite color?',
     options: ['Red', 'Blue', 'Green']
   })

💡 Tip: Open the Inspector UI to test all widget types interactively!
`)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...')
  process.exit(0)
})

export default server
