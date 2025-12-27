"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Download, Play, Pause, Volume2, Loader2, Sparkles, Check, Mic } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import VoiceSelector from "@/components/VoiceSelector";
import { ThemeToggle } from "@/components/theme-provider";

type Tab = "clone" | "tts";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("clone");

  // Voice Cloning State
  const [text, setText] = useState("Hello, This is a test of your new AI voice cloning app.");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [removeNoise, setRemoveNoise] = useState(true);

  // AI TTS State
  const [ttsText, setTtsText] = useState("Hello! This is Infinity TTS. Try different voices in multiple languages!");
  const [ttsVoice, setTtsVoice] = useState("Jessica");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioSrc, setTtsAudioSrc] = useState<string | null>(null);

  // Waveform refs
  const refWaveformRef = useRef<HTMLDivElement>(null);
  const genWaveformRef = useRef<HTMLDivElement>(null);
  const ttsWaveformRef = useRef<HTMLDivElement>(null);
  const refWavesurferRef = useRef<WaveSurfer | null>(null);
  const genWavesurferRef = useRef<WaveSurfer | null>(null);
  const ttsWavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);

  // Audio state
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isGenPlaying, setIsGenPlaying] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const charCount = activeTab === "clone" ? text.length : ttsText.length;
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

    if (refWavesurferRef.current) {
      refWavesurferRef.current.destroy();
    }

    const timer = setTimeout(() => {
      if (!refWaveformRef.current) return;

      const wavesurfer = WaveSurfer.create({
        container: refWaveformRef.current,
        waveColor: "hsl(var(--primary) / 0.5)",
        progressColor: "hsl(var(--primary))",
        cursorColor: "hsl(var(--primary))",
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
          color: "hsla(var(--primary) / 0.3)",
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
      const regions = regionsPluginRef.current?.getRegions();
      if (regions && regions.length > 0) {
        const region = regions[0];
        region.play();
      } else {
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

  const toggleTtsAudio = () => {
    if (ttsWavesurferRef.current) {
      ttsWavesurferRef.current.playPause();
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

  // Generate audio with voice cloning
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

  // Generate audio with AI TTS
  const handleTtsGenerate = async () => {
    if (!ttsText) {
      alert("Please enter text to generate.");
      return;
    }

    if (ttsText.length > maxChars) {
      alert(`Text is too long. Maximum ${maxChars} characters allowed.`);
      return;
    }

    setTtsLoading(true);
    setTtsAudioSrc(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ttsText,
          voice: ttsVoice,
          speed: ttsSpeed,
          output_format: "mp3"
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate");

      // Check if response has jobId (async) or audio (sync)
      if (data.jobId) {
        // Async response - poll for status
        const result = await pollJobStatus(data.jobId);
        const audioUrl = `data:audio/mp3;base64,${result.audio}`;
        setTtsAudioSrc(audioUrl);
      } else if (data.audio) {
        // Sync response - use audio directly
        const audioUrl = `data:audio/mp3;base64,${data.audio}`;
        setTtsAudioSrc(audioUrl);
      } else {
        throw new Error("Invalid response from server");
      }

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setTtsLoading(false);
    }
  };

  // Load generated audio into waveform (Voice Clone)
  useEffect(() => {
    if (audioSrc && genWaveformRef.current) {
      if (genWavesurferRef.current) {
        genWavesurferRef.current.destroy();
      }

      const wavesurfer = WaveSurfer.create({
        container: genWaveformRef.current,
        waveColor: "hsl(var(--chart-2) / 0.5)",
        progressColor: "hsl(var(--chart-2))",
        cursorColor: "hsl(var(--chart-2))",
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

  // Load generated audio into waveform (AI TTS)
  useEffect(() => {
    if (ttsAudioSrc && ttsWaveformRef.current) {
      if (ttsWavesurferRef.current) {
        ttsWavesurferRef.current.destroy();
      }

      const wavesurfer = WaveSurfer.create({
        container: ttsWaveformRef.current,
        waveColor: "hsl(var(--chart-2) / 0.5)",
        progressColor: "hsl(var(--chart-2))",
        cursorColor: "hsl(var(--chart-2))",
        barWidth: 2,
        barGap: 1,
        height: 120,
        normalize: true,
      });

      wavesurfer.load(ttsAudioSrc);

      wavesurfer.on("play", () => setIsTtsPlaying(true));
      wavesurfer.on("pause", () => setIsTtsPlaying(false));
      wavesurfer.on("finish", () => setIsTtsPlaying(false));

      ttsWavesurferRef.current = wavesurfer;
    }
  }, [ttsAudioSrc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refWavesurferRef.current) refWavesurferRef.current.destroy();
      if (genWavesurferRef.current) genWavesurferRef.current.destroy();
      if (ttsWavesurferRef.current) ttsWavesurferRef.current.destroy();
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              AI Powered Voice Generation
            </div>
            <ThemeToggle />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent dark:from-violet-300 dark:via-purple-300 dark:to-pink-300">
            Voice Studio
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Clone voices or generate speech in 60+ AI voices across 8 languages
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("clone")}
              className={`px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === "clone"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Cloning
              </div>
            </button>
            <button
              onClick={() => setActiveTab("tts")}
              className={`px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === "tts"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Voices
              </div>
            </button>
          </div>
        </div>

        {/* Voice Cloning Tab */}
        {activeTab === "clone" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Reference Voice Section */}
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary" />
                    Reference Voice
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload and trim your voice sample (max {maxAudioDuration}s)
                  </p>
                </div>

                {file && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRemoveNoise(!removeNoise)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        removeNoise ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          removeNoise ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <Sparkles className={`w-4 h-4 ${removeNoise ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm text-muted-foreground">Clean Audio</span>
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
                  className="w-full h-48 border-2 border-dashed border-border rounded-2xl hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-card hover:bg-accent/50 group"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-lg">Drop your audio file here</p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse • WAV, MP3, or any audio format</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {audioDuration > 0 && `${audioDuration.toFixed(1)}s • `}
                            {audioDuration > maxAudioDuration ? (
                              <span className="text-amber-500">Select {maxAudioDuration}s section below</span>
                            ) : (
                              <span className="text-green-500">Perfect length</span>
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
                      >
                        Change
                      </Button>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 mb-4">
                      <div ref={refWaveformRef} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Selected: <span className="font-mono text-primary">{regionStart.toFixed(2)}s - {regionEnd.toFixed(2)}s</span>
                        <span className="ml-2">
                          ({(regionEnd - regionStart).toFixed(2)}s / {maxAudioDuration}s)
                        </span>
                      </div>
                      <Button
                        onClick={toggleRefAudio}
                        size="sm"
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
                  <h2 className="text-xl font-semibold">Text to Speak</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the text you want the AI to speak in the cloned voice
                  </p>
                </div>
                <div className="text-sm">
                  <span className={`font-mono ${charCount > maxChars ? 'text-destructive' : 'text-primary'}`}>
                    {charCount.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground"> / {maxChars.toLocaleString()}</span>
                </div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-40 bg-card border border-border rounded-2xl p-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Type or paste your text here..."
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={loading || !file || !text || charCount > maxChars}
                className="h-14 px-12 text-lg font-semibold rounded-xl shadow-lg"
                size="lg"
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
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {progress < 20 ? "Processing audio..." : progress < 90 ? "Generating voice..." : "Almost done..."}
                </p>
              </div>
            )}

            {/* Generated Audio Section */}
            {audioSrc && (
              <div className="relative animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-green-500" />
                      Generated Voice
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
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
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>

                <div className="bg-card border border-green-500/20 rounded-2xl p-6">
                  <div className="bg-muted/50 rounded-xl p-4 mb-4">
                    <div ref={genWaveformRef} />
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={toggleGenAudio}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
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
        )}

        {/* AI Voices Tab */}
        {activeTab === "tts" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Coming Soon Message */}
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="text-center max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  AI Voices Coming Soon
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  We're currently working on bringing you 60+ premium AI voices in 8 languages. This feature will be available very soon!
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Under Development
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-16">
          <p>Advanced AI Voice Generation Technology</p>
        </div>
      </div>
    </main>
  );
}
