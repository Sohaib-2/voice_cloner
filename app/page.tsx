"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mic, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-provider";
import VoiceCloningTab from "@/components/tabs/VoiceCloningTab";
import AIVoicesTab from "@/components/tabs/AIVoicesTab";

type Tab = "clone" | "tts";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("clone");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const maxChars = 50000;
  const maxAudioDuration = 25;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              AI Powered Voice Generation
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {user && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard")}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  {user.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin")}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent dark:from-violet-300 dark:via-purple-300 dark:to-pink-300">
              VoiceForge
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Clone voices or generate speech with high-quality AI speakers
            </p>
          </div>
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

        {/* Tab Content */}
        {activeTab === "clone" && (
          <VoiceCloningTab maxChars={maxChars} maxAudioDuration={maxAudioDuration} />
        )}

        {activeTab === "tts" && <AIVoicesTab />}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-16">
          <p>Advanced AI Voice Generation Technology</p>
        </div>
      </div>
    </main>
  );
}
