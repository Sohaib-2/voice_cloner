"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Mic, Wand2, Download, Play, Pause, Volume2, Loader2 } from "lucide-react";

export default function Home() {
  const [text, setText] = useState("Hello, This is a test of your new AI voice cloning app.");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [refAudioSrc, setRefAudioSrc] = useState<string | null>(null);
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isGenPlaying, setIsGenPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const refAudioRef = useRef<HTMLAudioElement>(null);
  const genAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const maxChars = 500;

  // Helper: Convert File to Base64
  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setRefAudioSrc(url);
    }
  };

  // Toggle reference audio playback
  const toggleRefAudio = () => {
    if (refAudioRef.current) {
      if (isRefPlaying) {
        refAudioRef.current.pause();
      } else {
        refAudioRef.current.play();
      }
      setIsRefPlaying(!isRefPlaying);
    }
  };

  // Toggle generated audio playback
  const toggleGenAudio = () => {
    if (genAudioRef.current) {
      if (isGenPlaying) {
        genAudioRef.current.pause();
      } else {
        genAudioRef.current.play();
      }
      setIsGenPlaying(!isGenPlaying);
    }
  };

  // Handle audio end events
  useEffect(() => {
    const refAudio = refAudioRef.current;
    const genAudio = genAudioRef.current;

    const handleRefEnded = () => setIsRefPlaying(false);
    const handleGenEnded = () => setIsGenPlaying(false);

    if (refAudio) {
      refAudio.addEventListener('ended', handleRefEnded);
    }
    if (genAudio) {
      genAudio.addEventListener('ended', handleGenEnded);
    }

    return () => {
      if (refAudio) refAudio.removeEventListener('ended', handleRefEnded);
      if (genAudio) genAudio.removeEventListener('ended', handleGenEnded);
    };
  }, []);

  const pollJobStatus = async (jobId: string): Promise<{ audio: string; duration: number }> => {
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
          } else {
            // Still in queue or processing - update progress
            setProgress(prev => Math.min(prev + 5, 90));
          }
        } catch (err) {
          clearInterval(pollInterval);
          reject(err);
        }
      }, 2000); // Poll every 2 seconds
    });
  };

  const handleGenerate = async () => {
    if (!file || !text) {
      alert("Please upload a voice sample and enter text.");
      return;
    }

    if (text.length > maxChars) {
      alert(`Text is too long. Maximum ${maxChars} characters allowed.`);
      return;
    }

    setLoading(true);
    setAudioSrc(null);
    setProgress(0);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      const fullBase64 = await toBase64(file);
      const base64Data = fullBase64.split(",")[1];

      setProgress(10);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gen_text: text,
          ref_audio: base64Data,
          speed: 1.0,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate");

      // Check if response is async (has jobId) or sync (has audio)
      if (data.jobId) {
        // Async mode - poll for status
        setProgress(20);
        const result = await pollJobStatus(data.jobId);
        setProgress(100);
        const audioUrl = `data:audio/mp3;base64,${result.audio}`;
        setAudioSrc(audioUrl);
      } else if (data.audio) {
        // Sync mode - simulate quick progress
        progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval!);
              return 90;
            }
            return prev + 15;
          });
        }, 200);

        await new Promise(resolve => setTimeout(resolve, 500));
        if (progressInterval) clearInterval(progressInterval);

        setProgress(100);
        const audioUrl = `data:audio/mp3;base64,${data.audio}`;
        setAudioSrc(audioUrl);
      } else {
        throw new Error("Invalid response from server");
      }

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 rounded-full text-violet-700 dark:text-violet-300 text-sm font-medium mb-4">
            <Mic className="w-4 h-4" />
            AI Powered
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            AI Voice Cloner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Upload a voice sample and watch AI clone it to speak your text with incredible realism
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Reference Voice Upload */}
          <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-violet-600" />
                Reference Voice
              </CardTitle>
              <CardDescription>
                Upload a 3-10 second audio sample of the voice you want to clone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-violet-400 dark:hover:border-violet-600 transition-all duration-300 flex flex-col items-center justify-center gap-3 bg-white/50 dark:bg-gray-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/10"
                >
                  <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-violet-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-700 dark:text-gray-300">Click to upload</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">WAV, MP3, or any audio format</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                        <Volume2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    {refAudioSrc && (
                      <div className="flex gap-2">
                        <Button
                          onClick={toggleRefAudio}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {isRefPlaying ? (
                            <><Pause className="w-4 h-4 mr-2" /> Pause</>
                          ) : (
                            <><Play className="w-4 h-4 mr-2" /> Preview</>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setFile(null);
                            setRefAudioSrc(null);
                            setIsRefPlaying(false);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                  <audio ref={refAudioRef} src={refAudioSrc || undefined} className="hidden" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Input */}
          <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-violet-600" />
                Text to Speak
              </CardTitle>
              <CardDescription>
                Enter the text you want the cloned voice to say
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  maxLength={maxChars}
                  placeholder="Type your message here..."
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all resize-none"
                />
                <div className="flex justify-between items-center text-sm">
                  <span className={`${charCount > maxChars ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {charCount} / {maxChars} characters
                  </span>
                  {charCount > maxChars && (
                    <span className="text-red-500 font-medium">Text too long!</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={loading || !file || !text || charCount > maxChars}
            size="lg"
            className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Voice... {progress}%
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Voice Clone
              </>
            )}
          </Button>
        </div>

        {/* Loading Progress */}
        {loading && (
          <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium text-violet-700 dark:text-violet-300">
                  <span>Processing your voice clone...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-violet-200 dark:bg-violet-900/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Audio Player */}
        {audioSrc && !loading && (
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 animate-fadeIn">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                  <span className="text-white text-lg">✓</span>
                </div>
                Voice Clone Ready!
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                Your AI-generated voice is ready to play
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800">
                <audio ref={genAudioRef} src={audioSrc} className="hidden" />

                <div className="flex items-center gap-4">
                  <Button
                    onClick={toggleGenAudio}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isGenPlaying ? (
                      <><Pause className="w-5 h-5 mr-2" /> Pause</>
                    ) : (
                      <><Play className="w-5 h-5 mr-2" /> Play Audio</>
                    )}
                  </Button>

                  <a
                    href={audioSrc}
                    download="ai-voice-clone.mp3"
                    className="flex-1"
                  >
                    <Button variant="outline" size="lg" className="w-full border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                      <Download className="w-5 h-5 mr-2" />
                      Download MP3
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6">
          <p>Advanced AI Voice Cloning Technology</p>
        </div>
      </div>
    </main>
  );
}
