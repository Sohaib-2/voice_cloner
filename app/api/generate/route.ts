import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";
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
    const { gen_text, ref_audio, speed, remove_silence, language = "en", ref_language } = body;

    if (!gen_text || !ref_audio) {
      return NextResponse.json({ error: "Missing text or audio" }, { status: 400 });
    }

    // 2. Check user role and credits
    const user = await db.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(session.userId).first();

    const credits = await db.prepare(
      'SELECT * FROM user_credits WHERE user_id = ?'
    ).bind(session.userId).first();

    if (!credits) {
      return NextResponse.json({ error: "User credits not found" }, { status: 404 });
    }

    const charCount = gen_text.length;
    const isAdmin = user?.role === 'admin';

    // Check if enough credits (skip for admin)
    if (!isAdmin && credits.remaining_voice_cloning_chars < charCount) {
      return NextResponse.json({
        error: `Not enough credits. You need ${charCount} chars but only have ${credits.remaining_voice_cloning_chars} remaining.`
      }, { status: 403 });
    }

    // Decide between sync and async based on text length
    const useAsync = gen_text.length >= TEXT_LENGTH_THRESHOLD;
    const endpoint = useAsync ? "run" : "runsync";

    // Decide which model to use based on language
    const useF5TTS = language === "en";
    const endpointId = useF5TTS ? process.env.RUNPOD_ENDPOINT_ID : process.env.RUNPOD_CHATTERBOX_ENDPOINT_ID;
    const apiKey = process.env.RUNPOD_API_KEY;

    if (!endpointId || !apiKey) {
      return NextResponse.json({
        error: `${useF5TTS ? 'F5-TTS' : 'Chatterbox'} endpoint not configured`
      }, { status: 500 });
    }

    // Generate storage path for organized R2 structure
    const recordingId = generateId();
    const storagePath = `recordings/${session.userId}/${recordingId}.mp3`;

    // 1. Call RunPod Serverless
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${endpointId}/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: useF5TTS ? {
            gen_text,
            ref_audio, // Already Base64 from frontend
            ref_text: "", // Empty = Auto-transcribe
            remove_silence: remove_silence ?? true,
            speed: speed ?? 1.0,
            output_format: "mp3",
            storage_path: storagePath // Pass organized path to handler
          } : {
            // Chatterbox-specific input format
            text: gen_text,
            ref_audio, // Already Base64 from frontend
            language: language,
            ref_language: ref_language || language, // Default to output language if not specified
            storage_path: storagePath // Pass organized path to handler
          },
        }),
      }
    );

    const data = await runpodResponse.json();

    // 2. Handle Response based on endpoint type
    if (useAsync) {
      // Async endpoint returns job ID immediately
      if (data.id) {
        // Store job metadata in database for later credit deduction
        const jobId = data.id;
        const now = Date.now();

        try {
          // Store metadata with endpoint type for later polling
          // Format: "endpoint_type|storage_path" so we know which endpoint to poll and where file will be
          const metadata = `${useF5TTS ? 'f5tts' : 'chatterbox'}|${storagePath}`;
          await db.prepare(
            `INSERT INTO recordings (id, user_id, r2_key, duration, char_count, type, created_at, delete_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(jobId, session.userId, metadata, 0, charCount, 'voice_clone', now, 0).run();
        } catch (dbError) {
          console.error('Failed to store job metadata:', dbError);
          // Continue anyway - we'll handle missing metadata gracefully
        }

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
      const audioDuration = data.output.duration_sec || data.output.duration_seconds || 0;
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

      // 4. Save reference to database (handler already uploaded to S3/R2)
      const now = Date.now();
      const deleteAt = now + (12 * 60 * 60 * 1000); // 12 hours from now

      try {
        // Save URL reference to database (audio is already in S3/R2 from handler at storagePath)
        await db.prepare(
          `INSERT INTO recordings (id, user_id, r2_key, duration, char_count, type, created_at, delete_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(recordingId, session.userId, storagePath, audioDuration, charCount, 'voice_clone', now, deleteAt).run();

        // 5. Delete old recordings (keep only last 3)
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
        console.error('Failed to save recording reference:', saveError);
        // Continue anyway - don't fail the generation
      }

      return NextResponse.json({
        audio_url: data.output.audio_url, // S3/R2 URL
        duration: data.output.duration_sec || data.output.duration_seconds,
        creditsRemaining: newRemaining
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
