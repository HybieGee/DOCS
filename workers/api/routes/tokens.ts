import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';

export const tokenRoutes = new Hono<{ Bindings: Env }>();

// Constants
const DAILY_CAP = 7500;
const REWARDS = {
  MINT_COMMON: 500,
  MINT_LEGENDARY: 2500,
  WATER: 100,
  VOTE: 50,
  VOTE_QUALITY: 25,
  PASSIVE: {
    LEVEL_1: 10,
    LEVEL_2: 25,
    LEVEL_3: 50,
    LEVEL_4: 100,
    LEVEL_5: 200
  }
};

// Middleware to verify auth
const requireAuth = async (c: any, next: any) => {
  const token = getCookie(c, 'session');
  
  if (!token) {
    return c.json({ success: false, error: 'No session token found. Please log in again.' }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ success: false, error: 'Session expired. Please log in again.' }, 401);
  }

  c.set('userId', payload.sub);
  c.set('userAddress', payload.solana_address);
  await next();
};

// Helper to get today's date in UTC
const getTodayUTC = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
};

// Helper to ensure user has token records
const ensureUserTokenRecords = async (db: D1Database, userId: string) => {
  // Ensure token balance exists
  await db.prepare(
    'INSERT OR IGNORE INTO token_balances (user_id, balance, lifetime_earned) VALUES (?, 0, 0)'
  ).bind(userId).run();
  
  // Ensure streak exists
  await db.prepare(
    'INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)'
  ).bind(userId).run();
};

// GET /api/tokens/stats - Get user's token statistics
tokenRoutes.get('/stats', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    await ensureUserTokenRecords(c.env.DB, userId);
    
    const today = getTodayUTC();
    
    // Get user's balance
    const balance = await c.env.DB.prepare(
      'SELECT balance, lifetime_earned FROM token_balances WHERE user_id = ?'
    ).bind(userId).first<{ balance: number; lifetime_earned: number }>();
    
    // Get today's earnings
    const todayEarnings = await c.env.DB.prepare(
      'SELECT amount FROM daily_earnings WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first<{ amount: number }>();
    
    // Get user's streak
    const streak = await c.env.DB.prepare(
      'SELECT current_streak, last_active_date FROM user_streaks WHERE user_id = ?'
    ).bind(userId).first<{ current_streak: number; last_active_date: string }>();
    
    // Calculate streak multiplier
    let streakMultiplier = 1.0;
    if (streak) {
      if (streak.current_streak >= 100) streakMultiplier = 1.5;
      else if (streak.current_streak >= 30) streakMultiplier = 1.25;
      else if (streak.current_streak >= 7) streakMultiplier = 1.1;
    }
    
    // Get user rank (based on lifetime earnings)
    const rank = await c.env.DB.prepare(
      'SELECT COUNT(*) as rank FROM token_balances WHERE lifetime_earned > ?'
    ).bind(balance?.lifetime_earned || 0).first<{ rank: number }>();
    
    // Get total users
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first<{ count: number }>();

    return c.json({
      success: true,
      data: {
        total_balance: balance?.balance || 0,
        today_earned: todayEarnings?.amount || 0,
        daily_cap: DAILY_CAP,
        streak_days: streak?.current_streak || 0,
        streak_multiplier: streakMultiplier,
        lifetime_earned: balance?.lifetime_earned || 0,
        rank: (rank?.rank || 0) + 1,
        total_users: totalUsers?.count || 1
      }
    });
  } catch (error) {
    console.error('Get token stats error:', error);
    return c.json({ success: false, error: 'Failed to get token stats' }, 500);
  }
});

// GET /api/tokens/history - Get user's earning history
tokenRoutes.get('/history', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    
    // Get last 50 transactions
    const transactions = await c.env.DB.prepare(
      `SELECT amount, source, description, created_at as date 
       FROM token_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`
    ).bind(userId).all();

    return c.json({
      success: true,
      data: transactions.results || []
    });
  } catch (error) {
    console.error('Get earning history error:', error);
    return c.json({ success: false, error: 'Failed to get earning history' }, 500);
  }
});

// POST /api/tokens/award - Award tokens to user (internal use)
tokenRoutes.post('/award', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    const body = await c.req.json<{ amount: number; source: string; description: string }>();
    
    if (!body.amount || body.amount <= 0) {
      return c.json({ success: false, error: 'Invalid amount' }, 400);
    }
    
    await ensureUserTokenRecords(c.env.DB, userId);
    const today = getTodayUTC();
    
    // Check daily cap
    const todayEarnings = await c.env.DB.prepare(
      'SELECT amount FROM daily_earnings WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first<{ amount: number }>();
    
    const currentDaily = todayEarnings?.amount || 0;
    if (currentDaily >= DAILY_CAP) {
      return c.json({ success: false, error: 'Daily cap reached' }, 400);
    }
    
    // Calculate amount with cap
    const amountToAward = Math.min(body.amount, DAILY_CAP - currentDaily);
    
    // Start transaction
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Record transaction
    await c.env.DB.prepare(
      'INSERT INTO token_transactions (id, user_id, amount, source, description) VALUES (?, ?, ?, ?, ?)'
    ).bind(txId, userId, amountToAward, body.source, body.description).run();
    
    // Update balance
    await c.env.DB.prepare(
      `UPDATE token_balances 
       SET balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`
    ).bind(amountToAward, amountToAward, userId).run();
    
    // Update daily earnings
    await c.env.DB.prepare(
      `INSERT INTO daily_earnings (id, user_id, date, amount) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, date) 
       DO UPDATE SET amount = amount + ?`
    ).bind(`daily_${userId}_${today}`, userId, today, amountToAward, amountToAward).run();
    
    // Update streak if first earning of the day
    if (currentDaily === 0) {
      const streak = await c.env.DB.prepare(
        'SELECT current_streak, last_active_date FROM user_streaks WHERE user_id = ?'
      ).bind(userId).first<{ current_streak: number; last_active_date: string }>();
      
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
      
      let newStreak = 1;
      if (streak?.last_active_date === yesterdayStr) {
        newStreak = (streak.current_streak || 0) + 1;
      }
      
      await c.env.DB.prepare(
        `UPDATE user_streaks 
         SET current_streak = ?, longest_streak = MAX(longest_streak, ?), last_active_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      ).bind(newStreak, newStreak, today, userId).run();
    }
    
    // Get new balance
    const newBalance = await c.env.DB.prepare(
      'SELECT balance FROM token_balances WHERE user_id = ?'
    ).bind(userId).first<{ balance: number }>();

    return c.json({
      success: true,
      data: {
        awarded: amountToAward,
        new_balance: newBalance?.balance || 0,
        remaining_daily: Math.max(0, DAILY_CAP - currentDaily - amountToAward)
      }
    });
  } catch (error) {
    console.error('Award tokens error:', error);
    return c.json({ success: false, error: 'Failed to award tokens' }, 500);
  }
});

// Helper function to award tokens (called from other routes)
export async function awardTokens(
  db: D1Database, 
  userId: string, 
  amount: number, 
  source: string, 
  description: string
): Promise<boolean> {
  try {
    const today = getTodayUTC();
    
    // Check daily cap
    const todayEarnings = await db.prepare(
      'SELECT amount FROM daily_earnings WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first<{ amount: number }>();
    
    const currentDaily = todayEarnings?.amount || 0;
    if (currentDaily >= DAILY_CAP) {
      return false; // Daily cap reached
    }
    
    const amountToAward = Math.min(amount, DAILY_CAP - currentDaily);
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Record transaction
    await db.prepare(
      'INSERT INTO token_transactions (id, user_id, amount, source, description) VALUES (?, ?, ?, ?, ?)'
    ).bind(txId, userId, amountToAward, source, description).run();
    
    // Update balance
    await db.prepare(
      `UPDATE token_balances 
       SET balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`
    ).bind(amountToAward, amountToAward, userId).run();
    
    // Update daily earnings
    await db.prepare(
      `INSERT INTO daily_earnings (id, user_id, date, amount) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, date) 
       DO UPDATE SET amount = amount + ?`
    ).bind(`daily_${userId}_${today}`, userId, today, amountToAward, amountToAward).run();
    
    return true;
  } catch (error) {
    console.error('Award tokens helper error:', error);
    return false;
  }
}

// GET /api/tokens/leaderboard - Get community leaderboard
tokenRoutes.get('/leaderboard', async (c) => {
  try {
    const leaderboard = await c.env.DB.prepare(
      `SELECT 
        u.username,
        tb.lifetime_earned as total_earned,
        tb.balance,
        us.current_streak as streak_days,
        COUNT(DISTINCT ch.id) as droplets_owned
       FROM token_balances tb
       JOIN users u ON tb.user_id = u.id
       LEFT JOIN user_streaks us ON tb.user_id = us.user_id
       LEFT JOIN characters ch ON tb.user_id = ch.owner_user_id
       GROUP BY tb.user_id
       ORDER BY tb.lifetime_earned DESC
       LIMIT 50`
    ).all();

    const results = leaderboard.results?.map((user, index) => ({
      rank: index + 1,
      ...user
    })) || [];

    return c.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return c.json({ success: false, error: 'Failed to get leaderboard' }, 500);
  }
});

// POST /api/tokens/auto-earn - Auto-earn tokens every 30 seconds
tokenRoutes.post('/auto-earn', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    await ensureUserTokenRecords(c.env.DB, userId);
    
    const today = getTodayUTC();
    
    // Check daily cap
    const todayEarnings = await c.env.DB.prepare(
      'SELECT amount FROM daily_earnings WHERE user_id = ? AND date = ?'
    ).bind(userId, today).first<{ amount: number }>();
    
    const currentDaily = todayEarnings?.amount || 0;
    if (currentDaily >= DAILY_CAP) {
      return c.json({ success: false, error: 'Daily cap reached' }, 200);
    }
    
    // Calculate earning amount based on user's droplet level
    // For now, let's use a base rate that allows reaching daily cap
    // 7500 tokens / day = 7500 / (24 * 60 * 60 / 30) = ~2.6 tokens per 30 seconds
    // Let's round up to 3 tokens per 30 seconds for a nice even number
    let baseEarningRate = 3;
    
    // Get user's highest level droplet for bonus
    const userDroplet = await c.env.DB.prepare(
      'SELECT level, is_legendary FROM characters WHERE owner_user_id = ? ORDER BY level DESC LIMIT 1'
    ).bind(userId).first<{ level: number; is_legendary: number }>();
    
    if (userDroplet) {
      // Bonus based on droplet level
      baseEarningRate += userDroplet.level; // +1 to +5 based on level
      if (userDroplet.is_legendary) {
        baseEarningRate *= 2; // Legendary droplets earn 2x
      }
    }
    
    // Apply streak multiplier
    const streak = await c.env.DB.prepare(
      'SELECT current_streak FROM user_streaks WHERE user_id = ?'
    ).bind(userId).first<{ current_streak: number }>();
    
    let multiplier = 1.0;
    if (streak) {
      if (streak.current_streak >= 100) multiplier = 1.5;
      else if (streak.current_streak >= 30) multiplier = 1.25;
      else if (streak.current_streak >= 7) multiplier = 1.1;
    }
    
    const finalAmount = Math.floor(baseEarningRate * multiplier);
    const amountToAward = Math.min(finalAmount, DAILY_CAP - currentDaily);
    
    if (amountToAward <= 0) {
      return c.json({ success: false, error: 'Daily cap reached' }, 200);
    }
    
    // Award the tokens
    const success = await awardTokens(
      c.env.DB, 
      userId, 
      amountToAward, 
      'passive', 
      `Auto-earned ${amountToAward} tokens (${userDroplet ? `Level ${userDroplet.level}` : 'No droplet'})`
    );
    
    if (success) {
      return c.json({ 
        success: true, 
        data: { 
          earned: amountToAward,
          remaining_daily: DAILY_CAP - currentDaily - amountToAward
        } 
      });
    } else {
      return c.json({ success: false, error: 'Failed to award tokens' }, 500);
    }
    
  } catch (error) {
    console.error('Auto-earn tokens error:', error);
    return c.json({ success: false, error: 'Failed to auto-earn tokens' }, 500);
  }
});