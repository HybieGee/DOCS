import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';

export const tokenRoutes = new Hono<{ Bindings: Env }>();

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

// GET /api/tokens/stats - Get user's token statistics
tokenRoutes.get('/stats', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    
    // Mock data for now - in production this would query actual token balances
    const mockStats = {
      total_balance: Math.floor(Math.random() * 50000) + 10000,
      today_earned: Math.floor(Math.random() * 3000),
      daily_cap: 7500,
      streak_days: Math.floor(Math.random() * 30) + 1,
      streak_multiplier: 1.0 + (Math.floor(Math.random() * 30) > 6 ? 0.1 : 0),
      lifetime_earned: Math.floor(Math.random() * 100000) + 20000,
      rank: Math.floor(Math.random() * 1000) + 1,
      total_users: 2347
    };

    return c.json({
      success: true,
      data: mockStats
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
    
    // Mock earning history data
    const mockHistory = [
      {
        date: new Date().toISOString(),
        amount: 500,
        source: 'minting',
        description: 'Daily droplet minted (Common)'
      },
      {
        date: new Date(Date.now() - 3600000).toISOString(),
        amount: 300,
        source: 'watering',
        description: 'Watered 3 droplets'
      },
      {
        date: new Date(Date.now() - 7200000).toISOString(),
        amount: 150,
        source: 'voting',
        description: 'Voted on community lore (3 votes)'
      },
      {
        date: new Date(Date.now() - 86400000).toISOString(),
        amount: 50,
        source: 'passive',
        description: 'Daily passive rewards (Level 3 droplet)'
      },
      {
        date: new Date(Date.now() - 172800000).toISOString(),
        amount: 2500,
        source: 'minting',
        description: 'Daily droplet minted (Legendary!)'
      }
    ];

    return c.json({
      success: true,
      data: mockHistory
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

    if (body.amount > 7500) {
      return c.json({ success: false, error: 'Amount exceeds daily cap' }, 400);
    }

    // In production, this would:
    // 1. Check daily cap hasn't been reached
    // 2. Record the transaction in database
    // 3. Update user's balance
    // 4. Apply any streak multipliers
    
    console.log(`Awarding ${body.amount} tokens to user ${userId} for ${body.source}: ${body.description}`);

    return c.json({
      success: true,
      data: {
        awarded: body.amount,
        new_balance: body.amount, // Mock balance
        remaining_daily: Math.max(0, 7500 - body.amount)
      }
    });
  } catch (error) {
    console.error('Award tokens error:', error);
    return c.json({ success: false, error: 'Failed to award tokens' }, 500);
  }
});

// GET /api/tokens/leaderboard - Get community leaderboard
tokenRoutes.get('/leaderboard', async (c) => {
  try {
    // Mock leaderboard data
    const mockLeaderboard = Array.from({ length: 50 }, (_, i) => ({
      rank: i + 1,
      username: `User${Math.floor(Math.random() * 10000)}`,
      total_earned: Math.floor(Math.random() * 100000) + 10000,
      streak_days: Math.floor(Math.random() * 100),
      droplets_owned: Math.floor(Math.random() * 5) + 1
    })).sort((a, b) => b.total_earned - a.total_earned);

    return c.json({
      success: true,
      data: mockLeaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return c.json({ success: false, error: 'Failed to get leaderboard' }, 500);
  }
});