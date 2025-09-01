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
    
    console.log('Received lore submission:', { characterId, bodyLength: body.body?.length, userId });
    
    if (!body.body || typeof body.body !== 'string') {
      return c.json({ success: false, error: 'Lore body is required' }, 400);
    }
    
    if (body.body.trim().length === 0) {
      return c.json({ success: false, error: 'Lore cannot be empty' }, 400);
    }
    
    if (body.body.length > 500) {
      return c.json({ success: false, error: 'Lore must be 500 characters or less' }, 400);
    }

    // Check ownership in database (works for both creations and characters)
    console.log('Checking ownership for character:', characterId);
    const character = await c.env.DB.prepare(
      'SELECT owner_user_id FROM characters WHERE id = ?'
    ).bind(characterId).first();
    
    console.log('Character found:', character);

    if (!character) {
      return c.json({ success: false, error: 'Character/Creation not found' }, 404);
    }

    if (character.owner_user_id !== userId) {
      console.log(`Ownership check failed: character.owner_user_id=${character.owner_user_id}, userId=${userId}`);
      return c.json({ success: false, error: 'You can only add lore to your own creations' }, 403);
    }
    
    console.log('Ownership check passed');

    // Store lore in database
    const loreId = `lore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Inserting lore: id=${loreId}, character_id=${characterId}, author_user_id=${userId}, body=${body.body.substring(0, 50)}...`);
    
    try {
      const result = await c.env.DB.prepare(
        `INSERT INTO lore (
          id, character_id, author_user_id, body
        ) VALUES (?, ?, ?, ?)`
      )
        .bind(loreId, characterId, userId, body.body)
        .run();
        
      console.log('Lore insertion result:', result);
      
      if (!result.success) {
        throw new Error(`Database insert failed: ${result.error || 'Unknown error'}`);
      }
    } catch (dbError) {
      console.error('Database insertion error:', dbError);
      throw new Error(`Failed to store lore in database: ${dbError}`);
    }

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