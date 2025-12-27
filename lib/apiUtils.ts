// Poll job status
export const pollJobStatus = async (jobId: string): Promise<{ audio: string; duration: number }> => {
  return new Promise((resolve, reject) => {
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
          resolve({ audio: statusData.audio, duration: statusData.duration });
        } else if (statusData.status === "FAILED") {
          clearInterval(pollInterval);
          reject(new Error(statusData.error || "Job failed"));
        }
      } catch (err) {
        clearInterval(pollInterval);
        reject(err);
      }
    }, 2000);
  });
};
