import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';
import { awardTokens } from './tokens';

export const questRoutes = new Hono<{ Bindings: Env }>();

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

// Helper to get the start of the current week (Monday)
const getWeekStartUTC = () => {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setUTCDate(diff));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
};

// Track a quest action
export async function trackQuestAction(
  db: D1Database,
  userId: string,
  actionType: string,
  targetId?: string
): Promise<void> {
  try {
    // Log the action
    const logId = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.prepare(
      'INSERT INTO quest_activity_log (id, user_id, action_type, target_id) VALUES (?, ?, ?, ?)'
    ).bind(logId, userId, actionType, targetId || null).run();
    
    const today = getTodayUTC();
    const weekStart = getWeekStartUTC();
    
    // Update progress for relevant quests
    if (actionType === 'water' || actionType === 'water_unique') {
      // Update daily water quest
      await updateQuestProgress(db, userId, 'daily_water_3', 1, today);
      // Update weekly water quest
      await updateQuestProgress(db, userId, 'weekly_water_50', 1, weekStart);
      
      // Check water achievements
      const waterCount = await db.prepare(
        'SELECT COUNT(*) as count FROM quest_activity_log WHERE user_id = ? AND action_type LIKE ?'
      ).bind(userId, 'water%').first<{ count: number }>();
      
      if (waterCount && waterCount.count >= 100) {
        await completeAchievement(db, userId, 'achievement_water_100');
      }
    }
    
    if (actionType === 'vote') {
      // Update daily vote quest
      await updateQuestProgress(db, userId, 'daily_vote_5', 1, today);
      // Update weekly vote quest
      await updateQuestProgress(db, userId, 'weekly_vote_30', 1, weekStart);
      
      // Check vote achievements
      const voteCount = await db.prepare(
        'SELECT COUNT(*) as count FROM quest_activity_log WHERE user_id = ? AND action_type = ?'
      ).bind(userId, 'vote').first<{ count: number }>();
      
      if (voteCount && voteCount.count >= 1000) {
        await completeAchievement(db, userId, 'achievement_votes_1000');
      }
    }
    
    if (actionType === 'login') {
      // Update daily login quest
      await updateQuestProgress(db, userId, 'daily_login', 1, today);
      
      // Check weekly streak
      const lastSevenDays = await db.prepare(
        `SELECT COUNT(DISTINCT DATE(timestamp)) as days 
         FROM quest_activity_log 
         WHERE user_id = ? AND action_type = ? 
         AND timestamp >= date('now', '-7 days')`
      ).bind(userId, 'login').first<{ days: number }>();
      
      if (lastSevenDays && lastSevenDays.days >= 7) {
        await updateQuestProgress(db, userId, 'weekly_streak_7', lastSevenDays.days, weekStart);
      }
    }
    
    if (actionType === 'mint') {
      await completeAchievement(db, userId, 'achievement_first_mint');
    }
    
    if (actionType === 'mint_legendary') {
      await completeAchievement(db, userId, 'achievement_legendary');
    }
    
  } catch (error) {
    console.error('Track quest action error:', error);
  }
}

// Update quest progress
async function updateQuestProgress(
  db: D1Database,
  userId: string,
  questId: string,
  progress: number,
  resetDate: string
): Promise<void> {
  const progressId = `qp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get quest requirements
  const quest = await db.prepare(
    'SELECT requirement_count FROM quest_definitions WHERE id = ?'
  ).bind(questId).first<{ requirement_count: number }>();
  
  if (!quest) return;
  
  // Upsert progress
  await db.prepare(
    `INSERT INTO user_quest_progress (id, user_id, quest_id, current_progress, reset_date, completed, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, quest_id, reset_date) 
     DO UPDATE SET 
       current_progress = MIN(current_progress + ?, ?),
       completed = current_progress + ? >= ?,
       completed_at = CASE WHEN current_progress + ? >= ? THEN CURRENT_TIMESTAMP ELSE completed_at END,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(
    progressId, userId, questId, progress, resetDate, 
    progress >= quest.requirement_count, progress >= quest.requirement_count ? new Date().toISOString() : null,
    progress, quest.requirement_count,
    progress, quest.requirement_count,
    progress, quest.requirement_count
  ).run();
}

// Complete an achievement
async function completeAchievement(
  db: D1Database,
  userId: string,
  achievementId: string
): Promise<void> {
  // Check if already earned
  const existing = await db.prepare(
    'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
  ).bind(userId, achievementId).first();
  
  if (existing) return;
  
  // Award achievement
  const achievementRecordId = `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.prepare(
    'INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)'
  ).bind(achievementRecordId, userId, achievementId).run();
  
  // Also create a completed quest progress entry
  const progressId = `qp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const quest = await db.prepare(
    'SELECT requirement_count FROM quest_definitions WHERE id = ?'
  ).bind(achievementId).first<{ requirement_count: number }>();
  
  if (quest) {
    await db.prepare(
      'INSERT INTO user_quest_progress (id, user_id, quest_id, current_progress, completed, completed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(progressId, userId, achievementId, quest.requirement_count, true, new Date().toISOString()).run();
  }
}

// GET /api/quests - Get user's quest progress
questRoutes.get('/', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    const today = getTodayUTC();
    const weekStart = getWeekStartUTC();
    
    // Get all quest definitions
    const questsResult = await c.env.DB.prepare(
      'SELECT * FROM quest_definitions ORDER BY type, token_reward DESC'
    ).all();
    
    // Get user's progress for daily quests
    const dailyProgress = await c.env.DB.prepare(
      `SELECT quest_id, current_progress, completed, claimed 
       FROM user_quest_progress 
       WHERE user_id = ? AND reset_date = ?`
    ).bind(userId, today).all();
    
    // Get user's progress for weekly quests
    const weeklyProgress = await c.env.DB.prepare(
      `SELECT quest_id, current_progress, completed, claimed 
       FROM user_quest_progress 
       WHERE user_id = ? AND reset_date = ?`
    ).bind(userId, weekStart).all();
    
    // Get user's achievements
    const achievements = await c.env.DB.prepare(
      `SELECT up.quest_id, up.current_progress, up.completed, up.claimed, ua.earned_at
       FROM quest_definitions qd
       LEFT JOIN user_quest_progress up ON qd.id = up.quest_id AND up.user_id = ?
       LEFT JOIN user_achievements ua ON qd.id = ua.achievement_id AND ua.user_id = ?
       WHERE qd.type = 'achievement'`
    ).bind(userId, userId).all();
    
    // Combine data
    const quests = (questsResult.results || []).map((quest: any) => {
      let progress: any = null;
      
      if (quest.type === 'daily') {
        progress = (dailyProgress.results || []).find((p: any) => p.quest_id === quest.id);
      } else if (quest.type === 'weekly') {
        progress = (weeklyProgress.results || []).find((p: any) => p.quest_id === quest.id);
      } else if (quest.type === 'achievement') {
        progress = (achievements.results || []).find((p: any) => p.quest_id === quest.id);
      }
      
      return {
        ...quest,
        current_progress: progress?.current_progress || 0,
        completed: progress?.completed || false,
        claimed: progress?.claimed || false,
        earned_at: progress?.earned_at || null
      };
    });
    
    // Separate by type
    const response = {
      daily: quests.filter(q => q.type === 'daily'),
      weekly: quests.filter(q => q.type === 'weekly'),
      achievements: quests.filter(q => q.type === 'achievement')
    };
    
    return c.json({ success: true, data: response });
  } catch (error) {
    console.error('Get quests error:', error);
    return c.json({ success: false, error: 'Failed to get quests' }, 500);
  }
});

// POST /api/quests/:questId/claim - Claim quest rewards
questRoutes.post('/:questId/claim', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    const questId = c.req.param('questId');
    
    // Get quest details
    const quest = await c.env.DB.prepare(
      'SELECT * FROM quest_definitions WHERE id = ?'
    ).bind(questId).first<any>();
    
    if (!quest) {
      return c.json({ success: false, error: 'Quest not found' }, 404);
    }
    
    // Check if quest is completed and not claimed
    let resetDate = null;
    if (quest.type === 'daily') {
      resetDate = getTodayUTC();
    } else if (quest.type === 'weekly') {
      resetDate = getWeekStartUTC();
    }
    
    const progress = await c.env.DB.prepare(
      `SELECT * FROM user_quest_progress 
       WHERE user_id = ? AND quest_id = ? ${resetDate ? 'AND reset_date = ?' : ''}`
    ).bind(userId, questId, ...(resetDate ? [resetDate] : [])).first<any>();
    
    if (!progress || !progress.completed) {
      return c.json({ success: false, error: 'Quest not completed' }, 400);
    }
    
    if (progress.claimed) {
      return c.json({ success: false, error: 'Reward already claimed' }, 400);
    }
    
    // Award tokens
    const awarded = await awardTokens(
      c.env.DB,
      userId,
      quest.token_reward,
      'quest',
      `Completed quest: ${quest.name}`
    );
    
    if (!awarded) {
      return c.json({ success: false, error: 'Failed to award tokens' }, 500);
    }
    
    // Mark as claimed
    await c.env.DB.prepare(
      `UPDATE user_quest_progress 
       SET claimed = TRUE, claimed_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND quest_id = ? ${resetDate ? 'AND reset_date = ?' : ''}`
    ).bind(userId, questId, ...(resetDate ? [resetDate] : [])).run();
    
    return c.json({ 
      success: true, 
      data: { 
        tokens_awarded: quest.token_reward,
        quest_name: quest.name 
      } 
    });
  } catch (error) {
    console.error('Claim quest error:', error);
    return c.json({ success: false, error: 'Failed to claim quest' }, 500);
  }
});

// POST /api/quests/track-online - Track online time for daily quest
questRoutes.post('/track-online', requireAuth, async (c) => {
  try {
    const userId = c.get('userId' as never) as string;
    const today = getTodayUTC();
    
    // Check if we've already tracked a recent online ping (within last 2 minutes)
    const recentPing = await c.env.DB.prepare(
      `SELECT id FROM quest_activity_log 
       WHERE user_id = ? AND action_type = 'online_ping' 
       AND timestamp > datetime('now', '-2 minutes')`
    ).bind(userId).first();
    
    if (!recentPing) {
      // Track online ping
      await trackQuestAction(c.env.DB, userId, 'online_ping');
      
      // Count online pings today (each ping = ~1 minute online)
      const onlineMinutes = await c.env.DB.prepare(
        `SELECT COUNT(*) as minutes FROM quest_activity_log 
         WHERE user_id = ? AND action_type = 'online_ping' 
         AND DATE(timestamp) = ?`
      ).bind(userId, today).first<{ minutes: number }>();
      
      if (onlineMinutes && onlineMinutes.minutes >= 30) {
        await updateQuestProgress(c.env.DB, userId, 'daily_active_30min', 30, today);
      } else if (onlineMinutes) {
        await updateQuestProgress(c.env.DB, userId, 'daily_active_30min', onlineMinutes.minutes, today);
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Track online error:', error);
    return c.json({ success: false, error: 'Failed to track online time' }, 500);
  }
});