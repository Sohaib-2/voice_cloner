import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";
import { r2 } from "@/lib/r2-client";
import { generateId } from "@/lib/db";

const VOICE_INFO: Record<string, { gender: string; description: string }> = {
  // 🇺🇸 US English - Female (11 voices)
  "af_heart": { gender: "Female", description: "Warm and expressive with heartfelt delivery" },
  "af_alloy": { gender: "Female", description: "Balanced and versatile for general use" },
  "af_aoede": { gender: "Female", description: "Melodic and harmonious voice" },
  "af_bella": { gender: "Female", description: "Warm and friendly with natural intonation" },
  "af_jessica": { gender: "Female", description: "Clear and direct with neutral tone" },
  "af_kore": { gender: "Female", description: "Smooth and pleasant with consistent quality" },
  "af_nicole": { gender: "Female", description: "Professional and articulate with dynamic range" },
  "af_nova": { gender: "Female", description: "Modern and crisp with bright tonality" },
  "af_river": { gender: "Female", description: "Calm and flowing with gentle delivery" },
  "af_sarah": { gender: "Female", description: "Natural and approachable tone" },
  "af_sky": { gender: "Female", description: "Light and airy with youthful energy" },

  // 🇺🇸 US English - Male (9 voices)
  "am_adam": { gender: "Male", description: "Deep and authoritative with strong presence" },
  "am_echo": { gender: "Male", description: "Resonant and engaging with dynamic range" },
  "am_eric": { gender: "Male", description: "Friendly and approachable with warm delivery" },
  "am_fenrir": { gender: "Male", description: "Strong and bold with powerful delivery" },
  "am_liam": { gender: "Male", description: "Smooth and articulate with natural flow" },
  "am_michael": { gender: "Male", description: "Clear and confident with professional tone" },
  "am_onyx": { gender: "Male", description: "Rich and deep with commanding presence" },
  "am_puck": { gender: "Male", description: "Energetic and lively with playful character" },
  "am_santa": { gender: "Male", description: "Jolly and warm with cheerful character" },

  // 🇬🇧 British English - Female (4 voices)
  "bf_alice": { gender: "Female", description: "Pleasant British voice with gentle quality" },
  "bf_emma": { gender: "Female", description: "Refined British accent with elegant delivery" },
  "bf_isabella": { gender: "Female", description: "Sophisticated and clear British tone" },
  "bf_lily": { gender: "Female", description: "Soft British accent with delicate expression" },

  // 🇬🇧 British English - Male (4 voices)
  "bm_daniel": { gender: "Male", description: "Articulate British voice with precision" },
  "bm_fable": { gender: "Male", description: "Narrative British tone with storytelling quality" },
  "bm_george": { gender: "Male", description: "Distinguished British voice with authority" },
  "bm_lewis": { gender: "Male", description: "Clear British accent with professional tone" },

  // 🇯🇵 Japanese - Female (4 voices)
  "jf_alpha": { gender: "Female", description: "Clear Japanese delivery with natural flow" },
  "jf_gongitsune": { gender: "Female", description: "Expressive Japanese voice with character" },
  "jf_nezumi": { gender: "Female", description: "Light Japanese tone with delicate quality" },
  "jf_tebukuro": { gender: "Female", description: "Warm Japanese voice with friendly delivery" },

  // 🇯🇵 Japanese - Male (1 voice)
  "jm_kumo": { gender: "Male", description: "Clear Japanese voice with steady delivery" },

  // 🇨🇳 Mandarin Chinese - Female (4 voices)
  "zf_xiaobei": { gender: "Female", description: "Clear Mandarin voice with pleasant tone" },
  "zf_xiaoni": { gender: "Female", description: "Sweet Mandarin delivery with gentle quality" },
  "zf_xiaoxiao": { gender: "Female", description: "Bright Mandarin voice with cheerful character" },
  "zf_xiaoyi": { gender: "Female", description: "Professional Mandarin tone with clarity" },

  // 🇨🇳 Mandarin Chinese - Male (4 voices)
  "zm_yunjian": { gender: "Male", description: "Strong Mandarin voice with confident delivery" },
  "zm_yunxi": { gender: "Male", description: "Smooth Mandarin tone with natural flow" },
  "zm_yunxia": { gender: "Male", description: "Warm Mandarin voice with friendly presence" },
  "zm_yunyang": { gender: "Male", description: "Clear Mandarin delivery with steady quality" },

  // 🇪🇸 Spanish - Female (1 voice)
  "ef_dora": { gender: "Female", description: "Warm Spanish voice with expressive delivery" },

  // 🇪🇸 Spanish - Male (2 voices)
  "em_alex": { gender: "Male", description: "Clear Spanish tone with natural accent" },
  "em_santa": { gender: "Male", description: "Friendly Spanish voice with character" },

  // 🇫🇷 French - Female (1 voice)
  "ff_siwis": { gender: "Female", description: "Elegant French accent with refined quality" },

  // 🇮🇳 Hindi - Female (2 voices)
  "hf_alpha": { gender: "Female", description: "Clear Hindi voice with natural delivery" },
  "hf_beta": { gender: "Female", description: "Warm Hindi tone with pleasant quality" },

  // 🇮🇳 Hindi - Male (2 voices)
  "hm_omega": { gender: "Male", description: "Strong Hindi voice with confident presence" },
  "hm_psi": { gender: "Male", description: "Clear Hindi delivery with professional tone" },

  // 🇮🇹 Italian - Female (1 voice)
  "if_sara": { gender: "Female", description: "Melodic Italian voice with expressive quality" },

  // 🇮🇹 Italian - Male (1 voice)
  "im_nicola": { gender: "Male", description: "Clear Italian tone with natural delivery" },

  // 🇧🇷 Brazilian Portuguese - Female (1 voice)
  "pf_dora": { gender: "Female", description: "Warm Brazilian Portuguese with lively tone" },

  // 🇧🇷 Brazilian Portuguese - Male (2 voices)
  "pm_alex": { gender: "Male", description: "Clear Brazilian Portuguese with natural flow" },
  "pm_santa": { gender: "Male", description: "Friendly Brazilian Portuguese with character" },
};

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice, speed, output_format } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (!process.env.DEEPINFRA_API_KEY) {
      return NextResponse.json({ error: "DeepInfra API key not configured" }, { status: 500 });
    }

    // Check user role and credits
    const user = await db.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(session.userId).first();

    const credits = await db.prepare(
      'SELECT * FROM user_credits WHERE user_id = ?'
    ).bind(session.userId).first();

    if (!credits) {
      return NextResponse.json({ error: "User credits not found" }, { status: 404 });
    }

    const charCount = text.length;
    const isAdmin = user?.role === 'admin';

    // Check if enough credits (skip for admin)
    if (!isAdmin && credits.remaining_tts_chars < charCount) {
      return NextResponse.json({
        error: `Not enough TTS credits. You need ${charCount} chars but only have ${credits.remaining_tts_chars} remaining.`
      }, { status: 403 });
    }

    // Call DeepInfra Kokoro API
    const deepinfraResponse = await fetch(
      "https://api.deepinfra.com/v1/openai/audio/speech",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        },
        body: JSON.stringify({
          model: "hexgrad/Kokoro-82M",
          input: text,
          voice: voice || "af_nicole",
          response_format: output_format || "mp3",
          speed: speed || 1.0,
        }),
      }
    );

    if (!deepinfraResponse.ok) {
      const errorData = await deepinfraResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to generate speech", details: errorData },
        { status: deepinfraResponse.status }
      );
    }

    // Get audio buffer first
    const audioBuffer = Buffer.from(await deepinfraResponse.arrayBuffer());

    // Deduct TTS credits (admins still track usage but don't deplete credits)
    const newUsed = credits.used_tts_chars + charCount;
    const newRemaining = isAdmin ? credits.remaining_tts_chars : (credits.total_tts_chars - newUsed);

    await db.prepare(
      `UPDATE user_credits
       SET used_tts_chars = ?,
           remaining_tts_chars = ?,
           last_updated = ?
       WHERE user_id = ?`
    ).bind(newUsed, newRemaining, Date.now(), session.userId).run();

    // Save to R2 and database
    const recordingId = generateId();
    const r2Key = `recordings/${session.userId}/${recordingId}.${output_format || 'mp3'}`;
    const now = Date.now();
    const deleteAt = now + (12 * 60 * 60 * 1000); // 12 hours from now

    try {
      // Upload to R2
      await r2.upload(r2Key, audioBuffer, `audio/${output_format || 'mp3'}`);

      // Save to database
      await db.prepare(
        `INSERT INTO recordings (id, user_id, r2_key, duration, char_count, type, created_at, delete_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(recordingId, session.userId, r2Key, 0, charCount, 'tts', now, deleteAt).run();

      // Delete old TTS recordings (keep only last 3)
      const allRecordings = await db.prepare(
        `SELECT id, r2_key FROM recordings
         WHERE user_id = ? AND type = ?
         ORDER BY created_at DESC`
      ).bind(session.userId, 'tts').all();

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
      console.error('Failed to save TTS recording:', saveError);
      // Continue anyway - don't fail the generation
    }

    const voiceId = voice || "af_bella";
    const voiceMetadata = VOICE_INFO[voiceId] || { gender: "Unknown", description: "No description available" };

    // Calculate the new remaining credits for the header
    const newUsedForHeader = isAdmin ? 0 : (credits.used_tts_chars + charCount);
    const newRemainingForHeader = isAdmin ? 'unlimited' : (credits.total_tts_chars - newUsedForHeader).toString();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': `audio/${output_format || 'mp3'}`,
        'Content-Length': audioBuffer.length.toString(),
        'X-Voice-Id': voiceId,
        'X-Voice-Gender': voiceMetadata.gender,
        'X-Voice-Description': encodeURIComponent(voiceMetadata.description),
        'X-Credits-Remaining': newRemainingForHeader,
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
