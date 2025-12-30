import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";
import { r2 } from "@/lib/r2-client";

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

    // Determine which endpoint to poll based on stored metadata
    const useChatterbox = jobRecord?.r2_key === 'chatterbox';
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
      // Handle different output formats between F5-TTS and Chatterbox
      // F5-TTS: data.output.audio, data.output.duration_sec
      // Chatterbox might use: data.output.audio_base64 or just data.output
      const audioData = data.output?.audio || data.output?.audio_base64 || data.output;
      const audioDuration = data.output?.duration_sec || data.output?.duration || 0;

      // Deduct credits for async job completion
      try {
        // Get job metadata from database (reuse jobRecord if already fetched)
        let completionJobRecord = jobRecord;
        if (!completionJobRecord) {
          completionJobRecord = await db.prepare(
            'SELECT * FROM recordings WHERE id = ? AND user_id = ?'
          ).bind(jobId, session.userId).first();
        }

        // Check if this is a pending job (r2_key is 'chatterbox' or 'f5tts', not a full path)
        const isPending = completionJobRecord?.r2_key === 'chatterbox' || completionJobRecord?.r2_key === 'f5tts';

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

          // Save audio to R2 and update database
          const r2Key = `recordings/${session.userId}/${jobId}.mp3`;
          const now = Date.now();
          const deleteAt = now + (12 * 60 * 60 * 1000); // 12 hours from now

          try {
            // Convert base64 to buffer - use the extracted audioData
            const audioBuffer = Buffer.from(audioData, 'base64');

            // Upload to R2
            await r2.upload(r2Key, audioBuffer, 'audio/mpeg');

            // Update recording in database
            await db.prepare(
              `UPDATE recordings
               SET r2_key = ?, duration = ?, type = ?, delete_at = ?
               WHERE id = ? AND user_id = ?`
            ).bind(r2Key, audioDuration, 'voice_clone', deleteAt, jobId, session.userId).run();

            // Delete old recordings (keep only last 3)
            const allRecordings = await db.prepare(
              `SELECT id, r2_key FROM recordings
               WHERE user_id = ? AND type = ?
               ORDER BY created_at DESC`
            ).bind(session.userId, 'voice_clone').all();

            if (allRecordings.results.length > 3) {
              const toDelete = allRecordings.results.slice(3);
              for (const rec of toDelete) {
                await r2.delete(rec.r2_key);
                await db.prepare('DELETE FROM recordings WHERE id = ?').bind(rec.id).run();
              }
            }
          } catch (saveError) {
            console.error('Failed to save recording:', saveError);
          }

          // Get updated credits to return
          const updatedCredits = await db.prepare(
            'SELECT remaining_voice_cloning_chars FROM user_credits WHERE user_id = ?'
          ).bind(session.userId).first();

          return NextResponse.json({
            status: "COMPLETED",
            audio: audioData,
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
        audio: audioData,
        duration: audioDuration
      });
    } else if (data.status === "FAILED") {
      // Clean up pending job record if it exists (where r2_key is 'chatterbox' or 'f5tts')
      try {
        await db.prepare(
          'DELETE FROM recordings WHERE id = ? AND user_id = ? AND (r2_key = ? OR r2_key = ?)'
        ).bind(jobId, session.userId, 'chatterbox', 'f5tts').run();
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
