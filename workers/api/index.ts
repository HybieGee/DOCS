import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import { authRoutes } from './routes/auth';
import { characterRoutes } from './routes/characters';
import { loreRoutes } from './routes/lore';
import { worldRoutes } from './routes/world';
import { leaderboardRoutes } from './routes/leaderboard';
import { WorldRoom } from './durable-objects/world-room';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  BUCKET: R2Bucket;
  WORLD: DurableObjectNamespace;
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

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/characters', characterRoutes);
app.route('/api/lore', loreRoutes);
app.route('/api/world', worldRoutes);
app.route('/api/leaderboard', leaderboardRoutes);

// WebSocket endpoint for real-time updates
app.get('/api/realtime', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected websocket', 426);
  }

  const id = c.env.WORLD.idFromName('world-room');
  const stub = c.env.WORLD.get(id);
  return stub.fetch(c.req.raw);
});

export default app;

// Export Durable Object
export { WorldRoom };