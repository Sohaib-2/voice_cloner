import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";

const VOICE_INFO: Record<string, { gender: string; description: string }> = {
  // 🇺🇸 US English - Female
  "af_heart": { gender: "Female", description: "Warm and expressive with heartfelt delivery" },
  "af_bella": { gender: "Female", description: "Warm and friendly with natural intonation" },
  "af_nicole": { gender: "Female", description: "Professional and articulate with dynamic range" },
  "af_sky": { gender: "Female", description: "Light and airy with youthful energy" },
  "af_alloy": { gender: "Female", description: "Balanced and versatile for general use" },
  "af_jessica": { gender: "Female", description: "Clear and direct with neutral tone" },
  "af_kore": { gender: "Female", description: "Smooth and pleasant with consistent quality" },
  "af_river": { gender: "Female", description: "Calm and flowing with gentle delivery" },
  "af_nova": { gender: "Female", description: "Modern and crisp with bright tonality" },

  // 🇺🇸 US English - Male
  "am_michael": { gender: "Male", description: "Clear and confident with professional tone" },
  "am_adam": { gender: "Male", description: "Deep and authoritative with strong presence" },
  "am_echo": { gender: "Male", description: "Resonant and engaging with dynamic range" },
  "am_eric": { gender: "Male", description: "Friendly and approachable with warm delivery" },
  "am_liam": { gender: "Male", description: "Smooth and articulate with natural flow" },
  "am_onyx": { gender: "Male", description: "Rich and deep with commanding presence" },
  "am_puck": { gender: "Male", description: "Energetic and lively with playful character" },
  "am_fenrir": { gender: "Male", description: "Strong and bold with powerful delivery" },

  // 🇬🇧 British English - Female
  "bf_emma": { gender: "Female", description: "Refined British accent with elegant delivery" },
  "bf_isabella": { gender: "Female", description: "Sophisticated and clear British tone" },
  "bf_alice": { gender: "Female", description: "Pleasant British voice with gentle quality" },
  "bf_lily": { gender: "Female", description: "Soft British accent with delicate expression" },

  // 🇬🇧 British English - Male
  "bm_george": { gender: "Male", description: "Distinguished British voice with authority" },
  "bm_lewis": { gender: "Male", description: "Clear British accent with professional tone" },
  "bm_daniel": { gender: "Male", description: "Articulate British voice with precision" },
  "bm_fable": { gender: "Male", description: "Narrative British tone with storytelling quality" },

  // 🇯🇵 Japanese - Female
  "jf_hina": { gender: "Female", description: "Gentle Japanese voice with sweet character" },
  "jf_alpha": { gender: "Female", description: "Clear Japanese delivery with natural flow" },
  "jf_gongitsune": { gender: "Female", description: "Expressive Japanese voice with character" },
  "jf_nezumi": { gender: "Female", description: "Light Japanese tone with delicate quality" },
  "jf_tebukuro": { gender: "Female", description: "Warm Japanese voice with friendly delivery" },
  "jf_yuki": { gender: "Female", description: "Soft Japanese accent with calm presence" },

  // 🇯🇵 Japanese - Male
  "jm_kumo": { gender: "Male", description: "Clear Japanese voice with steady delivery" },

  // 🇫🇷 French
  "ff_siwis": { gender: "Female", description: "Elegant French accent with refined quality" },

  // 🇨🇳 Chinese - Female
  "zf_xiaobei": { gender: "Female", description: "Clear Mandarin voice with pleasant tone" },
  "zf_xiaoni": { gender: "Female", description: "Sweet Mandarin delivery with gentle quality" },
  "zf_xiaoxiao": { gender: "Female", description: "Bright Mandarin voice with cheerful character" },
  "zf_xiaoyi": { gender: "Female", description: "Professional Mandarin tone with clarity" },

  // 🇨🇳 Chinese - Male
  "zm_yunjian": { gender: "Male", description: "Strong Mandarin voice with confident delivery" },
  "zm_yunxi": { gender: "Male", description: "Smooth Mandarin tone with natural flow" },
  "zm_yunxia": { gender: "Male", description: "Warm Mandarin voice with friendly presence" },
  "zm_yunyang": { gender: "Male", description: "Clear Mandarin delivery with steady quality" },

  // 🇪🇸 Spanish
  "ef_dora": { gender: "Female", description: "Warm Spanish voice with expressive delivery" },
  "em_alex": { gender: "Male", description: "Clear Spanish tone with natural accent" },
  "em_santa": { gender: "Male", description: "Friendly Spanish voice with character" },

  // 🇮🇹 Italian
  "if_sara": { gender: "Female", description: "Melodic Italian voice with expressive quality" },
  "im_nicola": { gender: "Male", description: "Clear Italian tone with natural delivery" },

  // 🇧🇷 Portuguese
  "pf_dora": { gender: "Female", description: "Warm Brazilian Portuguese with lively tone" },
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
          voice: voice || "af_bella",
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

    // Deduct TTS credits (skip for admin)
    if (!isAdmin) {
      const newUsed = credits.used_tts_chars + charCount;
      const newRemaining = credits.total_tts_chars - newUsed;

      await db.prepare(
        `UPDATE user_credits
         SET used_tts_chars = ?,
             remaining_tts_chars = ?,
             last_updated = ?
         WHERE user_id = ?`
      ).bind(newUsed, newRemaining, Date.now(), session.userId).run();
    }

    const audioBuffer = Buffer.from(await deepinfraResponse.arrayBuffer());
    const voiceId = voice || "af_bella";
    const voiceMetadata = VOICE_INFO[voiceId] || { gender: "Unknown", description: "No description available" };

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': `audio/${output_format || 'mp3'}`,
        'Content-Length': audioBuffer.length.toString(),
        'X-Voice-Id': voiceId,
        'X-Voice-Gender': voiceMetadata.gender,
        'X-Voice-Description': encodeURIComponent(voiceMetadata.description),
        'X-Credits-Remaining': (!isAdmin ? (credits.total_tts_chars - (credits.used_tts_chars + charCount)).toString() : 'unlimited'),
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
