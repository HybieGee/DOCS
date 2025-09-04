-- Quest definitions table (static quest data)
CREATE TABLE IF NOT EXISTS quest_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'achievement')),
  requirement_type TEXT NOT NULL, -- 'water', 'vote', 'login', 'mint', 'level', etc.
  requirement_count INTEGER NOT NULL,
  token_reward INTEGER NOT NULL,
  badge_id TEXT, -- For achievements
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User quest progress tracking
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP,
  reset_date DATE, -- For daily/weekly quests
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, quest_id, reset_date),
  FOREIGN KEY (quest_id) REFERENCES quest_definitions(id)
);

-- Achievement badges earned by users
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id),
  FOREIGN KEY (achievement_id) REFERENCES quest_definitions(id)
);

-- Quest activity log for tracking actions
CREATE TABLE IF NOT EXISTS quest_activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'water', 'vote', 'login', 'mint', etc.
  target_id TEXT, -- ID of what was acted upon (character_id, lore_id, etc.)
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON user_quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_reset ON user_quest_progress(reset_date);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON quest_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON quest_activity_log(timestamp);

-- Insert default quest definitions
INSERT OR IGNORE INTO quest_definitions (id, name, description, type, requirement_type, requirement_count, token_reward) VALUES
-- Daily Quests
('daily_water_3', 'Hydration Helper', 'Water 3 different droplets', 'daily', 'water_unique', 3, 50),
('daily_vote_5', 'Community Curator', 'Vote on 5 lore entries', 'daily', 'vote', 5, 75),
('daily_active_30min', 'Active Player', 'Be online for 30 minutes total', 'daily', 'online_minutes', 30, 100),
('daily_login', 'Daily Check-in', 'Log in today', 'daily', 'login', 1, 25),

-- Weekly Quests
('weekly_water_50', 'Water Master', 'Water 50 droplets this week', 'weekly', 'water', 50, 500),
('weekly_vote_30', 'Lore Scholar', 'Vote on 30 lore entries this week', 'weekly', 'vote', 30, 750),
('weekly_streak_7', 'Dedication', 'Log in 7 days in a row', 'weekly', 'login_streak', 7, 1000),
('weekly_earn_5000', 'Token Collector', 'Earn 5000 tokens this week', 'weekly', 'tokens_earned', 5000, 300),

-- Achievements (permanent)
('achievement_first_mint', 'First Steps', 'Mint your first droplet', 'achievement', 'mint', 1, 100),
('achievement_water_100', 'Caretaker', 'Water 100 droplets total', 'achievement', 'water_total', 100, 500),
('achievement_legendary', 'Lucky One', 'Mint a legendary droplet', 'achievement', 'mint_legendary', 1, 2500),
('achievement_votes_1000', 'Community Pillar', 'Cast 1000 votes total', 'achievement', 'vote_total', 1000, 1000),
('achievement_level_5', 'Droplet Master', 'Get a droplet to Level 5', 'achievement', 'droplet_level', 5, 2000),
('achievement_tokens_10k', 'Wealthy', 'Accumulate 10,000 tokens', 'achievement', 'token_balance', 10000, 500),
('achievement_streak_30', 'Dedicated Player', 'Maintain a 30-day login streak', 'achievement', 'login_streak_total', 30, 1500);