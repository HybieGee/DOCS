import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';
import type { Character, Water } from '@/lib/types';
import { LEGENDARY_CHANCE, EVOLUTION_THRESHOLDS, MINTS_PER_DAY_LIMIT } from '@/lib/types';

export const characterRoutes = new Hono<{ Bindings: Env }>();

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
  c.set('userAddress', payload.solana_address);
  await next();
};

// Mint a new character
characterRoutes.post('/mint', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const userAddress = c.get('userAddress');
    const body = await c.req.json<{ turnstile_token?: string }>();

    // Check daily mint limit
    const today = new Date().toISOString().split('T')[0];
    const mintCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM characters 
       WHERE owner_user_id = ? AND date(created_at) = ?`
    )
      .bind(userId, today)
      .first<{ count: number }>();

    if (mintCount && mintCount.count >= MINTS_PER_DAY_LIMIT) {
      return c.json({ success: false, error: 'Daily mint limit reached' }, 429);
    }

    // Generate spawn coordinates
    const x = Math.random() * 1920; // World width
    const y = 600 + Math.random() * 200; // Ground level range

    // Check for legendary spawn
    const isLegendary = Math.random() < LEGENDARY_CHANCE;

    // Generate character properties
    const characterId = crypto.randomUUID();
    const spriteSeed = crypto.randomUUID();
    const colorPalette = generateColorPalette(isLegendary);
    const name = generateCharacterName();

    // Create character in database
    await c.env.DB.prepare(
      `INSERT INTO characters (
        id, owner_user_id, wallet_address, name, is_legendary,
        x, y, level, water_count, sprite_seed, color_palette
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        characterId, userId, userAddress, name, isLegendary ? 1 : 0,
        x, y, 1, 0, spriteSeed, colorPalette
      )
      .run();

    // Update world state
    await c.env.DB.prepare(
      `UPDATE world_state SET 
       total_characters = total_characters + 1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    ).run();

    const character: Character = {
      id: characterId,
      owner_user_id: userId,
      wallet_address: userAddress,
      name,
      is_legendary: isLegendary,
      x,
      y,
      level: 1,
      water_count: 0,
      sprite_seed: spriteSeed,
      color_palette: colorPalette,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Broadcast to real-time clients
    const worldId = c.env.WORLD.idFromName('world-room');
    const worldStub = c.env.WORLD.get(worldId);
    await worldStub.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'character_spawn',
        payload: character,
      }),
    });

    return c.json({ success: true, data: character });
  } catch (error) {
    console.error('Mint error:', error);
    return c.json({ success: false, error: 'Failed to mint character' }, 500);
  }
});

// Water a character
characterRoutes.post('/:id/water', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const characterId = c.param('id');

    // Check if character exists
    const character = await c.env.DB.prepare(
      'SELECT * FROM characters WHERE id = ?'
    )
      .bind(characterId)
      .first<Character>();

    if (!character) {
      return c.json({ success: false, error: 'Character not found' }, 404);
    }

    // Check if already watered today
    const today = new Date().toISOString().split('T')[0];
    const existingWater = await c.env.DB.prepare(
      `SELECT id FROM waters 
       WHERE user_id = ? AND character_id = ? AND date(created_at) = ?`
    )
      .bind(userId, characterId, today)
      .first();

    if (existingWater) {
      return c.json({ success: false, error: 'Already watered today' }, 429);
    }

    // Create water record
    const waterId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO waters (id, user_id, character_id) VALUES (?, ?, ?)'
    )
      .bind(waterId, userId, characterId)
      .run();

    // Update character water count
    const newWaterCount = character.water_count + 1;
    let newLevel = character.level;

    // Check for level up
    if (newWaterCount >= EVOLUTION_THRESHOLDS.level5 && character.level < 5) {
      newLevel = 5;
    } else if (newWaterCount >= EVOLUTION_THRESHOLDS.level4 && character.level < 4) {
      newLevel = 4;
    } else if (newWaterCount >= EVOLUTION_THRESHOLDS.level3 && character.level < 3) {
      newLevel = 3;
    } else if (newWaterCount >= EVOLUTION_THRESHOLDS.level2 && character.level < 2) {
      newLevel = 2;
    }

    await c.env.DB.prepare(
      `UPDATE characters SET 
       water_count = ?, level = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(newWaterCount, newLevel, characterId)
      .run();

    // Update world state
    await c.env.DB.prepare(
      `UPDATE world_state SET 
       total_waters = total_waters + 1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    ).run();

    // Broadcast water event
    const worldId = c.env.WORLD.idFromName('world-room');
    const worldStub = c.env.WORLD.get(worldId);
    await worldStub.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: newLevel > character.level ? 'level_up' : 'water',
        payload: {
          character_id: characterId,
          water_count: newWaterCount,
          level: newLevel,
          user_id: userId,
        },
      }),
    });

    return c.json({
      success: true,
      data: {
        water_count: newWaterCount,
        level: newLevel,
        leveled_up: newLevel > character.level,
      },
    });
  } catch (error) {
    console.error('Water error:', error);
    return c.json({ success: false, error: 'Failed to water character' }, 500);
  }
});

// Get all characters
characterRoutes.get('/', async (c) => {
  try {
    const cursor = c.req.query('cursor');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

    let query = `
      SELECT c.*, u.username as owner_username
      FROM characters c
      LEFT JOIN users u ON c.owner_user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT ?
    `;
    const params = [limit];

    if (cursor) {
      query = `
        SELECT c.*, u.username as owner_username
        FROM characters c
        LEFT JOIN users u ON c.owner_user_id = u.id
        WHERE c.created_at < ?
        ORDER BY c.created_at DESC
        LIMIT ?
      `;
      params.unshift(cursor);
    }

    const characters = await c.env.DB.prepare(query)
      .bind(...params)
      .all();

    return c.json({ success: true, data: characters.results });
  } catch (error) {
    console.error('Get characters error:', error);
    return c.json({ success: false, error: 'Failed to get characters' }, 500);
  }
});

// Helper functions
function generateColorPalette(isLegendary: boolean): string {
  if (isLegendary) {
    return JSON.stringify({
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#FF69B4',
      glow: '#FFFFFF',
    });
  }

  const palettes = [
    { primary: '#4A90E2', secondary: '#7EC8E3', accent: '#A8DADC' },
    { primary: '#E27D60', secondary: '#E8A87C', accent: '#F5DEB3' },
    { primary: '#85CDCA', secondary: '#C38D9E', accent: '#F7CAC9' },
    { primary: '#41B3A3', secondary: '#6FEDD6', accent: '#9FFFCB' },
  ];

  return JSON.stringify(palettes[Math.floor(Math.random() * palettes.length)]);
}

function generateCharacterName(): string {
  const prefixes = ['Aqua', 'Dew', 'Rain', 'Mist', 'Drop', 'Splash', 'Tide', 'Wave'];
  const suffixes = ['ling', 'ie', 'let', 'kin', 'bud', 'bloom', 'sprite', 'wisp'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix}${suffix}`;
}