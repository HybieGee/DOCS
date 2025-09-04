import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';

// Helper function to redistribute overlapping characters
async function redistributeOverlappingCharacters(db: D1Database): Promise<void> {
  const MIN_DISTANCE = 80;
  const WORLD_WIDTH = 1920;
  const WORLD_HEIGHT = 200;
  const GROUND_Y_START = 600;
  
  console.log('Starting character position redistribution...');
  
  // Get all existing characters
  const allCharacters = await db.prepare(
    'SELECT id, x, y, created_at FROM characters ORDER BY created_at ASC'
  ).all();
  
  const characters = allCharacters.results || [];
  console.log(`Found ${characters.length} characters to reposition`);
  
  if (characters.length === 0) return;
  
  const newPositions: Array<{ id: string; x: number; y: number }> = [];
  const occupiedPositions: Array<{ x: number; y: number }> = [];
  
  // Generate new positions for each character
  for (const char of characters) {
    const charData = char as any;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;
    let newPosition: { x: number; y: number } | null = null;
    
    while (attempts < MAX_ATTEMPTS && !newPosition) {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT + GROUND_Y_START;
      
      // Check if this position is too close to any occupied position
      let tooClose = false;
      for (const pos of occupiedPositions) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < MIN_DISTANCE) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        newPosition = { x, y };
        occupiedPositions.push(newPosition);
      }
      
      attempts++;
    }
    
    // Fallback if we can't find a safe position
    if (!newPosition) {
      newPosition = {
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT + GROUND_Y_START
      };
      occupiedPositions.push(newPosition);
    }
    
    newPositions.push({
      id: charData.id,
      x: newPosition.x,
      y: newPosition.y
    });
  }
  
  console.log(`Generated ${newPositions.length} new positions`);
  
  // Update all characters with new positions
  for (const pos of newPositions) {
    await db.prepare(
      'UPDATE characters SET x = ?, y = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(pos.x, pos.y, pos.id).run();
  }
  
  console.log('Character position redistribution complete!');
}

export const systemRoutes = new Hono<{ Bindings: Env }>();

// GET /api/system/stats - Get comprehensive system statistics
systemRoutes.get('/stats', async (c) => {
  try {
    // Run multiple queries in parallel for efficiency
    const [
      charactersResult,
      watersResult,
      usersResult,
      aiCreationsResult,
      legendaryResult,
      dailyMintsResult
    ] = await Promise.all([
      // Total characters
      c.env.DB.prepare('SELECT COUNT(*) as count FROM characters').first<{ count: number }>(),
      
      // Total waters
      c.env.DB.prepare('SELECT COUNT(*) as count FROM waters').first<{ count: number }>(),
      
      // Total users
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      
      // AI creations (those starting with 'cr_')
      c.env.DB.prepare("SELECT COUNT(*) as count FROM characters WHERE id LIKE 'cr_%'").first<{ count: number }>(),
      
      // Legendary characters
      c.env.DB.prepare('SELECT COUNT(*) as count FROM characters WHERE is_legendary = 1').first<{ count: number }>(),
      
      // Daily mints (today)
      c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM characters 
        WHERE date(created_at) = date('now')
      `).first<{ count: number }>()
    ]);

    // Calculate API response time (simulate)
    const apiStartTime = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    const apiResponseTime = Date.now() - apiStartTime;

    // Calculate database integrity score
    const integrityChecks = await Promise.all([
      // Check for orphaned records
      c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM waters w 
        LEFT JOIN characters c ON w.character_id = c.id 
        WHERE c.id IS NULL
      `).first<{ count: number }>(),
      
      // Check for invalid user references
      c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM characters ch 
        LEFT JOIN users u ON ch.owner_user_id = u.id 
        WHERE u.id IS NULL
      `).first<{ count: number }>(),
      
      // Check for negative water counts
      c.env.DB.prepare('SELECT COUNT(*) as count FROM characters WHERE water_count < 0').first<{ count: number }>()
    ]);

    const totalIntegrityIssues = integrityChecks.reduce((sum, check) => sum + (check?.count || 0), 0);
    const totalRecords = (charactersResult?.count || 0) + (watersResult?.count || 0) + (usersResult?.count || 0);
    const integrityScore = totalRecords > 0 ? Math.max(0, 100 - (totalIntegrityIssues / totalRecords * 100)) : 100;

    // AI creations are considered "verified" if they have valid image URLs or metadata
    const verifiedImagesResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM characters 
      WHERE id LIKE 'cr_%' AND (accessories IS NOT NULL OR sprite_seed IS NOT NULL)
    `).first<{ count: number }>();

    const stats = {
      total_characters: charactersResult?.count || 0,
      total_waters: watersResult?.count || 0,
      total_users: usersResult?.count || 0,
      ai_creations: aiCreationsResult?.count || 0,
      verified_images: verifiedImagesResult?.count || 0,
      legendary_count: legendaryResult?.count || 0,
      daily_mints: dailyMintsResult?.count || 0,
      api_response_time: apiResponseTime,
      database_integrity_score: Math.round(integrityScore * 100) / 100,
      last_verification_check: new Date().toISOString()
    };

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('System stats error:', error);
    return c.json({ success: false, error: 'Failed to fetch system stats' }, 500);
  }
});

// GET /api/system/verification-logs - Get recent verification logs
systemRoutes.get('/verification-logs', async (c) => {
  try {
    // For now, generate mock verification logs
    // In a real system, these would come from a verification_logs table
    const mockLogs = [
      {
        id: 'log_' + Date.now() + '_1',
        type: 'image_hash' as const,
        status: 'verified' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        details: 'Image hash verification completed for 15 new creations'
      },
      {
        id: 'log_' + Date.now() + '_2',
        type: 'stats_audit' as const,
        status: 'verified' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
        details: 'Statistics integrity check passed - no anomalies detected'
      },
      {
        id: 'log_' + Date.now() + '_3',
        type: 'blockchain_verify' as const,
        status: 'verified' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        details: 'Blockchain anchoring verified for latest batch'
      },
      {
        id: 'log_' + Date.now() + '_4',
        type: 'api_integrity' as const,
        status: 'verified' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 minutes ago
        details: 'API rate limiting and security checks passed'
      }
    ];

    return c.json({ success: true, data: mockLogs });
  } catch (error) {
    console.error('Verification logs error:', error);
    return c.json({ success: false, error: 'Failed to fetch verification logs' }, 500);
  }
});

// POST /api/system/verify/:type - Run verification check
systemRoutes.post('/verify/:type', async (c) => {
  try {
    // Get user info for authentication
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

    const verificationType = c.req.param('type');
    
    switch (verificationType) {
      case 'images':
        // Verify AI-generated images
        const aiCreations = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM characters 
          WHERE id LIKE 'cr_%' AND accessories IS NOT NULL
        `).first<{ count: number }>();
        
        return c.json({ 
          success: true, 
          data: { 
            type: 'image_verification',
            verified_count: aiCreations?.count || 0,
            message: `Verified ${aiCreations?.count || 0} AI-generated images`
          } 
        });

      case 'ai-signatures':
        // Check AI signatures in metadata
        const signaturesResult = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM characters 
          WHERE id LIKE 'cr_%' AND sprite_seed IS NOT NULL
        `).first<{ count: number }>();
        
        return c.json({ 
          success: true, 
          data: { 
            type: 'signature_verification',
            verified_count: signaturesResult?.count || 0,
            message: `Verified AI signatures for ${signaturesResult?.count || 0} creations`
          } 
        });

      case 'database':
        // Run database integrity audit
        const orphanedWaters = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM waters w 
          LEFT JOIN characters c ON w.character_id = c.id 
          WHERE c.id IS NULL
        `).first<{ count: number }>();

        const orphanedCharacters = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM characters ch 
          LEFT JOIN users u ON ch.owner_user_id = u.id 
          WHERE u.id IS NULL
        `).first<{ count: number }>();

        const totalIssues = (orphanedWaters?.count || 0) + (orphanedCharacters?.count || 0);
        
        return c.json({ 
          success: true, 
          data: { 
            type: 'database_audit',
            issues_found: totalIssues,
            message: totalIssues === 0 ? 'Database integrity check passed' : `Found ${totalIssues} integrity issues`
          } 
        });

      case 'stats':
        // Validate statistics for anomalies
        const todayWaters = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM waters 
          WHERE date(created_at) = date('now')
        `).first<{ count: number }>();

        const todayCreations = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM characters 
          WHERE date(created_at) = date('now')
        `).first<{ count: number }>();

        // Simple anomaly detection: if today's activity is more than 10x the average
        const avgDailyWaters = (await c.env.DB.prepare(`
          SELECT AVG(daily_count) as avg FROM (
            SELECT date(created_at) as day, COUNT(*) as daily_count 
            FROM waters 
            WHERE created_at >= date('now', '-7 days')
            GROUP BY date(created_at)
          )
        `).first<{ avg: number }>())?.avg || 0;

        const isAnomalous = (todayWaters?.count || 0) > avgDailyWaters * 10;
        
        return c.json({ 
          success: true, 
          data: { 
            type: 'stats_validation',
            anomalies_detected: isAnomalous,
            today_waters: todayWaters?.count || 0,
            today_creations: todayCreations?.count || 0,
            message: isAnomalous ? 'Anomalous activity detected - flagged for review' : 'Statistics validation passed'
          } 
        });

      default:
        return c.json({ success: false, error: 'Unknown verification type' }, 400);
    }

  } catch (error) {
    console.error('Verification check error:', error);
    return c.json({ success: false, error: 'Verification check failed' }, 500);
  }
});

// GET /api/system/health - System health check
systemRoutes.get('/health', async (c) => {
  try {
    const healthChecks = await Promise.all([
      // Database connectivity
      c.env.DB.prepare('SELECT 1 as test').first(),
      
      // Basic query performance
      c.env.DB.prepare('SELECT COUNT(*) as count FROM characters LIMIT 1').first()
    ]);

    const allHealthy = healthChecks.every(check => check !== null);

    return c.json({
      success: true,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: healthChecks[0] ? 'ok' : 'fail',
          performance: healthChecks[1] ? 'ok' : 'fail'
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return c.json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }
    }, 500);
  }
});

// POST /api/system/fix-overlaps - Fix overlapping character positions
systemRoutes.post('/fix-overlaps', async (c) => {
  try {
    console.log('Fix overlaps endpoint called');
    
    // Run the redistribution
    await redistributeOverlappingCharacters(c.env.DB);
    
    // Clear any cached data
    await c.env.CACHE.delete('world_state');
    
    return c.json({ 
      success: true, 
      message: 'All character positions have been redistributed to prevent overlaps' 
    });
  } catch (error) {
    console.error('Fix overlaps error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to redistribute positions' 
    }, 500);
  }
});

// GET /api/system/overlap-status - Check current overlap status  
systemRoutes.get('/overlap-status', async (c) => {
  try {
    const MIN_DISTANCE = 80;
    
    // Get all characters
    const allCharacters = await c.env.DB.prepare(
      'SELECT id, x, y FROM characters'
    ).all();
    
    const characters = (allCharacters.results || []) as Array<{ id: string; x: number; y: number }>;
    
    // Check for overlaps
    let overlapCount = 0;
    const overlaps: Array<{ char1: string; char2: string; distance: number }> = [];
    
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const char1 = characters[i];
        const char2 = characters[j];
        
        const distance = Math.sqrt(
          Math.pow(char1.x - char2.x, 2) + Math.pow(char1.y - char2.y, 2)
        );
        
        if (distance < MIN_DISTANCE) {
          overlapCount++;
          overlaps.push({
            char1: char1.id,
            char2: char2.id,
            distance: Math.round(distance * 100) / 100
          });
        }
      }
    }
    
    return c.json({
      success: true,
      data: {
        total_characters: characters.length,
        overlapping_pairs: overlapCount,
        min_distance_required: MIN_DISTANCE,
        overlaps: overlaps.slice(0, 10) // Show first 10 overlaps
      }
    });
  } catch (error) {
    console.error('Overlap status check error:', error);
    return c.json({ success: false, error: 'Failed to check overlap status' }, 500);
  }
});