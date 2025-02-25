/**
 * Configuration module for the application
 * Handles environment-specific settings
 */

/**
 * Detects if the application is running in a local development environment
 * @returns {boolean} True if running locally, false otherwise
 */
function isLocalDevelopment() {
  // Check if running on localhost or local IP
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.startsWith('192.168.') || 
         hostname.startsWith('10.') ||
         hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
}

/**
 * Loads configuration from a local config file if it exists
 * @returns {Promise<Object>} Configuration object
 */
async function loadLocalConfig() {
  console.log('[Config] Attempting to load config.local.json');
  try {
    const response = await fetch('/config.local.json');
    console.log('[Config] Fetch response status:', response.status);
    if (response.ok) {
      const config = await response.json();
      console.log('[Config] Successfully loaded config:', config);
      return config;
    } else {
      console.warn('[Config] Failed to load config, status:', response.status);
    }
  } catch (error) {
    console.warn('[Config] Error loading local config:', error);
  }
  return {};
}

/**
 * Application configuration
 */
class Config {
  constructor() {
    this.initialized = false;
    this.config = {
      apiBaseUrl: '', // Empty string means relative URL (/api/grok)
      isDevelopment: false,
      debugMode: false
    };
  }

  /**
   * Initialize the configuration
   * @returns {Promise<Config>} This config instance
   */
  async init() {
    if (this.initialized) return this;
    
    // Set environment flags
    this.config.isDevelopment = isLocalDevelopment();
    this.config.debugMode = new URLSearchParams(window.location.search).has('debug') || 
                           localStorage.getItem('debugMode') === 'true';
    
    // Load configuration with clear precedence:
    // 1. Default values (from constructor)
    // 2. Window.ENV_CONFIG (if available)
    // 3. Local config file (in development mode)
    if (window.ENV_CONFIG) {
      console.log('[Config] Found window.ENV_CONFIG, applying...');
      this.config = { ...this.config, ...window.ENV_CONFIG };
    }
    
    if (this.config.isDevelopment) {
      console.log('[Config] Loading local configuration...');
      try {
        const localConfig = await loadLocalConfig();
        console.log('[Config] Local config loaded:', localConfig);
        this.config = { ...this.config, ...localConfig };
        console.log('[Config] Final configuration:', this.config);
      } catch (error) {
        console.warn('[Config] Failed to load local config:', error);
      }
    } else {
      console.log('[Config] Not in development mode, using default configuration');
    }
    
    this.initialized = true;
    return this;
  }

  /**
   * Get the full API URL for a given endpoint
   * @param {string} endpoint - The API endpoint (e.g., '/api/grok')
   * @returns {string} The full URL to the API endpoint
   */
  getApiUrl(endpoint) {
    console.log('[Config] getApiUrl called with endpoint:', endpoint);
    
    // In development mode, use the proxy server
    if (this.config.isDevelopment && this.config.port) {
      const proxyUrl = `http://localhost:${this.config.port}${endpoint}`;
      console.log('[Config] Using development proxy URL:', proxyUrl);
      return proxyUrl;
    }
    
    console.log('[Config] Current apiBaseUrl:', this.config.apiBaseUrl);
    
    // If apiBaseUrl is empty, use relative URL
    if (!this.config.apiBaseUrl) {
      console.log('[Config] Using relative URL:', endpoint);
      return endpoint;
    }
    
    // Otherwise, join the base URL with the endpoint
    // Remove trailing slash from base URL if present
    const baseUrl = this.config.apiBaseUrl.endsWith('/') 
      ? this.config.apiBaseUrl.slice(0, -1) 
      : this.config.apiBaseUrl;
    
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') 
      ? endpoint.slice(1) 
      : endpoint;
    
    const fullUrl = `${baseUrl}/${cleanEndpoint}`;
    console.log('[Config] Using full URL:', fullUrl);
    
    return fullUrl;
  }

  /**
   * Get a configuration value
   * @param {string} key - The configuration key
   * @param {*} defaultValue - Default value if key is not found
   * @returns {*} The configuration value
   */
  get(key, defaultValue) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
}

// Create singleton instance
const config = new Config();
export default config;
