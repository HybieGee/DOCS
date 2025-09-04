-- EMERGENCY OVERLAP FIX SCRIPT
-- Run this directly in your D1 database console to fix all overlapping droplets

-- First, let's see what we're working with
SELECT COUNT(*) as total_characters FROM characters;

-- Update all characters with new non-overlapping positions
-- Using a grid-based approach for guaranteed spacing

UPDATE characters 
SET 
  x = (ROW_NUMBER() OVER (ORDER BY created_at) - 1) % 20 * 100 + 50 + RANDOM() % 50,
  y = ((ROW_NUMBER() OVER (ORDER BY created_at) - 1) / 20) * 100 + 600 + RANDOM() % 50,
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM characters);

-- Alternative: Scattered approach (uncomment if you prefer random scatter)
/*
UPDATE characters 
SET 
  x = ABS(RANDOM() % 1800) + 60,
  y = ABS(RANDOM() % 180) + 620,
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM characters);
*/

-- Verify the fix
SELECT 
  COUNT(*) as total_updated,
  MIN(x) as min_x,
  MAX(x) as max_x,
  MIN(y) as min_y,
  MAX(y) as max_y
FROM characters;

-- Check for any remaining potential overlaps (should be 0 or very few)
SELECT COUNT(*) as potential_overlaps
FROM characters c1
JOIN characters c2 ON c1.id < c2.id
WHERE ABS(c1.x - c2.x) < 80 AND ABS(c1.y - c2.y) < 80;