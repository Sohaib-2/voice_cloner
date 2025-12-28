import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/d1-client';
import { r2 } from '@/lib/r2-client';
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

// DELETE - Delete user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await params;

    // Prevent deleting admin users
    const userToDelete = await db.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first();
    if (userToDelete?.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    // Get all recordings for this user
    const recordings = await db.prepare(
      'SELECT r2_key FROM recordings WHERE user_id = ?'
    ).bind(userId).all();

    // Delete from R2
    for (const rec of recordings.results) {
      await r2.delete(rec.r2_key);
    }

    // Delete from database (CASCADE will handle related records)
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update user (renew plan, update credits, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { action, plan, credits } = body;

    if (action === 'renew') {
      // Renew plan for 30 days
      const now = Date.now();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000);
      const planConfig = PLANS[plan];

      // Update user
      await db.prepare(
        `UPDATE users
         SET current_plan = ?, plan_started_at = ?, plan_expires_at = ?, status = 'active'
         WHERE id = ?`
      ).bind(plan, now, expiresAt, userId).run();

      // Reset credits
      await db.prepare(
        `UPDATE user_credits
         SET total_voice_cloning_chars = ?,
             used_voice_cloning_chars = 0,
             remaining_voice_cloning_chars = ?,
             total_tts_chars = ?,
             used_tts_chars = 0,
             remaining_tts_chars = ?,
             current_period_start = ?,
             current_period_end = ?,
             last_updated = ?
         WHERE user_id = ?`
      ).bind(
        planConfig.voiceCloningChars,
        planConfig.voiceCloningChars,
        planConfig.ttsChars,
        planConfig.ttsChars,
        now,
        expiresAt,
        now,
        userId
      ).run();

      return NextResponse.json({ success: true, message: 'Plan renewed successfully' });
    }

    if (action === 'update_credits') {
      // Update credits manually
      const { voiceCloning, tts } = credits;

      await db.prepare(
        `UPDATE user_credits
         SET total_voice_cloning_chars = ?,
             remaining_voice_cloning_chars = ?,
             total_tts_chars = ?,
             remaining_tts_chars = ?,
             last_updated = ?
         WHERE user_id = ?`
      ).bind(
        voiceCloning,
        voiceCloning,
        tts,
        tts,
        Date.now(),
        userId
      ).run();

      return NextResponse.json({ success: true, message: 'Credits updated successfully' });
    }

    if (action === 'toggle_status') {
      // Toggle active/inactive status
      const user = await db.prepare('SELECT status FROM users WHERE id = ?').bind(userId).first();
      const newStatus = user.status === 'active' ? 'inactive' : 'active';

      await db.prepare('UPDATE users SET status = ? WHERE id = ?').bind(newStatus, userId).run();

      return NextResponse.json({ success: true, status: newStatus });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
