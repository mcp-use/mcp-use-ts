---
'create-mcp-use-app': patch
'mcp-use': patch
---

Add MCP-UI Resource Integration

Add uiResource() method to McpServer for unified widget registration with MCP-UI compatibility.

- Support three resource types: externalUrl (iframe), rawHtml (direct), remoteDom (scripted)
- Automatic tool and resource generation with ui\_ prefix and ui://widget/ URIs
- Props-to-parameters conversion with type safety
- New uiresource template with examples
- Inspector integration for UI resource rendering
- Add @mcp-ui/server dependency
- Complete test coverage
