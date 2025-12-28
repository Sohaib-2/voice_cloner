#!/usr/bin/env node

// Script to create a user in Cloudflare D1 database
// Usage: node scripts/create-user.js <username> <password> [plan]

// Load environment variables first
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID;

const PLANS = {
  starter: {
    name: "Starter Pack",
    voiceCloningChars: 100000,
    ttsChars: 100000,
  },
  basic: {
    name: "Basic Pack",
    voiceCloningChars: 500000,
    ttsChars: 500000,
  },
  pro: {
    name: "Pro Pack",
    voiceCloningChars: 1000000,
    ttsChars: 1000000,
  },
  enterprise: {
    name: "Enterprise Pack",
    voiceCloningChars: 5000000,
    ttsChars: 5000000,
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

async function queryD1(sql, params = []) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(`D1 API Error: ${JSON.stringify(data.errors)}`);
  }

  return data.result?.[0] || { success: false, results: [] };
}

async function createUser(username, password, plan = 'pro') {
  try {
    console.log('Creating user...');
    console.log('Username:', username);
    console.log('Plan:', plan);

    // Check if user exists
    const existing = await queryD1(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existing.results && existing.results.length > 0) {
      console.error('❌ User already exists!');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId();
    const now = Date.now();
    const planConfig = PLANS[plan];
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    // Create user
    await queryD1(
      `INSERT INTO users (id, username, password, status, current_plan, plan_started_at, plan_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, hashedPassword, 'active', plan, now, expiresAt, now]
    );

    console.log('✅ User created in database');

    // Create credits
    await queryD1(
      `INSERT INTO user_credits (
        user_id, total_voice_cloning_chars, used_voice_cloning_chars, remaining_voice_cloning_chars,
        total_tts_chars, used_tts_chars, remaining_tts_chars,
        total_audio_duration, current_period_start, current_period_end, last_updated
      ) VALUES (?, ?, 0, ?, ?, 0, ?, 0, ?, ?, ?)`,
      [
        userId,
        planConfig.voiceCloningChars,
        planConfig.voiceCloningChars,
        planConfig.ttsChars,
        planConfig.ttsChars,
        now,
        expiresAt,
        now
      ]
    );

    console.log('✅ Credits initialized');
    console.log('\n📊 User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Plan: ${planConfig.name}`);
    console.log(`Voice Cloning Credits: ${planConfig.voiceCloningChars.toLocaleString()} chars`);
    console.log(`TTS Credits: ${planConfig.ttsChars.toLocaleString()} chars`);
    console.log(`Plan Expires: ${new Date(expiresAt).toLocaleDateString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ User created successfully!');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/create-user.js <username> <password> [plan]');
  console.log('\nAvailable plans: starter, basic, pro, enterprise');
  console.log('Default plan: pro\n');
  process.exit(1);
}

const [username, password, plan = 'pro'] = args;

if (!PLANS[plan]) {
  console.error(`❌ Invalid plan: ${plan}`);
  console.log('Available plans:', Object.keys(PLANS).join(', '));
  process.exit(1);
}

// Create user
createUser(username, password, plan);
