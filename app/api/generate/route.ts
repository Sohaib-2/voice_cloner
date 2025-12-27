import { NextResponse } from "next/server";

const TEXT_LENGTH_THRESHOLD = 500; // Characters threshold for sync vs async

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gen_text, ref_audio, speed, remove_silence } = body;

    if (!gen_text || !ref_audio) {
      return NextResponse.json({ error: "Missing text or audio" }, { status: 400 });
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

      return NextResponse.json({
        audio: data.output.audio, // Base64 MP3
        duration: data.output.duration_sec
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
