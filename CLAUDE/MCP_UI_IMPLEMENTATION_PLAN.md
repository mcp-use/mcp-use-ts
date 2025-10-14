# MCP-UI Integration Implementation Plan

## Overview
This document outlines the plan to implement MCP-UI integration into the mcp-use library, providing a fancy way to expose UI widgets as MCP resources with automatic discovery, prop extraction, and tool generation.

## Current Architecture Analysis

### Existing Components
1. **Widget Serving**: The `McpServer` class already serves widgets from `/mcp-use/widgets/*` through `setupWidgetRoutes()` method (mcp-server.ts:445-481)
2. **MCP-UI Support**: The `@mcp-ui/server` package provides `createUIResource` function with support for:
   - External URLs with iframe rendering
   - Raw HTML content
   - Remote DOM scripts
3. **Widget Implementation**: Widgets like the kanban-board are React components that can accept props via URL query parameters
4. **Manual Integration**: Currently requires manual creation of both tools and resources for each widget

### Key Opportunities
- **Automatic Widget Discovery**: Scan filesystem for widgets and auto-register them
- **Props Extraction**: Parse TypeScript/React component props to generate tool input schemas
- **Unified Interface**: Create a `uiResource` method that handles both tool and resource registration
- **Dynamic URL Generation**: Automatically construct iframe URLs with query parameters based on tool inputs

## Proposed Architecture

### Core Concepts

#### 1. UIResource Method
A specialized method on the McpServer class that:
- Accepts widget configuration (name, path, props)
- Automatically creates both a tool and a UI resource
- Handles prop-to-query-parameter conversion
- Returns UIResource format compatible with MCP-UI

#### 2. Widget Discovery System
- Scan `dist/resources/mcp-use/widgets/*` directories
- Parse widget manifest files or TypeScript interfaces
- Extract component props and their types
- Generate input schemas automatically

#### 3. Automatic Tool Generation
- Create tools that return both text and UI resources
- Pass tool inputs as query parameters to widget iframes
- Support complex data types through JSON encoding

## Implementation Phases

### Phase 1: Core UIResource Infrastructure

#### 1.1 Create UIResource Type Definitions
**File**: `packages/mcp-use/src/server/types.ts`

```typescript
export interface UIResourceDefinition {
  name: string
  widget: string
  title?: string
  description?: string
  props?: WidgetProps
  size?: [string, string]
  annotations?: ResourceAnnotations
}

export interface WidgetProps {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    default?: any
    description?: string
  }
}

export interface WidgetConfig {
  name: string
  path: string
  manifest?: WidgetManifest
  component?: string
}
```

#### 1.2 Implement uiResource Method
**File**: `packages/mcp-use/src/server/mcp-server.ts`

Add methods to McpServer class:
```typescript
/**
 * Create a UIResource object for a widget with the given parameters
 * This method is shared between tool and resource handlers to avoid duplication
 */
private createWidgetUIResource(
  widget: string,
  params: Record<string, any>,
  size?: [string, string]
): any {
  const iframeUrl = this.buildWidgetUrl(widget, params)

  return createUIResource({
    uri: `ui://widget/${widget}`,
    content: {
      type: 'externalUrl',
      iframeUrl
    },
    encoding: 'text',
    uiMetadata: size ? {
      'preferred-frame-size': size
    } : undefined
  })
}

/**
 * Register a widget as both a tool and a resource
 * The tool allows passing parameters, the resource provides static access
 */
uiResource(definition: UIResourceDefinition): this {
  // Register the tool - returns UIResource with parameters
  this.tool({
    name: `ui_${definition.widget}`,
    description: definition.description || `Display ${definition.widget} widget`,
    inputs: this.convertPropsToInputs(definition.props),
    fn: async (params) => {
      // Create the UIResource with user-provided params
      const uiResource = this.createWidgetUIResource(
        definition.widget,
        params,
        definition.size
      )

      return {
        content: [
          {
            type: 'text',
            text: `Displaying ${definition.title || definition.widget} widget`
          },
          uiResource  // Reuse the same UIResource
        ]
      }
    }
  })

  // Register the resource - returns UIResource with defaults
  this.resource({
    name: definition.name,
    uri: `ui://widget/${definition.widget}`,
    title: definition.title,
    description: definition.description,
    mimeType: 'text/html',
    annotations: definition.annotations,
    fn: async () => {
      // Create the UIResource with default/empty params
      const uiResource = this.createWidgetUIResource(
        definition.widget,
        this.applyDefaultProps(definition.props),
        definition.size
      )

      return {
        contents: [uiResource]  // Return the UIResource directly
      }
    }
  })

  return this
}

/**
 * Apply default values to widget props
 */
private applyDefaultProps(props?: WidgetProps): Record<string, any> {
  if (!props) return {}

  const defaults: Record<string, any> = {}
  for (const [key, prop] of Object.entries(props)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default
    }
  }
  return defaults
}
```

### Phase 2: Widget Discovery System

#### 2.1 Create Widget Discovery Module
**File**: `packages/mcp-use/src/server/widget-discovery.ts`

```typescript
import { readdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface WidgetManifest {
  name: string
  title?: string
  description?: string
  props?: Record<string, PropDefinition>
  size?: [string, string]
}

export class WidgetDiscovery {
  private widgetsPath: string

  constructor(widgetsPath: string) {
    this.widgetsPath = widgetsPath
  }

  async discoverWidgets(): Promise<WidgetConfig[]> {
    const widgets: WidgetConfig[] = []

    if (!existsSync(this.widgetsPath)) {
      return widgets
    }

    const dirs = readdirSync(this.widgetsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())

    for (const dir of dirs) {
      const widgetPath = join(this.widgetsPath, dir.name)
      const manifestPath = join(widgetPath, 'widget.json')

      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        widgets.push({
          name: dir.name,
          path: widgetPath,
          manifest
        })
      } else {
        // Try to auto-detect from index.html or component files
        widgets.push({
          name: dir.name,
          path: widgetPath
        })
      }
    }

    return widgets
  }
}
```

#### 2.2 Add discoverWidgets Method to McpServer
**File**: `packages/mcp-use/src/server/mcp-server.ts`

```typescript
async discoverWidgets(options?: DiscoverWidgetsOptions): Promise<void> {
  const discovery = new WidgetDiscovery(
    options?.path || join(process.cwd(), 'dist/resources/mcp-use/widgets')
  )

  const widgets = await discovery.discoverWidgets()

  for (const widget of widgets) {
    if (widget.manifest) {
      this.uiResource({
        name: widget.name,
        widget: widget.name,
        title: widget.manifest.title,
        description: widget.manifest.description,
        props: widget.manifest.props,
        size: widget.manifest.size
      })
    } else if (options?.autoRegister) {
      // Register with minimal configuration
      this.uiResource({
        name: widget.name,
        widget: widget.name
      })
    }
  }
}
```

### Phase 3: Props and Schema Generation

#### 3.1 Implement Prop Extraction Utilities
**File**: `packages/mcp-use/src/server/widget-props.ts`

```typescript
import * as ts from 'typescript'

export class PropExtractor {
  extractPropsFromFile(filePath: string): WidgetProps {
    const program = ts.createProgram([filePath], {})
    const sourceFile = program.getSourceFile(filePath)

    if (!sourceFile) return {}

    const props: WidgetProps = {}

    // Find interface or type definitions for props
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node) &&
          node.name?.text.includes('Props')) {
        node.members.forEach(member => {
          if (ts.isPropertySignature(member) && member.name) {
            const propName = member.name.getText()
            const propType = this.getTypeString(member.type)
            const isOptional = !!member.questionToken

            props[propName] = {
              type: this.mapTsTypeToSchemaType(propType),
              required: !isOptional
            }
          }
        })
      }
    })

    return props
  }

  private mapTsTypeToSchemaType(tsType: string): string {
    switch (tsType) {
      case 'string': return 'string'
      case 'number': return 'number'
      case 'boolean': return 'boolean'
      case 'any[]':
      case 'Array': return 'array'
      default: return 'object'
    }
  }
}
```

#### 3.2 Create Query Parameter Builder
**File**: `packages/mcp-use/src/server/mcp-server.ts` (addition)

```typescript
private buildWidgetUrl(widget: string, params: Record<string, any>): string {
  const baseUrl = `http://localhost:${this.serverPort}/mcp-use/widgets/${widget}`

  if (Object.keys(params).length === 0) {
    return baseUrl
  }

  const queryParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        queryParams.append(key, JSON.stringify(value))
      } else {
        queryParams.append(key, String(value))
      }
    }
  }

  return `${baseUrl}?${queryParams.toString()}`
}

private convertPropsToInputs(props?: WidgetProps): InputDefinition[] {
  if (!props) return []

  return Object.entries(props).map(([name, prop]) => ({
    name,
    type: prop.type,
    description: prop.description,
    required: prop.required,
    default: prop.default
  }))
}
```

### Phase 4: Widget Manifest System

#### 4.1 Define Widget Manifest Format
**File**: `widget.json` (example for kanban-board)

```json
{
  "name": "kanban-board",
  "title": "Kanban Board",
  "description": "Interactive task management board with drag-and-drop",
  "version": "1.0.0",
  "props": {
    "initialTasks": {
      "type": "array",
      "description": "Initial tasks to display on the board",
      "required": false
    },
    "columns": {
      "type": "array",
      "description": "Column configuration",
      "required": false,
      "default": [
        { "id": "todo", "title": "To Do" },
        { "id": "in-progress", "title": "In Progress" },
        { "id": "done", "title": "Done" }
      ]
    },
    "theme": {
      "type": "string",
      "description": "Visual theme (light/dark)",
      "required": false,
      "default": "light"
    }
  },
  "size": ["900px", "600px"],
  "assets": {
    "main": "index.html",
    "scripts": ["assets/index.js"],
    "styles": ["assets/style.css"]
  }
}
```

#### 4.2 Update Build Process
**File**: `packages/mcp-use-cli/src/commands/build.ts` (conceptual)

- Add step to scan for React/TypeScript components
- Extract prop interfaces automatically
- Generate widget.json if not present
- Bundle widgets with manifests

### Phase 5: Integration and Testing

#### 5.1 Update Server Template
**File**: `packages/create-mcp-use-app/src/templates/ui/src/server.ts`

```typescript
import { createMCPServer } from 'mcp-use/server'

const server = createMCPServer('ui-mcp-server', {
  version: '1.0.0',
  description: 'MCP server with auto-discovered UI widgets',
})

const PORT = process.env.PORT || 3000

// Manual widget registration with full control
server.uiResource({
  name: 'kanban-board',
  widget: 'kanban-board',
  title: 'Kanban Board',
  description: 'Task management with drag-and-drop',
  props: {
    initialTasks: {
      type: 'array',
      description: 'Initial task list',
      required: false
    },
    theme: {
      type: 'string',
      description: 'Visual theme',
      default: 'light'
    }
  },
  size: ['900px', '600px']
})

// OR: Automatic discovery (alternative approach)
await server.discoverWidgets({
  path: './dist/resources/mcp-use/widgets',
  autoRegister: true
})

server.listen(PORT)
```

#### 5.2 Create Example Widgets

**Additional widgets to create**:
1. **Chart Widget** - Data visualization with configurable chart type
2. **Form Builder** - Dynamic form with field configuration
3. **Data Table** - Sortable/filterable table with pagination

Each widget should:
- Have TypeScript prop interfaces
- Include a widget.json manifest
- Support query parameter initialization
- Demonstrate different prop types

## Benefits of This Implementation

### Developer Experience
- **Simplified API**: Single `uiResource` method instead of separate tool and resource definitions
- **Auto-discovery**: Widgets automatically registered from filesystem
- **Type Safety**: Props extracted from TypeScript interfaces
- **Zero Config**: Works out of the box with sensible defaults

### Features
- **Automatic Tool Generation**: Each widget gets a corresponding tool
- **Props to Query Params**: Seamless data passing to widgets
- **Manifest System**: Declarative widget configuration
- **Asset Management**: Automatic handling of JS/CSS assets

### Extensibility
- **Plugin Architecture**: Easy to add new widget types
- **Custom Prop Types**: Support for complex data structures
- **Framework Agnostic**: Works with React, Vue, or vanilla JS
- **Build Integration**: Hooks into existing build pipeline

## Migration Path

For existing implementations:
1. Keep backward compatibility with manual tool/resource registration
2. Add deprecation warnings for old patterns
3. Provide migration tool to generate manifests from existing code
4. Document migration guide with examples

## Success Criteria

- [ ] Widgets can be registered with a single method call
- [ ] Automatic discovery finds and registers all widgets in a directory
- [ ] Props are extracted from TypeScript interfaces
- [ ] Tool inputs are converted to widget props via query parameters
- [ ] Each widget exposes both tool and resource endpoints
- [ ] UIResources render correctly in MCP-UI compatible clients
- [ ] Documentation and examples are comprehensive

## Next Steps

1. Implement Phase 1 (Core Infrastructure)
2. Test with existing kanban-board widget
3. Implement Phase 2 (Discovery System)
4. Create additional example widgets
5. Write comprehensive documentation
6. Create migration guide for existing users