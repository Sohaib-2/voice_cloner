import { useState, useCallback } from 'react';

export interface KokoroVoice {
  id: string;
  name: string;
  gender: string;
  language: string;
  description: string;
  flag: string;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  // American English - Female (11 voices)
  { id: 'af_heart', name: 'Heart', gender: 'Female', language: 'English (US)', description: 'Warm and expressive with heartfelt delivery', flag: '🇺🇸' },
  { id: 'af_alloy', name: 'Alloy', gender: 'Female', language: 'English (US)', description: 'Balanced and versatile for general use', flag: '🇺🇸' },
  { id: 'af_aoede', name: 'Aoede', gender: 'Female', language: 'English (US)', description: 'Melodic and harmonious voice', flag: '🇺🇸' },
  { id: 'af_bella', name: 'Bella', gender: 'Female', language: 'English (US)', description: 'Warm and friendly with natural intonation', flag: '🇺🇸' },
  { id: 'af_jessica', name: 'Jessica', gender: 'Female', language: 'English (US)', description: 'Clear and direct with neutral tone', flag: '🇺🇸' },
  { id: 'af_kore', name: 'Kore', gender: 'Female', language: 'English (US)', description: 'Smooth and pleasant with consistent quality', flag: '🇺🇸' },
  { id: 'af_nicole', name: 'Nicole', gender: 'Female', language: 'English (US)', description: 'Professional and articulate with dynamic range', flag: '🇺🇸' },
  { id: 'af_nova', name: 'Nova', gender: 'Female', language: 'English (US)', description: 'Modern and crisp with bright tonality', flag: '🇺🇸' },
  { id: 'af_river', name: 'River', gender: 'Female', language: 'English (US)', description: 'Calm and flowing with gentle delivery', flag: '🇺🇸' },
  { id: 'af_sarah', name: 'Sarah', gender: 'Female', language: 'English (US)', description: 'Natural and approachable tone', flag: '🇺🇸' },
  { id: 'af_sky', name: 'Sky', gender: 'Female', language: 'English (US)', description: 'Light and airy with youthful energy', flag: '🇺🇸' },

  // American English - Male (9 voices)
  { id: 'am_adam', name: 'Adam', gender: 'Male', language: 'English (US)', description: 'Deep and authoritative with strong presence', flag: '🇺🇸' },
  { id: 'am_echo', name: 'Echo', gender: 'Male', language: 'English (US)', description: 'Resonant and engaging with dynamic range', flag: '🇺🇸' },
  { id: 'am_eric', name: 'Eric', gender: 'Male', language: 'English (US)', description: 'Friendly and approachable with warm delivery', flag: '🇺🇸' },
  { id: 'am_fenrir', name: 'Fenrir', gender: 'Male', language: 'English (US)', description: 'Strong and bold with powerful delivery', flag: '🇺🇸' },
  { id: 'am_liam', name: 'Liam', gender: 'Male', language: 'English (US)', description: 'Smooth and articulate with natural flow', flag: '🇺🇸' },
  { id: 'am_michael', name: 'Michael', gender: 'Male', language: 'English (US)', description: 'Clear and confident with professional tone', flag: '🇺🇸' },
  { id: 'am_onyx', name: 'Onyx', gender: 'Male', language: 'English (US)', description: 'Rich and deep with commanding presence', flag: '🇺🇸' },
  { id: 'am_puck', name: 'Puck', gender: 'Male', language: 'English (US)', description: 'Energetic and lively with playful character', flag: '🇺🇸' },
  { id: 'am_santa', name: 'Santa', gender: 'Male', language: 'English (US)', description: 'Jolly and warm with cheerful character', flag: '🇺🇸' },

  // British English - Female (4 voices)
  { id: 'bf_alice', name: 'Alice', gender: 'Female', language: 'English (UK)', description: 'Pleasant British voice with gentle quality', flag: '🇬🇧' },
  { id: 'bf_emma', name: 'Emma', gender: 'Female', language: 'English (UK)', description: 'Refined British accent with elegant delivery', flag: '🇬🇧' },
  { id: 'bf_isabella', name: 'Isabella', gender: 'Female', language: 'English (UK)', description: 'Sophisticated and clear British tone', flag: '🇬🇧' },
  { id: 'bf_lily', name: 'Lily', gender: 'Female', language: 'English (UK)', description: 'Soft British accent with delicate expression', flag: '🇬🇧' },

  // British English - Male (4 voices)
  { id: 'bm_daniel', name: 'Daniel', gender: 'Male', language: 'English (UK)', description: 'Articulate British voice with precision', flag: '🇬🇧' },
  { id: 'bm_fable', name: 'Fable', gender: 'Male', language: 'English (UK)', description: 'Narrative British tone with storytelling quality', flag: '🇬🇧' },
  { id: 'bm_george', name: 'George', gender: 'Male', language: 'English (UK)', description: 'Distinguished British voice with authority', flag: '🇬🇧' },
  { id: 'bm_lewis', name: 'Lewis', gender: 'Male', language: 'English (UK)', description: 'Clear British accent with professional tone', flag: '🇬🇧' },

  // Japanese - Female (4 voices)
  { id: 'jf_alpha', name: 'Alpha', gender: 'Female', language: 'Japanese', description: 'Clear Japanese delivery with natural flow', flag: '🇯🇵' },
  { id: 'jf_gongitsune', name: 'Gongitsune', gender: 'Female', language: 'Japanese', description: 'Expressive Japanese voice with character', flag: '🇯🇵' },
  { id: 'jf_nezumi', name: 'Nezumi', gender: 'Female', language: 'Japanese', description: 'Light Japanese tone with delicate quality', flag: '🇯🇵' },
  { id: 'jf_tebukuro', name: 'Tebukuro', gender: 'Female', language: 'Japanese', description: 'Warm Japanese voice with friendly delivery', flag: '🇯🇵' },

  // Japanese - Male (1 voice)
  { id: 'jm_kumo', name: 'Kumo', gender: 'Male', language: 'Japanese', description: 'Clear Japanese voice with steady delivery', flag: '🇯🇵' },

  // Mandarin Chinese - Female (4 voices)
  { id: 'zf_xiaobei', name: 'Xiaobei', gender: 'Female', language: 'Chinese', description: 'Clear Mandarin voice with pleasant tone', flag: '🇨🇳' },
  { id: 'zf_xiaoni', name: 'Xiaoni', gender: 'Female', language: 'Chinese', description: 'Sweet Mandarin delivery with gentle quality', flag: '🇨🇳' },
  { id: 'zf_xiaoxiao', name: 'Xiaoxiao', gender: 'Female', language: 'Chinese', description: 'Bright Mandarin voice with cheerful character', flag: '🇨🇳' },
  { id: 'zf_xiaoyi', name: 'Xiaoyi', gender: 'Female', language: 'Chinese', description: 'Professional Mandarin tone with clarity', flag: '🇨🇳' },

  // Mandarin Chinese - Male (4 voices)
  { id: 'zm_yunjian', name: 'Yunjian', gender: 'Male', language: 'Chinese', description: 'Strong Mandarin voice with confident delivery', flag: '🇨🇳' },
  { id: 'zm_yunxi', name: 'Yunxi', gender: 'Male', language: 'Chinese', description: 'Smooth Mandarin tone with natural flow', flag: '🇨🇳' },
  { id: 'zm_yunxia', name: 'Yunxia', gender: 'Male', language: 'Chinese', description: 'Warm Mandarin voice with friendly presence', flag: '🇨🇳' },
  { id: 'zm_yunyang', name: 'Yunyang', gender: 'Male', language: 'Chinese', description: 'Clear Mandarin delivery with steady quality', flag: '🇨🇳' },

  // Spanish - Female (1 voice)
  { id: 'ef_dora', name: 'Dora', gender: 'Female', language: 'Spanish', description: 'Warm Spanish voice with expressive delivery', flag: '🇪🇸' },

  // Spanish - Male (2 voices)
  { id: 'em_alex', name: 'Alex', gender: 'Male', language: 'Spanish', description: 'Clear Spanish tone with natural accent', flag: '🇪🇸' },
  { id: 'em_santa', name: 'Santa', gender: 'Male', language: 'Spanish', description: 'Friendly Spanish voice with character', flag: '🇪🇸' },

  // French - Female (1 voice)
  { id: 'ff_siwis', name: 'Siwis', gender: 'Female', language: 'French', description: 'Elegant French accent with refined quality', flag: '🇫🇷' },

  // Hindi - Female (2 voices)
  { id: 'hf_alpha', name: 'Alpha', gender: 'Female', language: 'Hindi', description: 'Clear Hindi voice with natural delivery', flag: '🇮🇳' },
  { id: 'hf_beta', name: 'Beta', gender: 'Female', language: 'Hindi', description: 'Warm Hindi tone with pleasant quality', flag: '🇮🇳' },

  // Hindi - Male (2 voices)
  { id: 'hm_omega', name: 'Omega', gender: 'Male', language: 'Hindi', description: 'Strong Hindi voice with confident presence', flag: '🇮🇳' },
  { id: 'hm_psi', name: 'Psi', gender: 'Male', language: 'Hindi', description: 'Clear Hindi delivery with professional tone', flag: '🇮🇳' },

  // Italian - Female (1 voice)
  { id: 'if_sara', name: 'Sara', gender: 'Female', language: 'Italian', description: 'Melodic Italian voice with expressive quality', flag: '🇮🇹' },

  // Italian - Male (1 voice)
  { id: 'im_nicola', name: 'Nicola', gender: 'Male', language: 'Italian', description: 'Clear Italian tone with natural delivery', flag: '🇮🇹' },

  // Brazilian Portuguese - Female (1 voice)
  { id: 'pf_dora', name: 'Dora', gender: 'Female', language: 'Portuguese', description: 'Warm Brazilian Portuguese with lively tone', flag: '🇧🇷' },

  // Brazilian Portuguese - Male (2 voices)
  { id: 'pm_alex', name: 'Alex', gender: 'Male', language: 'Portuguese', description: 'Clear Brazilian Portuguese with natural flow', flag: '🇧🇷' },
  { id: 'pm_santa', name: 'Santa', gender: 'Male', language: 'Portuguese', description: 'Friendly Brazilian Portuguese with character', flag: '🇧🇷' },
];

interface UseKokoroTTSReturn {
  generateSpeech: (text: string, voiceId: string, speed?: number) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  progress: number;
}

export function useKokoroTTS(): UseKokoroTTSReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized] = useState(true); // Always initialized since we use API
  const [progress] = useState(100); // Always ready

  const generateSpeech = useCallback(async (text: string, voiceId: string, speed: number = 1.0): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Call our API route which uses DeepInfra
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          voice: voiceId,
          speed,
          output_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      // Response is now binary audio data
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);

      // Update credits in localStorage if available in headers
      const creditsRemaining = response.headers.get('X-Credits-Remaining');
      if (creditsRemaining && creditsRemaining !== 'unlimited') {
        try {
          const creditsData = localStorage.getItem('credits');
          if (creditsData) {
            const credits = JSON.parse(creditsData);
            const charCount = text.length;

            // Update both remaining and used credits
            credits.tts.remaining = parseInt(creditsRemaining);
            credits.tts.used = credits.tts.total - parseInt(creditsRemaining);

            localStorage.setItem('credits', JSON.stringify(credits));

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('creditsUpdated', { detail: credits }));
          }
        } catch (err) {
          console.error('Failed to update credits:', err);
        }
      }

      return url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateSpeech,
    isLoading,
    error,
    isInitialized,
    progress,
  };
}
