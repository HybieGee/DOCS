// KV adapter interface for Cloudflare KV
export interface KV {
  incr(key: string): Promise<number>;
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSec?: number): Promise<void>;
  expire(key: string, ttlSec: number): Promise<void>;
  ttl(key: string): Promise<number | null>;
  publish?(channel: string, message: string): Promise<void>;
  subscribe?(channel: string, onMessage: (message: string) => void): Promise<void>;
}

// Cloudflare KV adapter for use in Workers
export class CloudflareKV implements KV {
  constructor(private namespace: KVNamespace) {}

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const next = current + 1;
    await this.set(key, next);
    return next;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.namespace.get(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSec?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSec) {
      await this.namespace.put(key, serialized, { expirationTtl: ttlSec });
    } else {
      await this.namespace.put(key, serialized);
    }
  }

  async expire(key: string, ttlSec: number): Promise<void> {
    const value = await this.namespace.get(key);
    if (value !== null) {
      await this.namespace.put(key, value, { expirationTtl: ttlSec });
    }
  }

  async ttl(key: string): Promise<number | null> {
    // Cloudflare KV doesn't expose TTL directly
    // Would need to store expiry separately if needed
    return null;
  }

  // Pub/sub not directly supported in KV, use rolling buffer approach
  async publish(channel: string, message: string): Promise<void> {
    const key = `pubsub:${channel}`;
    const existing = await this.get<string[]>(key) || [];
    const updated = [...existing, message].slice(-100); // Keep last 100 messages
    await this.set(key, updated, 300); // 5 min TTL
  }
}