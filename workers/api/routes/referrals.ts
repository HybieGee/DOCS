import { Hono } from 'hono';
import { generateSeed } from '../lib/genImage';

export const referralRoutes = new Hono<{ Bindings: Env }>();

// Generate unique referral code for user
referralRoutes.post('/generate-code/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  try {
    // Check if user already has a referral code
    const existingCode = await c.env.DB.prepare(`
      SELECT code FROM referral_codes WHERE user_id = ?
    `).bind(userId).first();
    
    if (existingCode) {
      return c.json({ success: true, code: existingCode.code });
    }
    
    // Generate unique code based on user ID
    const seed = await generateSeed(userId + Date.now().toString());
    const code = seed.slice(0, 8).toUpperCase();
    
    // Create referral code
    await c.env.DB.prepare(`
      INSERT INTO referral_codes (id, user_id, code, uses_count, max_uses, is_active, created_at)
      VALUES (?, ?, ?, 0, 100, 1, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), userId, code).run();
    
    return c.json({ success: true, code });
  } catch (error) {
    console.error('Error generating referral code:', error);
    return c.json({ error: 'Failed to generate referral code' }, 500);
  }
});

// Apply referral code when new user joins
referralRoutes.post('/apply-code', async (c) => {
  const { referralCode, newUserId } = await c.req.json();
  
  try {
    // Find the referral code and its owner
    const codeData = await c.env.DB.prepare(`
      SELECT rc.*, u.username as referrer_username 
      FROM referral_codes rc 
      JOIN users u ON rc.user_id = u.id 
      WHERE rc.code = ? AND rc.is_active = 1 AND rc.uses_count < rc.max_uses
    `).bind(referralCode).first();
    
    if (!codeData) {
      return c.json({ error: 'Invalid or expired referral code' }, 400);
    }
    
    // Check if user was already referred
    const existingReferral = await c.env.DB.prepare(`
      SELECT id FROM user_referrals WHERE referee_user_id = ?
    `).bind(newUserId).first();
    
    if (existingReferral) {
      return c.json({ error: 'User has already been referred' }, 400);
    }
    
    // Create referral record
    const referralId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO user_referrals (
        id, referrer_user_id, referee_user_id, referral_code, 
        bonus_claimed, referrer_bonus, referee_bonus, 
        activity_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 1000, 500, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(referralId, codeData.user_id, newUserId, referralCode).run();
    
    // Update referral code usage count
    await c.env.DB.prepare(`
      UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = ?
    `).bind(codeData.id).run();
    
    // Give initial bonus to new user
    await c.env.DB.prepare(`
      UPDATE users SET token_balance = token_balance + 500 WHERE id = ?
    `).bind(newUserId).run();
    
    return c.json({ 
      success: true, 
      message: 'Referral applied successfully! You received 500 $DROPLET bonus.',
      referrerUsername: codeData.referrer_username 
    });
  } catch (error) {
    console.error('Error applying referral code:', error);
    return c.json({ error: 'Failed to apply referral code' }, 500);
  }
});

// Complete referral activity (when referee creates their first droplet)
referralRoutes.post('/complete-activity/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  try {
    // Find pending referral for this user
    const referral = await c.env.DB.prepare(`
      SELECT * FROM user_referrals 
      WHERE referee_user_id = ? AND activity_completed = 0
    `).bind(userId).first();
    
    if (!referral) {
      return c.json({ success: false, message: 'No pending referral found' });
    }
    
    // Mark activity as completed
    await c.env.DB.prepare(`
      UPDATE user_referrals 
      SET activity_completed = 1, bonus_claimed = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(referral.id).run();
    
    // Give bonus to referrer
    await c.env.DB.prepare(`
      UPDATE users SET token_balance = token_balance + 1000 WHERE id = ?
    `).bind(referral.referrer_user_id).run();
    
    return c.json({ 
      success: true, 
      message: 'Referral completed! Referrer received 1000 $DROPLET bonus.' 
    });
  } catch (error) {
    console.error('Error completing referral activity:', error);
    return c.json({ error: 'Failed to complete referral activity' }, 500);
  }
});

// Get user's referral stats
referralRoutes.get('/stats/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  try {
    // Get user's referral code
    const referralCode = await c.env.DB.prepare(`
      SELECT code, uses_count, max_uses FROM referral_codes WHERE user_id = ?
    `).bind(userId).first();
    
    // Get referral stats
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_referrals,
        SUM(CASE WHEN activity_completed = 1 THEN 1 ELSE 0 END) as completed_referrals,
        SUM(CASE WHEN bonus_claimed = 1 THEN referrer_bonus ELSE 0 END) as total_earned
      FROM user_referrals 
      WHERE referrer_user_id = ?
    `).bind(userId).first();
    
    // Get recent referrals
    const recentReferrals = await c.env.DB.prepare(`
      SELECT 
        ur.*,
        u.username as referee_username
      FROM user_referrals ur
      JOIN users u ON ur.referee_user_id = u.id
      WHERE ur.referrer_user_id = ?
      ORDER BY ur.created_at DESC
      LIMIT 10
    `).bind(userId).all();
    
    return c.json({
      success: true,
      referralCode: referralCode?.code || null,
      stats: {
        totalReferrals: stats?.total_referrals || 0,
        completedReferrals: stats?.completed_referrals || 0,
        totalEarned: stats?.total_earned || 0,
        codeUsesLeft: referralCode ? (referralCode.max_uses - referralCode.uses_count) : 100
      },
      recentReferrals: recentReferrals.results || []
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return c.json({ error: 'Failed to get referral stats' }, 500);
  }
});