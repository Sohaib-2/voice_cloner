"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Download, Play, Pause, Volume2, Loader2, Sparkles, Check } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { toBase64, processAudioFile } from "@/lib/audioUtils";
import { pollJobStatus } from "@/lib/apiUtils";

interface VoiceCloningTabProps {
  maxChars: number;
  maxAudioDuration: number;
}

export default function VoiceCloningTab({ maxChars, maxAudioDuration }: VoiceCloningTabProps) {
  const [text, setText] = useState("Hello, This is a test of your new AI voice cloning app.");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [removeNoise, setRemoveNoise] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isGenPlaying, setIsGenPlaying] = useState(false);

  const refWaveformRef = useRef<HTMLDivElement>(null);
  const genWaveformRef = useRef<HTMLDivElement>(null);
  const refWavesurferRef = useRef<WaveSurfer | null>(null);
  const genWavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;

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

  // Initialize waveform after file is set
  useEffect(() => {
    if (!file || !refWaveformRef.current) return;

    if (refWavesurferRef.current) {
      refWavesurferRef.current.destroy();
    }

    const timer = setTimeout(() => {
      if (!refWaveformRef.current) return;

      const wavesurfer = WaveSurfer.create({
        container: refWaveformRef.current,
        waveColor: "oklch(0.72 0.22 295 / 0.4)",
        progressColor: "oklch(0.72 0.22 295)",
        cursorColor: "oklch(0.85 0.25 320)",
        cursorWidth: 3,
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
          color: "oklch(0.72 0.22 295 / 0.25)",
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
      const processedFile = await processAudioFile(file, regionStart, regionEnd, removeNoise);
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
        waveColor: "oklch(0.7 0.18 195 / 0.4)",
        progressColor: "oklch(0.7 0.18 195)",
        cursorColor: "oklch(0.8 0.22 175)",
        cursorWidth: 3,
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (refWavesurferRef.current) refWavesurferRef.current.destroy();
      if (genWavesurferRef.current) genWavesurferRef.current.destroy();
    };
  }, []);

  return (
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
                <Button onClick={toggleRefAudio} size="sm">
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
  );
}
