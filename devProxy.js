/**
 * Development Proxy Server
 * 
 * This proxy server is used for local development to:
 * 1. Avoid CORS issues when making requests to the API
 * 2. Provide a way to mock API responses for testing
 * 3. Log and inspect API requests and responses
 * 
 * Usage: node devProxy.js
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  port: 3000,
  apiBaseUrl: '',
  mockResponses: false,
  logRequests: true
};

// Load configuration
let config = { ...DEFAULT_CONFIG };
try {
  if (fs.existsSync('./config.local.json')) {
    const localConfig = JSON.parse(fs.readFileSync('./config.local.json', 'utf8'));
    config = { ...config, ...localConfig };
    console.log('[Proxy] Loaded configuration from config.local.json');
  } else {
    console.log('[Proxy] No config.local.json found, using default configuration');
  }
} catch (error) {
  console.error('[Proxy] Error loading configuration:', error.message);
}

// Create mock response directory if it doesn't exist
const mockDir = path.join(__dirname, 'mocks');
if (config.mockResponses && !fs.existsSync(mockDir)) {
  fs.mkdirSync(mockDir);
  console.log('[Proxy] Created mocks directory');
}

/**
 * Get a mock response for a given endpoint if available
 * @param {string} endpoint - The API endpoint
 * @param {string} method - The HTTP method
 * @returns {Object|null} The mock response or null if not found
 */
function getMockResponse(endpoint, method) {
  if (!config.mockResponses) return null;
  
  const mockPath = path.join(mockDir, `${endpoint.replace(/\//g, '_')}_${method.toLowerCase()}.json`);
  
  if (fs.existsSync(mockPath)) {
    try {
      return JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    } catch (error) {
      console.error(`[Proxy] Error reading mock file ${mockPath}:`, error.message);
    }
  }
  
  return null;
}

/**
 * Forward a request to the target API
 * @param {Object} req - The incoming request
 * @param {Object} res - The server response
 * @param {string} targetUrl - The target URL to forward to
 */
function forwardRequest(req, res, targetUrl) {
  const parsedUrl = url.parse(targetUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      host: parsedUrl.hostname
    }
  };

  // Log the request
  if (config.logRequests) {
    console.log(`[Proxy] ${req.method} ${targetUrl}`);
    console.log('[Proxy] Request headers:', req.headers);
  }

  // Create the appropriate request object based on protocol
  const proxyReq = (parsedUrl.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
    // Set response headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Add CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Set status code
    res.statusCode = proxyRes.statusCode;
    
    // Log the response
    if (config.logRequests) {
      console.log(`[Proxy] Response status: ${proxyRes.statusCode}`);
      console.log('[Proxy] Response headers:', proxyRes.headers);
    }
    
    // Pipe the response data
    proxyRes.pipe(res);
  });

  // Handle errors
  proxyReq.on('error', (error) => {
    console.error('[Proxy] Error forwarding request:', error.message);
    
    // Provide a more helpful error message based on the error type
    let errorMessage = 'Proxy error: ' + error.message;
    let statusCode = 500;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Unable to connect to API server at ${parsedUrl.hostname}. The server may be down or unreachable.`;
      statusCode = 503; // Service Unavailable
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = `DNS lookup failed for ${parsedUrl.hostname}. Check your apiBaseUrl configuration.`;
      statusCode = 502; // Bad Gateway
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = `Connection to ${parsedUrl.hostname} timed out. The server may be overloaded or unreachable.`;
      statusCode = 504; // Gateway Timeout
    }
    
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ 
      error: errorMessage,
      code: error.code,
      endpoint: req.url,
      targetUrl: targetUrl
    }));
  });

  // If there's request data, pipe it to the proxy request
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// Create the server
const server = http.createServer((req, res) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204; // No content
    res.end();
    return;
  }

  // Parse the request URL
  const parsedUrl = url.parse(req.url);
  const endpoint = parsedUrl.pathname;
  
  // Check if we should use a mock response
  const mockResponse = getMockResponse(endpoint, req.method);
  if (mockResponse) {
    console.log(`[Proxy] Using mock response for ${req.method} ${endpoint}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(mockResponse));
    return;
  }
  
  // If we have an API base URL, forward the request
  if (config.apiBaseUrl) {
    const targetUrl = `${config.apiBaseUrl}${endpoint}${parsedUrl.search || ''}`;
    forwardRequest(req, res, targetUrl);
  } else {
    // If no API base URL is configured, return an error
    console.error('[Proxy] No API base URL configured');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ 
      error: 'Proxy configuration error: No API base URL configured',
      help: 'Create a config.local.json file with an apiBaseUrl property'
    }));
  }
});

// Start the server
server.listen(config.port, () => {
  console.log(`[Proxy] Development proxy server running at http://localhost:${config.port}`);
  console.log(`[Proxy] API requests will be forwarded to: ${config.apiBaseUrl || 'No API base URL configured'}`);
  console.log(`[Proxy] Mock responses: ${config.mockResponses ? 'Enabled' : 'Disabled'}`);
  console.log(`[Proxy] Request logging: ${config.logRequests ? 'Enabled' : 'Disabled'}`);
  console.log('[Proxy] Press Ctrl+C to stop the server');
}); 