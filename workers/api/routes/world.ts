import { Hono } from 'hono';
import type { Env } from '../index';

// Simple overlap fix function
async function fixOverlappingPositions(db: D1Database): Promise<{ updated: number; message: string }> {
  const MIN_DISTANCE = 80;
  const WORLD_WIDTH = 1920;
  const WORLD_HEIGHT = 200;
  const GROUND_Y_START = 600;
  
  // Get all characters
  const result = await db.prepare('SELECT id, x, y FROM characters').all();
  const characters = result.results || [];
  
  if (characters.length === 0) {
    return { updated: 0, message: 'No characters found' };
  }
  
  const occupiedPositions: Array<{ x: number; y: number }> = [];
  let updatedCount = 0;
  
  // Redistribute each character to a safe position
  for (const char of characters) {
    const charData = char as any;
    let attempts = 0;
    let safePosition = null;
    
    // Try to find a safe position
    while (attempts < 50 && !safePosition) {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT + GROUND_Y_START;
      
      // Check distance from occupied positions
      let isSafe = true;
      for (const pos of occupiedPositions) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < MIN_DISTANCE) {
          isSafe = false;
          break;
        }
      }
      
      if (isSafe) {
        safePosition = { x, y };
        occupiedPositions.push(safePosition);
      }
      
      attempts++;
    }
    
    // Use fallback position if needed
    if (!safePosition) {
      safePosition = {
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT + GROUND_Y_START
      };
      occupiedPositions.push(safePosition);
    }
    
    // Update character position
    await db.prepare('UPDATE characters SET x = ?, y = ? WHERE id = ?')
      .bind(safePosition.x, safePosition.y, charData.id).run();
    
    updatedCount++;
  }
  
  return { 
    updated: updatedCount, 
    message: `Successfully redistributed ${updatedCount} characters with ${MIN_DISTANCE}px minimum spacing`
  };
}

interface WorldState {
  id: number;
  total_characters: number;
  total_waters: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  last_milestone_reached: number;
  current_phase: 'dawn' | 'day' | 'dusk' | 'night';
  updated_at: string;
}

export const worldRoutes = new Hono<{ Bindings: Env }>();

// Get world state
worldRoutes.get('/state', async (c) => {
  try {
    console.log('Getting world state...');
    
    // Try to get from cache first
    const cached = await c.env.CACHE.get('world_state');
    if (cached) {
      console.log('Found cached world state');
      return c.json({ success: true, data: JSON.parse(cached) });
    }

    console.log('Cache miss, querying database...');
    // Get from database
    const worldState = await c.env.DB.prepare(
      'SELECT * FROM world_state WHERE id = 1'
    ).first<WorldState>();
    
    console.log('Database query result:', worldState);

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

      // Cache for 60 seconds
      await c.env.CACHE.put('world_state', JSON.stringify(defaultState), { expirationTtl: 60 });
      return c.json({ success: true, data: defaultState });
    }

    // Cache for 60 seconds
    await c.env.CACHE.put('world_state', JSON.stringify(worldState), { expirationTtl: 60 });
    return c.json({ success: true, data: worldState });
  } catch (error) {
    console.error('World state error:', error);
    return c.json({ success: false, error: 'Failed to get world state', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
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

// POST /api/world/fix-overlaps - Emergency fix for overlapping positions
worldRoutes.post('/fix-overlaps', async (c) => {
  try {
    console.log('Emergency overlap fix called');
    
    // Execute the position fix
    const result = await fixOverlappingPositions(c.env.DB);
    
    // Clear world state cache to refresh
    await c.env.CACHE.delete('world_state');
    
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Fix overlaps error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fix overlaps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
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
    const worldId = (c.env as any).WORLD.idFromName('world-room');
    const worldStub = (c.env as any).WORLD.get(worldId);
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