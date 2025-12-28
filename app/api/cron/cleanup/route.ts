import { NextResponse } from 'next/server';
import { db } from '@/lib/d1-client';
import { r2 } from '@/lib/r2-client';

/**
 * Cleanup endpoint to delete recordings older than 12 hours
 * Call this via a cron job or manually
 *
 * You can set up Cloudflare Cron Triggers or use external services like:
 * - Vercel Cron (if deployed on Vercel)
 * - GitHub Actions scheduled workflow
 * - External cron service (cron-job.org, etc.)
 *
 * IMPORTANT: Set CRON_SECRET environment variable and pass it in Authorization header
 * Example: Authorization: Bearer your-secret-token
 */
export async function GET(request: Request) {
  try {
    // Verify authorization token
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing Authorization header' },
        { status: 401 }
      );
    }

    const now = Date.now();

    // Find all recordings that should be deleted (delete_at < now)
    const expiredRecordings = await db.prepare(
      `SELECT id, r2_key FROM recordings WHERE delete_at < ? AND delete_at > 0`
    ).bind(now).all();

    let deletedCount = 0;
    const errors: string[] = [];

    for (const recording of expiredRecordings.results) {
      try {
        // Delete from R2
        const r2Success = await r2.delete(recording.r2_key);

        if (r2Success) {
          // Delete from database
          await db.prepare('DELETE FROM recordings WHERE id = ?').bind(recording.id).run();
          deletedCount++;
        } else {
          errors.push(`Failed to delete from R2: ${recording.r2_key}`);
        }
      } catch (err) {
        errors.push(`Error deleting ${recording.id}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      totalExpired: expiredRecordings.results.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that prefer POST
export async function POST(request: Request) {
  return GET(request);
}
