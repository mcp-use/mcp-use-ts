import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { fetchFavicon } from './shared-utils.js'

const app = new Hono()

// Enable CORS for all routes
app.use('*', cors())

// Favicon proxy endpoint
app.get('/:url', async (c) => {
  const url = c.req.param('url')

  if (!url) {
    return c.json({ error: 'URL parameter is required' }, 400)
  }

  try {
    const result = await fetchFavicon(url)

    if (result) {
      return new Response(result.data, {
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400, immutable', // Cache for 24 hours
          'Access-Control-Allow-Origin': '*',
        },
      })
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
