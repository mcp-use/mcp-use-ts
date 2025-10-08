# MCP Inspector

A web-based interface for connecting to and managing MCP (Model Context Protocol) servers.

## Features

- **Server Management**: Add, connect to, and manage MCP servers
- **Real-time Connection**: Test connections before adding servers
- **Browser-Compatible**: Works entirely in the browser using the MCP client
- **Multiple Connection Types**: Support for HTTP/SSE and WebSocket connections

## Usage

### Adding a New Server

1. Click the server selection dropdown in the top-left corner
2. Click "Add Server" button
3. Fill in the server details:
   - **Server Name**: A friendly name for your server
   - **Connection Type**: Choose between HTTP/SSE or WebSocket
   - **Server URL**: The URL to connect to (e.g., `http://localhost:3000` or `ws://localhost:3000`)
   - **Description** (optional): Brief description of the server
4. Click "Add Server" to test the connection and add the server

### Connecting to Servers

1. Select a server from the dropdown
2. The system will automatically attempt to connect
3. Once connected, you'll see a "Connected" badge

## Example Server Configurations

### Linear Server

For connecting to a Linear MCP server:

- **Server Name**: Linear
- **Connection Type**: HTTP/SSE
- **Server URL**: `https://your-linear-mcp-server.com`
- **Description**: Linear project management integration

### Local Development Server

For local development:

- **Server Name**: Local Dev
- **Connection Type**: HTTP/SSE
- **Server URL**: `http://localhost:3000`
- **Description**: Local development server

### WebSocket Server

For WebSocket-based servers:

- **Server Name**: WebSocket Server
- **Connection Type**: WebSocket
- **Server URL**: `ws://localhost:8080`
- **Description**: WebSocket-based MCP server

## Technical Details

The inspector uses the browser-compatible MCP client from `mcp-use/browser`, which supports:

- HTTP/SSE connections
- WebSocket connections
- OAuth authentication (when configured)

The client automatically handles:

- Connection testing before adding servers
- Session management
- Error handling and reporting

## Development

To run the inspector in development mode:

```bash
cd inspector
yarn install
yarn dev
```

The inspector will be available at `http://localhost:5173`.
