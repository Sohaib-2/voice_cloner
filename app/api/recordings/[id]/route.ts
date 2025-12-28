import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/d1-client";
import { r2 } from "@/lib/r2-client";

// GET - Download a specific recording
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get recording from database
    const recording = await db.prepare(
      `SELECT * FROM recordings WHERE id = ? AND user_id = ?`
    ).bind(id, session.userId).first();

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Fetch file from R2
    const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects/${recording.r2_key}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

    // Determine content type from r2_key extension
    const ext = recording.r2_key.split('.').pop();
    const contentType = ext === 'wav' ? 'audio/wav' : 'audio/mpeg';

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error("Failed to fetch recording:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
