import { create } from 'mcp-use/server'
import { readFile, readdir, stat } from 'fs/promises'
import { join, resolve } from 'path'

// Create a filesystem MCP server
const mcp = create('filesystem-server', {
  version: '1.0.0',
  description: 'A filesystem MCP server for file operations'
})

// Resource for current directory listing
mcp.resource({
  uri: 'fs://current',
  name: 'Current Directory',
  description: 'Contents of the current directory',
  mimeType: 'text/plain',
  fn: async () => {
    try {
      const files = await readdir('.')
      return files.join('\n')
    } catch (error) {
      return `Error reading directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

// Tool for reading files
mcp.tool({
  name: 'read-file',
  description: 'Read the contents of a file',
  inputs: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file to read',
      required: true
    }
  ],
  fn: async ({ path }: { path: string }) => {
    try {
      const content = await readFile(path, 'utf-8')
      return `Contents of ${path}:\n\n${content}`
    } catch (error) {
      return `Error reading file ${path}: ${error instanceof Error ? error.message : 'File not found'}`
    }
  }
})

// Tool for listing directory contents
mcp.tool({
  name: 'list-directory',
  description: 'List files and directories in a path',
  inputs: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path to list',
      required: true
    },
    {
      name: 'include-hidden',
      type: 'boolean',
      description: 'Include hidden files (starting with .)',
      required: false
    }
  ],
  fn: async ({ path, includeHidden = false }: { path: string; includeHidden?: boolean }) => {
    try {
      const files = await readdir(path)
      const filteredFiles = includeHidden 
        ? files 
        : files.filter(file => !file.startsWith('.'))
      
      const fileInfo = await Promise.all(
        filteredFiles.map(async (file) => {
          const fullPath = join(path, file)
          const stats = await stat(fullPath)
          const type = stats.isDirectory() ? '[DIR]' : '[FILE]'
          const size = stats.isFile() ? ` (${stats.size} bytes)` : ''
          return `${type} ${file}${size}`
        })
      )
      
      return `Contents of ${path}:\n\n${fileInfo.join('\n')}`
    } catch (error) {
      return `Error listing directory ${path}: ${error instanceof Error ? error.message : 'Directory not found'}`
    }
  }
})

// Tool for getting file information
mcp.tool({
  name: 'file-info',
  description: 'Get detailed information about a file or directory',
  inputs: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the file or directory',
      required: true
    }
  ],
  fn: async ({ path }: { path: string }) => {
    try {
      const stats = await stat(path)
      const info = {
        name: path,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        permissions: {
          readable: true, // Assume readable if we can stat
          writable: true, // Would need additional checks
          executable: stats.mode & 0o111 ? true : false
        }
      }
      
      return `File Information for ${path}:\n\n${JSON.stringify(info, null, 2)}`
    } catch (error) {
      return `Error getting file info for ${path}: ${error instanceof Error ? error.message : 'File not found'}`
    }
  }
})

// Template for file access
mcp.template({
  uriTemplate: 'file://{filename}',
  name: 'File Template',
  description: 'Template for accessing files by name',
  mimeType: 'text/plain',
  fn: async ({ filename }: { filename: string }) => {
    try {
      const content = await readFile(filename, 'utf-8')
      return `Contents of ${filename}:\n\n${content}`
    } catch (error) {
      return `Error reading file ${filename}: ${error instanceof Error ? error.message : 'File not found'}`
    }
  }
})

console.log('🚀 Starting Filesystem MCP Server...')
console.log('📋 Server: filesystem-server v1.0.0')
console.log('📦 Resources: fs://current')
console.log('🛠️  Tools: read-file, list-directory, file-info')
console.log('🎯 Templates: file://{filename}')
console.log('✅ Server ready!')

// Start the server
mcp.serve().catch(console.error)