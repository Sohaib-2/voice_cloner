// Authentication utilities for VoiceForge
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// Validate JWT_SECRET is set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set in production');
}

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT_SECRET. This is INSECURE and should only be used in development.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'voiceforge-super-secret-key-change-in-production'
);

export interface SessionData {
  userId: string;
  username: string;
  exp: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export async function createToken(userId: string, username: string): Promise<string> {
  const token = await new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(JWT_SECRET);

  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

// Get session from request
export async function getSession(request: Request): Promise<SessionData | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

// Get session from cookies
export function getSessionFromCookies(cookies: string): Promise<SessionData | null> {
  const tokenMatch = cookies.match(/token=([^;]+)/);
  if (!tokenMatch) {
    return Promise.resolve(null);
  }

  return verifyToken(tokenMatch[1]);
}
