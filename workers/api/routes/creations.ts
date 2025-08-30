import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from '@/lib/auth/jwt';
import type { Env } from '../index';
import { StabilityProvider } from '../lib/providers/stability';
import { generateSeed } from '../lib/genImage';
import { ensureBlackAndWhite, validateImageFormat } from '../lib/postprocess';

export const creationRoutes = new Hono<{ Bindings: Env }>();

// Rate limiting helper
async function checkRateLimit(c: any, key: string): Promise<boolean> {
  const current = await c.env.CACHE.get(key);
  if (current) {
    return false; // Rate limited
  }
  
  // Set rate limit (1 creation per 60 seconds - minimum KV TTL)
  await c.env.CACHE.put(key, '1', { expirationTtl: 60 });
  return true;
}

// Generate creation ID
function generateCreationId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'cr_';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST /api/creations - Generate new creation
creationRoutes.post('/', async (c) => {
  try {
    // Parse request body
    let body: { wallet?: string; level?: 1 | 2 | 3 } = {};
    try {
      body = await c.req.json();
    } catch (error) {
      // Handle empty body
      console.log('Empty request body, using defaults');
    }

    const { wallet, level = 1 } = body;
    
    // Get user info if authenticated
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
      console.log('No valid auth, proceeding without user ID');
    }

    // Rate limiting
    const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const rateLimitKey = `rate_limit:creation:${wallet || userId || clientIP}`;
    
    const canCreate = await checkRateLimit(c, rateLimitKey);
    if (!canCreate) {
      return c.json({ success: false, error: 'Rate limit exceeded. Please wait 60 seconds between creations.' }, 429);
    }

    // Validate level
    if (![1, 2, 3].includes(level)) {
      return c.json({ success: false, error: 'Level must be 1, 2, or 3' }, 400);
    }

    // Check if we have Stability API key
    if (!c.env.STABILITY_API_KEY) {
      return c.json({ success: false, error: 'Image generation service not configured' }, 500);
    }

    // Generate deterministic seed
    const seedInput = `${wallet || userId || clientIP}_${Date.now()}`;
    const seed = await generateSeed(seedInput);
    
    // Generate creation ID
    const id = generateCreationId();
    
    console.log(`Generating creation ${id} with seed ${seed.slice(0, 8)}... at level ${level}`);
    
    // Generate image using Stability AI
    const provider = new StabilityProvider(c.env.STABILITY_API_KEY);
    const output = await provider.generate({ seed, level, size: "1024x1024" });
    
    // Validate image format
    if (!validateImageFormat(output.png)) {
      throw new Error('Generated image is not a valid PNG');
    }
    
    // Post-process to ensure black and white
    const processedPng = await ensureBlackAndWhite(output.png);
    
    // Store image in R2
    const imageKey = `${id}.png`;
    await c.env.BUCKET.put(imageKey, processedPng, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable'
      }
    });
    
    // Create metadata record
    const baseUrl = new URL(c.req.url).origin;
    const record = {
      id,
      level,
      seed,
      image_key: imageKey,
      image_url: `${baseUrl}/api/creations/${id}/image`,
      preview_url: `${baseUrl}/api/creations/${id}/image?w=512`,
      traits: output.traits,
      wallet: wallet || null,
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    // Store record in KV
    await c.env.CREATIONS.put(id, JSON.stringify(record));
    
    console.log(`Creation ${id} generated successfully`);
    
    return c.json({ success: true, data: record }, 201);
    
  } catch (error) {
    console.error('Creation generation error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to generate creation'
    }, 500);
  }
});

// GET /api/creations/:id - Get creation metadata
creationRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    if (!id.startsWith('cr_')) {
      return c.json({ success: false, error: 'Invalid creation ID' }, 400);
    }
    
    const record = await c.env.CREATIONS.get(id);
    if (!record) {
      return c.json({ success: false, error: 'Creation not found' }, 404);
    }
    
    const data = JSON.parse(record);
    return c.json({ success: true, data });
    
  } catch (error) {
    console.error('Get creation error:', error);
    return c.json({ success: false, error: 'Failed to get creation' }, 500);
  }
});

// GET /api/creations/:id/image - Serve creation image
creationRoutes.get('/:id/image', async (c) => {
  try {
    const id = c.req.param('id');
    
    if (!id.startsWith('cr_')) {
      return c.json({ success: false, error: 'Invalid creation ID' }, 400);
    }
    
    const imageKey = `${id}.png`;
    const object = await c.env.BUCKET.get(imageKey);
    
    if (!object) {
      return c.json({ success: false, error: 'Image not found' }, 404);
    }
    
    // TODO: Handle resize parameter ?w=512 using Cloudflare Image Resizing if available
    const width = c.req.query('w');
    if (width && width === '512') {
      // For now, return original - could implement client-side resize or use CF Image Resizing
      console.log(`Resize requested for ${id} to width ${width} - returning original`);
    }
    
    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': object.etag
      }
    });
    
  } catch (error) {
    console.error('Serve image error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});