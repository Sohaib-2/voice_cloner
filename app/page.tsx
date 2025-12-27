"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Download, Play, Pause, Volume2, Loader2, Sparkles, Check } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

export default function Home() {
  const [text, setText] = useState("Hello, This is a test of your new AI voice cloning app.");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [removeNoise, setRemoveNoise] = useState(true);

  // Waveform refs
  const refWaveformRef = useRef<HTMLDivElement>(null);
  const genWaveformRef = useRef<HTMLDivElement>(null);
  const refWavesurferRef = useRef<WaveSurfer | null>(null);
  const genWavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);

  // Audio state
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isGenPlaying, setIsGenPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const charCount = text.length;
  const maxChars = 50000;
  const maxAudioDuration = 25;

  // Helper: Convert File to Base64
  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  // Client-side noise reduction
  const applyNoiseReduction = async (audioBuffer: AudioBuffer): Promise<AudioBuffer> => {
    const sampleRate = audioBuffer.sampleRate;
    const context = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      sampleRate
    );

    const source = context.createBufferSource();
    source.buffer = audioBuffer;

    const highPassFilter = context.createBiquadFilter();
    highPassFilter.type = "highpass";
    highPassFilter.frequency.value = 80;
    highPassFilter.Q.value = 1;

    source.connect(highPassFilter);
    highPassFilter.connect(context.destination);
    source.start(0);

    return await context.startRendering();
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  // Process audio file
  const processAudioFile = async (audioFile: File) => {
    const audioContext = new AudioContext();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(regionStart * sampleRate);
    const endSample = Math.floor(regionEnd * sampleRate);
    const trimmedLength = endSample - startSample;

    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      trimmedLength,
      sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const trimmedData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < trimmedLength; i++) {
        trimmedData[i] = channelData[startSample + i];
      }
    }

    let finalBuffer = trimmedBuffer;
    if (removeNoise) {
      finalBuffer = await applyNoiseReduction(trimmedBuffer);
    }

    const wavBlob = await audioBufferToWav(finalBuffer);
    return new File([wavBlob], audioFile.name, { type: "audio/wav" });
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      // Clean up previous wavesurfer
      if (refWavesurferRef.current) {
        refWavesurferRef.current.destroy();
        refWavesurferRef.current = null;
      }

      setFile(selectedFile);
    } catch (error) {
      alert("Failed to load audio file. Please try a different file.");
      e.target.value = "";
    }
  };

  // Initialize waveform after file is set and DOM is ready
  useEffect(() => {
    if (!file || !refWaveformRef.current) return;

    // Clean up previous instance
    if (refWavesurferRef.current) {
      refWavesurferRef.current.destroy();
    }

    // Wait for next tick to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!refWaveformRef.current) return;

      const wavesurfer = WaveSurfer.create({
        container: refWaveformRef.current,
        waveColor: "#a78bfa",
        progressColor: "#7c3aed",
        cursorColor: "#7c3aed",
        barWidth: 2,
        barGap: 1,
        height: 120,
        normalize: true,
        backend: "WebAudio",
      });

      const regions = wavesurfer.registerPlugin(RegionsPlugin.create());
      regionsPluginRef.current = regions;

      const url = URL.createObjectURL(file);
      wavesurfer.load(url);

      wavesurfer.on("ready", () => {
        const duration = wavesurfer.getDuration();
        setAudioDuration(duration);

        const regionDuration = Math.min(duration, maxAudioDuration);
        regions.addRegion({
          start: 0,
          end: regionDuration,
          color: "rgba(124, 58, 237, 0.3)",
          drag: true,
          resize: true,
        });

        setRegionStart(0);
        setRegionEnd(regionDuration);
      });

      regions.on("region-updated", (region) => {
        let start = region.start;
        let end = region.end;

        if (end - start > maxAudioDuration) {
          end = start + maxAudioDuration;
          region.setOptions({ end });
        }

        setRegionStart(start);
        setRegionEnd(end);
      });

      wavesurfer.on("play", () => setIsRefPlaying(true));
      wavesurfer.on("pause", () => setIsRefPlaying(false));
      wavesurfer.on("finish", () => setIsRefPlaying(false));

      refWavesurferRef.current = wavesurfer;
    }, 100);

    return () => clearTimeout(timer);
  }, [file, maxAudioDuration]);

  const toggleRefAudio = () => {
    if (!refWavesurferRef.current) return;

    if (isRefPlaying) {
      refWavesurferRef.current.pause();
    } else {
      // Play only the selected region
      const regions = regionsPluginRef.current?.getRegions();
      if (regions && regions.length > 0) {
        const region = regions[0];
        region.play();
      } else {
        // Fallback if no region exists
        refWavesurferRef.current.setTime(regionStart);
        refWavesurferRef.current.play();
      }
    }
  };

  const toggleGenAudio = () => {
    if (genWavesurferRef.current) {
      genWavesurferRef.current.playPause();
    }
  };

  // Poll job status
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
            setProgress(prev => Math.min(prev + 5, 90));
          }
        } catch (err) {
          clearInterval(pollInterval);
          reject(err);
        }
      }, 2000);
    });
  };

  // Generate audio
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

    try {
      // Process audio (trim + noise reduction)
      const processedFile = await processAudioFile(file);

      const fullBase64 = await toBase64(processedFile);
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

      if (data.jobId) {
        setProgress(20);
        const result = await pollJobStatus(data.jobId);
        setProgress(100);
        const audioUrl = `data:audio/mp3;base64,${result.audio}`;
        setAudioSrc(audioUrl);
      } else if (data.audio) {
        setProgress(100);
        const audioUrl = `data:audio/mp3;base64,${data.audio}`;
        setAudioSrc(audioUrl);
      } else {
        throw new Error("Invalid response from server");
      }

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Load generated audio into waveform
  useEffect(() => {
    if (audioSrc && genWaveformRef.current) {
      if (genWavesurferRef.current) {
        genWavesurferRef.current.destroy();
      }

      const wavesurfer = WaveSurfer.create({
        container: genWaveformRef.current,
        waveColor: "#10b981",
        progressColor: "#059669",
        cursorColor: "#059669",
        barWidth: 2,
        barGap: 1,
        height: 120,
        normalize: true,
      });

      wavesurfer.load(audioSrc);

      wavesurfer.on("play", () => setIsGenPlaying(true));
      wavesurfer.on("pause", () => setIsGenPlaying(false));
      wavesurfer.on("finish", () => setIsGenPlaying(false));

      genWavesurferRef.current = wavesurfer;
    }
  }, [audioSrc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refWavesurferRef.current) {
        refWavesurferRef.current.destroy();
      }
      if (genWavesurferRef.current) {
        genWavesurferRef.current.destroy();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-300 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            AI Powered Voice Cloning
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
            Voice Studio
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Transform any text into speech using AI-cloned voices with studio-quality results
          </p>
        </div>

        {/* Main Studio Area */}
        <div className="space-y-8">
          {/* Reference Voice Section */}
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-violet-400" />
                  Reference Voice
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Upload and trim your voice sample (max {maxAudioDuration}s)
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRemoveNoise(!removeNoise)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      removeNoise ? 'bg-violet-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        removeNoise ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <Sparkles className={`w-4 h-4 ${removeNoise ? 'text-violet-400' : 'text-gray-500'}`} />
                  <span className="text-sm text-gray-300">Clean Audio</span>
                </div>
              )}
            </div>

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
                className="w-full h-48 border-2 border-dashed border-violet-500/30 rounded-2xl hover:border-violet-500/60 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-violet-500/5 hover:bg-violet-500/10 backdrop-blur-sm group"
              >
                <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-white text-lg">Drop your audio file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse • WAV, MP3, or any audio format</p>
                </div>
              </button>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="text-sm text-gray-400">
                          {audioDuration > 0 && `${audioDuration.toFixed(1)}s • `}
                          {audioDuration > maxAudioDuration ? (
                            <span className="text-amber-400">Select {maxAudioDuration}s section below</span>
                          ) : (
                            <span className="text-green-400">Perfect length</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setFile(null);
                        setIsRefPlaying(false);
                        if (refWavesurferRef.current) refWavesurferRef.current.destroy();
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10 hover:bg-white/10"
                    >
                      Change
                    </Button>
                  </div>

                  {/* Waveform */}
                  <div className="bg-black/20 rounded-xl p-4 mb-4">
                    <div ref={refWaveformRef} />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      Selected: <span className="font-mono text-violet-300">{regionStart.toFixed(2)}s - {regionEnd.toFixed(2)}s</span>
                      <span className="ml-2 text-gray-400">
                        ({(regionEnd - regionStart).toFixed(2)}s / {maxAudioDuration}s)
                      </span>
                    </div>
                    <Button
                      onClick={toggleRefAudio}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {isRefPlaying ? (
                        <><Pause className="w-4 h-4 mr-2" /> Pause</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" /> Preview</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text Input Section */}
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Text to Speak</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Enter the text you want the AI to speak in the cloned voice
                </p>
              </div>
              <div className="text-sm">
                <span className={`font-mono ${charCount > maxChars ? 'text-red-400' : 'text-violet-300'}`}>
                  {charCount.toLocaleString()}
                </span>
                <span className="text-gray-500"> / {maxChars.toLocaleString()}</span>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-40 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none backdrop-blur-sm"
              placeholder="Type or paste your text here..."
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={loading || !file || !text || charCount > maxChars}
              className="h-14 px-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-lg font-semibold rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Generating...</>
              ) : (
                <><Wand2 className="w-5 h-5 mr-3" /> Generate Voice</>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {loading && progress > 0 && (
            <div className="space-y-2 animate-fadeIn">
              <div className="h-2 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-400">
                {progress < 20 ? "Processing audio..." : progress < 90 ? "Generating voice..." : "Almost done..."}
              </p>
            </div>
          )}

          {/* Generated Audio Section */}
          {audioSrc && (
            <div className="relative animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-green-400" />
                    Generated Voice
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Your AI-generated voice is ready
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = audioSrc;
                    link.download = 'generated-voice.mp3';
                    link.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-green-300"
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 backdrop-blur-sm">
                {/* Waveform */}
                <div className="bg-black/20 rounded-xl p-4 mb-4">
                  <div ref={genWaveformRef} />
                </div>

                {/* Controls */}
                <div className="flex justify-center">
                  <Button
                    onClick={toggleGenAudio}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGenPlaying ? (
                      <><Pause className="w-5 h-5 mr-2" /> Pause</>
                    ) : (
                      <><Play className="w-5 h-5 mr-2" /> Play Generated Voice</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-16">
          <p>Advanced AI Voice Cloning Technology</p>
        </div>
      </div>
    </main>
  );
}
