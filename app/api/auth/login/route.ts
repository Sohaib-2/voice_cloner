import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken } from '@/lib/auth';
import { db } from '@/lib/d1-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Check if plan expired (skip for admin)
    if (user.role !== 'admin' && Date.now() > user.plan_expires_at) {
      return NextResponse.json(
        { error: 'Your plan has expired. Please renew your subscription.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get user credits
    const credits = await db.prepare(
      'SELECT * FROM user_credits WHERE user_id = ?'
    ).bind(user.id).first();

    // Create token
    const token = await createToken(user.id, user.username);

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        plan: user.current_plan,
        status: user.status,
        role: user.role,
        planStartedAt: user.plan_started_at,
        planExpiresAt: user.plan_expires_at
      },
      credits: credits ? {
        voiceCloning: {
          total: credits.total_voice_cloning_chars,
          used: credits.used_voice_cloning_chars,
          remaining: credits.remaining_voice_cloning_chars
        },
        tts: {
          total: credits.total_tts_chars,
          used: credits.used_tts_chars,
          remaining: credits.remaining_tts_chars
        },
        totalAudioDuration: credits.total_audio_duration
      } : {
        voiceCloning: {
          total: 0,
          used: 0,
          remaining: 0
        },
        tts: {
          total: 0,
          used: 0,
          remaining: 0
        },
        totalAudioDuration: 0
      }
    });

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
