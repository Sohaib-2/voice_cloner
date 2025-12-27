"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, Sparkles } from "lucide-react";

interface AudioTrimmerProps {
  audioFile: File;
  onTrimComplete: (trimmedFile: File) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

export default function AudioTrimmer({
  audioFile,
  onTrimComplete,
  onCancel,
  maxDuration = 25,
}: AudioTrimmerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [removeNoise, setRemoveNoise] = useState(true);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
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

    // Create Regions plugin
    const regions = wavesurfer.registerPlugin(RegionsPlugin.create());
    regionsPluginRef.current = regions;

    // Load audio file
    const url = URL.createObjectURL(audioFile);
    wavesurfer.load(url);

    // When audio is ready
    wavesurfer.on("ready", () => {
      const duration = wavesurfer.getDuration();
      setAudioDuration(duration);

      // Create initial region (either full audio or max duration)
      const regionDuration = Math.min(duration, maxDuration);
      const start = 0;
      const end = regionDuration;

      regions.addRegion({
        start: start,
        end: end,
        color: "oklch(0.72 0.22 295 / 0.25)",
        drag: true,
        resize: true,
      });

      setRegionStart(start);
      setRegionEnd(end);
    });

    // Update region state when changed
    regions.on("region-updated", (region) => {
      let start = region.start;
      let end = region.end;

      // Ensure region doesn't exceed max duration
      if (end - start > maxDuration) {
        end = start + maxDuration;
        region.setOptions({ end });
      }

      setRegionStart(start);
      setRegionEnd(end);
    });

    // Play/pause events
    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
      URL.revokeObjectURL(url);
    };
  }, [audioFile, maxDuration]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  // Client-side noise reduction using high-pass filter and noise gate
  const applyNoiseReduction = async (audioBuffer: AudioBuffer): Promise<AudioBuffer> => {
    const sampleRate = audioBuffer.sampleRate;
    const context = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      sampleRate
    );

    // Create source
    const source = context.createBufferSource();
    source.buffer = audioBuffer;

    // High-pass filter to remove low-frequency noise (below 80Hz)
    const highPassFilter = context.createBiquadFilter();
    highPassFilter.type = "highpass";
    highPassFilter.frequency.value = 80;
    highPassFilter.Q.value = 1;

    // Connect nodes
    source.connect(highPassFilter);
    highPassFilter.connect(context.destination);
    source.start(0);

    return await context.startRendering();
  };

  const handleTrim = async () => {
    if (!wavesurferRef.current) return;

    setTrimming(true);

    try {
      // Decode audio file
      const audioContext = new AudioContext();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Calculate sample positions
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(regionStart * sampleRate);
      const endSample = Math.floor(regionEnd * sampleRate);
      const trimmedLength = endSample - startSample;

      // Create trimmed buffer
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        sampleRate
      );

      // Copy trimmed audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);
        for (let i = 0; i < trimmedLength; i++) {
          trimmedData[i] = channelData[startSample + i];
        }
      }

      // Apply noise reduction if enabled
      let finalBuffer = trimmedBuffer;
      if (removeNoise) {
        finalBuffer = await applyNoiseReduction(trimmedBuffer);
      }

      // Convert to WAV blob
      const wavBlob = await audioBufferToWav(finalBuffer);
      const trimmedFile = new File([wavBlob], audioFile.name, { type: "audio/wav" });

      onTrimComplete(trimmedFile);
    } catch (error) {
      console.error("Error trimming audio:", error);
      alert("Failed to trim audio. Please try again.");
    } finally {
      setTrimming(false);
    }
  };

  return (
    <div className="space-y-4">
      {audioDuration > maxDuration ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Audio too long!</strong> Your audio is {audioDuration.toFixed(1)}s.
            Select a {maxDuration}-second section by dragging the blue highlighted region.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Perfect length!</strong> Your audio is {audioDuration.toFixed(1)}s.
            You can still trim it or adjust the selection if needed.
          </p>
        </div>
      )}

      {/* Waveform */}
      <div className="border-2 border-violet-200 dark:border-violet-800 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div ref={waveformRef} />
      </div>

      {/* Noise Removal Toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setRemoveNoise(!removeNoise)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            removeNoise ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              removeNoise ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${removeNoise ? 'text-violet-600' : 'text-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Clean Audio (Remove Background Noise)
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Selected: {regionStart.toFixed(2)}s - {regionEnd.toFixed(2)}s
          <span className="ml-2 font-semibold">
            ({(regionEnd - regionStart).toFixed(2)}s / {maxDuration}s)
          </span>
        </div>

        <div className="flex gap-2">
          <Button onClick={togglePlayPause} variant="outline" size="sm">
            {isPlaying ? (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Preview</>
            )}
          </Button>

          <Button onClick={onCancel} variant="outline" size="sm">
            Cancel
          </Button>

          <Button
            onClick={handleTrim}
            disabled={trimming || (regionEnd - regionStart) > maxDuration}
            className="bg-violet-600 hover:bg-violet-700"
            size="sm"
          >
            {trimming ? (
              <>Trimming...</>
            ) : (
              <><Check className="w-4 h-4 mr-2" /> Use This Section</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert AudioBuffer to WAV blob
async function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  setUint32(0x46464952);
  // file length
  setUint32(length - 8);
  // RIFF type
  setUint32(0x45564157);
  // format chunk identifier
  setUint32(0x20746d66);
  // format chunk length
  setUint32(16);
  // sample format (raw)
  setUint16(1);
  // channel count
  setUint16(buffer.numberOfChannels);
  // sample rate
  setUint32(buffer.sampleRate);
  // byte rate (sample rate * block align)
  setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
  // block align (channel count * bytes per sample)
  setUint16(buffer.numberOfChannels * 2);
  // bits per sample
  setUint16(16);
  // data chunk identifier
  setUint32(0x61746164);
  // data chunk length
  setUint32(length - pos - 4);

  // Write interleaved data
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
}
