# Create MCP App CLI Usage

The `create-mcp-app` CLI tool allows you to quickly scaffold MCP server projects with different templates.

## Installation

```bash
# Install globally
npm install -g mcp-use

# Or use with npx (recommended)
npx create-mcp-app my-server
```

## Usage

### Basic Usage

```bash
# Create a basic MCP server
npx create-mcp-app my-server

# Create with specific template
npx create-mcp-app my-server --template filesystem

# Skip dependency installation
npx create-mcp-app my-server --no-install
```

### Available Templates

#### 1. Basic Template (default)

```bash
npx create-mcp-app my-server --template basic
```

**Features:**

- Simple echo tool
- Server information resource
- Greeting prompt
- Perfect for learning MCP basics

#### 2. Filesystem Template

```bash
npx create-mcp-app my-server --template filesystem
```

**Features:**

- File reading and listing tools
- Directory operations
- File information tool
- File access templates
- Great for file management servers

#### 3. API Template

```bash
npx create-mcp-app my-server --template api
```

**Features:**

- HTTP GET/POST requests
- Weather API integration
- JSONPlaceholder API
- API documentation prompts
- Perfect for API integration servers

## Project Structure

After running `create-mcp-app`, you'll get:

```
my-server/
├── src/
│   └── server.ts          # Main server file
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md             # Project documentation
```

## Getting Started

1. **Navigate to your project:**

   ```bash
   cd my-server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Run in development mode:**

   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Customization

### Adding New Tools

Edit `src/server.ts` to add your own tools:

```typescript
// Add a new tool
mcp.tool({
  name: 'my-tool',
  description: 'My custom tool',
  inputs: [
    {
      name: 'input',
      type: 'string',
      description: 'Input parameter',
      required: true
    }
  ],
  fn: async ({ input }: { input: string }) => {
    return `Processed: ${input}`
  }
})
```

### Adding New Resources

```typescript
// Add a new resource
mcp.resource({
  uri: 'my://resource',
  name: 'My Resource',
  description: 'Custom resource',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({ data: 'Hello World' })
  }
})
```

### Adding New Prompts

```typescript
// Add a new prompt
mcp.prompt({
  name: 'my-prompt',
  description: 'Generate custom content',
  args: [
    {
      name: 'topic',
      type: 'string',
      description: 'Topic to generate content about',
      required: true
    }
  ],
  fn: async ({ topic }: { topic: string }) => {
    return `Generate content about ${topic}`
  }
})
```

## Examples

### Basic Server Example

```typescript
import { create } from 'mcp-use/server'

const mcp = create('my-server', {
  version: '1.0.0',
  description: 'My custom MCP server'
})

// Simple echo tool
mcp.tool({
  name: 'echo',
  description: 'Echo back the input',
  inputs: [
    { name: 'message', type: 'string', required: true }
  ],
  fn: async ({ message }: { message: string }) => {
    return `Echo: ${message}`
  }
})

mcp.serve().catch(console.error)
```

### Filesystem Server Example

```typescript
import { readdir, readFile } from 'node:fs/promises'
import { create } from 'mcp-use/server'

const mcp = create('filesystem-server', {
  version: '1.0.0'
})

// File reading tool
mcp.tool({
  name: 'read-file',
  description: 'Read file contents',
  inputs: [
    { name: 'path', type: 'string', required: true }
  ],
  fn: async ({ path }: { path: string }) => {
    const content = await readFile(path, 'utf-8')
    return `Contents of ${path}:\n\n${content}`
  }
})

mcp.serve().catch(console.error)
```

### API Server Example

```typescript
import axios from 'axios'
import { create } from 'mcp-use/server'

const mcp = create('api-server', {
  version: '1.0.0'
})

// HTTP GET tool
mcp.tool({
  name: 'http-get',
  description: 'Make HTTP GET requests',
  inputs: [
    { name: 'url', type: 'string', required: true }
  ],
  fn: async ({ url }: { url: string }) => {
    const response = await axios.get(url)
    return JSON.stringify(response.data, null, 2)
  }
})

mcp.serve().catch(console.error)
```

## Advanced Usage

### Environment Variables

Create a `.env` file for configuration:

```bash
# .env
API_KEY=your_api_key_here
PORT=3000
DEBUG=true
```

### Custom Templates

You can create your own templates by:

1. Creating a new template directory in `src/cli/templates/`
2. Adding the template files (package.json, tsconfig.json, src/server.ts, README.md)
3. Updating the CLI to include your template

### Publishing Your Server

1. **Build your server:**

   ```bash
   npm run build
   ```

2. **Test your server:**

   ```bash
   npm start
   ```

3. **Publish to npm (optional):**
   ```bash
   npm publish
   ```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'mcp-use/server'"**
   - Make sure you've installed dependencies: `npm install`
   - Check that mcp-use is in your package.json

2. **"Template not found"**
   - Use one of the available templates: basic, filesystem, api
   - Check the template name spelling

3. **"Permission denied"**
   - Make sure you have write permissions in the current directory
   - Try running with `sudo` if necessary (not recommended)

### Getting Help

- **Documentation**: https://docs.mcp-use.io
- **GitHub**: https://github.com/mcp-use/mcp-use-ts
- **Issues**: https://github.com/mcp-use/mcp-use-ts/issues
- **Discord**: https://discord.gg/XkNkSkMz3V

## Next Steps

1. **Explore the examples** in the `examples/` directory
2. **Read the documentation** at https://docs.mcp-use.io
3. **Join the community** on Discord
4. **Contribute** to the project on GitHub

Happy coding! 🚀
