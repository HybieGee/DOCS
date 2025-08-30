import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';
import type { Lore } from '@/lib/types';
import { MAX_LORE_LENGTH } from '@/lib/types';

export const loreRoutes = new Hono<{ Bindings: Env }>();

// Middleware to verify auth
const requireAuth = async (c: any, next: any) => {
  const token = getCookie(c, 'session');
  if (!token) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  c.set('userId', payload.sub);
  await next();
};

// Submit lore for a character
loreRoutes.post('/characters/:characterId/lore', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    const characterId = (c as any).param('characterId');
    const body = await c.req.json<{ body: string; turnstile_token?: string }>();

    // Validate lore length
    if (!body.body || body.body.length > MAX_LORE_LENGTH) {
      return c.json({ success: false, error: 'Invalid lore length' }, 400);
    }

    // Basic profanity filter (simplified)
    const blockedWords = ['spam', 'abuse']; // Add more in production
    const lowerBody = body.body.toLowerCase();
    for (const word of blockedWords) {
      if (lowerBody.includes(word)) {
        return c.json({ success: false, error: 'Content contains blocked words' }, 400);
      }
    }

    // Check if character exists
    const character = await c.env.DB.prepare(
      'SELECT id FROM characters WHERE id = ?'
    )
      .bind(characterId)
      .first();

    if (!character) {
      return c.json({ success: false, error: 'Character not found' }, 404);
    }

    // Check rate limit (max 5 lore submissions per day)
    const today = new Date().toISOString().split('T')[0];
    const submissionCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM lore 
       WHERE author_user_id = ? AND date(created_at) = ?`
    )
      .bind(userId, today)
      .first<{ count: number }>();

    if (submissionCount && submissionCount.count >= 5) {
      return c.json({ success: false, error: 'Daily lore submission limit reached' }, 429);
    }

    // Create lore entry
    const loreId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO lore (id, character_id, author_user_id, body, votes, is_canon)
       VALUES (?, ?, ?, ?, 0, 0)`
    )
      .bind(loreId, characterId, userId, body.body)
      .run();

    const lore: Lore = {
      id: loreId,
      character_id: characterId,
      author_user_id: userId,
      body: body.body,
      votes: 0,
      is_canon: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return c.json({ success: true, data: lore });
  } catch (error) {
    console.error('Lore submission error:', error);
    return c.json({ success: false, error: 'Failed to submit lore' }, 500);
  }
});

// Vote on lore
loreRoutes.post('/:loreId/vote', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    const loreId = (c as any).param('loreId');

    // Check if lore exists
    const lore = await c.env.DB.prepare(
      'SELECT * FROM lore WHERE id = ?'
    )
      .bind(loreId)
      .first<Lore>();

    if (!lore) {
      return c.json({ success: false, error: 'Lore not found' }, 404);
    }

    // Check if already voted
    const existingVote = await c.env.DB.prepare(
      'SELECT id FROM lore_votes WHERE lore_id = ? AND voter_user_id = ?'
    )
      .bind(loreId, userId)
      .first();

    if (existingVote) {
      return c.json({ success: false, error: 'Already voted' }, 409);
    }

    // Create vote
    const voteId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO lore_votes (id, lore_id, voter_user_id) VALUES (?, ?, ?)'
    )
      .bind(voteId, loreId, userId)
      .run();

    // Update vote count
    await c.env.DB.prepare(
      'UPDATE lore SET votes = votes + 1 WHERE id = ?'
    )
      .bind(loreId)
      .run();

    // Check if this lore should become canon
    const updatedLore = await c.env.DB.prepare(
      'SELECT * FROM lore WHERE id = ?'
    )
      .bind(loreId)
      .first<Lore>();

    if (updatedLore && updatedLore.votes >= 10 && !updatedLore.is_canon) {
      // Check if it has the most votes for this character
      const topLore = await c.env.DB.prepare(
        `SELECT id FROM lore 
         WHERE character_id = ? 
         ORDER BY votes DESC 
         LIMIT 1`
      )
        .bind(lore.character_id)
        .first<{ id: string }>();

      if (topLore && topLore.id === loreId) {
        // Remove canon status from previous canon lore
        await c.env.DB.prepare(
          'UPDATE lore SET is_canon = 0 WHERE character_id = ? AND is_canon = 1'
        )
          .bind(lore.character_id)
          .run();

        // Set this lore as canon
        await c.env.DB.prepare(
          'UPDATE lore SET is_canon = 1 WHERE id = ?'
        )
          .bind(loreId)
          .run();

        // Broadcast canon update
        const worldId = (c.env as any).WORLD.idFromName('world-room');
        const worldStub = (c.env as any).WORLD.get(worldId);
        await worldStub.fetch('http://internal/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            type: 'lore_canon',
            payload: {
              character_id: lore.character_id,
              lore_id: loreId,
              body: updatedLore.body,
            },
          }),
        });
      }
    }

    return c.json({ success: true, data: { votes: (updatedLore?.votes || 0) + 1 } });
  } catch (error) {
    console.error('Vote error:', error);
    return c.json({ success: false, error: 'Failed to vote' }, 500);
  }
});

// Get lore for a character
loreRoutes.get('/characters/:characterId/lore', async (c) => {
  try {
    const characterId = (c as any).param('characterId');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);

    const loreEntries = await c.env.DB.prepare(
      `SELECT l.*, u.username as author_username
       FROM lore l
       LEFT JOIN users u ON l.author_user_id = u.id
       WHERE l.character_id = ?
       ORDER BY l.is_canon DESC, l.votes DESC, l.created_at DESC
       LIMIT ?`
    )
      .bind(characterId, limit)
      .all();

    return c.json({ success: true, data: loreEntries.results });
  } catch (error) {
    console.error('Get lore error:', error);
    return c.json({ success: false, error: 'Failed to get lore' }, 500);
  }
});