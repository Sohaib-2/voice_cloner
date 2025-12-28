import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { db } from '@/lib/d1-client';
import { generateId } from '@/lib/db';
import { PLANS } from '@/lib/types';

// GET - List all users
export async function GET(request: NextRequest) {
  try {
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
    const { username, password, plan = 'starter' } = body;

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

    if (!PLANS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
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
    const planConfig = PLANS[plan];
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

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
      planConfig.voiceCloningChars,
      planConfig.voiceCloningChars,
      planConfig.ttsChars,
      planConfig.ttsChars,
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
