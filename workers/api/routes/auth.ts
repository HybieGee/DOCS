import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { createJWT, verifyJWT, hashPassword, verifyPassword } from '@/lib/auth/jwt';
import type { Env } from '../index';
import type { SignupRequest, LoginRequest, User } from '@/lib/types';
import { verifySignature } from '@/lib/utils/solana';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Signup
authRoutes.post('/signup', async (c) => {
  try {
    const body = await c.req.json<SignupRequest>();
    const { username, password, solana_address, signed_message, signature, turnstile_token } = body;

    // Skip Turnstile verification for simplified auth
    // TODO: Add proper captcha later if needed
    // const turnstileVerified = await verifyTurnstile(turnstile_token, c.env.TURNSTILE_SECRET_KEY);
    // if (!turnstileVerified) {
    //   return c.json({ success: false, error: 'Invalid captcha' }, 400);
    // }

    // For simplified auth, skip signature verification if it's the mock signature
    if (signature !== 'simplified_signup_no_wallet_required') {
      const signatureValid = await verifySignature(solana_address, signed_message, signature);
      if (!signatureValid) {
        return c.json({ success: false, error: 'Invalid signature' }, 400);
      }
    }

    // Check if user exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR solana_address = ?'
    )
      .bind(username, solana_address)
      .first();

    if (existingUser) {
      return c.json({ success: false, error: 'User already exists' }, 409);
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    
    await c.env.DB.prepare(
      'INSERT INTO users (id, username, password_hash, solana_address) VALUES (?, ?, ?, ?)'
    )
      .bind(userId, username, passwordHash, solana_address)
      .run();

    const user: User = {
      id: userId,
      username,
      solana_address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create JWT and session
    const token = await createJWT(user, c.env.JWT_SECRET);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    )
      .bind(sessionId, userId, token, expiresAt)
      .run();

    // Set cookie with cross-origin compatible settings
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true, // Always secure for HTTPS
      sameSite: 'None', // Allow cross-origin cookie sending
      maxAge: 7 * 24 * 60 * 60,
      domain: undefined, // Don't set domain to allow cross-origin
    });

    return c.json({ success: true, data: { user, token } });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// Login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { username, password } = body;

    // Get user
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE username = ?'
    )
      .bind(username)
      .first<User & { password_hash: string }>();

    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Create JWT and session
    const token = await createJWT(user, c.env.JWT_SECRET);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    )
      .bind(sessionId, user.id, token, expiresAt)
      .run();

    // Set cookie with cross-origin compatible settings
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true, // Always secure for HTTPS
      sameSite: 'None', // Allow cross-origin cookie sending
      maxAge: 7 * 24 * 60 * 60,
      domain: undefined, // Don't set domain to allow cross-origin
    });

    // Remove password hash from response
    const { password_hash, ...userData } = user;

    return c.json({ success: true, data: { user: userData, token } });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// Logout
authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, 'session');
  
  if (token) {
    // Delete session from database
    await c.env.DB.prepare(
      'DELETE FROM sessions WHERE token_hash = ?'
    )
      .bind(token)
      .run();
  }

  deleteCookie(c, 'session');
  return c.json({ success: true });
});

// Get current user\nauthRoutes.get('/me', async (c) => {\n  try {\n    const token = getCookie(c, 'session');\n    if (!token) {\n      return c.json({ success: false, error: 'Unauthorized' }, 401);\n    }\n\n    const payload = await verifyJWT(token, c.env.JWT_SECRET);\n    if (!payload) {\n      return c.json({ success: false, error: 'Unauthorized' }, 401);\n    }\n\n    const user = await c.env.DB.prepare(\n      'SELECT id, username, solana_address, created_at, updated_at FROM users WHERE id = ?'\n    )\n      .bind(payload.sub)\n      .first<User>();\n\n    if (!user) {\n      return c.json({ success: false, error: 'User not found' }, 404);\n    }\n\n    return c.json({ success: true, data: { user } });\n  } catch (error) {\n    console.error('Get me error:', error);\n    return c.json({ success: false, error: 'Internal server error' }, 500);\n  }\n});\n\n// Verify wallet
authRoutes.post('/wallet/verify', async (c) => {
  try {
    const token = getCookie(c, 'session');
    if (!token) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<{ signed_message: string; signature: string }>();
    const { signed_message, signature } = body;

    // Get user's Solana address
    const user = await c.env.DB.prepare(
      'SELECT solana_address FROM users WHERE id = ?'
    )
      .bind(payload.sub)
      .first<{ solana_address: string }>();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Verify signature
    const signatureValid = await verifySignature(user.solana_address, signed_message, signature);
    if (!signatureValid) {
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    return c.json({ success: true, data: { verified: true } });
  } catch (error) {
    console.error('Wallet verification error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// Helper function to verify Turnstile
async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    });

    const data = await response.json<{ success: boolean }>();
    return data.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}