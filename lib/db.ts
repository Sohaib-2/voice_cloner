// Database utility functions for VoiceForge
// This will be used with Cloudflare D1 database

import { User, UserCredits, Recording, SubscriptionHistory, PLANS } from './types';

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Add 1 month to a timestamp
export function addOneMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + 1);
  return date.getTime();
}

// Check if plan is expired
export function isPlanExpired(user: User): boolean {
  return Date.now() > user.planExpiresAt;
}

// Check if plan expires soon (within 7 days)
export function isPlanExpiringSoon(user: User): boolean {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return user.planExpiresAt - Date.now() < sevenDays && !isPlanExpired(user);
}

// Get days until expiry
export function getDaysUntilExpiry(user: User): number {
  const diff = user.planExpiresAt - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

// Calculate remaining percentage
export function getRemainingPercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

// Check if credits are low (>90% used)
export function areCreditsLow(used: number, total: number): boolean {
  return getRemainingPercentage(used, total) >= 90;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

// Format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}m ${secs}s`;
}

// Database query helpers (these will use D1 database)
// Note: Actual implementation will use Cloudflare D1 SQL queries

export const dbHelpers = {
  // User operations
  createUser: async (db: any, username: string, hashedPassword: string, plan: string = 'starter') => {
    const userId = generateId();
    const now = Date.now();
    const expiresAt = addOneMonth(now);
    const planConfig = PLANS[plan];

    // Insert user
    await db.prepare(
      `INSERT INTO users (id, username, password, status, current_plan, plan_started_at, plan_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, username, hashedPassword, 'active', plan, now, expiresAt, now).run();

    // Insert credits
    await db.prepare(
      `INSERT INTO user_credits (
        user_id, total_voice_cloning_chars, used_voice_cloning_chars, remaining_voice_cloning_chars,
        total_tts_chars, used_tts_chars, remaining_tts_chars,
        total_audio_duration, current_period_start, current_period_end, last_updated
      ) VALUES (?, ?, 0, ?, ?, 0, ?, 0, ?, ?, ?)`
    ).bind(
      userId,
      planConfig.voiceCloningChars,
      planConfig.voiceCloningChars,
      planConfig.ttsChars,
      planConfig.ttsChars,
      now,
      expiresAt,
      now
    ).run();

    return userId;
  },

  getUserByUsername: async (db: any, username: string) => {
    const result = await db.prepare(
      `SELECT * FROM users WHERE username = ?`
    ).bind(username).first();
    return result;
  },

  getUserById: async (db: any, userId: string) => {
    const result = await db.prepare(
      `SELECT * FROM users WHERE id = ?`
    ).bind(userId).first();
    return result;
  },

  getUserCredits: async (db: any, userId: string) => {
    const result = await db.prepare(
      `SELECT * FROM user_credits WHERE user_id = ?`
    ).bind(userId).first();
    return result;
  },

  deductCredits: async (db: any, userId: string, charCount: number, type: 'voice_clone' | 'tts', audioDuration: number) => {
    const credits = await dbHelpers.getUserCredits(db, userId);

    if (type === 'voice_clone') {
      const newUsed = credits.used_voice_cloning_chars + charCount;
      const newRemaining = credits.total_voice_cloning_chars - newUsed;

      await db.prepare(
        `UPDATE user_credits
         SET used_voice_cloning_chars = ?,
             remaining_voice_cloning_chars = ?,
             total_audio_duration = total_audio_duration + ?,
             last_updated = ?
         WHERE user_id = ?`
      ).bind(newUsed, newRemaining, audioDuration, Date.now(), userId).run();
    } else {
      const newUsed = credits.used_tts_chars + charCount;
      const newRemaining = credits.total_tts_chars - newUsed;

      await db.prepare(
        `UPDATE user_credits
         SET used_tts_chars = ?,
             remaining_tts_chars = ?,
             total_audio_duration = total_audio_duration + ?,
             last_updated = ?
         WHERE user_id = ?`
      ).bind(newUsed, newRemaining, audioDuration, Date.now(), userId).run();
    }
  },

  getRecordings: async (db: any, userId: string, type: 'voice_clone' | 'tts', limit: number = 3) => {
    const result = await db.prepare(
      `SELECT * FROM recordings
       WHERE user_id = ? AND type = ?
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(userId, type, limit).all();
    return result.results || [];
  },

  saveRecording: async (db: any, userId: string, r2Key: string, duration: number, charCount: number, type: 'voice_clone' | 'tts') => {
    const recordingId = generateId();

    // Insert new recording
    await db.prepare(
      `INSERT INTO recordings (id, user_id, r2_key, duration, char_count, type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(recordingId, userId, r2Key, duration, charCount, type, Date.now()).run();

    // Delete old recordings (keep only last 3)
    const recordings = await dbHelpers.getRecordings(db, userId, type, 100);
    if (recordings.length > 3) {
      const toDelete = recordings.slice(3);
      for (const rec of toDelete) {
        await db.prepare(`DELETE FROM recordings WHERE id = ?`).bind(rec.id).run();
      }
    }

    return recordingId;
  },

  renewSubscription: async (db: any, userId: string) => {
    const user = await dbHelpers.getUserById(db, userId);
    const plan = PLANS[user.current_plan];
    const now = Date.now();
    const expiresAt = addOneMonth(now);

    // Update user plan dates
    await db.prepare(
      `UPDATE users
       SET plan_started_at = ?, plan_expires_at = ?, status = 'active'
       WHERE id = ?`
    ).bind(now, expiresAt, userId).run();

    // Reset credits
    await db.prepare(
      `UPDATE user_credits
       SET total_voice_cloning_chars = ?,
           used_voice_cloning_chars = 0,
           remaining_voice_cloning_chars = ?,
           total_tts_chars = ?,
           used_tts_chars = 0,
           remaining_tts_chars = ?,
           total_audio_duration = 0,
           current_period_start = ?,
           current_period_end = ?,
           last_updated = ?
       WHERE user_id = ?`
    ).bind(
      plan.voiceCloningChars,
      plan.voiceCloningChars,
      plan.ttsChars,
      plan.ttsChars,
      now,
      expiresAt,
      now,
      userId
    ).run();
  }
};
