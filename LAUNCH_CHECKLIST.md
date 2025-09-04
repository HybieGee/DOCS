# 🚀 LAUNCH CHECKLIST

## 1. ✅ Clear All Data (Fresh Start)
Run these SQL commands in your D1 Console in this order:

```sql
-- Clear all tables
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

-- Reset world state
UPDATE world_state 
SET total_characters = 0, total_waters = 0, season = 'spring',
    last_milestone_reached = 0, current_phase = 'day',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

## 2. ✅ Update Contract Address
Edit `/lib/config.ts`:
```typescript
CONTRACT_ADDRESS: 'YOUR_ACTUAL_CA_HERE', // Replace 'Coming Soon'
```

## 3. ✅ Verify Overlap Prevention
New creations automatically use `generateSafePosition()` which ensures:
- ✓ Minimum 80px distance between all droplets
- ✓ Works in both `/api/characters` and `/api/creations` routes
- ✓ No manual intervention needed

## 4. Deploy Latest Code
```bash
git pull
npm run deploy:api
```

## 5. Quick Tests Before Launch
- [ ] Create a test account
- [ ] Mint a droplet - verify no overlaps
- [ ] Create another account, mint again - verify spacing
- [ ] Check CA displays correctly on homepage

## 6. Optional: Update Social Links
In `/lib/config.ts`, update:
- Twitter URL
- Telegram URL
- Discord URL (if applicable)

## THAT'S IT! 
Your app is ready with:
- ✅ Fresh database (no old data)
- ✅ Overlap prevention (automatic 80px spacing)
- ✅ Easy CA updates (just edit config.ts)
- ✅ Clean launch state