"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Play, Pause, Download, Loader2, Volume2, AlertCircle, Clock } from "lucide-react";
import { useKokoroTTS, KOKORO_VOICES } from "@/hooks/useKokoroTTS";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";

export default function AIVoicesTab() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<string>("af_nicole");
  const [speed, setSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSize, setAudioSize] = useState(0);
  const [recentAudios, setRecentAudios] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [playingRecordingAudio, setPlayingRecordingAudio] = useState<HTMLAudioElement | null>(null);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const { generateSpeech, isLoading, error, isInitialized, progress } = useKokoroTTS();

  const maxChars = 50000;
  const languages = ["all", ...Array.from(new Set(KOKORO_VOICES.map(v => v.language)))];
  const genders = ["all", "Male", "Female"];

  // Fetch recent recordings
  const fetchRecentAudios = async () => {
    setLoadingRecordings(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/recordings?type=tts", {
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
      const isActive = document.querySelector('[data-tab="tts"]:not(.hidden)');
      if (isActive) {
        fetchRecentAudios();
      }
    };

    // Initial fetch with a small delay to let the tab system settle
    const timer = setTimeout(() => {
      checkAndFetch();
    }, 100);

    // Set up MutationObserver to detect when tab becomes visible
    const tabElement = document.querySelector('[data-tab="tts"]');
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

    return () => clearTimeout(timer);
  }, []);

  // Filter voices based on selected filters
  const filteredVoices = KOKORO_VOICES.filter(voice => {
    const matchesLanguage = filterLanguage === "all" || voice.language === filterLanguage;
    const matchesGender = filterGender === "all" || voice.gender === filterGender;
    const matchesSearch = searchQuery === "" ||
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLanguage && matchesGender && matchesSearch;
  });

  const handleGenerate = async () => {
    if (!text.trim()) return;

    try {
      // Clean up old audio
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
        setIsPlaying(false);
      }

      const url = await generateSpeech(text, selectedVoice, speed);

      // Get audio file size
      const response = await fetch(url);
      const blob = await response.blob();
      setAudioSize(blob.size);

      setAudioUrl(url);

      // Refresh recent audios
      fetchRecentAudios();
    } catch (err) {
      console.error("Failed to generate speech:", err);
    }
  };

  // Initialize waveform when audio is generated
  useEffect(() => {
    if (audioUrl && waveformRef.current) {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "oklch(0.7 0.18 195 / 0.4)",
        progressColor: "oklch(0.7 0.18 195)",
        cursorColor: "oklch(0.8 0.22 175)",
        cursorWidth: 3,
        barWidth: 2,
        barGap: 1,
        height: 120,
        normalize: true,
        backend: "WebAudio",
      });

      wavesurfer.load(audioUrl);

      wavesurfer.on("ready", () => {
        const duration = wavesurfer.getDuration();
        setAudioDuration(duration);
      });

      wavesurfer.on("play", () => setIsPlaying(true));
      wavesurfer.on("pause", () => setIsPlaying(false));
      wavesurfer.on("finish", () => setIsPlaying(false));

      wavesurferRef.current = wavesurfer;
    }
  }, [audioUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice-${selectedVoice}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedVoiceData = KOKORO_VOICES.find(v => v.id === selectedVoice);

  // Format duration as Xm Ys
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handlePreviewVoice = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Stop any currently playing preview
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }

    // If clicking the same voice that's playing, just stop it
    if (previewVoice === voiceId) {
      setPreviewVoice(null);
      return;
    }

    try {
      setPreviewVoice(voiceId);
      const voiceData = KOKORO_VOICES.find(v => v.id === voiceId);

      // Get language-specific preview text with psychological impact
      const getPreviewText = (language: string) => {
        switch (language) {
          case 'English (US)':
          case 'English (UK)':
            return 'Your words have power. Let me bring your vision to life with clarity and emotion.';
          case 'Spanish':
            return 'Tus palabras tienen poder. Déjame dar vida a tu visión con claridad y emoción.';
          case 'French':
            return 'Vos mots ont du pouvoir. Laissez-moi donner vie à votre vision avec clarté et émotion.';
          case 'Chinese':
            return '您的话语充满力量。让我用清晰和情感为您的愿景注入生命。';
          case 'Japanese':
            return 'あなたの言葉には力があります。明確さと感情であなたのビジョンに命を吹き込ませてください。';
          case 'Hindi':
            return 'आपके शब्दों में शक्ति है। मुझे स्पष्टता और भावना के साथ आपकी दृष्टि को जीवंत करने दें।';
          case 'Italian':
            return 'Le tue parole hanno potere. Lascia che dia vita alla tua visione con chiarezza ed emozione.';
          case 'Portuguese':
            return 'Suas palavras têm poder. Deixe-me dar vida à sua visão com clareza e emoção.';
          default:
            return 'Your words have power. Let me bring your vision to life.';
        }
      };

      const previewText = getPreviewText(voiceData?.language || 'English (US)');

      const url = await generateSpeech(previewText, voiceId, 1.0);

      const audio = new Audio(url);
      setPreviewAudio(audio);

      audio.addEventListener('ended', () => {
        setPreviewVoice(null);
        setPreviewAudio(null);
        URL.revokeObjectURL(url);
      });

      audio.play();
    } catch (err) {
      console.error("Failed to preview voice:", err);
      setPreviewVoice(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Introduction Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              60+ AI Voices
            </h2>
            <p className="text-muted-foreground">
              Generate natural-sounding speech with advanced AI technology. Professional quality voice synthesis in multiple languages.
            </p>
            {!isInitialized && progress > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initializing AI voices... {progress}%
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Text Input & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Text Input */}
          <div className="bg-card border border-border rounded-xl p-6">
            <label className="block text-sm font-medium mb-3">
              Enter Text
              <span className="text-muted-foreground ml-2">
                ({text.length}/{maxChars} characters)
              </span>
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setText(e.target.value);
                }
              }}
              placeholder="Type or paste your text here to generate speech..."
              className="w-full h-40 px-4 py-3 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Speed Control */}
          <div className="bg-card border border-border rounded-xl p-6">
            <label className="block text-sm font-medium mb-3">
              Speech Speed: {speed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0.5x (Slower)</span>
              <span>2.0x (Faster)</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!text.trim() || isLoading}
            className="w-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white font-medium py-4 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Speech...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Speech
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <div className="bg-card border border-green-500/20 rounded-xl p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Generated Audio</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVoiceData?.name} - {selectedVoiceData?.language}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 mb-4">
                <div ref={waveformRef} />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div>
                  Duration: <span className="font-mono text-primary">{formatDuration(audioDuration)}</span>
                </div>
                <div>
                  Size: <span className="font-mono text-primary">{(audioSize / 1024).toFixed(2)} KB</span>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={togglePlayPause}
                  className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Play Generated Voice
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Voice Selection */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-medium mb-4">Select Voice</h3>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Language Filter */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">Language</label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>
                    {lang === "all" ? "All Languages" : lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">Gender</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {genders.map(gender => (
                  <option key={gender} value={gender}>
                    {gender === "all" ? "All Genders" : gender}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredVoices.map(voice => (
                <div
                  key={voice.id}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedVoice === voice.id
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <button
                      onClick={() => setSelectedVoice(voice.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <span className="text-lg">{voice.flag}</span>
                      <span className="font-medium text-sm">{voice.name}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handlePreviewVoice(voice.id, e)}
                        disabled={isLoading}
                        className="w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Preview voice"
                      >
                        {previewVoice === voice.id && isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        ) : previewVoice === voice.id ? (
                          <Pause className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
                        )}
                      </button>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                        {voice.gender}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{voice.description}</p>
                </div>
              ))}
            </div>

            {filteredVoices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No voices found matching your filters
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Audios Section */}
      {recentAudios.length > 0 && (
        <div className="relative animate-fadeIn mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Recent TTS Audios
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your last 3 generated TTS audios
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
                      <p className="text-sm font-medium">TTS Audio #{recentAudios.length - index}</p>
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
                      a.download = `tts-${audio.id}.mp3`;
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
