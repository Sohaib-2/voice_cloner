import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, voice, speed, output_format } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Call RunPod Serverless for AI Voice Generation
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${process.env.KOKORO_ENDPOINT_ID}/runsync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({
          input: {
            text,
            voice: voice || "Jessica",
            speed: speed || 1.0,
            output_format: output_format || "mp3"
          },
        }),
      }
    );

    const data = await runpodResponse.json();

    if (data.status !== "COMPLETED") {
      console.error("RunPod AI Voice Error:", data);
      return NextResponse.json({ error: "Generation failed", details: data }, { status: 500 });
    }

    return NextResponse.json({
      audio: data.output.audio, // Base64 audio
      format: data.output.format,
      voice: data.output.voice,
      duration: data.output.duration,
      processing_time: data.output.processing_time
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
