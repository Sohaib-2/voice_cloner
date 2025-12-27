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

export const VOICE_INFO = {
  // 🇺🇸 US English - Female
  "Jessica": { gender: "Female", description: "Warm and expressive with heartfelt delivery" },
  "Sarah": { gender: "Female", description: "Warm and friendly with natural intonation" },
  "Nicole": { gender: "Female", description: "Professional and articulate with dynamic range" },
  "Sky": { gender: "Female", description: "Light and airy with youthful energy" },
  "Alloy": { gender: "Female", description: "Balanced and versatile for general use" },
  "Jessica 2": { gender: "Female", description: "Clear and direct with neutral tone" },
  "Kore": { gender: "Female", description: "Smooth and pleasant with consistent quality" },
  "River": { gender: "Female", description: "Calm and flowing with gentle delivery" },
  "Nova": { gender: "Female", description: "Modern and crisp with bright tonality" },

  // 🇺🇸 US English - Male
  "Michael": { gender: "Male", description: "Clear and confident with professional tone" },
  "Adam": { gender: "Male", description: "Deep and authoritative with strong presence" },
  "Echo": { gender: "Male", description: "Resonant and engaging with dynamic range" },
  "Eric": { gender: "Male", description: "Friendly and approachable with warm delivery" },
  "Liam": { gender: "Male", description: "Smooth and articulate with natural flow" },
  "Onyx": { gender: "Male", description: "Rich and deep with commanding presence" },
  "Puck": { gender: "Male", description: "Energetic and lively with playful character" },
  "Fenrir": { gender: "Male", description: "Strong and bold with powerful delivery" },

  // 🇬🇧 British English - Female
  "Emma": { gender: "Female", description: "Refined British accent with elegant delivery" },
  "Isabella": { gender: "Female", description: "Sophisticated and clear British tone" },
  "Alice": { gender: "Female", description: "Pleasant British voice with gentle quality" },
  "Lily": { gender: "Female", description: "Soft British accent with delicate expression" },

  // 🇬🇧 British English - Male
  "George": { gender: "Male", description: "Distinguished British voice with authority" },
  "Lewis": { gender: "Male", description: "Clear British accent with professional tone" },
  "Daniel": { gender: "Male", description: "Articulate British voice with precision" },
  "Fable": { gender: "Male", description: "Narrative British tone with storytelling quality" },

  // 🇯🇵 Japanese - Female
  "Hina": { gender: "Female", description: "Gentle Japanese voice with sweet character" },
  "Alpha (JP)": { gender: "Female", description: "Clear Japanese delivery with natural flow" },
  "Gongitsune": { gender: "Female", description: "Expressive Japanese voice with character" },
  "Nezumi": { gender: "Female", description: "Light Japanese tone with delicate quality" },
  "Tebukuro": { gender: "Female", description: "Warm Japanese voice with friendly delivery" },
  "Yuki": { gender: "Female", description: "Soft Japanese accent with calm presence" },

  // 🇯🇵 Japanese - Male
  "Kumo": { gender: "Male", description: "Clear Japanese voice with steady delivery" },

  // 🇫🇷 French
  "Siwis": { gender: "Female", description: "Elegant French accent with refined quality" },

  // 🇨🇳 Chinese - Female
  "Xiaobei": { gender: "Female", description: "Clear Mandarin voice with pleasant tone" },
  "Xiaoni": { gender: "Female", description: "Sweet Mandarin delivery with gentle quality" },
  "Xiaoxiao": { gender: "Female", description: "Bright Mandarin voice with cheerful character" },
  "Xiaoyi": { gender: "Female", description: "Professional Mandarin tone with clarity" },

  // 🇨🇳 Chinese - Male
  "Yunjian": { gender: "Male", description: "Strong Mandarin voice with confident delivery" },
  "Yunxi": { gender: "Male", description: "Smooth Mandarin tone with natural flow" },
  "Yunxia": { gender: "Male", description: "Warm Mandarin voice with friendly presence" },
  "Yunyang": { gender: "Male", description: "Clear Mandarin delivery with steady quality" },

  // 🇪🇸 Spanish
  "Dora (ES)": { gender: "Female", description: "Warm Spanish voice with expressive delivery" },
  "Alex (ES)": { gender: "Male", description: "Clear Spanish tone with natural accent" },
  "Santa (ES)": { gender: "Male", description: "Friendly Spanish voice with character" },

  // 🇮🇹 Italian
  "Sara (IT)": { gender: "Female", description: "Melodic Italian voice with expressive quality" },
  "Nicola": { gender: "Male", description: "Clear Italian tone with natural delivery" },

  // 🇧🇷 Portuguese
  "Dora (BR)": { gender: "Female", description: "Warm Brazilian Portuguese with lively tone" },
  "Alex (BR)": { gender: "Male", description: "Clear Brazilian Portuguese with natural flow" },
  "Santa (BR)": { gender: "Male", description: "Friendly Brazilian Portuguese with character" },
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
                    {voices.map((voice) => {
                      const info = VOICE_INFO[voice as keyof typeof VOICE_INFO];
                      return (
                        <button
                          key={voice}
                          onClick={() => {
                            onVoiceChange(voice);
                            setIsOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{voice}</span>
                              {info && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  {info.gender}
                                </span>
                              )}
                            </div>
                            {info && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {info.description}
                              </p>
                            )}
                          </div>
                          {selectedVoice === voice && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
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
