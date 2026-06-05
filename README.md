# Voxxlyy

A full-stack AI voice platform with two capabilities: voice cloning from a reference audio clip, and text-to-speech using pre-built voices. Built on Cloudflare's edge infrastructure with RunPod serverless GPU workers handling model inference.

## What It Does

**Voice Cloning** — upload a short reference audio clip and generate speech in that voice. Two models run depending on the target language: F5-TTS for English, Chatterbox for multilingual output. Short requests (under 500 characters) hit the `runsync` RunPod endpoint and return immediately; longer requests are queued via `run` and the client polls `/api/status` until the job completes. Credits are deducted only on confirmed completion, not at queue time.

**Text-to-Speech** — pre-built voices via DeepInfra's Kokoro-82M model, covering 60+ voices across 9 languages.

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Cloudflare D1** — SQLite at the edge for users, credits, recordings and subscription history
- **Cloudflare R2** — object storage for generated audio files
- **RunPod Serverless** — GPU inference for voice cloning (F5-TTS + Chatterbox endpoints)
- **DeepInfra** — Kokoro-82M for pre-built TTS voices
- **JWT + bcrypt** — username/password auth via `jose`
- **Tailwind CSS + shadcn/ui**

## Voice Cloning Pipeline

```
Client sends: { gen_text, ref_audio (base64), speed, language }
      │
      ├── language === "en" → F5-TTS RunPod endpoint
      └── other language    → Chatterbox RunPod endpoint
              │
              ├── text < 500 chars → runsync (immediate result)
              └── text ≥ 500 chars → run (job ID → poll /api/status)
                          │
                          └── COMPLETED → deduct credits → update D1 → serve from R2
```

## Database Schema (Cloudflare D1)

```
users                — id, username, hashed_password, status, current_plan, plan_expires_at
user_credits         — separate char pools for voice cloning and TTS, monthly period tracking
recordings           — r2_key, duration, char_count, type (voice_clone | tts), delete_at
subscription_history — plan changes, amounts, period start/end, status
```

Six indexes across key lookup fields. Recordings are capped at the last 3 per type per user; older entries are removed from both R2 and D1 when new ones are saved.

## Credit System

Two separate credit pools per user — one for voice cloning, one for TTS. Credits are deducted per character of generated text, and plans reset monthly. Admin accounts bypass credit checks but usage is still tracked.

## Storage & Cleanup

Audio files are stored in R2 with a `delete_at` timestamp written to D1 at save time. A cron endpoint at `/api/cron/cleanup`, protected by a bearer token, queries for expired records and deletes them from R2 first, then D1.
