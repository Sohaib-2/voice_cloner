import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/d1-client';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user credits from database
    const credits = await db.prepare(
      'SELECT * FROM user_credits WHERE user_id = ?'
    ).bind(session.userId).first();

    if (!credits) {
      return NextResponse.json({ error: 'Credits not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      credits: {
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
      }
    });

  } catch (error: any) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
