import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyToken } from '@/lib/auth';
import { db } from '@/lib/d1-client';
import { generateId } from '@/lib/db';
import { PLANS } from '@/lib/types';

// Check if user is admin
async function isAdmin(request: Request) {
  // Get token from cookie
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  if (!tokenMatch) return false;

  const session = await verifyToken(tokenMatch[1]);
  if (!session) return false;

  const user = await db.prepare('SELECT role FROM users WHERE id = ?').bind(session.userId).first();
  return user?.role === 'admin';
}

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    // Check admin permission
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.prepare(
      `SELECT u.*, uc.*
       FROM users u
       LEFT JOIN user_credits uc ON u.id = uc.user_id
       ORDER BY u.created_at DESC`
    ).bind().all();

    return NextResponse.json({
      success: true,
      users: result.results
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, plan = 'starter', customCredits, customDurationDays } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate plan exists
    if (!PLANS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Validate custom plan fields if custom plan is selected
    if (plan === 'custom') {
      if (!customCredits || typeof customCredits.voiceCloning !== 'number' || typeof customCredits.tts !== 'number') {
        return NextResponse.json(
          { error: 'Custom plan requires voiceCloning and tts credits' },
          { status: 400 }
        );
      }
      if (!customDurationDays || customDurationDays < 1) {
        return NextResponse.json(
          { error: 'Custom plan requires valid duration in days' },
          { status: 400 }
        );
      }
    }

    // Check if username exists
    const existing = await db.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = generateId();
    const now = Date.now();

    // Use custom values for custom plan, otherwise use plan config
    let voiceCloningChars: number;
    let ttsChars: number;
    let expiresAt: number;

    if (plan === 'custom') {
      voiceCloningChars = customCredits.voiceCloning;
      ttsChars = customCredits.tts;
      expiresAt = now + (customDurationDays * 24 * 60 * 60 * 1000);
    } else {
      const planConfig = PLANS[plan];
      voiceCloningChars = planConfig.voiceCloningChars;
      ttsChars = planConfig.ttsChars;
      expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
    }

    // Create user
    await db.prepare(
      `INSERT INTO users (id, username, password, status, current_plan, plan_started_at, plan_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, username, hashedPassword, 'active', plan, now, expiresAt, now).run();

    // Create credits
    await db.prepare(
      `INSERT INTO user_credits (
        user_id, total_voice_cloning_chars, used_voice_cloning_chars, remaining_voice_cloning_chars,
        total_tts_chars, used_tts_chars, remaining_tts_chars,
        total_audio_duration, current_period_start, current_period_end, last_updated
      ) VALUES (?, ?, 0, ?, ?, 0, ?, 0, ?, ?, ?)`
    ).bind(
      userId,
      voiceCloningChars,
      voiceCloningChars,
      ttsChars,
      ttsChars,
      now,
      expiresAt,
      now
    ).run();

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        plan,
        planExpiresAt: expiresAt
      }
    });

  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
