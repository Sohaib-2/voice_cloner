import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gen_text, ref_audio, speed, remove_silence } = body;

    if (!gen_text || !ref_audio) {
      return NextResponse.json({ error: "Missing text or audio" }, { status: 400 });
    }

    // 1. Call RunPod Serverless
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/runsync`,
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

    // 2. Error Handling from RunPod
    if (data.status !== "COMPLETED") {
      console.error("RunPod Error:", data);
      return NextResponse.json({ error: "Generation failed", details: data }, { status: 500 });
    }

    // 3. Return Audio to Frontend (Pass-through)
    return NextResponse.json({ 
      audio: data.output.audio, // Base64 MP3
      duration: data.output.duration_sec 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}