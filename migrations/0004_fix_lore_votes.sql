-- Fix lore_votes table schema
-- Drop the old table with incorrect schema
DROP TABLE IF EXISTS lore_votes;

-- Recreate with correct schema including vote_type
CREATE TABLE lore_votes (
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