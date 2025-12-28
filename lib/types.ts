// VoiceForge Types

export interface User {
  id: string;
  username: string;
  password: string;
  status: 'active' | 'inactive';
  currentPlan: 'starter' | 'basic' | 'pro' | 'enterprise';
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
    voiceCloningChars: 100000,    // 100K chars/month
    ttsChars: 100000,
    price: 9.99,
    maxAudioDuration: 15          // 15 seconds max
  },
  basic: {
    name: "Basic Pack",
    voiceCloningChars: 500000,    // 500K chars/month
    ttsChars: 500000,
    price: 29.99,
    maxAudioDuration: 30
  },
  pro: {
    name: "Pro Pack",
    voiceCloningChars: 1000000,   // 1M chars/month
    ttsChars: 1000000,
    price: 49.99,
    maxAudioDuration: 30
  },
  enterprise: {
    name: "Enterprise Pack",
    voiceCloningChars: 5000000,   // 5M chars/month
    ttsChars: 5000000,
    price: 199.99,
    maxAudioDuration: 60
  }
};
