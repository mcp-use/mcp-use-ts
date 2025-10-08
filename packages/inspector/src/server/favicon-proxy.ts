import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Enable CORS for all routes
app.use('*', cors())

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

// Favicon proxy endpoint
app.get('/:url', async (c) => {
  const url = c.req.param('url')

  if (!url) {
    return c.json({ error: 'URL parameter is required' }, 400)
  }

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
      return new Response(cachedEntry.data, {
        headers: {
          'Content-Type': cachedEntry.contentType,
          'Cache-Control': 'public, max-age=86400, immutable', // Cache for 24 hours
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'HIT',
        },
      })
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

          return new Response(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, immutable', // Cache for 24 hours
              'Access-Control-Allow-Origin': '*',
              'X-Cache': 'MISS',
            },
          })
        }
      }
      catch {
        // Continue to next URL
        continue
      }
    }

    // If no favicon found, return a default icon
    return c.json({ error: 'No favicon found' }, 404)
  }
  catch (error) {
    console.error('Favicon proxy error:', error)
    return c.json({ error: 'Invalid URL or fetch failed' }, 400)
  }
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'favicon-proxy' })
})

export default app
