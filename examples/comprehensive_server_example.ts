import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { create } from 'mcp-use/server'

// Create a comprehensive MCP server
const mcp = create('comprehensive-server', {
  version: '1.0.0',
  description: 'A comprehensive MCP server demonstrating all features',
})

// === RESOURCES ===

// Simple text resource
mcp.resource({
  uri: 'info://server',
  name: 'Server Information',
  description: 'Basic server information',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      name: 'comprehensive-server',
      version: '1.0.0',
      features: ['resources', 'tools', 'prompts', 'templates'],
      timestamp: new Date().toISOString(),
    }, null, 2)
  },
})

// File system resource
mcp.resource({
  uri: 'fs://current-directory',
  name: 'Current Directory',
  description: 'Contents of the current directory',
  mimeType: 'text/plain',
  fn: async () => {
    try {
      const files = readdirSync('.')
      return files.join('\n')
    }
    catch (error) {
      return `Error reading directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// === TOOLS ===

// File operations tool
mcp.tool({
  name: 'read-file',
  description: 'Read the contents of a file',
  inputs: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file to read',
      required: true,
    },
  ],
  fn: async ({ path }) => {
    try {
      const content = readFileSync(path, 'utf-8')
      return `File contents of ${path}:\n\n${content}`
    }
    catch (error) {
      return `Error reading file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Directory listing tool
mcp.tool({
  name: 'list-directory',
  description: 'List files and directories in a path',
  inputs: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path to list',
      required: true,
    },
    {
      name: 'include-hidden',
      type: 'boolean',
      description: 'Include hidden files',
      required: false,
    },
  ],
  fn: async ({ path, includeHidden = false }) => {
    try {
      const files = readdirSync(path)
      const filteredFiles = includeHidden
        ? files
        : files.filter(file => !file.startsWith('.'))

      const fileInfo = filteredFiles.map((file) => {
        const fullPath = join(path, file)
        const stats = statSync(fullPath)
        const type = stats.isDirectory() ? '[DIR]' : '[FILE]'
        const size = stats.isFile() ? ` (${stats.size} bytes)` : ''
        return `${type} ${file}${size}`
      })

      return `Contents of ${path}:\n\n${fileInfo.join('\n')}`
    }
    catch (error) {
      return `Error listing directory ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Calculator tool
mcp.tool({
  name: 'calculate',
  description: 'Perform basic mathematical calculations',
  inputs: [
    {
      name: 'expression',
      type: 'string',
      description: 'Mathematical expression to evaluate',
      required: true,
    },
  ],
  fn: async ({ expression }) => {
    try {
      // Simple and safe evaluation (in production, use a proper math parser)
      const result = new Function(`"use strict"; return (${expression})`)()
      return `Result: ${expression} = ${result}`
    }
    catch (error) {
      return `Error calculating "${expression}": ${error instanceof Error ? error.message : 'Invalid expression'}`
    }
  },
})

// === PROMPTS ===

// Code review prompt
mcp.prompt({
  name: 'code-review',
  description: 'Generate a code review prompt',
  args: [
    {
      name: 'language',
      type: 'string',
      description: 'Programming language',
      required: true,
    },
    {
      name: 'complexity',
      type: 'string',
      description: 'Code complexity level',
      required: false,
    },
  ],
  fn: async ({ language, complexity = 'medium' }) => {
    return `Please review this ${language} code and provide feedback on:
- Code quality and best practices
- Performance considerations
- Security implications
- Maintainability
- ${complexity === 'high' ? 'Advanced optimization opportunities' : 'Basic improvements'}

Focus on actionable suggestions that will help improve the code.`
  },
})

// Documentation prompt
mcp.prompt({
  name: 'documentation',
  description: 'Generate documentation for code',
  args: [
    {
      name: 'component',
      type: 'string',
      description: 'Component or function name',
      required: true,
    },
    {
      name: 'type',
      type: 'string',
      description: 'Type of documentation',
      required: false,
    },
  ],
  fn: async ({ component, type = 'API' }) => {
    return `Generate comprehensive ${type} documentation for "${component}" including:
- Purpose and functionality
- Parameters and return values
- Usage examples
- Error handling
- Related components or dependencies`
  },
})

// === TEMPLATES ===

// File template
mcp.template({
  uriTemplate: 'file://{filename}',
  name: 'File Template',
  description: 'Template for accessing files',
  mimeType: 'text/plain',
  fn: async ({ filename }) => {
    try {
      const content = readFileSync(filename, 'utf-8')
      return `Contents of ${filename}:\n\n${content}`
    }
    catch (error) {
      return `Error reading file ${filename}: ${error instanceof Error ? error.message : 'File not found'}`
    }
  },
})

// Directory template
mcp.template({
  uriTemplate: 'dir://{directory}',
  name: 'Directory Template',
  description: 'Template for accessing directories',
  mimeType: 'text/plain',
  fn: async ({ directory }) => {
    try {
      const files = readdirSync(directory)
      return `Contents of ${directory}:\n\n${files.join('\n')}`
    }
    catch (error) {
      return `Error reading directory ${directory}: ${error instanceof Error ? error.message : 'Directory not found'}`
    }
  },
})

// === SERVER STARTUP ===

console.log('🚀 Starting Comprehensive MCP Server...')
console.log('📋 Server Information:')
console.log('  Name: comprehensive-server')
console.log('  Version: 1.0.0')
console.log('  Features: resources, tools, prompts, templates')
console.log('')
console.log('📦 Available Resources:')
console.log('  - info://server (Server information)')
console.log('  - fs://current-directory (Current directory contents)')
console.log('')
console.log('🛠️  Available Tools:')
console.log('  - read-file (Read file contents)')
console.log('  - list-directory (List directory contents)')
console.log('  - calculate (Perform calculations)')
console.log('')
console.log('💬 Available Prompts:')
console.log('  - code-review (Generate code review prompts)')
console.log('  - documentation (Generate documentation prompts)')
console.log('')
console.log('🎯 Available Templates:')
console.log('  - file://{filename} (File access template)')
console.log('  - dir://{directory} (Directory access template)')
console.log('')
console.log('✅ Server ready! Listening for connections...')

// Start the server
mcp.serve().catch(console.error)
