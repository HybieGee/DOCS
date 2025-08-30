import { Hono } from 'hono';
import type { Env } from '../index';

export const leaderboardRoutes = new Hono<{ Bindings: Env }>();

// Get leaderboards
leaderboardRoutes.get('/', async (c) => {
  try {
    const type = c.req.query('type') || 'creators';
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

    let query = '';
    const cacheKey = `leaderboard_${type}_${limit}`;

    // Try cache first
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json({ success: true, data: JSON.parse(cached) });
    }

    switch (type) {
      case 'creators':
        // Top character creators
        query = `
          SELECT u.username, u.solana_address, COUNT(c.id) as character_count,
                 SUM(CASE WHEN c.is_legendary = 1 THEN 1 ELSE 0 END) as legendary_count
          FROM users u
          LEFT JOIN characters c ON u.id = c.owner_user_id
          GROUP BY u.id
          HAVING character_count > 0
          ORDER BY character_count DESC, legendary_count DESC
          LIMIT ?
        `;
        break;

      case 'gardeners':
        // Top waterers
        query = `
          SELECT u.username, u.solana_address, COUNT(w.id) as waters_given
          FROM users u
          LEFT JOIN waters w ON u.id = w.user_id
          GROUP BY u.id
          HAVING waters_given > 0
          ORDER BY waters_given DESC
          LIMIT ?
        `;
        break;

      case 'loved':
        // Most loved characters
        query = `
          SELECT c.name, c.id, c.water_count, c.level, c.is_legendary, 
                 u.username as owner_username, u.solana_address as owner_address
          FROM characters c
          LEFT JOIN users u ON c.owner_user_id = u.id
          ORDER BY c.water_count DESC, c.level DESC
          LIMIT ?
        `;
        break;

      case 'authors':
        // Top lore authors
        query = `
          SELECT u.username, u.solana_address, 
                 COUNT(l.id) as lore_count,
                 SUM(l.votes) as total_votes,
                 SUM(CASE WHEN l.is_canon = 1 THEN 1 ELSE 0 END) as canon_count
          FROM users u
          LEFT JOIN lore l ON u.id = l.author_user_id
          GROUP BY u.id
          HAVING lore_count > 0
          ORDER BY canon_count DESC, total_votes DESC, lore_count DESC
          LIMIT ?
        `;
        break;

      default:
        return c.json({ success: false, error: 'Invalid leaderboard type' }, 400);
    }

    const results = await c.env.DB.prepare(query).bind(limit).all();

    // Add rankings
    const rankedResults = results.results.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // Cache for 5 minutes
    await c.env.CACHE.put(cacheKey, JSON.stringify(rankedResults), { expirationTtl: 300 });

    return c.json({ success: true, data: rankedResults });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return c.json({ success: false, error: 'Failed to get leaderboard' }, 500);
  }
});

// Get user stats
leaderboardRoutes.get('/user/:address', async (c) => {
  try {
    const address = (c as any).param('address');
    const cacheKey = `user_stats_${address}`;

    // Try cache first
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json({ success: true, data: JSON.parse(cached) });
    }

    // Get user
    const user = await c.env.DB.prepare(
      'SELECT id, username, solana_address, created_at FROM users WHERE solana_address = ?'
    )
      .bind(address)
      .first();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Get user statistics
    const stats = await Promise.all([
      // Characters created
      c.env.DB.prepare(
        `SELECT COUNT(*) as count, 
                SUM(CASE WHEN is_legendary = 1 THEN 1 ELSE 0 END) as legendary_count
         FROM characters WHERE owner_user_id = ?`
      )
        .bind(user.id)
        .first(),

      // Waters given
      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM waters WHERE user_id = ?'
      )
        .bind(user.id)
        .first(),

      // Waters received (on owned characters)
      c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM waters w
         INNER JOIN characters c ON w.character_id = c.id
         WHERE c.owner_user_id = ?`
      )
        .bind(user.id)
        .first(),

      // Lore contributions
      c.env.DB.prepare(
        `SELECT COUNT(*) as submissions,
                SUM(votes) as total_votes,
                SUM(CASE WHEN is_canon = 1 THEN 1 ELSE 0 END) as canon_count
         FROM lore WHERE author_user_id = ?`
      )
        .bind(user.id)
        .first(),
    ]);

    const userStats = {
      user: {
        username: user.username,
        solana_address: user.solana_address,
        joined: user.created_at,
      },
      characters: {
        total: stats[0]?.count || 0,
        legendary: stats[0]?.legendary_count || 0,
      },
      waters: {
        given: stats[1]?.count || 0,
        received: stats[2]?.count || 0,
      },
      lore: {
        submissions: stats[3]?.submissions || 0,
        votes: stats[3]?.total_votes || 0,
        canon: stats[3]?.canon_count || 0,
      },
    };

    // Cache for 2 minutes
    await c.env.CACHE.put(cacheKey, JSON.stringify(userStats), { expirationTtl: 120 });

    return c.json({ success: true, data: userStats });
  } catch (error) {
    console.error('User stats error:', error);
    return c.json({ success: false, error: 'Failed to get user stats' }, 500);
  }
});