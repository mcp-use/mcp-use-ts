# MCP Inspector

A web-based interface for connecting to and managing MCP (Model Context Protocol) servers using the `useMcp` React hook.

## Features

- **Server Management**: Add, connect to, and manage multiple MCP servers simultaneously
- **Real-time Connection Status**: See live connection states and errors
- **OAuth Authentication**: Automatic OAuth flow handling with popup support
- **Tool Execution**: Inspect and execute MCP tools directly from the UI
- **Resource & Prompt Browsing**: View available resources and prompts from connected servers
- **Browser-Compatible**: Works entirely in the browser using the `useMcp` React hook
- **Multiple Connection Types**: Support for HTTP/SSE and WebSocket connections
- **Persistent Storage**: Connections are saved to localStorage and automatically reconnect

## Usage

### Adding a New Server

1. Go to the main dashboard
2. In the "Add New MCP Server" section:
   - **Server Name** (optional): A friendly name for your server
   - **Server URL**: The URL to connect to (e.g., `https://mcp.linear.app/sse`)
3. Click "Connect" to add the server
4. The server will automatically attempt to connect

### Server States

The inspector displays various connection states:

- **discovering**: Finding the server
- **connecting**: Establishing connection
- **authenticating**: Going through OAuth flow (if required)
- **loading**: Loading tools, resources, and prompts
- **ready**: Connected and ready to use
- **failed**: Connection failed (with retry option)
- **pending_auth**: Waiting for OAuth authentication

### Authentication

For servers requiring OAuth (like Linear):

1. Click the "Authenticate" button when prompted
2. Complete the OAuth flow in the popup window
3. If the popup is blocked, click the "open auth page" link to authenticate manually
4. Once authenticated, the connection will automatically complete

### Inspecting a Server

1. Click the "Inspect" button on any connected server
2. View all available tools, resources, and prompts
3. Execute tools by clicking "Execute" and providing JSON input
4. Copy resource URIs to clipboard
5. View detailed schema information for each tool

## Example Server Configurations

### Linear MCP Server

For connecting to Linear's official MCP server:

- **Server Name**: Linear
- **Server URL**: `https://mcp.linear.app/sse`

This server requires OAuth authentication and provides tools for managing Linear issues, projects, teams, and more.

### Local Development Server

For local development using HTTP/SSE:

- **Server Name**: Local Dev
- **Server URL**: `http://localhost:3000/sse`

### WebSocket Server

For WebSocket-based servers:

- **Server Name**: WebSocket Server
- **Server URL**: `ws://localhost:8080`

## Technical Details

The inspector is built using:

- **React**: UI framework
- **useMcp Hook**: From `mcp-use/react` for managing MCP connections
- **React Router**: For navigation between dashboard and server detail views
- **Tailwind CSS**: For styling
- **shadcn/ui**: UI component library

### Architecture

- **McpContext**: Context provider that manages multiple MCP connections using `useMcp` hooks
- **InspectorDashboard**: Main dashboard showing all connections and stats
- **ServerList**: List view of all servers with detailed information
- **ServerDetail**: Detailed view of a single server with tool execution capabilities

The `useMcp` hook automatically handles:

- Connection lifecycle management
- OAuth authentication flows
- Tool, resource, and prompt discovery
- Error handling and retry logic
- Session persistence via localStorage

## Development

To run the inspector in development mode:

```bash
cd packages/inspector
yarn install
yarn dev
```

The inspector will be available at `http://localhost:5173`.

### Project Structure

```
src/
├── client/
│   ├── components/
│   │   ├── InspectorDashboard.tsx  # Main dashboard
│   │   ├── ServerList.tsx          # Server list view
│   │   ├── ServerDetail.tsx        # Server detail view
│   │   └── Layout.tsx              # App layout
│   ├── context/
│   │   └── McpContext.tsx          # MCP connection context
│   ├── App.tsx                     # Root app component
│   └── main.tsx                    # Entry point
└── components/
    └── ui/                         # shadcn/ui components
```

## Building

To build the inspector for production:

```bash
yarn build
```

The built files will be in the `dist/` directory.
