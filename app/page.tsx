"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [text, setText] = useState("Hello! This is a test of your new AI voice cloning app.");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  // Helper: Convert File to Base64
  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string); // Returns "data:audio/wav;base64,..."
    reader.onerror = error => reject(error);
  });

  const handleGenerate = async () => {
    if (!file || !text) return alert("Please upload a file and enter text.");
    
    setLoading(true);
    setAudioSrc(null); // Reset player

    try {
      // 1. Prepare Audio
      const fullBase64 = await toBase64(file);
      // Remove the "data:audio/wav;base64," prefix for the API
      const base64Data = fullBase64.split(",")[1];

      // 2. Call Next.js API
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

      // 3. Play Audio Immediately
      // We convert the Base64 MP3 back to a playable URL
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
      setAudioSrc(audioUrl);

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">🎙️ F5-TTS Tester</h1>
        
        {/* 1. File Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Reference Voice (3-10s WAV)</label>
          <input 
            type="file" 
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>

        {/* 2. Text Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Text to Speak</label>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-black"
          />
        </div>

        {/* 3. Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors
            ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'}`}
        >
          {loading ? "Generating..." : "Generate Voice"}
        </button>

        {/* 4. Audio Player */}
        {audioSrc && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 text-center">
            <p className="text-green-800 text-sm mb-2 font-medium">✨ Generation Complete!</p>
            <audio controls src={audioSrc} autoPlay className="w-full" />
            <a href={audioSrc} download="generated_voice.mp3" className="text-xs text-green-600 underline mt-2 block">
              Download MP3
            </a>
          </div>
        )}
      </div>
    </main>
  );
}