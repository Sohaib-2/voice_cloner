import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";
import { r2 } from "@/lib/r2-client";

// GET - Fetch user's recordings
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'voice_clone' or 'tts' or 'all'

    let query = `SELECT id, r2_key, duration, char_count, type, created_at
                 FROM recordings
                 WHERE user_id = ?`;

    const params: any[] = [session.userId];

    if (type && type !== 'all') {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT 10`;

    const result = await db.prepare(query).bind(...params).all();

    // Generate presigned URLs for each recording
    const recordings = await Promise.all(
      result.results.map(async (rec: any) => {
        try {
          const url = await r2.getPresignedUrl(rec.r2_key, 3600); // 1 hour expiry
          return {
            id: rec.id,
            url,
            duration: rec.duration,
            charCount: rec.char_count,
            type: rec.type,
            createdAt: rec.created_at,
          };
        } catch (error) {
          console.error(`Failed to get URL for recording ${rec.id}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed recordings
    const validRecordings = recordings.filter(r => r !== null);

    return NextResponse.json({ recordings: validRecordings });
  } catch (error) {
    console.error("Failed to fetch recordings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
