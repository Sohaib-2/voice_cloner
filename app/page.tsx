"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Mic, User, Settings, AudioWaveform, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-provider";
import VoiceCloningTab from "@/components/tabs/VoiceCloningTab";
import AIVoicesTab from "@/components/tabs/AIVoicesTab";
import { cn } from "@/lib/utils";

type Tab = "clone" | "tts";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("clone");
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const maxChars = 50000;
  const maxAudioDuration = 25;

  if (!isMounted) return null;

  return (
    <main className="relative min-h-screen bg-background overflow-x-hidden selection:bg-primary/20">
      {/* --- Background Effects --- */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="fixed left-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 opacity-30 blur-[120px]"></div>
      <div className="fixed right-0 bottom-0 -z-10 h-[500px] w-[500px] rounded-full bg-purple-500/10 opacity-30 blur-[120px]"></div>

      {/* CHANGED: Increased max-w from 7xl to [1600px] for a wider layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* --- Header --- */}
        <header className="flex items-center justify-between mb-12">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">VoiceForge</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                 {/* Admin Icon */}
                 {user.role === 'admin' && (
                  <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} title="Admin Panel">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </Button>
                 )}
                
                {/* User / Dashboard Icon */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => router.push("/dashboard")}
                  className="rounded-full bg-secondary/50 hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                  title="Dashboard"
                >
                    <User className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/login")} size="sm" className="rounded-full px-5">
                Sign In
              </Button>
            )}
          </div>
        </header>

        {/* --- Split Layout Grid --- */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Text (Sticky) */}
          {/* CHANGED: Adjusted column span from 4 to 3 to give the tool more room */}
          <div className="lg:col-span-3 lg:sticky lg:top-24 pt-4">
             <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
             >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-medium mb-6">
                  <Sparkles className="w-3 h-3" />
                  <span>AI V2.0 Engine</span>
                </div>

                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                  Your words, <br />
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    perfectly spoken.
                  </span>
                </h1>
                
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Experience the next generation of voice synthesis. Clone your voice in seconds or choose from our pro library.
                </p>

                {/* Feature List */}
                <ul className="space-y-3 mb-8">
                  {['Ultra-low latency generation', 'Studio quality 48kHz audio', 'Emotional range control'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
             </motion.div>
          </div>

          {/* Right Column: The Tool (Tabs + Card) */}
          {/* CHANGED: Adjusted column span from 8 to 9 */}
          <div className="lg:col-span-9">
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
             >
                {/* Tabs */}
                <div className="flex items-center justify-between mb-6">
                  <div className="inline-flex p-1 bg-muted/50 border border-border/50 rounded-xl">
                    {(["clone", "tts"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out flex items-center gap-2",
                          activeTab === tab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {activeTab === tab && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-primary shadow-sm rounded-lg"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          {tab === "clone" ? <Mic className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                          {tab === "clone" ? "Voice Cloning" : "AI Voices"}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Ready to generate
                  </div>
                </div>

                {/* Main Functional Card */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl shadow-black/5 ring-1 ring-white/10 dark:ring-white/5 relative overflow-hidden">
                   {/* Top subtle glow line */}
                   <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

                   <div className="p-1">
                      {/* Keep both tabs mounted to prevent audio from stopping */}
                      <div data-tab="clone" className={cn("p-6 sm:p-8", activeTab !== "clone" && "hidden")}>
                        <VoiceCloningTab maxChars={maxChars} maxAudioDuration={maxAudioDuration} />
                      </div>
                      <div data-tab="tts" className={cn("p-6 sm:p-8", activeTab !== "tts" && "hidden")}>
                        <AIVoicesTab />
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>

        </div>
      </div>
    </main>
  );
}