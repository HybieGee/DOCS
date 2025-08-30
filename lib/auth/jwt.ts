import { SignJWT, jwtVerify } from 'jose';
import type { User } from '@/lib/types';

const JWT_ISSUER = 'droplets-of-creation';
const JWT_AUDIENCE = 'droplets-api';

export interface JWTPayload {
  sub: string; // user id
  username: string;
  solana_address: string;
  iat?: number;
  exp?: number;
}

export async function createJWT(
  user: User,
  secret: string,
  expiresIn: string = '7d'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  const jwt = await new SignJWT({
    sub: user.id,
    username: user.username,
    solana_address: user.solana_address,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expiresIn)
    .sign(secretKey);

  return jwt;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Note: In production, use proper hashing with argon2 or bcrypt
  // For now, using a simple hash for development
  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}