-- Lore likes table
CREATE TABLE IF NOT EXISTS lore_likes (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    lore_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lore_id) REFERENCES lore(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(lore_id, user_id)
);

CREATE INDEX idx_lore_likes_lore_id ON lore_likes(lore_id);
CREATE INDEX idx_lore_likes_user_id ON lore_likes(user_id);

-- Add likes count to lore table (we'll calculate this dynamically for now)
-- ALTER TABLE lore ADD COLUMN likes_count INTEGER DEFAULT 0;

-- Update existing waters table to add hourly rate limiting columns
-- Add hour bucket for rate limiting (YYYY-MM-DD-HH format)
ALTER TABLE waters ADD COLUMN hour_bucket TEXT GENERATED ALWAYS AS (strftime('%Y-%m-%d-%H', created_at)) STORED;

-- Create index for hourly rate limiting queries
CREATE INDEX idx_waters_user_hour_bucket ON waters(user_id, hour_bucket);
CREATE INDEX idx_waters_user_character_hour ON waters(user_id, character_id, hour_bucket);