# Squad Tournament Testing Guide

## Quick Start: Test Your Squad Tournament System

### Method 1: Automated Test Script (Recommended)

1. **Get your user ID:**
   - Open `web/get-user-id.html` in your browser
   - Click "Get My User ID" button
   - Copy the generated command

   **OR** get it from browser console:
   ```javascript
   const { data } = await supabase.auth.getUser();
   console.log(data.user.id);
   ```

2. **Run the test script:**
   ```bash
   cd web
   npx tsx test-squad-tournament.ts TOURNAMENT_ID YOUR_USER_ID
   ```
   Example:
   ```bash
   npx tsx test-squad-tournament.ts 6167b1c0-fb1b-4e9a-b3e8-a9a058e9e9e8 abc123-your-user-id
   ```

2. **The script will create:**
   - ✅ A valid squad (4 players, divisible by team size)
   - ❌ A squad with too few players
   - ❌ A squad with wrong roster size (not divisible by team size)

3. **View results:**
   - Navigate to `/tournaments-admin/manage/YOUR_TOURNAMENT_ID`
   - Click the "Squads" tab
   - Check the "Pending Squad Approvals" section

---

## Method 2: Manual Testing (Step-by-Step)

### Step 1: Create a Squad Tournament

1. Go to **Court Owner Dashboard** → **Tournaments**
2. Click **Create Tournament**
3. Set these options:
   - **Tournament Mode**: Competitive (to test rating validation)
   - **Registration Mode**: Squad
   - **Squad Requirements**:
     - Min Size: 4
     - Rating Min: 3.0 (optional)
     - Rating Max: 5.0 (optional)
4. Set other fields (name, date, location, etc.)
5. Save tournament

### Step 2: Create Test Squads

#### Option A: Through UI
1. Navigate to `/community/squads` (or wherever squads are created)
2. Create a new squad
3. Add 4+ members
4. Register squad for tournament

#### Option B: Through Database Console
```sql
-- Create a test squad
INSERT INTO squads (owner_id, name, description, is_active, created_at)
VALUES (
  'YOUR_USER_ID',
  'Test Squad Alpha',
  'Test squad for tournament validation',
  true,
  NOW()
);

-- Get the squad ID from the result
-- Then add members
INSERT INTO squad_members (squad_id, user_id, role, status)
VALUES 
  ('SQUAD_ID', 'USER_1_ID', 'OWNER', 'ACTIVE'),
  ('SQUAD_ID', 'USER_2_ID', 'MEMBER', 'ACTIVE'),
  ('SQUAD_ID', 'USER_3_ID', 'MEMBER', 'ACTIVE'),
  ('SQUAD_ID', 'USER_4_ID', 'MEMBER', 'ACTIVE');
```

### Step 3: Register Squad for Tournament

Use the `registerSquad` function from your services:

```typescript
import { registerSquad } from './services/tournaments';

await registerSquad(
  'TOURNAMENT_ID',
  'SQUAD_ID',
  'OWNER_USER_ID',
  ['PLAYER_1_ID', 'PLAYER_2_ID', 'PLAYER_3_ID', 'PLAYER_4_ID'],
  'We are ready to compete!'
);
```

### Step 4: Test Validation Scenarios

#### ✅ Valid Squad
- 4 players (divisible by team size for doubles)
- Average rating within bounds (if competitive)
- Result: Green "Valid" badge, Approve button enabled

#### ❌ Too Few Players
- Only 2 players when minimum is 4
- Result: Red "Issues" badge, "Roster too small: 2/4 minimum"

#### ❌ Not Divisible
- 3 players for doubles tournament (not divisible by 2)
- Result: Red "Issues" badge, "Roster (3) must be divisible by team size (2)"

#### ⚠️ Low Rating
- Average rating 2.5 when minimum is 3.0
- Result: Red "Issues" badge, "Avg rating 2.5 below minimum 3.0"

#### ⚠️ Injured Player
- One player has status 'inactive_injured'
- Result: Yellow warning badge, "1 injured player(s) in roster"

---

## Method 3: Browser Console Testing

For quick tests, open browser console on the tournament page:

```javascript
// Get your Supabase client (already loaded)
const supabase = window.supabase; // or however it's exposed

// Create a squad registration directly
const { data, error } = await supabase
  .from('squad_registrations')
  .insert({
    tournament_id: 'YOUR_TOURNAMENT_ID',
    squad_id: 'YOUR_SQUAD_ID',
    registered_by: 'YOUR_USER_ID',
    status: 'pending',
    application_message: 'Test registration',
    registered_at: new Date().toISOString()
  })
  .select()
  .single();

console.log('Registration created:', data);

// Add players to roster
const rosterPlayers = [
  { 
    tournament_id: 'TOURNAMENT_ID',
    squad_registration_id: data.id,
    player_id: 'PLAYER_1_ID',
    status: 'active',
    added_at: new Date().toISOString()
  },
  // ... add more players
];

await supabase
  .from('tournament_roster')
  .insert(rosterPlayers);

// Refresh the page to see validation
location.reload();
```

---

## What to Look For

### In the UI:

1. **Pending Squad Approvals Section**
   - Amber background cards
   - Squad name and image
   - Member count, average rating

2. **Validation Badges**
   - ✅ Green shield: "Valid" - all checks passed
   - ❌ Red shield: "Issues" - has eligibility problems

3. **Issue Details**
   - Red alerts: Blocking issues (roster size, divisibility, rating)
   - Yellow warnings: Non-blocking (injured players, missing ratings)

4. **Approve Button State**
   - Enabled: Squad is valid
   - Disabled: Squad has issues (gray with tooltip)

5. **Confirmed Squad Cards**
   - Shows after approval
   - Expandable roster viewer
   - Lock status indicator

### In the Database:

```sql
-- Check squad registrations
SELECT * FROM squad_registrations 
WHERE tournament_id = 'YOUR_TOURNAMENT_ID';

-- Check roster
SELECT r.*, p.full_name, p.rating 
FROM tournament_roster r
JOIN profiles p ON p.id = r.player_id
WHERE r.tournament_id = 'YOUR_TOURNAMENT_ID';

-- Check squad details
SELECT s.*, 
  (SELECT COUNT(*) FROM squad_members WHERE squad_id = s.id) as member_count
FROM squads s
WHERE s.id IN (
  SELECT squad_id FROM squad_registrations 
  WHERE tournament_id = 'YOUR_TOURNAMENT_ID'
);
```

---

## Common Issues & Solutions

### "Squad not showing up"
- Check `status` is not 'withdrawn' or 'rejected'
- Verify `tournament_roster` has entries
- Check console for errors

### "Validation always passes"
- Verify tournament has `squadRequirements` set
- Check tournament `tournamentMode` is 'competitive' for rating checks
- Ensure roster players have rating data

### "Approve button disabled but no issues shown"
- Hard refresh the page (Ctrl+Shift+R)
- Check browser console for errors
- Verify validation function is running

---

## Testing Checklist

- [ ] Create squad tournament with requirements
- [ ] Create test squad with valid roster
- [ ] Register squad - see pending approval
- [ ] Verify validation badge shows "Valid"
- [ ] Click Approve - squad moves to confirmed section
- [ ] Create squad with too few players
- [ ] Verify "Issues" badge with error details
- [ ] Verify Approve button is disabled
- [ ] Click Reject on invalid squad
- [ ] Create squad with odd number for doubles
- [ ] Verify divisibility error shows
- [ ] Test expandable roster viewer on confirmed squads
- [ ] Test roster lock indicator

---

## Pro Tips

1. **Use Mock Data Toggle**: If admin, enable mock tournaments to test without affecting production
2. **Check Network Tab**: Watch for 400 errors on squad queries
3. **Console Logs**: Check for validation output in browser console
4. **Database Queries**: Use Supabase dashboard to verify data structure
5. **Clear Cache**: Hard refresh if UI doesn't update after changes

---

## Need Help?

- Check browser console for errors
- Verify your tournament ID is correct
- Ensure you have squad members in the database
- Test with simple scenarios first before complex ones
- Check that tournament `registrationMode` is 'squad'
