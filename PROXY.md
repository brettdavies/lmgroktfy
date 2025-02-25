# Development Proxy Server

This development proxy server is designed to help with local development by:

1. Avoiding CORS issues when making API requests
2. Providing a way to mock API responses for testing
3. Logging and inspecting API requests and responses

## Setup

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Create a `config.local.json` file in the project root with your API configuration:
   ```json
   {
     "apiBaseUrl": "https://your-api-endpoint.com",
     "port": 3000,
     "mockResponses": false,
     "logRequests": true
   }
   ```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `apiBaseUrl` | The base URL of the API to proxy requests to | `""` (empty string) |
| `port` | The port to run the proxy server on | `3000` |
| `mockResponses` | Whether to use mock responses from the `mocks` directory | `false` |
| `logRequests` | Whether to log request and response details | `true` |

## Usage

### Starting the Proxy Server

```bash
npm run proxy
```

This will start the proxy server on the configured port (default: 3000).

### Starting Both the Web Server and Proxy

```bash
npm run dev
```

This will start both the web server and the proxy server concurrently.

### Using Mock Responses

1. Set `mockResponses: true` in your `config.local.json` file
2. Create mock response files in the `mocks` directory with the naming convention:
   ```
   _endpoint_method.json
   ```
   
   For example:
   - `_api_grok_post.json` for POST requests to `/api/grok`
   - `_api_users_get.json` for GET requests to `/api/users`

### Updating Your Frontend Code

The proxy is automatically used in development environments. The `config.js` file detects when running in a development environment and routes API requests through the proxy server.

## Troubleshooting

### CORS Issues

The proxy server automatically adds CORS headers to all responses. If you're still experiencing CORS issues:

1. Make sure your frontend is making requests to the proxy server, not directly to the API
2. Check that the proxy server is running and accessible
3. Verify that the API endpoint in your configuration is correct

### API Connection Errors

The proxy server provides detailed error messages for common connection issues:

| Error | Status Code | Description |
|-------|-------------|-------------|
| ECONNREFUSED | 503 | The API server is down or unreachable |
| ENOTFOUND | 502 | DNS lookup failed for the API hostname |
| ETIMEDOUT | 504 | Connection to the API server timed out |

These errors will be returned as JSON responses with details about the error and the target URL.

### Mock Responses Not Working

If your mock responses aren't being used:

1. Ensure `mockResponses` is set to `true` in your configuration
2. Check that your mock files are named correctly and are valid JSON
3. Verify the mock files are in the `mocks` directory at the project root

## Advanced Usage

### Custom Headers

To add custom headers to proxied requests, modify the `forwardRequest` function in `devProxy.js`:

```javascript
const options = {
  // ...existing options
  headers: {
    ...req.headers,
    host: parsedUrl.hostname,
    'X-Custom-Header': 'Custom Value'
  }
};
```

### Request Transformation

To transform requests before they're sent to the API, modify the request handling in the server creation:

```javascript
// Inside the http.createServer callback
const body = [];
req.on('data', (chunk) => {
  body.push(chunk);
});
req.on('end', () => {
  const requestBody = Buffer.concat(body).toString();
  // Transform the request body
  const transformedBody = someTransformFunction(requestBody);
  // Use the transformed body in your request
});
``` 