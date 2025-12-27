import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    // Poll RunPod for job status
    const statusResponse = await fetch(
      `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/status/${jobId}`,
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
      return NextResponse.json({
        status: "COMPLETED",
        audio: data.output.audio,
        duration: data.output.duration_sec
      });
    } else if (data.status === "FAILED") {
      return NextResponse.json({
        status: "FAILED",
        error: data.error || "Job failed"
      }, { status: 500 });
    } else {
      // IN_QUEUE or IN_PROGRESS
      return NextResponse.json({
        status: data.status
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
