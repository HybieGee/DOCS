-- FRESH START - CLEAR ALL DATA
-- Run these commands in your D1 Database Console to reset everything

-- Step 1: Delete all existing data
DELETE FROM waters;
DELETE FROM characters;
DELETE FROM users;
DELETE FROM user_quest_progress;
DELETE FROM quest_activity_log;
DELETE FROM user_achievements;
DELETE FROM lore_entries;
DELETE FROM lore_votes;
DELETE FROM user_tokens;
DELETE FROM token_transactions;

-- Step 2: Reset world state to initial values
UPDATE world_state 
SET 
  total_characters = 0,
  total_waters = 0,
  season = 'spring',
  last_milestone_reached = 0,
  current_phase = 'day',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Step 3: Verify clean slate
SELECT 'characters' as table_name, COUNT(*) as count FROM characters
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'waters', COUNT(*) FROM waters
UNION ALL
SELECT 'user_tokens', COUNT(*) FROM user_tokens
UNION ALL
SELECT 'lore_entries', COUNT(*) FROM lore_entries;

-- Should show 0 for all tables

-- Step 4: Check world state is reset
SELECT * FROM world_state;