const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

export function getWebSocketUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsUrl}/${cleanEndpoint}`;
}