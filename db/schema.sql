-- CueCraft Cloud Database Schema (Compatible with Neon Postgres / Supabase)
-- Mirrors client-side IndexedDB stores (`cuecraft_studio_db`) for seamless multi-device sync.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_practice_date DATE,
  high_break INTEGER NOT NULL DEFAULT 0,
  matches_won INTEGER NOT NULL DEFAULT 0,
  shots_taken INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
  account_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  completed_lectures JSONB NOT NULL DEFAULT '[]'::jsonb,
  mastered_drills JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding_steps JSONB NOT NULL DEFAULT '{"aim":false,"spin":false,"strike":false}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_equipment_presets (
  account_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cue_id TEXT NOT NULL DEFAULT 'ash-classic',
  tip_id TEXT NOT NULL DEFAULT 'medium-pro',
  cloth_id TEXT NOT NULL DEFAULT 'club-standard',
  cushion_id TEXT NOT NULL DEFAULT 'club-rails',
  audio_muted BOOLEAN NOT NULL DEFAULT FALSE,
  haptics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
