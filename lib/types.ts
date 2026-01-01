// VoiceForge Types

export interface User {
  id: string;
  username: string;
  password: string;
  status: 'active' | 'inactive';
  currentPlan: 'starter' | 'basic' | 'pro' | 'enterprise' | 'custom';
  planStartedAt: number;
  planExpiresAt: number;
  createdAt: number;
}

export interface UserCredits {
  userId: string;
  // Voice Cloning
  totalVoiceCloningChars: number;
  usedVoiceCloningChars: number;
  remainingVoiceCloningChars: number;
  // TTS
  totalTTSChars: number;
  usedTTSChars: number;
  remainingTTSChars: number;
  // Stats
  totalAudioDuration: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  lastUpdated: number;
}

export interface Recording {
  id: string;
  userId: string;
  r2Key: string;
  duration: number;
  charCount: number;
  type: 'voice_clone' | 'tts';
  createdAt: number;
}

export interface SubscriptionHistory {
  id: string;
  userId: string;
  planName: string;
  voiceCloningChars: number;
  ttsChars: number;
  amountPaid: number;
  periodStart: number;
  periodEnd: number;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: number;
}

export interface Plan {
  name: string;
  voiceCloningChars: number;
  ttsChars: number;
  price: number;
  maxAudioDuration: number;
}

export const PLANS: Record<string, Plan> = {
  starter: {
    name: "Starter Pack",
    voiceCloningChars: 750000,     // 750K chars/month
    ttsChars: 1500000,             // 1.5M chars/month (TTS gets 2x)
    price: 7,
    maxAudioDuration: 25          // 25 seconds max
  },
  basic: {
    name: "Basic Pack",
    voiceCloningChars: 2500000,    // 2.5M chars/month
    ttsChars: 5000000,             // 5M chars/month (TTS gets 2x)
    price: 18,
    maxAudioDuration: 25
  },
  pro: {
    name: "Pro Pack",
    voiceCloningChars: 4000000,    // 4M chars/month
    ttsChars: 8000000,             // 8M chars/month (TTS gets 2x)
    price: 25,
    maxAudioDuration: 25
  },
  enterprise: {
    name: "Enterprise Pack",
    voiceCloningChars: 10000000,   // 10M chars/month
    ttsChars: 20000000,            // 20M chars/month (TTS gets 2x)
    price: 36,
    maxAudioDuration: 25
  },
  custom: {
    name: "Custom Plan",
    voiceCloningChars: 0,          // Set by admin
    ttsChars: 0,                   // Set by admin
    price: 0,                      // Set by admin
    maxAudioDuration: 25           // Default, can be customized
  }
};
