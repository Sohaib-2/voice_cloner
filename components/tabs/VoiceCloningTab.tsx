"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Download, Play, Pause, Volume2, Loader2, Sparkles, Check, Mic, Square, RotateCcw, Clock, Trash2, Globe } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { toBase64, processAudioFile } from "@/lib/audioUtils";
import { pollJobStatus } from "@/lib/apiUtils";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

interface VoiceCloningTabProps {
  maxChars: number;
  maxAudioDuration: number;
}

export default function VoiceCloningTab({ maxChars, maxAudioDuration }: VoiceCloningTabProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [refLanguage, setRefLanguage] = useState("en");
  const [text, setText] = useState(SUPPORTED_LANGUAGES.find(l => l.code === "en")?.previewText || "");
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
  const [genAudioDuration, setGenAudioDuration] = useState(0);
  const [genAudioSize, setGenAudioSize] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [queueTime, setQueueTime] = useState<number>(0);
  const [inputMode, setInputMode] = useState<"upload" | "record">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recentAudios, setRecentAudios] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [playingRecordingAudio, setPlayingRecordingAudio] = useState<HTMLAudioElement | null>(null);

  const refWaveformRef = useRef<HTMLDivElement>(null);
  const genWaveformRef = useRef<HTMLDivElement>(null);
  const refWavesurferRef = useRef<WaveSurfer | null>(null);
  const genWavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const charCount = text.length;

  // Cross-lingual mode has a lower character limit (5000 chars)
  const isCrossLingual = refLanguage !== selectedLanguage;
  const effectiveMaxChars = isCrossLingual ? 5000 : maxChars;

  // Update preview text when language changes
  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    if (lang) {
      setText(lang.previewText);
    }
  };

  // Fetch recent recordings
  const fetchRecentAudios = async () => {
    setLoadingRecordings(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/recordings?type=voice_clone", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRecentAudios(data.recordings || []);
      }
    } catch (error) {
      console.error("Failed to fetch recordings:", error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Load recordings on mount and when tab becomes visible
  useEffect(() => {
    // Check if this tab is currently visible
    const checkAndFetch = () => {
      const isActive = document.querySelector('[data-tab="clone"]:not(.hidden)');
      if (isActive) {
        fetchRecentAudios();
      }
    };

    // Initial fetch with a small delay to let the tab system settle
    const timer = setTimeout(() => {
      checkAndFetch();
    }, 100);

    // Set up MutationObserver to detect when tab becomes visible
    const tabElement = document.querySelector('[data-tab="clone"]');
    if (tabElement) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target as HTMLElement;
            const isHidden = target.classList.contains('hidden');
            if (!isHidden) {
              // Tab just became visible, fetch recordings
              fetchRecentAudios();
            }
          }
        });
      });

      observer.observe(tabElement, {
        attributes: true,
        attributeFilter: ['class']
      });

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    }

    // Restore generated audio from localStorage
    const savedAudio = localStorage.getItem('voiceClone_generatedAudio');
    if (savedAudio) {
      try {
        const { audioSrc: savedSrc, duration, size, timestamp } = JSON.parse(savedAudio);
        // Only restore if less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          setAudioSrc(savedSrc);
          setGenAudioDuration(duration);
          setGenAudioSize(size);
        } else {
          // Clear old data
          localStorage.removeItem('voiceClone_generatedAudio');
        }
      } catch (err) {
        console.error('Failed to restore audio:', err);
      }
    }

    return () => clearTimeout(timer);
  }, []);

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

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      setRecordedChunks([]);
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "recorded-audio.webm", { type: "audio/webm" });

        if (refWavesurferRef.current) {
          refWavesurferRef.current.destroy();
          refWavesurferRef.current = null;
        }
        setFile(file);

        stream.getTracks().forEach(track => track.stop());
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxAudioDuration) {
            stopRecording();
            return prev;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (error) {
      alert("Could not access microphone. Please grant permission and try again.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Re-record
  const reRecord = () => {
    setFile(null);
    setRecordingTime(0);
    if (refWavesurferRef.current) {
      refWavesurferRef.current.destroy();
      refWavesurferRef.current = null;
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

    if (text.length > effectiveMaxChars) {
      alert(`Text is too long. Maximum ${effectiveMaxChars.toLocaleString()} characters allowed${isCrossLingual ? ' for cross-lingual mode' : ''}.`);
      return;
    }

    setLoading(true);
    setAudioSrc(null);
    setProgress(0);
    setJobStatus("");
    setQueueTime(0);

    try {
      const processedFile = await processAudioFile(file, regionStart, regionEnd, removeNoise);
      const fullBase64 = await toBase64(processedFile);
      const base64Data = fullBase64.split(",")[1];

      setProgress(10);

      // Get token for authentication
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Not authenticated. Please log in.");
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          gen_text: text,
          ref_audio: base64Data,
          speed: 1.0,
          language: selectedLanguage,
          ref_language: refLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate");

      if (data.jobId) {
        setProgress(20);
        const result = await pollJobStatus(
          data.jobId,
          (prog) => setProgress(prog),
          (status, delayTime) => {
            setJobStatus(status);
            if (delayTime) setQueueTime(delayTime);
          }
        );
        const audioUrl = result.audio_url; // Direct S3/R2 URL
        setAudioSrc(audioUrl);

        // Fetch file size from the URL
        try {
          const audioResponse = await fetch(audioUrl);
          const audioBlob = await audioResponse.blob();
          setGenAudioSize(audioBlob.size);

          // Save to localStorage for persistence
          localStorage.setItem('voiceClone_generatedAudio', JSON.stringify({
            audioSrc: audioUrl,
            duration: result.duration || 0,
            size: audioBlob.size,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Failed to fetch audio size:', err);
          // Continue without size info
        }

        // Update credits if returned
        if (result.creditsRemaining !== undefined) {
          try {
            const creditsData = localStorage.getItem('credits');
            if (creditsData) {
              const credits = JSON.parse(creditsData);
              credits.voiceCloning.remaining = result.creditsRemaining;
              credits.voiceCloning.used = credits.voiceCloning.total - result.creditsRemaining;
              localStorage.setItem('credits', JSON.stringify(credits));
              window.dispatchEvent(new CustomEvent('creditsUpdated', { detail: credits }));
            }
          } catch (err) {
            console.error('Failed to update credits:', err);
          }
        }

        // Refresh recent audios
        fetchRecentAudios();
      } else if (data.audio_url) {
        setProgress(100);
        const audioUrl = data.audio_url; // Direct S3/R2 URL
        setAudioSrc(audioUrl);

        // Fetch file size from the URL
        try {
          const audioResponse = await fetch(audioUrl);
          const audioBlob = await audioResponse.blob();
          setGenAudioSize(audioBlob.size);

          // Save to localStorage for persistence
          localStorage.setItem('voiceClone_generatedAudio', JSON.stringify({
            audioSrc: audioUrl,
            duration: data.duration || 0,
            size: audioBlob.size,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Failed to fetch audio size:', err);
          // Continue without size info
        }

        // Update credits if returned
        if (data.creditsRemaining !== undefined) {
          try {
            const creditsData = localStorage.getItem('credits');
            if (creditsData) {
              const credits = JSON.parse(creditsData);
              credits.voiceCloning.remaining = data.creditsRemaining;
              credits.voiceCloning.used = credits.voiceCloning.total - data.creditsRemaining;
              localStorage.setItem('credits', JSON.stringify(credits));
              window.dispatchEvent(new CustomEvent('creditsUpdated', { detail: credits }));
            }
          } catch (err) {
            console.error('Failed to update credits:', err);
          }
        }

        // Refresh recent audios
        fetchRecentAudios();
      } else {
        throw new Error("Invalid response from server - no audio_url returned");
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

      wavesurfer.on("ready", () => {
        const duration = wavesurfer.getDuration();
        setGenAudioDuration(duration);

        // Update localStorage with duration
        const savedAudio = localStorage.getItem('voiceClone_generatedAudio');
        if (savedAudio) {
          try {
            const data = JSON.parse(savedAudio);
            data.duration = duration;
            localStorage.setItem('voiceClone_generatedAudio', JSON.stringify(data));
          } catch (err) {
            console.error('Failed to update duration:', err);
          }
        }
      });

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
              {inputMode === "upload" ? `Upload and trim your voice sample (max ${maxAudioDuration}s)` : `Record your voice directly (max ${maxAudioDuration}s)`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Reference Language Selector - Compact */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <select
                value={refLanguage}
                onChange={(e) => setRefLanguage(e.target.value)}
                className="h-9 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-accent transition-colors"
                title="Reference audio language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {file && (
              <div className="flex items-center gap-2 pl-3 border-l border-border/50">
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
        </div>

        {/* Mode Toggle */}
        {!file && !isRecording && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-muted rounded-xl p-1">
              <button
                onClick={() => setInputMode("upload")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "upload"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setInputMode("record")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "record"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mic className="w-4 h-4 inline mr-2" />
                Record
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {!file && !isRecording ? (
          inputMode === "upload" ? (
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
            <div className="w-full h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 bg-card">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <Mic className="w-10 h-10 text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-lg">Ready to record</p>
                <p className="text-sm text-muted-foreground mt-1">Click the button below to start recording</p>
              </div>
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            </div>
          )
        ) : isRecording ? (
          <div className="w-full h-48 border-2 border-red-500 rounded-2xl flex flex-col items-center justify-center gap-4 bg-card animate-pulse">
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <p className="font-medium text-lg text-red-500">Recording...</p>
              <p className="text-2xl font-mono font-bold mt-2">{recordingTime.toFixed(1)}s / {maxAudioDuration}s</p>
            </div>
            <Button
              onClick={stopRecording}
              size="lg"
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Recording
            </Button>
          </div>
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
                <div className="flex gap-2">
                  {inputMode === "record" && (
                    <Button
                      onClick={reRecord}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Re-record
                    </Button>
                  )}
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

          <div className="flex items-center gap-4">
            {/* Output Language Selector - Compact */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="h-9 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-accent transition-colors"
                title="Output language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Character Count */}
            <div className="text-sm pl-3 border-l border-border/50">
              <span className={`font-mono ${charCount > effectiveMaxChars ? 'text-destructive' : 'text-primary'}`}>
                {charCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / {effectiveMaxChars.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-40 bg-card border border-border rounded-2xl p-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Type or paste your text here..."
          />
        </div>
      </div>

      {/* Cross-Lingual Mode Indicator */}
      {isCrossLingual && (
        <div className="flex justify-center animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Cross-lingual mode active: {SUPPORTED_LANGUAGES.find(l => l.code === refLanguage)?.flag} → {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag} • Max {effectiveMaxChars.toLocaleString()} chars
            </p>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={loading || !file || !text || charCount > effectiveMaxChars}
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

      {/* Status Display */}
      {loading && (
        <div className="space-y-2 animate-fadeIn">
          {jobStatus === "IN_QUEUE" ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  In Queue{queueTime > 0 ? ` • Estimated wait: ${Math.ceil(queueTime / 1000)}s` : ""}
                </p>
              </div>
            </div>
          ) : jobStatus === "IN_PROGRESS" || progress > 0 ? (
            <>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {progress < 20 ? "Processing audio..." : progress < 90 ? "Generating voice..." : "Almost done..."}
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Starting...</p>
              </div>
            </div>
          )}
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
              onClick={async () => {
                try {
                  // For S3/R2 URLs, fetch and create blob for download
                  const response = await fetch(audioSrc);
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'generated-voice.mp3';
                  link.click();
                  URL.revokeObjectURL(url); // Clean up
                } catch (err) {
                  console.error('Download failed:', err);
                  alert('Failed to download audio. Please try again.');
                }
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

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {genAudioDuration > 0 && (
                  <span className="font-mono text-primary">
                    Duration: {genAudioDuration.toFixed(2)}s
                  </span>
                )}
                {genAudioSize > 0 && genAudioDuration > 0 && (
                  <span className="mx-2">•</span>
                )}
                {genAudioSize > 0 && (
                  <span className="font-mono text-primary">
                    Size: {genAudioSize >= 1024 * 1024
                      ? `${(genAudioSize / (1024 * 1024)).toFixed(2)} MB`
                      : `${(genAudioSize / 1024).toFixed(2)} KB`}
                  </span>
                )}
              </div>
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

      {/* Recent Audios Section */}
      {recentAudios.length > 0 && (
        <div className="relative animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Recent Audios
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your last 3 generated voice clones
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentAudios.map((audio, index) => (
              <div
                key={audio.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Voice Clone #{recentAudios.length - index}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(audio.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  {audio.charCount} characters
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = audio.url;
                      a.download = `voice-clone-${audio.id}.mp3`;
                      a.click();
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // If this audio is already playing, stop it
                      if (playingRecordingId === audio.id) {
                        playingRecordingAudio?.pause();
                        setPlayingRecordingId(null);
                        setPlayingRecordingAudio(null);
                        return;
                      }

                      // Stop any currently playing audio
                      if (playingRecordingAudio) {
                        playingRecordingAudio.pause();
                      }

                      // Play the new audio
                      const audioPlayer = new Audio(audio.url);
                      setPlayingRecordingId(audio.id);
                      setPlayingRecordingAudio(audioPlayer);

                      audioPlayer.addEventListener('ended', () => {
                        setPlayingRecordingId(null);
                        setPlayingRecordingAudio(null);
                      });

                      audioPlayer.play().catch((err) => {
                        console.error('Failed to play audio:', err);
                        alert('Failed to play audio. The file may have expired or is not available.');
                        setPlayingRecordingId(null);
                        setPlayingRecordingAudio(null);
                      });
                    }}
                  >
                    {playingRecordingId === audio.id ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {loadingRecordings && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
