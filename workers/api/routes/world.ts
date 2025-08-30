import { Hono } from 'hono';
import type { Env } from '../index';
import type { WorldState } from '@/lib/types';

export const worldRoutes = new Hono<{ Bindings: Env }>();

// Get world state
worldRoutes.get('/state', async (c) => {
  try {
    // Try to get from cache first
    const cached = await c.env.CACHE.get('world_state');
    if (cached) {
      return c.json({ success: true, data: JSON.parse(cached) });
    }

    // Get from database
    const worldState = await c.env.DB.prepare(
      'SELECT * FROM world_state WHERE id = 1'
    ).first<WorldState>();

    if (!worldState) {
      // Initialize if not exists
      await c.env.DB.prepare(
        `INSERT OR REPLACE INTO world_state 
         (id, total_characters, total_waters, season, last_milestone_reached, current_phase) 
         VALUES (1, 0, 0, 'spring', 0, 'day')`
      ).run();

      const defaultState = {
        id: 1,
        total_characters: 0,
        total_waters: 0,
        season: 'spring',
        last_milestone_reached: 0,
        current_phase: 'day',
        updated_at: new Date().toISOString(),
      };

      // Cache for 30 seconds
      await c.env.CACHE.put('world_state', JSON.stringify(defaultState), { expirationTtl: 30 });
      return c.json({ success: true, data: defaultState });
    }

    // Cache for 30 seconds
    await c.env.CACHE.put('world_state', JSON.stringify(worldState), { expirationTtl: 30 });
    return c.json({ success: true, data: worldState });
  } catch (error) {
    console.error('World state error:', error);
    return c.json({ success: false, error: 'Failed to get world state' }, 500);
  }
});

// Get milestone progress
worldRoutes.get('/milestones', async (c) => {
  try {
    const worldState = await c.env.DB.prepare(
      'SELECT total_characters, last_milestone_reached FROM world_state WHERE id = 1'
    ).first<{ total_characters: number; last_milestone_reached: number }>();

    const milestones = [
      { threshold: 100, type: 'streams', name: 'Flowing Waters', unlocked: false },
      { threshold: 500, type: 'plants', name: 'Growing Life', unlocked: false },
      { threshold: 1000, type: 'lights', name: 'Town Lights', unlocked: false },
      { threshold: 5000, type: 'village', name: 'Thriving Village', unlocked: false },
      { threshold: 10000, type: 'city', name: 'Grand City', unlocked: false },
    ];

    if (worldState) {
      milestones.forEach(milestone => {
        milestone.unlocked = worldState.total_characters >= milestone.threshold;
      });
    }

    return c.json({ 
      success: true, 
      data: {
        milestones,
        current_characters: worldState?.total_characters || 0,
        last_milestone: worldState?.last_milestone_reached || 0,
      }
    });
  } catch (error) {
    console.error('Milestones error:', error);
    return c.json({ success: false, error: 'Failed to get milestones' }, 500);
  }
});

// Get recent events
worldRoutes.get('/events', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    const events = await c.env.DB.prepare(
      `SELECT * FROM events 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all();

    return c.json({ success: true, data: events.results });
  } catch (error) {
    console.error('Events error:', error);
    return c.json({ success: false, error: 'Failed to get events' }, 500);
  }
});

// Admin endpoint to update season/phase (for testing)
worldRoutes.post('/admin/season', async (c) => {
  try {
    const body = await c.req.json<{ season?: string; phase?: string }>();
    
    // Simple auth check - in production, use proper admin auth
    const authHeader = c.req.header('Authorization');
    if (authHeader !== 'Bearer admin-secret-key') {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (body.season && ['spring', 'summer', 'autumn', 'winter'].includes(body.season)) {
      updates.push('season = ?');
      params.push(body.season);
    }

    if (body.phase && ['dawn', 'day', 'dusk', 'night'].includes(body.phase)) {
      updates.push('current_phase = ?');
      params.push(body.phase);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid updates provided' }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(1); // WHERE id = 1

    await c.env.DB.prepare(
      `UPDATE world_state SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...params)
      .run();

    // Clear cache
    await c.env.CACHE.delete('world_state');

    // Broadcast update via Durable Object
    const worldId = c.env.WORLD.idFromName('world-room');
    const worldStub = c.env.WORLD.get(worldId);
    await worldStub.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'season_change',
        payload: { season: body.season, phase: body.phase },
      }),
    });

    return c.json({ success: true, data: { season: body.season, phase: body.phase } });
  } catch (error) {
    console.error('Admin season update error:', error);
    return c.json({ success: false, error: 'Failed to update season' }, 500);
  }
});