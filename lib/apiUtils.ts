// Poll job status
export const pollJobStatus = async (
  jobId: string,
  onProgress?: (progress: number) => void,
  onStatusUpdate?: (status: string, delayTime?: number, executionTime?: number) => void
): Promise<{ audio: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    let currentProgress = 20;
    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await fetch("/api/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });

        const statusData = await statusRes.json();

        if (statusData.status === "COMPLETED") {
          clearInterval(pollInterval);
          if (onProgress) onProgress(100);
          if (onStatusUpdate) onStatusUpdate("COMPLETED");
          resolve({ audio: statusData.audio, duration: statusData.duration });
        } else if (statusData.status === "FAILED") {
          clearInterval(pollInterval);
          reject(new Error(statusData.error || "Job failed"));
        } else if (statusData.status === "IN_QUEUE") {
          // Job is in queue, notify UI
          if (onStatusUpdate) {
            onStatusUpdate("IN_QUEUE", statusData.delayTime, statusData.executionTime);
          }
        } else if (statusData.status === "IN_PROGRESS") {
          // Job is actively processing, show progress
          if (onStatusUpdate) {
            onStatusUpdate("IN_PROGRESS", statusData.delayTime, statusData.executionTime);
          }
          // Incrementally increase progress while processing
          if (currentProgress < 90) {
            currentProgress += 5;
            if (onProgress) onProgress(currentProgress);
          }
        }
      } catch (err) {
        clearInterval(pollInterval);
        reject(err);
      }
    }, 2000);
  });
};
