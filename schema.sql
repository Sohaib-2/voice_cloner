-- VoiceForge Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  current_plan TEXT DEFAULT 'starter' CHECK(current_plan IN ('starter', 'basic', 'pro', 'enterprise')),
  plan_started_at INTEGER NOT NULL,
  plan_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- User Credits Table (monthly tracking)
CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  -- Voice Cloning Credits
  total_voice_cloning_chars INTEGER NOT NULL DEFAULT 0,
  used_voice_cloning_chars INTEGER NOT NULL DEFAULT 0,
  remaining_voice_cloning_chars INTEGER NOT NULL DEFAULT 0,
  -- TTS Credits
  total_tts_chars INTEGER NOT NULL DEFAULT 0,
  used_tts_chars INTEGER NOT NULL DEFAULT 0,
  remaining_tts_chars INTEGER NOT NULL DEFAULT 0,
  -- Stats
  total_audio_duration REAL NOT NULL DEFAULT 0,
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recordings Table (last 3 per type)
CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  duration REAL NOT NULL,
  char_count INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('voice_clone', 'tts')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subscription History Table
CREATE TABLE IF NOT EXISTS subscription_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  voice_cloning_chars INTEGER NOT NULL,
  tts_chars INTEGER NOT NULL,
  amount_paid REAL NOT NULL DEFAULT 0,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_type ON recordings(type);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
