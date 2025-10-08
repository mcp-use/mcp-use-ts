# API MCP Server

An API MCP server created with `create-mcp-app` that provides HTTP operations and API integrations.

## Features

- **🌐 HTTP Requests**: GET and POST requests
- **🌤️ Weather API**: Get weather information
- **📊 JSON Placeholder**: Test API interactions
- **📚 Documentation**: Generate API documentation

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Production

```bash
# Build the server
npm run build

# Run the built server
npm start
```

## Available Tools

### `http-get`
Make an HTTP GET request to any URL.

**Parameters:**
- `url` (string, required): URL to make the GET request to
- `headers` (object, optional): Optional headers to include

**Example:**
```json
{
  "url": "https://api.github.com/users/octocat",
  "headers": {
    "User-Agent": "MyApp/1.0"
  }
}
```

### `http-post`
Make an HTTP POST request to any URL.

**Parameters:**
- `url` (string, required): URL to make the POST request to
- `data` (object, required): Data to send in the request body
- `headers` (object, optional): Optional headers to include

**Example:**
```json
{
  "url": "https://httpbin.org/post",
  "data": {
    "message": "Hello World"
  },
  "headers": {
    "Content-Type": "application/json"
  }
}
```

### `weather`
Get weather information for a city.

**Parameters:**
- `city` (string, required): City name to get weather for
- `apiKey` (string, optional): OpenWeatherMap API key

**Example:**
```json
{
  "city": "London",
  "apiKey": "your-api-key-here"
}
```

**Note:** Get a free API key at [OpenWeatherMap](https://openweathermap.org/api).

### `json-placeholder`
Interact with JSONPlaceholder API for testing.

**Parameters:**
- `resource` (string, required): Resource type (posts, users, comments, albums, photos, todos)
- `id` (string, optional): Specific ID (will list all if not provided)

**Example:**
```json
{
  "resource": "posts",
  "id": "1"
}
```

## Available Resources

### `api://status`
Current status and information about the API server.

## Available Prompts

### `api-docs`
Generate API documentation for endpoints.

**Parameters:**
- `endpoint` (string, required): API endpoint to document
- `method` (string, optional): HTTP method (default: GET)

## API Integrations

### Weather API
- **Service**: OpenWeatherMap
- **Free Tier**: 1,000 calls/day
- **Signup**: [OpenWeatherMap](https://openweathermap.org/api)

### JSON Placeholder
- **Service**: JSONPlaceholder
- **Free**: Yes, no API key required
- **Documentation**: [JSONPlaceholder](https://jsonplaceholder.typicode.com/)

## Customization

### Adding New API Integrations

```typescript
// Add a new API tool
mcp.tool({
  name: 'my-api',
  description: 'Call my custom API',
  inputs: [
    { name: 'endpoint', type: 'string', required: true },
    { name: 'params', type: 'object', required: false }
  ],
  fn: async ({ endpoint, params }) => {
    const response = await axios.get(`https://my-api.com/${endpoint}`, { params })
    return JSON.stringify(response.data, null, 2)
  }
})
```

### Adding Authentication

```typescript
// Add API key authentication
const apiKey = process.env.MY_API_KEY
if (!apiKey) {
  throw new Error('MY_API_KEY environment variable is required')
}

// Use in requests
const response = await axios.get(url, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})
```

### Error Handling

```typescript
// Custom error handling
mcp.tool({
  name: 'safe-request',
  inputs: [{ name: 'url', type: 'string', required: true }],
  fn: async ({ url }) => {
    try {
      const response = await axios.get(url, { timeout: 5000 })
      return `Success: ${response.status}`
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return `HTTP Error: ${error.response?.status} - ${error.message}`
      }
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})
```

## Environment Variables

Create a `.env` file for API keys:

```bash
# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Custom APIs
MY_API_KEY=your_custom_api_key
```

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io)
- [mcp-use Documentation](https://docs.mcp-use.io)
- [Axios Documentation](https://axios-http.com/)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [JSONPlaceholder](https://jsonplaceholder.typicode.com/)
