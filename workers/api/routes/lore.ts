import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';

export const loreRoutes = new Hono<{ Bindings: Env }>();

// POST /api/lore/characters/:id/lore - Add lore to a character
loreRoutes.post('/characters/:id/lore', async (c) => {
  try {
    // Get user info
    let userId: string | null = null;
    try {
      const token = getCookie(c, 'session');
      if (token) {
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        if (payload) {
          userId = payload.sub;
        }
      }
    } catch (error) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    if (!userId) {
      return c.json({ success: false, error: 'Must be logged in' }, 401);
    }

    const characterId = c.req.param('id');
    const body = await c.req.json<{ body: string; turnstile_token?: string }>();
    
    if (!body.body || body.body.length > 500) {
      return c.json({ success: false, error: 'Lore must be 1-500 characters' }, 400);
    }

    // Verify ownership if it's a creation
    if (characterId.startsWith('cr_')) {
      const creationRecord = await c.env.CREATIONS.get(characterId);
      if (!creationRecord) {
        return c.json({ success: false, error: 'Creation not found' }, 404);
      }

      const creation = JSON.parse(creationRecord);
      if (creation.user_id !== userId) {
        return c.json({ success: false, error: 'You can only add lore to your own creations' }, 403);
      }
    } else {
      // For regular characters, check database ownership
      const character = await c.env.DB.prepare(
        'SELECT owner_user_id FROM characters WHERE id = ?'
      ).bind(characterId).first();

      if (!character) {
        return c.json({ success: false, error: 'Character not found' }, 404);
      }

      if (character.owner_user_id !== userId) {
        return c.json({ success: false, error: 'You can only add lore to your own characters' }, 403);
      }
    }

    // Store lore in database
    const loreId = `lore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await c.env.DB.prepare(
      `INSERT INTO lore (
        id, character_id, author_user_id, body, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(loreId, characterId, userId, body.body)
      .run();

    return c.json({ 
      success: true, 
      data: { 
        id: loreId,
        character_id: characterId,
        body: body.body,
        author_user_id: userId,
        created_at: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.error('Add lore error:', error);
    return c.json({ success: false, error: 'Failed to add lore' }, 500);
  }
});

// GET /api/lore/characters/:id/lore - Get lore for a character
loreRoutes.get('/characters/:id/lore', async (c) => {
  try {
    const characterId = c.req.param('id');
    
    const loreEntries = await c.env.DB.prepare(
      `SELECT * FROM lore 
       WHERE character_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`
    )
      .bind(characterId)
      .all();

    return c.json({ 
      success: true, 
      data: loreEntries.results || [] 
    });
  } catch (error) {
    console.error('Get lore error:', error);
    return c.json({ success: false, error: 'Failed to get lore' }, 500);
  }
});