-- PROPER ORDER TO AVOID FOREIGN KEY ERRORS
-- Run these commands ONE AT A TIME in your D1 Console

-- Step 1: Clear dependent tables first (children)
DELETE FROM token_transactions;
DELETE FROM user_tokens;
DELETE FROM lore_votes;
DELETE FROM lore_entries;
DELETE FROM user_achievements;
DELETE FROM quest_activity_log;
DELETE FROM user_quest_progress;
DELETE FROM waters;

-- Step 2: Clear main tables (parents)
DELETE FROM characters;
DELETE FROM users;

-- Step 3: Reset world state
UPDATE world_state 
SET 
  total_characters = 0,
  total_waters = 0,
  season = 'spring',
  last_milestone_reached = 0,
  current_phase = 'day',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Step 4: Verify everything is clear
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'characters', COUNT(*) FROM characters
UNION ALL
SELECT 'waters', COUNT(*) FROM waters
UNION ALL
SELECT 'world_state', total_characters FROM world_state WHERE id = 1;