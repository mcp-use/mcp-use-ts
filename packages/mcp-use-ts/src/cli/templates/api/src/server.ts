import axios from 'axios'
import { create } from 'mcp-use/server'

// Create an API MCP server
const mcp = create('api-server', {
  version: '1.0.0',
  description: 'An API MCP server for HTTP operations',
})

// Resource for server status
mcp.resource({
  uri: 'api://status',
  name: 'API Server Status',
  description: 'Current status of the API server',
  mimeType: 'application/json',
  fn: async () => {
    return JSON.stringify({
      name: 'api-server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: ['http-get', 'http-post', 'weather', 'json-placeholder'],
    }, null, 2)
  },
})

// Tool for making HTTP GET requests
mcp.tool({
  name: 'http-get',
  description: 'Make an HTTP GET request to a URL',
  inputs: [
    {
      name: 'url',
      type: 'string',
      description: 'URL to make the GET request to',
      required: true,
    },
    {
      name: 'headers',
      type: 'object',
      description: 'Optional headers to include',
      required: false,
    },
  ],
  fn: async ({ url, headers = {} }: { url: string, headers?: Record<string, string> }) => {
    try {
      const response = await axios.get(url, { headers })
      return `GET ${url}\nStatus: ${response.status}\nHeaders: ${JSON.stringify(response.headers, null, 2)}\n\nResponse:\n${JSON.stringify(response.data, null, 2)}`
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        return `Error making GET request to ${url}:\nStatus: ${error.response?.status}\nMessage: ${error.message}`
      }
      return `Error making GET request to ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Tool for making HTTP POST requests
mcp.tool({
  name: 'http-post',
  description: 'Make an HTTP POST request to a URL',
  inputs: [
    {
      name: 'url',
      type: 'string',
      description: 'URL to make the POST request to',
      required: true,
    },
    {
      name: 'data',
      type: 'object',
      description: 'Data to send in the request body',
      required: true,
    },
    {
      name: 'headers',
      type: 'object',
      description: 'Optional headers to include',
      required: false,
    },
  ],
  fn: async ({ url, data, headers = {} }: { url: string, data: any, headers?: Record<string, string> }) => {
    try {
      const response = await axios.post(url, data, { headers })
      return `POST ${url}\nStatus: ${response.status}\nHeaders: ${JSON.stringify(response.headers, null, 2)}\n\nResponse:\n${JSON.stringify(response.data, null, 2)}`
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        return `Error making POST request to ${url}:\nStatus: ${error.response?.status}\nMessage: ${error.message}`
      }
      return `Error making POST request to ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Tool for getting weather information (example API integration)
mcp.tool({
  name: 'weather',
  description: 'Get weather information for a city (using OpenWeatherMap API)',
  inputs: [
    {
      name: 'city',
      type: 'string',
      description: 'City name to get weather for',
      required: true,
    },
    {
      name: 'apiKey',
      type: 'string',
      description: 'OpenWeatherMap API key (get one at openweathermap.org)',
      required: false,
    },
  ],
  fn: async ({ city, apiKey }: { city: string, apiKey?: string }) => {
    try {
      // Use a demo API key for demonstration (replace with your own)
      const key = apiKey || 'demo'
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`

      const response = await axios.get(url)
      const weather = response.data

      return `Weather in ${city}:\nTemperature: ${weather.main.temp}°C\nDescription: ${weather.weather[0].description}\nHumidity: ${weather.main.humidity}%\nWind: ${weather.wind.speed} m/s`
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        return `Error getting weather for ${city}: ${error.response?.status === 401 ? 'Invalid API key' : error.message}`
      }
      return `Error getting weather for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Tool for JSON Placeholder API (free testing API)
mcp.tool({
  name: 'json-placeholder',
  description: 'Interact with JSONPlaceholder API (posts, users, comments)',
  inputs: [
    {
      name: 'resource',
      type: 'string',
      description: 'Resource type (posts, users, comments, albums, photos, todos)',
      required: true,
    },
    {
      name: 'id',
      type: 'string',
      description: 'Specific ID (optional, will list all if not provided)',
      required: false,
    },
  ],
  fn: async ({ resource, id }: { resource: string, id?: string }) => {
    try {
      const baseUrl = 'https://jsonplaceholder.typicode.com'
      const url = id ? `${baseUrl}/${resource}/${id}` : `${baseUrl}/${resource}`

      const response = await axios.get(url)
      return `JSONPlaceholder ${resource}${id ? ` (ID: ${id})` : ' (all items)'}:\n\n${JSON.stringify(response.data, null, 2)}`
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        return `Error fetching ${resource} from JSONPlaceholder: ${error.message}`
      }
      return `Error fetching ${resource}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

// Prompt for API documentation
mcp.prompt({
  name: 'api-docs',
  description: 'Generate API documentation',
  args: [
    {
      name: 'endpoint',
      type: 'string',
      description: 'API endpoint to document',
      required: true,
    },
    {
      name: 'method',
      type: 'string',
      description: 'HTTP method (GET, POST, PUT, DELETE)',
      required: false,
    },
  ],
  fn: async ({ endpoint, method = 'GET' }: { endpoint: string, method?: string }) => {
    return `# API Documentation

## ${method} ${endpoint}

### Description
Documentation for the ${method} ${endpoint} endpoint.

### Parameters
- **endpoint**: ${endpoint}
- **method**: ${method}

### Example Request
\`\`\`bash
curl -X ${method} "${endpoint}"
\`\`\`

### Example Response
\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`

### Error Handling
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error`
  },
})

console.log('🚀 Starting API MCP Server...')
console.log('📋 Server: api-server v1.0.0')
console.log('📦 Resources: api://status')
console.log('🛠️  Tools: http-get, http-post, weather, json-placeholder')
console.log('💬 Prompts: api-docs')
console.log('✅ Server ready!')

// Start the server
mcp.serve().catch(console.error)
