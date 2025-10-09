# MCP-UI Format Guide - Important Notes

## Key Fixes Applied

### 1. **Resource MIME Type**
- ❌ **Wrong**: `application/vnd.mcp-ui.resource`
- ✅ **Correct**: `text/plain` for resources containing UI resource JSON

The MCP SDK doesn't recognize custom MIME types like `application/vnd.mcp-ui.resource`. Resources should use standard MIME types.

### 2. **Tool Return Format**
Tools in MCP cannot return `resource` type in their content array. They can only return:
- `text`
- `image`
- `audio`

❌ **Wrong**:
```javascript
return {
  content: [
    { type: 'resource', resource: {...} }
  ]
}
```

✅ **Correct**:
```javascript
return {
  content: [
    { type: 'text', text: 'Result text with UI resource info' }
  ]
}
```

### 3. **MCP-UI Content Types**
When using `@mcp-ui/server`, the content types are:
- `externalUrl` - for iframe URLs
- `rawHtml` - for HTML content (not `html`)
- `remoteDom` - for dynamic scripts

❌ **Wrong**:
```javascript
content: {
  type: 'html',
  html: '<div>...</div>'
}
```

✅ **Correct**:
```javascript
content: {
  type: 'rawHtml',
  htmlString: '<div>...</div>'
}
```

## Proper Implementation Pattern

### For Resources (that clients can read)
```javascript
server.resource({
  uri: 'ui://widget/name',
  fn: async () => {
    const uiResource = createUIResource({
      uri: 'ui://widget/name',
      content: { type: 'externalUrl', iframeUrl: '...' },
      encoding: 'text'
    })

    return {
      contents: [{
        uri: 'ui://widget/name',
        mimeType: 'text/plain',
        text: JSON.stringify(uiResource)
      }]
    }
  }
})
```

### For Tools (that perform actions)
```javascript
server.tool({
  name: 'show-widget',
  fn: async (params) => {
    const uiResource = createUIResource({
      uri: 'ui://widget/name',
      content: { type: 'externalUrl', iframeUrl: '...' },
      encoding: 'text'
    })

    // Tools return text, not resources
    return {
      content: [{
        type: 'text',
        text: `Created widget\nUI Resource: ${JSON.stringify(uiResource)}`
      }]
    }
  }
})
```

### Using uiResource Method (Simplified)
```javascript
server.uiResource({
  name: 'widget-name',
  inputs: [
    { name: 'data', type: 'array', required: false }
  ],
  returnTextContent: true  // Returns text with UI resource info
})
// This automatically creates both resource and tool with proper validation
```

## Testing Checklist

When testing with MCP Inspector or other clients:

1. **Resources** should be readable at their URIs
2. **Tools** should return text content (may include UI resource JSON)
3. **Parameters** are validated and converted to correct types
4. **Errors** show clear messages for invalid inputs

## Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Unsupported resource type" | Invalid MIME type or content structure | Use `text/plain` MIME type |
| "No overload matches" | Tool returning wrong type | Return `{ content: [{ type: 'text', text: '...' }] }` |
| "Invalid JSON" | Parameter not properly validated | Use the `uiResource` method with proper input types |

## Benefits of This Approach

1. **Standards Compliant**: Follows MCP SDK specifications
2. **Type Safety**: Parameters validated automatically
3. **Clear Errors**: Invalid inputs produce helpful messages
4. **Less Code**: uiResource method reduces boilerplate
5. **Flexible**: Supports custom handlers when needed

## Example: Complete Widget Implementation

```javascript
// Define widget with validation
server.uiResource({
  name: 'my-widget',
  description: 'Interactive widget',
  inputs: [
    { name: 'items', type: 'array', required: false, default: [] },
    { name: 'title', type: 'string', required: true }
  ],
  fn: async (params) => {
    // params.items is already an array, not a string
    // params.title is guaranteed to exist

    const url = `http://localhost:3000/widgets/my-widget?` +
      `items=${encodeURIComponent(JSON.stringify(params.items))}&` +
      `title=${encodeURIComponent(params.title)}`

    return {
      content: {
        type: 'externalUrl',
        iframeUrl: url,
        preferredFrameSize: { width: 800, height: 600 }
      },
      text: `Showing widget with ${params.items.length} items`
    }
  },
  returnTextContent: true
})
```

This creates:
- Resource: `ui://widget/my-widget`
- Tool: `show-my-widget` with automatic validation
- Type conversion: string inputs → proper types
- Error handling: clear messages for invalid inputs