import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Shared utilities for MCP Inspector server functionality
 */

// In-memory cache for favicons
interface CacheEntry {
  data: ArrayBuffer
  contentType: string
  timestamp: number
  ttl: number
}

const faviconCache = new Map<string, CacheEntry>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const MAX_CACHE_SIZE = 1000 // Maximum number of cached favicons

// Clean up expired cache entries
function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of faviconCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      faviconCache.delete(key)
    }
  }
}

// Run cleanup every hour
setInterval(cleanupCache, 60 * 60 * 1000)

// Get cache key for a URL
function getCacheKey(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.toLowerCase()
  }
  catch {
    return url.toLowerCase()
  }
}

/**
 * Fetch favicon for a given URL with caching
 */
export async function fetchFavicon(url: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(url)

    // Add protocol if missing
    let fullUrl = decodedUrl
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      fullUrl = `https://${decodedUrl}`
    }

    // Validate URL
    const urlObj = new URL(fullUrl)
    const cacheKey = getCacheKey(fullUrl)

    // Check cache first
    const cachedEntry = faviconCache.get(cacheKey)
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < cachedEntry.ttl) {
      return {
        data: cachedEntry.data,
        contentType: cachedEntry.contentType,
      }
    }

    const protocol = urlObj.protocol
    const baseDomain = `${protocol}//${urlObj.origin.split('.').slice(-2).join('.')}`

    // Try to fetch favicon from common locations
    const faviconUrls = [
      `${urlObj.origin}/favicon.ico`,
      `${urlObj.origin}/favicon.png`,
      `${urlObj.origin}/apple-touch-icon.png`,
      `${urlObj.origin}/icon.png`,
      `${baseDomain}/favicon.ico`,
      `${baseDomain}/favicon.png`,
      `${baseDomain}/apple-touch-icon.png`,
      `${baseDomain}/icon.png`,
    ]

    for (const faviconUrl of faviconUrls) {
      try {
        const response = await fetch(faviconUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MCP-Inspector/1.0)',
          },
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/x-icon'
          const buffer = await response.arrayBuffer()

          // Cache the result
          if (faviconCache.size >= MAX_CACHE_SIZE) {
            // Remove oldest entries if cache is full
            const entries = Array.from(faviconCache.entries())
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
            const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 4))
            toRemove.forEach(([key]) => faviconCache.delete(key))
          }

          faviconCache.set(cacheKey, {
            data: buffer,
            contentType,
            timestamp: Date.now(),
            ttl: CACHE_TTL,
          })

          return {
            data: buffer,
            contentType,
          }
        }
      }
      catch {
        // Continue to next URL
        continue
      }
    }

    return null
  }
  catch (error) {
    console.error('Favicon fetch error:', error)
    return null
  }
}

/**
 * Handle chat API request with MCP agent
 */
export async function handleChatRequest(requestBody: {
  mcpServerUrl: string
  llmConfig: any
  authConfig?: any
  messages: any[]
}): Promise<{ content: string; toolCalls: any[] }> {
  const { mcpServerUrl, llmConfig, authConfig, messages } = requestBody

  if (!mcpServerUrl || !llmConfig || !messages) {
    throw new Error('Missing required fields: mcpServerUrl, llmConfig, messages')
  }

  // Dynamically import mcp-use and LLM providers
  const { MCPAgent, MCPClient } = await import('mcp-use')

  // Create LLM instance based on provider
  let llm: any
  if (llmConfig.provider === 'openai') {
    // @ts-ignore - Dynamic import of peer dependency available through mcp-use
    const { ChatOpenAI } = await import('@langchain/openai')
    llm = new ChatOpenAI({
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
    })
  }
  else if (llmConfig.provider === 'anthropic') {
    // @ts-ignore - Dynamic import of peer dependency available through mcp-use
    const { ChatAnthropic } = await import('@langchain/anthropic')
    llm = new ChatAnthropic({
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
    })
  }
  else if (llmConfig.provider === 'google') {
    // @ts-ignore - Dynamic import of peer dependency available through mcp-use
    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai')
    llm = new ChatGoogleGenerativeAI({
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
    })
  }
  else {
    throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`)
  }

  // Create MCP client and connect to server
  const client = new MCPClient()
  const serverName = `inspector-${Date.now()}`

  // Add server with potential authentication headers
  const serverConfig: any = { url: mcpServerUrl }

  // Handle authentication - support both custom auth and OAuth
  if (authConfig && authConfig.type !== 'none') {
    serverConfig.headers = {}

    if (authConfig.type === 'basic' && authConfig.username && authConfig.password) {
      const auth = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64')
      serverConfig.headers.Authorization = `Basic ${auth}`
    }
    else if (authConfig.type === 'bearer' && authConfig.token) {
      serverConfig.headers.Authorization = `Bearer ${authConfig.token}`
    }
    else if (authConfig.type === 'oauth') {
      // For OAuth, use the tokens passed from the frontend
      if (authConfig.oauthTokens?.access_token) {
        // Capitalize the token type (e.g., "bearer" -> "Bearer")
        const tokenType = authConfig.oauthTokens.token_type
          ? authConfig.oauthTokens.token_type.charAt(0).toUpperCase() + authConfig.oauthTokens.token_type.slice(1)
          : 'Bearer'
        serverConfig.headers.Authorization = `${tokenType} ${authConfig.oauthTokens.access_token}`
        console.log('Using OAuth access token for MCP server authentication')
        console.log('Authorization header:', `${tokenType} ${authConfig.oauthTokens.access_token.substring(0, 20)}...`)
      }
      else {
        console.warn('OAuth selected but no access token provided')
      }
    }
  }

  // If the URL contains authentication info, extract it (fallback)
  try {
    const url = new URL(mcpServerUrl)
    if (url.username && url.password && (!authConfig || authConfig.type === 'none')) {
      // Extract auth from URL
      const auth = Buffer.from(`${url.username}:${url.password}`).toString('base64')
      serverConfig.headers = serverConfig.headers || {}
      serverConfig.headers.Authorization = `Basic ${auth}`
      // Remove auth from URL to avoid double encoding
      serverConfig.url = `${url.protocol}//${url.host}${url.pathname}${url.search}`
    }
  }
  catch (error) {
    // If URL parsing fails, use original URL
    console.warn('Failed to parse MCP server URL for auth:', error)
  }

  // Debug: Log the server config being used
  console.log('Adding server with config:', {
    url: serverConfig.url,
    hasHeaders: !!serverConfig.headers,
    headers: serverConfig.headers,
  })

  client.addServer(serverName, serverConfig)

  // Create agent with user's LLM
  const agent = new MCPAgent({
    llm,
    client,
    maxSteps: 10,
    memoryEnabled: true,
    systemPrompt: 'You are a helpful assistant with access to MCP tools, prompts, and resources. Help users interact with the MCP server.',
  })

  // Format messages - use only the last user message as the query
  const lastUserMessage = messages.filter((msg: any) => msg.role === 'user').pop()

  if (!lastUserMessage) {
    throw new Error('No user message found')
  }

  // Get response from agent
  const response = await agent.run(lastUserMessage.content)

  // Clean up
  await client.closeAllSessions()

  return {
    content: response,
    toolCalls: [],
  }
}

/**
 * Get content type for static assets
 */
export function getContentType(filePath: string): string {
  if (filePath.endsWith('.js')) {
    return 'application/javascript'
  }
  else if (filePath.endsWith('.css')) {
    return 'text/css'
  }
  else if (filePath.endsWith('.svg')) {
    return 'image/svg+xml'
  }
  else if (filePath.endsWith('.html')) {
    return 'text/html'
  }
  else if (filePath.endsWith('.json')) {
    return 'application/json'
  }
  else if (filePath.endsWith('.png')) {
    return 'image/png'
  }
  else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
    return 'image/jpeg'
  }
  else if (filePath.endsWith('.ico')) {
    return 'image/x-icon'
  }
  else {
    return 'application/octet-stream'
  }
}

/**
 * Check if client files exist
 */
export function checkClientFiles(clientDistPath: string): boolean {
  return existsSync(clientDistPath)
}

/**
 * Get client dist path
 */
export function getClientDistPath(): string {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  return join(__dirname, '../../dist/client')
}
