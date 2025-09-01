-- Lore voting system
CREATE TABLE IF NOT EXISTS lore_votes (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    lore_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lore_id) REFERENCES lore(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(lore_id, user_id)
);

CREATE INDEX idx_lore_votes_lore_id ON lore_votes(lore_id);
CREATE INDEX idx_lore_votes_user_id ON lore_votes(user_id);
CREATE INDEX idx_lore_votes_vote_type ON lore_votes(vote_type);

-- Add some sample votes for testing (optional)
-- These would be removed in production
INSERT OR IGNORE INTO lore_votes (id, lore_id, user_id, vote_type) 
SELECT 
    'vote_sample_' || CAST(ABS(RANDOM()) % 10000 AS TEXT),
    l.id,
    u.id,
    CASE WHEN ABS(RANDOM()) % 100 < 70 THEN 'up' ELSE 'down' END
FROM lore l
CROSS JOIN users u
WHERE ABS(RANDOM()) % 100 < 30 -- 30% chance of having a vote
LIMIT 100;