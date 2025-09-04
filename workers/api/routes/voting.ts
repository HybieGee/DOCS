import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';
import { CloudflareKV } from '@/lib/kv';
import { awardTokens } from './tokens';
import { trackQuestAction } from './quests';

export const votingRoutes = new Hono<{ Bindings: Env }>();

// GET /api/voting/lore - Get lore entries for voting
votingRoutes.get('/lore', async (c) => {
  try {
    const tab = c.req.query('tab') || 'trending';
    const sort = c.req.query('sort') || 'votes';
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

    // Get user ID for personalized data
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
      // Continue without user ID if not authenticated
    }

    let query = `
      SELECT 
        l.id,
        l.character_id,
        l.body,
        l.author_user_id,
        l.created_at,
        c.name as character_name,
        c.accessories as character_image_url,
        u.username as author_username,
        COUNT(DISTINCT ll.id) as likes_count,
        COUNT(DISTINCT v.id) as vote_count,
        AVG(CASE WHEN v.vote_type = 'up' THEN 100 WHEN v.vote_type = 'down' THEN 0 ELSE 50 END) as quality_score,
        ${userId ? `MAX(CASE WHEN ll.user_id = ? THEN 1 ELSE 0 END) as user_liked` : '0 as user_liked'},
        ${userId ? `MAX(CASE WHEN v.user_id = ? THEN 1 ELSE 0 END) as user_voted` : '0 as user_voted'}
      FROM lore l
      LEFT JOIN characters c ON l.character_id = c.id
      LEFT JOIN users u ON l.author_user_id = u.id
      LEFT JOIN lore_likes ll ON l.id = ll.lore_id
      LEFT JOIN lore_votes v ON l.id = v.lore_id
    `;

    const bindings: any[] = [];
    if (userId) {
      bindings.push(userId, userId); // For user_liked and user_voted checks
    }

    // Add WHERE clause based on tab
    if (tab === 'my-votes' && userId) {
      query += ` WHERE EXISTS (SELECT 1 FROM lore_votes mv WHERE mv.lore_id = l.id AND mv.user_id = ?)`;
      bindings.push(userId);
    } else if (tab === 'trending') {
      // Trending: recent entries with good engagement
      query += ` WHERE l.created_at >= date('now', '-7 days')`;
    } else if (tab === 'top') {
      // Top: highest quality scores
      query += ` WHERE 1=1`;
    } else if (tab === 'recent') {
      // Recent: newest entries
      query += ` WHERE 1=1`;
    }

    query += ` GROUP BY l.id`;

    // Add ORDER BY based on sort
    switch (sort) {
      case 'votes':
        query += ` ORDER BY vote_count DESC, l.created_at DESC`;
        break;
      case 'likes':
        query += ` ORDER BY likes_count DESC, l.created_at DESC`;
        break;
      case 'quality':
        query += ` ORDER BY quality_score DESC, vote_count DESC, l.created_at DESC`;
        break;
      case 'recent':
      default:
        query += ` ORDER BY l.created_at DESC`;
        break;
    }

    query += ` LIMIT ?`;
    bindings.push(limit);

    const loreEntries = await c.env.DB.prepare(query).bind(...bindings).all();

    // Process results to ensure proper data types
    const processedEntries = (loreEntries.results || []).map((entry: any) => ({
      ...entry,
      likes_count: entry.likes_count || 0,
      vote_count: entry.vote_count || 0,
      quality_score: Math.round(entry.quality_score || 50),
      user_liked: Boolean(entry.user_liked),
      user_voted: Boolean(entry.user_voted)
    }));

    return c.json({ success: true, data: processedEntries });
  } catch (error) {
    console.error('Get lore for voting error:', error);
    return c.json({ success: false, error: 'Failed to get lore entries' }, 500);
  }
});

// GET /api/voting/stats - Get voting statistics
votingRoutes.get('/stats', async (c) => {
  try {
    // Get user ID for personalized stats
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
      // Continue without user ID if not authenticated
    }

    const [
      totalLoreResult,
      totalVotesResult,
      topRatedResult,
      userVotesResult,
      userLoreResult
    ] = await Promise.all([
      // Total lore entries
      c.env.DB.prepare('SELECT COUNT(*) as count FROM lore').first<{ count: number }>(),
      
      // Total votes cast
      c.env.DB.prepare('SELECT COUNT(*) as count FROM lore_votes').first<{ count: number }>(),
      
      // Top rated entries (quality score >= 75)
      c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT l.id FROM lore l
          LEFT JOIN lore_votes v ON l.id = v.lore_id
          GROUP BY l.id
          HAVING AVG(CASE WHEN v.vote_type = 'up' THEN 100 WHEN v.vote_type = 'down' THEN 0 ELSE 50 END) >= 75
        )
      `).first<{ count: number }>(),
      
      // User's votes cast
      userId ? c.env.DB.prepare('SELECT COUNT(*) as count FROM lore_votes WHERE user_id = ?').bind(userId).first<{ count: number }>() : { count: 0 },
      
      // User's lore entries
      userId ? c.env.DB.prepare('SELECT COUNT(*) as count FROM lore WHERE author_user_id = ?').bind(userId).first<{ count: number }>() : { count: 0 }
    ]);

    const stats = {
      total_lore_entries: totalLoreResult?.count || 0,
      total_votes_cast: totalVotesResult?.count || 0,
      top_rated_count: topRatedResult?.count || 0,
      your_votes_cast: userVotesResult?.count || 0,
      your_lore_entries: userLoreResult?.count || 0
    };

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get voting stats error:', error);
    return c.json({ success: false, error: 'Failed to get voting stats' }, 500);
  }
});

// POST /api/voting/lore/:id/vote - Vote on a lore entry with rate limiting
votingRoutes.post('/lore/:id/vote', async (c) => {
  try {
    // Get user info
    let userId: string | null = null;
    let userAddress: string | null = null;
    try {
      const token = getCookie(c, 'session');
      if (token) {
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        if (payload) {
          userId = payload.sub;
          userAddress = payload.solana_address;
        }
      }
    } catch (error) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }

    if (!userId || !userAddress) {
      return c.json({ success: false, error: 'Must be logged in' }, 401);
    }

    // Initialize KV for rate limiting
    const kv = new CloudflareKV(c.env.CACHE);
    const hourBucket = Math.floor(Date.now() / 3600000);
    const voteKey = `votes:total:${userAddress}:${hourBucket}`;
    
    // Check vote rate limit (3 per hour)
    let totalVotes = await kv.get<number>(voteKey) || 0;
    if (totalVotes >= 3) {
      return c.json({ success: false, error: 'VOTE_LIMIT_REACHED' }, 429);
    }

    const loreId = c.req.param('id');
    const body = await c.req.json<{ vote_type: 'up' | 'down' }>();

    if (!body.vote_type || !['up', 'down'].includes(body.vote_type)) {
      return c.json({ success: false, error: 'Invalid vote type' }, 400);
    }

    // Check if lore exists and get author
    const lore = await c.env.DB.prepare(
      'SELECT id, author_user_id FROM lore WHERE id = ?'
    ).bind(loreId).first<{ id: string; author_user_id: string }>();

    if (!lore) {
      return c.json({ success: false, error: 'Lore not found' }, 404);
    }

    // Prevent self-voting
    if (lore.author_user_id === userId) {
      return c.json({ success: false, error: 'You cannot vote on your own lore' }, 400);
    }

    // Check if user already voted
    const existingVote = await c.env.DB.prepare(
      'SELECT id, vote_type FROM lore_votes WHERE lore_id = ? AND user_id = ?'
    ).bind(loreId, userId).first<{ id: string; vote_type: string }>();

    if (existingVote) {
      if (existingVote.vote_type === body.vote_type) {
        return c.json({ success: false, error: 'You have already cast this vote' }, 400);
      } else {
        // Update existing vote
        await c.env.DB.prepare(
          'UPDATE lore_votes SET vote_type = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(body.vote_type, existingVote.id).run();
      }
    } else {
      // Create new vote
      const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await c.env.DB.prepare(
        'INSERT INTO lore_votes (id, lore_id, user_id, vote_type) VALUES (?, ?, ?, ?)'
      ).bind(voteId, loreId, userId, body.vote_type).run();
      
      // Increment rate limit counter only for new votes
      await kv.set(voteKey, totalVotes + 1, 3700); // Expire after ~1 hour
      
      // Award tokens for voting
      await awardTokens(c.env.DB, userId, 50, 'voting', `Voted on lore entry`);
      
      // Track quest progress
      await trackQuestAction(c.env.DB, userId, 'vote', loreId);
    }

    // Calculate new vote count and quality score
    const voteStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as vote_count,
        AVG(CASE WHEN vote_type = 'up' THEN 100 WHEN vote_type = 'down' THEN 0 ELSE 50 END) as quality_score
      FROM lore_votes 
      WHERE lore_id = ?
    `).bind(loreId).first<{ vote_count: number; quality_score: number }>();

    return c.json({
      success: true,
      data: {
        vote_count: voteStats?.vote_count || 0,
        quality_score: Math.round(voteStats?.quality_score || 50),
        user_vote: body.vote_type
      }
    });

  } catch (error) {
    console.error('Vote on lore error:', error);
    return c.json({ success: false, error: 'Failed to vote on lore' }, 500);
  }
});

// DELETE /api/voting/lore/:id/vote - Remove vote from a lore entry
votingRoutes.delete('/lore/:id/vote', async (c) => {
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

    const loreId = c.req.param('id');

    // Remove vote
    const result = await c.env.DB.prepare(
      'DELETE FROM lore_votes WHERE lore_id = ? AND user_id = ?'
    ).bind(loreId, userId).run();

    if (!result.success) {
      return c.json({ success: false, error: 'Vote not found' }, 404);
    }

    // Calculate new vote count and quality score
    const voteStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as vote_count,
        AVG(CASE WHEN vote_type = 'up' THEN 100 WHEN vote_type = 'down' THEN 0 ELSE 50 END) as quality_score
      FROM lore_votes 
      WHERE lore_id = ?
    `).bind(loreId).first<{ vote_count: number; quality_score: number }>();

    return c.json({
      success: true,
      data: {
        vote_count: voteStats?.vote_count || 0,
        quality_score: Math.round(voteStats?.quality_score || 50),
        user_vote: null
      }
    });

  } catch (error) {
    console.error('Remove vote error:', error);
    return c.json({ success: false, error: 'Failed to remove vote' }, 500);
  }
});