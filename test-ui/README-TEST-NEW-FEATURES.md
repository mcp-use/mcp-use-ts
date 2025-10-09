# Testing New MCP-UI Features

This test file (`server-test-new-features.ts`) demonstrates all the new UI resource features added to the mcp-use library.

## Running the Test

```bash
# Install dependencies (if not already done)
npm install

# Build the widgets
npm run build

# Run the test server
npx tsx src/server-test-new-features.ts
```

## Features Being Tested

### 1. **Basic uiResource (No Inputs)**
- **Name**: `simple-dashboard`
- **Test**: Creates a UI resource without any parameters
- **Usage**: The tool `show-simple-dashboard` will be auto-generated
- **Expected**: Should serve the widget at `/mcp-use/widgets/data-visualization`

### 2. **uiResource with Validated Inputs**
- **Name**: `kanban-board`
- **Test**: Validates array and number inputs
- **Usage**: Call `show-kanban-board` with:
  ```json
  {
    "tasks": "[{\"id\":1,\"title\":\"Test\"}]",
    "columns": "[\"todo\",\"done\"]",
    "maxTasksPerColumn": "5"
  }
  ```
- **Expected**: Parameters are validated and converted to proper types

### 3. **uiResource with Custom Handler**
- **Name**: `todo-list-advanced`
- **Test**: Complex filtering and sorting with custom logic
- **Usage**: Call `show-todo-list-advanced` with:
  ```json
  {
    "todos": "[{\"title\":\"Task 1\",\"priority\":\"high\",\"completed\":false}]",
    "filter": "high-priority",
    "sortBy": "priority",
    "showCompleted": "false"
  }
  ```
- **Expected**: Custom handler processes params and returns filtered/sorted results

### 4. **Raw HTML UI Resource**
- **Name**: `custom-html-widget`
- **Test**: Generates custom HTML instead of using iframes
- **Usage**: Call `show-custom-html-widget` with:
  ```json
  {
    "title": "My Custom Widget",
    "data": "{\"key\":\"value\"}"
  }
  ```
- **Expected**: Returns HTML content directly, not an iframe URL

### 5. **Multi-Widget Dashboard Tool**
- **Name**: `create-multi-widget-dashboard`
- **Test**: Creates complex dashboards with proper MCP-UI format
- **Usage**:
  ```json
  {
    "widgets": "[{\"title\":\"Widget 1\",\"type\":\"iframe\",\"name\":\"kanban-board\"}]",
    "layout": "grid"
  }
  ```
- **Expected**: Returns both text and properly formatted UI resource

### 6. **Parameter Validation Tool**
- **Name**: `test-parameter-validation`
- **Test**: Validates all parameter types
- **Usage**:
  ```json
  {
    "stringParam": "test",
    "numberParam": "123",
    "booleanParam": "true",
    "arrayParam": "[1,2,3]",
    "objectParam": "{\"key\":\"value\"}"
  }
  ```
- **Expected**: All params converted to correct types

## Testing with MCP Inspector

1. Start the test server:
   ```bash
   npx tsx src/server-test-new-features.ts
   ```

2. Connect via MCP Inspector to `http://localhost:3000/mcp`

3. Test each tool/resource to verify:
   - ✅ Parameters are validated correctly
   - ✅ Invalid parameters show clear error messages
   - ✅ UI resources return proper MCP-UI format
   - ✅ Text content is returned when `returnTextContent: true`
   - ✅ Custom handlers work as expected
   - ✅ Raw HTML content is properly formatted

## Expected MCP-UI Resource Format

When a tool returns a UI resource, it should have this structure:
```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "ui://widget/name",
        "text": "{\"encodedContent\":\"...\",\"encoding\":\"text\"}",
        "mimeType": "application/vnd.mcp-ui.resource"
      }
    }
  ]
}
```

## Validation Examples

### Valid Input
```json
{
  "tasks": "[{\"id\":1}]",  // String -> Array ✅
  "maxTasks": "10"           // String -> Number ✅
}
```

### Invalid Input (Will Error)
```json
{
  "tasks": "not-json",       // Invalid JSON ❌
  "maxTasks": "not-a-number" // Invalid Number ❌
}
```

## Key Improvements Over Original

1. **Type Safety**: Parameters are validated against their definitions
2. **Automatic Conversion**: String inputs converted to proper types
3. **Error Messages**: Clear errors for invalid inputs
4. **MCP-UI Compliance**: Follows official spec from mcpui.dev
5. **Flexible Content**: Supports iframes, raw HTML, and custom scripts
6. **Hybrid Responses**: Can return both text and UI resources

## Troubleshooting

- If widgets don't load, ensure `npm run build` was run first
- Check that PORT 3000 is available
- Verify @mcp-ui/server is installed: `npm ls @mcp-ui/server`
- Check browser console for CORS issues if testing from external client