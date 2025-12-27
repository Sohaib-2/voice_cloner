"use client";

import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const VOICE_MAP = {
  // 🇺🇸 US English (lang: a)
  "Jessica": "af_heart", "Sarah": "af_bella", "Nicole": "af_nicole",
  "Sky": "af_sky", "Alloy": "af_alloy", "Jessica 2": "af_jessica",
  "Kore": "af_kore", "River": "af_river", "Nova": "af_nova",
  "Michael": "am_michael", "Adam": "am_adam", "Echo": "am_echo",
  "Eric": "am_eric", "Liam": "am_liam", "Onyx": "am_onyx",
  "Puck": "am_puck", "Fenrir": "am_fenrir",

  // 🇬🇧 British English (lang: b)
  "Emma": "bf_emma", "Isabella": "bf_isabella", "Alice": "bf_alice",
  "Lily": "bf_lily", "George": "bm_george", "Lewis": "bm_lewis",
  "Daniel": "bm_daniel", "Fable": "bm_fable",

  // 🇯🇵 Japanese (lang: j)
  "Hina": "jf_hina", "Alpha (JP)": "jf_alpha", "Gongitsune": "jf_gongitsune",
  "Nezumi": "jf_nezumi", "Tebukuro": "jf_tebukuro", "Yuki": "jf_yuki",
  "Kumo": "jm_kumo",

  // 🇫🇷 French (lang: f)
  "Siwis": "ff_siwis",

  // 🇨🇳 Chinese (lang: z)
  "Xiaobei": "zf_xiaobei", "Xiaoni": "zf_xiaoni", "Xiaoxiao": "zf_xiaoxiao",
  "Xiaoyi": "zf_xiaoyi", "Yunjian": "zm_yunjian", "Yunxi": "zm_yunxi",
  "Yunxia": "zm_yunxia", "Yunyang": "zm_yunyang",

  // 🇪🇸 Spanish (lang: e)
  "Dora (ES)": "ef_dora", "Alex (ES)": "em_alex", "Santa (ES)": "em_santa",

  // 🇮🇹 Italian (lang: i)
  "Sara (IT)": "if_sara", "Nicola": "im_nicola",

  // 🇧🇷 Portuguese (lang: p)
  "Dora (BR)": "pf_dora", "Alex (BR)": "pm_alex", "Santa (BR)": "pm_santa",
};

const VOICE_CATEGORIES = {
  "🇺🇸 US English - Female": [
    "Jessica", "Sarah", "Nicole", "Sky", "Alloy", "Jessica 2", "Kore", "River", "Nova"
  ],
  "🇺🇸 US English - Male": [
    "Michael", "Adam", "Echo", "Eric", "Liam", "Onyx", "Puck", "Fenrir"
  ],
  "🇬🇧 British English - Female": [
    "Emma", "Isabella", "Alice", "Lily"
  ],
  "🇬🇧 British English - Male": [
    "George", "Lewis", "Daniel", "Fable"
  ],
  "🇯🇵 Japanese - Female": [
    "Hina", "Alpha (JP)", "Gongitsune", "Nezumi", "Tebukuro", "Yuki"
  ],
  "🇯🇵 Japanese - Male": [
    "Kumo"
  ],
  "🇫🇷 French": [
    "Siwis"
  ],
  "🇨🇳 Chinese - Female": [
    "Xiaobei", "Xiaoni", "Xiaoxiao", "Xiaoyi"
  ],
  "🇨🇳 Chinese - Male": [
    "Yunjian", "Yunxi", "Yunxia", "Yunyang"
  ],
  "🇪🇸 Spanish": [
    "Dora (ES)", "Alex (ES)", "Santa (ES)"
  ],
  "🇮🇹 Italian": [
    "Sara (IT)", "Nicola"
  ],
  "🇧🇷 Portuguese": [
    "Dora (BR)", "Alex (BR)", "Santa (BR)"
  ],
};

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

export default function VoiceSelector({ selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCategories = Object.entries(VOICE_CATEGORIES).reduce((acc, [category, voices]) => {
    const filtered = voices.filter(voice =>
      voice.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="w-full justify-between h-12 text-left font-normal bg-card hover:bg-accent"
      >
        <span className="font-semibold text-primary">{selectedVoice}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg max-h-[500px] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border sticky top-0 bg-popover">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search voices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            <div className="overflow-y-auto">
              {Object.entries(filteredCategories).map(([category, voices]) => (
                <div key={category} className="border-b border-border last:border-0">
                  <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground sticky top-0">
                    {category}
                  </div>
                  <div className="py-1">
                    {voices.map((voice) => (
                      <button
                        key={voice}
                        onClick={() => {
                          onVoiceChange(voice);
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex items-center justify-between group"
                      >
                        <span className="font-medium text-foreground">{voice}</span>
                        {selectedVoice === voice && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(filteredCategories).length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No voices found matching "{search}"
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
