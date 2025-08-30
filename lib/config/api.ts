// API Configuration
// Update these URLs after deploying your Cloudflare Worker

const API_CONFIG = {
  // For local development
  development: {
    apiUrl: 'http://localhost:8787',
    wsUrl: 'ws://localhost:8787'
  },
  
  // For production - UPDATE THIS WITH YOUR WORKER URL
  production: {
    apiUrl: 'https://droplets-api.YOUR-SUBDOMAIN.workers.dev',
    wsUrl: 'wss://droplets-api.YOUR-SUBDOMAIN.workers.dev'
  }
};

export const getApiConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? API_CONFIG.development : API_CONFIG.production;
};

export const API_URL = getApiConfig().apiUrl;
export const WS_URL = getApiConfig().wsUrl;