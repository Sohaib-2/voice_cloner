import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";
import { r2 } from "@/lib/r2-client";
import { generateId } from "@/lib/db";

const TEXT_LENGTH_THRESHOLD = 500; // Characters threshold for sync vs async

export async function POST(request: Request) {
  try {
    // 1. Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please login." }, { status: 401 });
    }

    const body = await request.json();
    const { gen_text, ref_audio, speed, remove_silence } = body;

    if (!gen_text || !ref_audio) {
      return NextResponse.json({ error: "Missing text or audio" }, { status: 400 });
    }

    // 2. Check user credits
    const credits = await db.prepare(
      'SELECT * FROM user_credits WHERE user_id = ?'
    ).bind(session.userId).first();

    if (!credits) {
      return NextResponse.json({ error: "User credits not found" }, { status: 404 });
    }

    const charCount = gen_text.length;

    // Check if enough credits
    if (credits.remaining_voice_cloning_chars < charCount) {
      return NextResponse.json({
        error: `Not enough credits. You need ${charCount} chars but only have ${credits.remaining_voice_cloning_chars} remaining.`
      }, { status: 403 });
    }

    // Decide between sync and async based on text length
    const useAsync = gen_text.length >= TEXT_LENGTH_THRESHOLD;
    const endpoint = useAsync ? "run" : "runsync";

    // 1. Call RunPod Serverless
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({
          input: {
            gen_text,
            ref_audio, // Already Base64 from frontend
            ref_text: "", // Empty = Auto-transcribe
            remove_silence: remove_silence ?? true,
            speed: speed ?? 1.0,
            output_format: "mp3"
          },
        }),
      }
    );

    const data = await runpodResponse.json();

    // 2. Handle Response based on endpoint type
    if (useAsync) {
      // Async endpoint returns job ID immediately
      if (data.id) {
        return NextResponse.json({
          jobId: data.id,
          status: "IN_QUEUE"
        });
      } else {
        console.error("RunPod Async Error:", data);
        return NextResponse.json({ error: "Failed to queue job", details: data }, { status: 500 });
      }
    } else {
      // Sync endpoint returns result directly
      if (data.status !== "COMPLETED") {
        console.error("RunPod Sync Error:", data);
        return NextResponse.json({ error: "Generation failed", details: data }, { status: 500 });
      }

      // 3. Generation successful - deduct credits
      const audioDuration = data.output.duration_sec || 0;
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

      // 4. Save to R2 and database
      const recordingId = generateId();
      const r2Key = `recordings/${session.userId}/${recordingId}.mp3`;
      const now = Date.now();
      const deleteAt = now + (12 * 60 * 60 * 1000); // 12 hours from now

      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(data.output.audio, 'base64');

        // Upload to R2
        await r2.upload(r2Key, audioBuffer, 'audio/mpeg');

        // Save to database
        await db.prepare(
          `INSERT INTO recordings (id, user_id, r2_key, duration, char_count, type, created_at, delete_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(recordingId, session.userId, r2Key, audioDuration, charCount, 'voice_clone', now, deleteAt).run();

        // 5. Delete old recordings (keep only last 3)
        const allRecordings = await db.prepare(
          `SELECT id, r2_key FROM recordings
           WHERE user_id = ? AND type = ?
           ORDER BY created_at DESC`
        ).bind(session.userId, 'voice_clone').all();

        if (allRecordings.results.length > 3) {
          const toDelete = allRecordings.results.slice(3);
          for (const rec of toDelete) {
            // Delete from R2
            await r2.delete(rec.r2_key);
            // Delete from database
            await db.prepare('DELETE FROM recordings WHERE id = ?').bind(rec.id).run();
          }
        }
      } catch (saveError) {
        console.error('Failed to save recording:', saveError);
        // Continue anyway - don't fail the generation
      }

      return NextResponse.json({
        audio: data.output.audio, // Base64 MP3
        duration: data.output.duration_sec,
        creditsRemaining: newRemaining
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
