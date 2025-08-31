/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import { authRoutes } from './routes/auth';
import { characterRoutes } from './routes/characters';
import { creationRoutes } from './routes/creations';
import { loreRoutes } from './routes/lore';
import { worldRoutes } from './routes/world';
// import { leaderboardRoutes } from './routes/leaderboard';
// import { WorldRoom } from './durable-objects/world-room';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  CREATIONS: KVNamespace;
  BUCKET: R2Bucket;
  // WORLD: DurableObjectNamespace;
  JWT_SECRET: string;
  STABILITY_API_KEY?: string;
  TURNSTILE_SECRET_KEY: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS - return the actual origin for credentials
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Return the actual origin to allow credentials
      // This allows any origin but returns the specific one (not wildcard)
      return origin || '*';
    },
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug database access
app.get('/debug/db', async (c) => {
  try {
    const count = await c.env.DB.prepare('SELECT COUNT(*) as count FROM world_state').first();
    const data = await c.env.DB.prepare('SELECT * FROM world_state WHERE id = 1').first();
    return c.json({ success: true, count, data });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/characters', characterRoutes);
app.route('/api/creations', creationRoutes);
app.route('/api/lore', loreRoutes);  // Lore routes include /characters/:id/lore prefix
app.route('/api/world', worldRoutes);
// app.route('/api/leaderboard', leaderboardRoutes);

// WebSocket endpoint for real-time updates (simplified without Durable Objects)
app.get('/api/realtime', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected websocket', 426);
  }

  // For now, return a simple WebSocket that doesn't broadcast
  // This prevents the connection errors while we work on other features
  try {
    const [client, server] = Object.values(new WebSocketPair());
    
    // Accept the WebSocket connection
    server.accept();
    
    // Send a welcome message
    server.send(JSON.stringify({
      type: 'connected',
      payload: { message: 'Connected to realtime updates' }
    }));
    
    // Handle incoming messages (just echo for now)
    server.addEventListener('message', (event) => {
      console.log('Received message:', event.data);
    });
    
    // Handle close
    server.addEventListener('close', () => {
      console.log('WebSocket closed');
    });
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  } catch (error) {
    console.error('WebSocket error:', error);
    return c.text('WebSocket error', 500);
  }
});

export default app;

// Export Durable Object (temporarily disabled)
// export { WorldRoom };