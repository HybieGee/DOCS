// World events publishing for real-time updates
import type { KV } from './kv';

let counter = 0;

export interface WorldEvent {
  id: number;
  payload: {
    type: 'water' | 'levelUp' | 'spawn';
    [key: string]: unknown;
  };
}

export async function publishWorldEvent(
  kv: KV,
  type: 'water' | 'levelUp' | 'spawn',
  data: Record<string, unknown>
) {
  counter++;
  const entry: WorldEvent = {
    id: Date.now() * 1000 + (counter % 1000),
    payload: { type, ...data }
  };
  
  const key = 'world:events';
  const existing = (await kv.get<WorldEvent[]>(key)) || [];
  const next = [...existing, entry].slice(-200); // Keep last 200 events
  await kv.set(key, next, 600); // Keep for 10 minutes
}

export async function getRecentWorldEvents(
  kv: KV,
  sinceId?: number
): Promise<WorldEvent[]> {
  const events = (await kv.get<WorldEvent[]>('world:events')) || [];
  if (sinceId) {
    return events.filter(e => e.id > sinceId);
  }
  return events;
}