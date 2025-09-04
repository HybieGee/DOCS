import { Hono } from 'hono';
import type { Env } from '../index';

export const fixPositionsRoutes = new Hono<{ Bindings: Env }>();

// Helper function to generate non-overlapping positions for existing characters
async function redistributeExistingCharacters(db: D1Database): Promise<void> {
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

// POST /api/fix-positions/redistribute - Admin endpoint to fix overlapping positions
fixPositionsRoutes.post('/redistribute', async (c) => {
  try {
    console.log('Fix positions endpoint called');
    
    // Run the redistribution
    await redistributeExistingCharacters(c.env.DB);
    
    // Clear any cached data
    await c.env.CACHE.delete('world_state');
    
    return c.json({ 
      success: true, 
      message: 'All character positions have been redistributed to prevent overlaps' 
    });
  } catch (error) {
    console.error('Fix positions error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to redistribute positions' 
    }, 500);
  }
});

// GET /api/fix-positions/status - Check overlap status
fixPositionsRoutes.get('/status', async (c) => {
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
    console.error('Status check error:', error);
    return c.json({ success: false, error: 'Failed to check status' }, 500);
  }
});