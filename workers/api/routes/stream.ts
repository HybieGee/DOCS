import { Hono } from 'hono';
import type { Env } from '../index';
import { CloudflareKV } from '@/lib/kv';
import { getRecentWorldEvents, type WorldEvent } from '@/lib/worldEvents';

export const streamRoutes = new Hono<{ Bindings: Env }>();

// SSE endpoint for real-time world events
streamRoutes.get('/world', async (c) => {
  const kv = new CloudflareKV(c.env.CACHE);
  
  // Set up SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');
  c.header('Access-Control-Allow-Origin', '*');

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const send = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial connection message
      send('connected', { message: 'Connected to world stream' });

      // Track last event ID for polling
      let lastId = 0;

      // Poll for new events
      const pollInterval = setInterval(async () => {
        try {
          const events = await getRecentWorldEvents(kv, lastId);
          for (const evt of events) {
            if (evt.id > lastId) {
              lastId = evt.id;
              send(evt.payload.type, evt.payload);
            }
          }
        } catch (error) {
          console.error('Error polling events:', error);
        }
      }, 1000); // Poll every second

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        send('heartbeat', { timestamp: Date.now() });
      }, 30000); // Every 30 seconds

      // Cleanup on close
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    }
  });

  return new Response(stream);
});