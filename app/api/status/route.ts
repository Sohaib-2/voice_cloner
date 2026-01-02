import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    // Get job metadata to determine which endpoint to use
    const jobRecord = await db.prepare(
      'SELECT * FROM recordings WHERE id = ? AND user_id = ?'
    ).bind(jobId, session.userId).first();

    if (!jobRecord) {
      return NextResponse.json({
        error: "Job not found"
      }, { status: 404 });
    }

    // Parse metadata from r2_key field
    // Format: "endpoint_type|storage_path" or just "storage_path" for completed jobs
    const r2KeyValue = jobRecord.r2_key as string;
    let endpointType = 'f5tts'; // default
    let storagePath = r2KeyValue;

    if (r2KeyValue.includes('|')) {
      const [type, path] = r2KeyValue.split('|');
      endpointType = type;
      storagePath = path;
    }

    // Determine which endpoint to poll
    const useChatterbox = endpointType === 'chatterbox';
    const endpointId = useChatterbox
      ? process.env.RUNPOD_CHATTERBOX_ENDPOINT_ID
      : process.env.RUNPOD_ENDPOINT_ID;

    if (!endpointId) {
      return NextResponse.json({
        error: `${useChatterbox ? 'Chatterbox' : 'F5-TTS'} endpoint not configured`
      }, { status: 500 });
    }

    // Poll RunPod for job status
    const statusResponse = await fetch(
      `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
      }
    );

    const data = await statusResponse.json();

    // Return the status to frontend
    if (data.status === "COMPLETED") {
      // Handlers now return audio_url instead of base64
      const audioUrl = data.output?.audio_url;
      const audioDuration = data.output?.duration_sec || data.output?.duration_seconds || data.output?.duration || 0;

      // Deduct credits for async job completion
      try {
        // Get job metadata from database (reuse jobRecord if already fetched)
        let completionJobRecord = jobRecord;
        if (!completionJobRecord) {
          completionJobRecord = await db.prepare(
            'SELECT * FROM recordings WHERE id = ? AND user_id = ?'
          ).bind(jobId, session.userId).first();
        }

        // Check if this is a pending job (r2_key contains '|' delimiter meaning it's pending)
        const isPending = completionJobRecord?.r2_key.includes('|');

        if (completionJobRecord && isPending) {
          const charCount = completionJobRecord.char_count;

          // Get user role and credits
          const user = await db.prepare(
            'SELECT role FROM users WHERE id = ?'
          ).bind(session.userId).first();

          const credits = await db.prepare(
            'SELECT * FROM user_credits WHERE user_id = ?'
          ).bind(session.userId).first();

          const isAdmin = user?.role === 'admin';

          // Deduct credits (skip for admin)
          if (!isAdmin && credits) {
            const newUsed = credits.used_voice_cloning_chars + charCount;
            const newRemaining = credits.total_voice_cloning_chars - newUsed;

            await db.prepare(
              `UPDATE user_credits
               SET used_voice_cloning_chars = ?,
                   remaining_voice_cloning_chars = ?,
                   total_audio_duration = total_audio_duration + ?,
                   last_updated = ?
               WHERE user_id = ?`
            ).bind(newUsed, newRemaining, audioDuration, Date.now(), session.userId).run();
          }

          // Update database record (handler already uploaded to S3/R2 at storagePath)
          const now = Date.now();
          const deleteAt = now + (12 * 60 * 60 * 1000); // 12 hours from now

          try {
            // Update recording in database with just the storage path (remove endpoint metadata)
            await db.prepare(
              `UPDATE recordings
               SET r2_key = ?, duration = ?, type = ?, delete_at = ?
               WHERE id = ? AND user_id = ?`
            ).bind(storagePath, audioDuration, 'voice_clone', deleteAt, jobId, session.userId).run();

            // Delete old recordings (keep only last 3)
            const allRecordings = await db.prepare(
              `SELECT id, r2_key FROM recordings
               WHERE user_id = ? AND type = ?
               ORDER BY created_at DESC`
            ).bind(session.userId, 'voice_clone').all();

            if (allRecordings.results.length > 3) {
              const toDelete = allRecordings.results.slice(3);
              for (const rec of toDelete) {
                // Note: Handler manages S3/R2 cleanup, we just remove DB records
                await db.prepare('DELETE FROM recordings WHERE id = ?').bind(rec.id).run();
              }
            }
          } catch (saveError) {
            console.error('Failed to update recording:', saveError);
          }

          // Get updated credits to return
          const updatedCredits = await db.prepare(
            'SELECT remaining_voice_cloning_chars FROM user_credits WHERE user_id = ?'
          ).bind(session.userId).first();

          return NextResponse.json({
            status: "COMPLETED",
            audio_url: audioUrl,
            duration: audioDuration,
            creditsRemaining: updatedCredits?.remaining_voice_cloning_chars || 0
          });
        }
      } catch (creditError) {
        console.error('Failed to deduct credits for async job:', creditError);
        // Continue anyway and return the audio
      }

      return NextResponse.json({
        status: "COMPLETED",
        audio_url: audioUrl,
        duration: audioDuration
      });
    } else if (data.status === "FAILED") {
      // Clean up pending job record if it exists (where r2_key contains '|')
      try {
        // Only delete if it's a pending job (contains the metadata delimiter)
        if (jobRecord.r2_key.includes('|')) {
          await db.prepare(
            'DELETE FROM recordings WHERE id = ? AND user_id = ?'
          ).bind(jobId, session.userId).run();
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup failed job:', cleanupError);
      }

      return NextResponse.json({
        status: "FAILED",
        error: data.error || "Job failed"
      }, { status: 500 });
    } else {
      // IN_QUEUE or IN_PROGRESS
      return NextResponse.json({
        status: data.status,
        delayTime: data.delayTime || 0,
        executionTime: data.executionTime || 0
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
