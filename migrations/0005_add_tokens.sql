-- Create token balances table
CREATE TABLE IF NOT EXISTS token_balances (
  user_id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'minting', 'watering', 'voting', 'passive', 'bonus'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create daily earnings tracking
CREATE TABLE IF NOT EXISTS daily_earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  amount INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create user streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date TEXT, -- YYYY-MM-DD format
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON token_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_user_date ON daily_earnings(user_id, date);