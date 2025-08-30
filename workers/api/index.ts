/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import { authRoutes } from './routes/auth';
// import { characterRoutes } from './routes/characters';
// import { loreRoutes } from './routes/lore';
import { worldRoutes } from './routes/world';
// import { leaderboardRoutes } from './routes/leaderboard';
// import { WorldRoom } from './durable-objects/world-room';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  BUCKET: R2Bucket;
  // WORLD: DurableObjectNamespace;
  JWT_SECRET: string;
  TURNSTILE_SECRET_KEY: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      const allowedOrigins = [
        'http://localhost:3000',
        'https://droplets-of-creation.pages.dev',
        'https://dropletsofcreation.com',
        'https://137e551d.docs-6aq.pages.dev',
        'https://fa143249.docs-6aq.pages.dev',
        'https://f4e906ba.docs-6aq.pages.dev',
      ];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
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
// app.route('/api/characters', characterRoutes);
// app.route('/api', loreRoutes);  // Lore routes include /characters/:id/lore prefix
app.route('/api/world', worldRoutes);
// app.route('/api/leaderboard', leaderboardRoutes);

// WebSocket endpoint for real-time updates (temporarily disabled)
// app.get('/api/realtime', async (c) => {
//   const upgradeHeader = c.req.header('Upgrade');
//   if (upgradeHeader !== 'websocket') {
//     return c.text('Expected websocket', 426);
//   }

//   const id = c.env.WORLD.idFromName('world-room');
//   const stub = c.env.WORLD.get(id);
//   return stub.fetch(c.req.raw);
// });

export default app;

// Export Durable Object (temporarily disabled)
// export { WorldRoom };