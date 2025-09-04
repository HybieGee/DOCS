-- Migration: Add Seasonal Content and Referral System
-- Run this in your D1 Console to add new features

-- Seasonal Events Table
CREATE TABLE IF NOT EXISTS seasonal_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'holiday', 'seasonal', 'special'
  season TEXT NOT NULL, -- 'winter', 'spring', 'summer', 'autumn'
  theme_data TEXT, -- JSON for theme configuration
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Referral System Table
CREATE TABLE IF NOT EXISTS user_referrals (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL, -- User who referred
  referee_user_id TEXT NOT NULL, -- User who was referred
  referral_code TEXT NOT NULL,
  bonus_claimed BOOLEAN DEFAULT FALSE,
  referrer_bonus INTEGER DEFAULT 0,
  referee_bonus INTEGER DEFAULT 0,
  activity_completed BOOLEAN DEFAULT FALSE, -- Has referee created a droplet?
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referee_user_id) -- Each user can only be referred once
);

-- Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 100, -- Limit per referral code
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id) -- Each user gets one referral code
);

-- Add seasonal theme to characters (optional field)
-- This adds a new column without breaking existing functionality
ALTER TABLE characters ADD COLUMN seasonal_theme TEXT DEFAULT NULL;
ALTER TABLE characters ADD COLUMN is_seasonal BOOLEAN DEFAULT FALSE;

-- Create default winter event (if not exists)
INSERT OR IGNORE INTO seasonal_events (
  id, name, type, season, theme_data, start_date, end_date, is_active
) VALUES (
  'winter_2024',
  'Winter Wonderland',
  'holiday',
  'winter',
  '{"themes": ["snowflake", "icicle", "frost", "winter-crystal"], "special_effects": true}',
  '2024-12-01',
  '2025-02-28',
  1
);

-- Verify tables were created
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('seasonal_events', 'user_referrals', 'referral_codes');