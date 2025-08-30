-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    solana_address TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_solana_address ON users(solana_address);
CREATE INDEX idx_users_username ON users(username);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    owner_user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    name TEXT,
    is_legendary BOOLEAN DEFAULT 0,
    x REAL NOT NULL,
    y REAL NOT NULL,
    level INTEGER DEFAULT 1,
    water_count INTEGER DEFAULT 0,
    sprite_seed TEXT,
    color_palette TEXT,
    accessories TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_characters_owner_user_id ON characters(owner_user_id);
CREATE INDEX idx_characters_wallet_address ON characters(wallet_address);
CREATE INDEX idx_characters_level ON characters(level);
CREATE INDEX idx_characters_water_count ON characters(water_count);
CREATE INDEX idx_characters_created_at ON characters(created_at);

-- Waters table (likes)
CREATE TABLE IF NOT EXISTS waters (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_bucket TEXT GENERATED ALWAYS AS (date(created_at)) STORED,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(user_id, character_id, date_bucket)
);

CREATE INDEX idx_waters_user_id ON waters(user_id);
CREATE INDEX idx_waters_character_id ON waters(character_id);
CREATE INDEX idx_waters_created_at ON waters(created_at);

-- Lore table
CREATE TABLE IF NOT EXISTS lore (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    character_id TEXT NOT NULL,
    author_user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    is_canon BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_lore_character_id ON lore(character_id);
CREATE INDEX idx_lore_author_user_id ON lore(author_user_id);
CREATE INDEX idx_lore_votes ON lore(votes);
CREATE INDEX idx_lore_is_canon ON lore(is_canon);

-- Lore votes table
CREATE TABLE IF NOT EXISTS lore_votes (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    lore_id TEXT NOT NULL,
    voter_user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lore_id) REFERENCES lore(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(lore_id, voter_user_id)
);

CREATE INDEX idx_lore_votes_lore_id ON lore_votes(lore_id);
CREATE INDEX idx_lore_votes_voter_user_id ON lore_votes(voter_user_id);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    type TEXT NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at);

-- World state table (singleton)
CREATE TABLE IF NOT EXISTS world_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_characters INTEGER DEFAULT 0,
    total_waters INTEGER DEFAULT 0,
    season TEXT DEFAULT 'spring',
    last_milestone_reached INTEGER DEFAULT 0,
    current_phase TEXT DEFAULT 'day',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize world state
INSERT OR IGNORE INTO world_state (id) VALUES (1);