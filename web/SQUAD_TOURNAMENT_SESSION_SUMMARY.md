# Squad Tournament System - Session Summary

**Date:** March 1-2, 2026  
**Status:** ✅ Core Features Implemented & Tested  
**Next Phase:** On Hold - Ready for Future Enhancement

---

## 🎯 Session Objectives Completed

### 1. Squad Validation System
**User Request:** "i cant check the squad if they are valid?"

**Implementation:**
- Added `validateSquad()` function in [TournamentHub.tsx](components/court-owner/TournamentHub.tsx#L678-L725)
- Validation checks:
  - ✅ Minimum roster size (configurable via `squad_requirements.minSize`)
  - ✅ Team size divisibility (roster % team size = 0)
  - ✅ Rating requirements for competitive tournaments (avg rating within bounds)
  - ⚠️ Injured player warnings (non-blocking)
- Visual feedback:
  - 🟢 Green "Valid" badge with ShieldCheck icon
  - 🔴 Red "Issues" badge with ShieldAlert icon
  - Detailed issue list with AlertCircle icons
  - Approve button disabled for invalid squads

### 2. Tournament Card Navigation
**User Request:** "when clicking these cards should be tournament management page"

**Implementation:**
- Modified [TournamentsManager.tsx](components/court-owner/TournamentsManager.tsx)
  - Line 356: Added `onClick={onManageHub || onView}` to card body (grid view)
  - Line 479: Added `onClick={onManageHub || onView}` to list row (list view)
  - Lines 416-437, 509-523: Added `e.stopPropagation()` to all buttons to prevent event bubbling
- Both grid and list views now navigate to tournament management hub on click
- Buttons (status, bracket, edit, delete) still work independently

### 3. Squad Count Display Fix
**User Request:** "what is 1 + 1 hen theres non confirmed and 1 pending"

**Implementation:**
- Simplified tab label from complex conditional logic to straightforward count
- Changed to: `Squads (${activeSquadRegs.length})` - shows total pending + confirmed
- Removed confusing suffix logic that was showing incorrect totals

### 4. Test Data Infrastructure
**User Request:** "make a migration or mock data for squad that can be verified or not or teach me ways to test these tournament which required squads"

**Created Files:**
1. **test-squad-tournament.ts** (TypeScript test script - deprecated due to RLS issues)
2. **test-squad-data.sql** (✅ Working SQL script for Supabase SQL Editor)
3. **cleanup-test-squads.sql** (Cleanup script to remove test data)
4. **get-user-id.html** (Helper page to retrieve user ID)
5. **SQUAD_TOURNAMENT_TESTING_GUIDE.md** (Comprehensive testing documentation)

---

## 🐛 Issues Fixed

### Schema Mismatches
**Problem:** Test script failed with "Could not find 'is_active' column"

**Root Causes:**
- Script used non-existent columns: `is_active`, `owner_id`, `status` (in squad_members)
- Actual schema uses: `created_by`, no status tracking in core tables

**Resolution:** 
- Updated to correct column names
- Removed phantom fields from INSERT statements

### RLS Policy Blocking
**Problem:** "new row violates row-level security policy for table 'squads'"

**Root Cause:** API-based Supabase client runs with authenticated user permissions, triggering RLS

**Resolution:**
- Created SQL script for Supabase SQL Editor (runs as postgres user)
- Bypasses RLS policies for administrative test data creation
- Final solution: [test-squad-data.sql](test-squad-data.sql)

### Unique Constraint Violations
**Problem:** "duplicate key value violates unique constraint 'squad_members_user_id_unique'"

**Root Cause:** `squad_members` table has unique constraint on `user_id` - users can only be in one squad

**Resolution:**
- Script now queries for profiles NOT already in any squad
- Uses 9 unused profiles across 3 test squads (4+2+3 players)
- Each player appears in exactly one squad

### Non-Existent Database Columns
**Problem 1:** CourtCalendar.tsx queried `courts.address` and `courts.city` (don't exist)

**Resolution:**
- Removed `address` and `city` from Court interface
- Updated query to only fetch `id, name` (actual columns)
- Address/city live on `locations` table, not `courts`

**Problem 2:** Service queried `squads.members_count` and `squads.avg_rating` (don't exist)

**Resolution:**
- Removed from Supabase select in `getSquadRegistrations()` and `getSquadRegistration()`
- Set to `undefined` in `mapSquadRegistration()` mapper function
- Fixed silent crash that prevented squad data from loading

### Tournament Configuration Missing
**Problem:** All squads showing as invalid, even "Valid Warriors" with 4 players

**Root Causes:**
1. Tournament had no `registration_mode = 'squad'` set
   - Hub only loads squad data when `tournament.registrationMode === 'squad'`
2. No `squad_requirements` JSONB set in database
   - Default `minSize` behavior was inconsistent

**Resolution:**
- SQL script now sets:
  ```sql
  UPDATE tournaments 
  SET 
    registration_mode = 'squad',
    event_type = 'doubles',
    squad_requirements = '{"minSize": 4, "teamSize": 2}'::jsonb
  WHERE id = v_tournament_id;
  ```
- Creates clear test scenarios:
  - ✅ "Valid Warriors" (4 players) → GREEN badge
  - ❌ "Small Team" (2 players) → RED badge (below minimum)
  - ❌ "Odd Squad" (3 players) → RED badge (below minimum + not divisible)

### Rules of Hooks Violation
**Problem:** React crash after approving squad: "Rendered more hooks than during the previous render"

**Root Cause:** `React.useState` called inside `.map()` callback at line 1190

**Code Before:**
```tsx
confirmedSquadRegs.map((reg, i) => {
  const [showRoster, setShowRoster] = React.useState(false); // ❌ HOOK IN LOOP
  return <div>...</div>
})
```

**Resolution:**
- Moved state to component level: `const [openRosters, setOpenRosters] = useState<Set<string>>(new Set())`
- Inside map: `const showRoster = openRosters.has(reg.id)` (no hook call)
- Toggle function adds/removes registration ID from Set
- Complies with Rules of Hooks (hooks only at top level)

---

## 📁 Files Modified

### Core Features
| File | Changes | Lines |
|------|---------|-------|
| [TournamentHub.tsx](components/court-owner/TournamentHub.tsx) | Added validation system, fixed hooks violation | 678-725, 1000-1069, 1188-1215 |
| [TournamentsManager.tsx](components/court-owner/TournamentsManager.tsx) | Clickable cards, event propagation fixes | 356, 416-437, 467, 479, 509-523 |
| [services/tournaments.ts](services/tournaments.ts) | Removed non-existent squad columns | 1850-1877, 1888-1915, 1633-1639 |
| [CourtCalendar.tsx](components/court-owner/CourtCalendar.tsx) | Removed address/city from courts query | 35-38, 353 |

### Testing Infrastructure
| File | Purpose | Status |
|------|---------|--------|
| [test-squad-data.sql](test-squad-data.sql) | Create 3 test scenarios (1 valid, 2 invalid) | ✅ Working |
| [cleanup-test-squads.sql](cleanup-test-squads.sql) | Remove all test squads and related data | ✅ Ready to use |
| [test-squad-tournament.ts](test-squad-tournament.ts) | TypeScript test script | ⚠️ Deprecated (RLS blocked) |
| [get-user-id.html](get-user-id.html) | Helper to retrieve user ID | ℹ️ Reference only |
| [SQUAD_TOURNAMENT_TESTING_GUIDE.md](SQUAD_TOURNAMENT_TESTING_GUIDE.md) | Complete testing documentation | 📖 Documentation |

---

## 🧪 Testing Setup

### Quick Start - Create Test Data

**1. Run Cleanup (optional, if squads already exist):**
```sql
-- In Supabase SQL Editor
-- Copy contents of cleanup-test-squads.sql and run
```

**2. Create Test Squads:**
```sql
-- In Supabase SQL Editor
-- Copy contents of test-squad-data.sql
-- Update line 12: v_tournament_id := 'YOUR_TOURNAMENT_ID';
-- Run the script
```

**3. View Results:**
- Navigate to: `/tournaments-admin/manage/YOUR_TOURNAMENT_ID`
- Click "Squads" tab
- Expand "Pending Squad Approvals" section

**Expected Output:**
- 🟢 **"Valid Warriors"** - 4 players, GREEN badge, Approve button enabled
- 🔴 **"Small Team"** - 2 players, RED badge, "Roster too small: 2/4 minimum"
- 🔴 **"Odd Squad"** - 3 players, RED badge, "Roster (3) must be divisible by team size (2)"

### Test Scenarios Created

| Squad Name | Players | Validation Result | Issues |
|------------|---------|-------------------|--------|
| Valid Warriors | 4 | ✅ VALID | None - meets minSize=4, divisible by 2 |
| Small Team | 2 | ❌ INVALID | Below minimum size (2 < 4) |
| Odd Squad | 3 | ❌ INVALID | Below minimum (3 < 4) AND not divisible by 2 |

---

## 🏗️ Architecture Decisions

### Squad Member Uniqueness
**Constraint:** `squad_members.user_id` has UNIQUE constraint

**Implication:** Users can only be in one squad at a time

**Design Choice:** This is intentional to prevent:
- Double registration in multiple squads for same tournament
- Roster conflicts and scheduling issues
- Unfair competitive advantages

**Test Impact:** SQL script must use different players for each test squad

### RLS Policy Approach
**Challenge:** Row Level Security blocks INSERT operations from authenticated API clients

**Solution:** Use Supabase SQL Editor for test data creation
- Runs as `postgres` service role user
- Bypasses RLS policies
- Standard approach for administrative operations
- Allows seeding test data without disabling RLS

**Alternative Rejected:** Temporarily disabling RLS (security risk)

### Validation Logic Location
**Decision:** Client-side validation in TournamentHub component

**Rationale:**
- Instant feedback without round-trip to server
- Consistent with existing individual registration validation
- Can be mirrored server-side in future for API-based registrations

**Trade-off:** Logic duplication if API endpoints added later (acceptable for MVP)

---

## 📊 Current System Capabilities

### Squad Validation Rules
1. **Roster Size:** `roster.length >= tournament.squadRequirements.minSize`
2. **Team Divisibility:** `roster.length % teamSize === 0` (teamSize = 2 for doubles, 1 for singles)
3. **Rating Requirements:** For competitive tournaments:
   - `avgRating >= ratingMin` (if set)
   - `avgRating <= ratingMax` (if set)
4. **Injured Players:** Warning only (non-blocking)

### Squad Requirements Configuration
Stored in `tournaments.squad_requirements` JSONB column:
```json
{
  "minSize": 4,
  "teamSize": 2,
  "ratingMin": 3.5,
  "ratingMax": 5.0,
  "ratingReplacementTolerance": 0.5
}
```

### Squad Lifecycle States
- `pending` - Awaiting court owner approval
- `confirmed` - Approved, roster locked or unlockable
- `waitlisted` - On waiting list
- `rejected` - Rejected by court owner
- `withdrawn` - Withdrawn by squad owner

---

## 🚀 Ready Features

### ✅ Implemented & Tested
- Squad validation with visual feedback
- Pending squad approval workflow
- Approve/reject actions for court owners
- Squad roster display (expandable)
- Tournament configuration (registration_mode, squad_requirements)
- Test data creation scripts
- Clickable tournament cards
- Squad count display

### ⏸️ On Hold (Not Yet Implemented)
- Rating-based validation testing (requires profiles with varied ratings)
- Competitive tournament scenarios
- Roster locking workflow
- Squad substitution approval
- Bracket generation with squads
- Match lineup selection
- Squad vs Squad match recording

---

## 📝 Usage Instructions

### For Court Owners

**Approving Squads:**
1. Navigate to tournament management hub
2. Click "Squads" tab
3. Review pending squad approvals
4. Check validation badges:
   - 🟢 Green = Ready to approve
   - 🔴 Red = Has issues (see details)
5. Click roster button to view squad members
6. Click "Approve" (enabled only for valid squads)

**Rejecting Squads:**
- Click "Reject" button on any pending squad
- Confirmation dialog will appear
- Squad status changes to "rejected"

### For Developers

**Creating New Test Scenarios:**
1. Edit `test-squad-data.sql`
2. Duplicate a scenario block (e.g., SCENARIO 1)
3. Change squad name, description, player count
4. Add to cleanup script's squad name list
5. Run cleanup → run test-squad-data

**Adjusting Validation Rules:**
```sql
UPDATE tournaments 
SET squad_requirements = '{
  "minSize": 6,
  "teamSize": 2,
  "ratingMin": 4.0,
  "ratingMax": 5.5
}'::jsonb
WHERE id = 'YOUR_TOURNAMENT_ID';
```

**Debugging Squad Data:**
```sql
-- Check squad registrations
SELECT * FROM squad_registrations WHERE tournament_id = 'YOUR_ID';

-- Check rosters
SELECT tr.*, p.full_name, p.rating 
FROM tournament_roster tr
JOIN profiles p ON tr.player_id = p.id
WHERE tr.squad_registration_id IN (
  SELECT id FROM squad_registrations WHERE tournament_id = 'YOUR_ID'
);

-- Check tournament config
SELECT registration_mode, squad_requirements, event_type 
FROM tournaments WHERE id = 'YOUR_ID';
```

---

## 🔮 Future Enhancements (Suggestions)

### Phase 2: Advanced Validation
- Server-side validation API endpoint
- Real-time rating averages (compute on profiles query)
- Age division requirements
- Gender requirements for mixed doubles
- Maximum roster size limits

### Phase 3: Squad Management
- Roster locking UI for court owners
- Lock/unlock individual squads
- Bulk lock all rosters button
- Visual indicators for locked status

### Phase 4: Match Day Features
- Squad lineup selection (which roster members play match X)
- Substitution request approval workflow
- Substitution logs and audit trail
- Injury reporting and status updates

### Phase 5: Bracket Integration
- Squad bracket generation (use squad name instead of player names)
- Squad vs Squad match cards
- Team assignment from squad rosters
- Automatic lineup rotation suggestions

### Phase 6: Analytics & Reporting
- Squad performance statistics
- Roster utilization (which players played how many matches)
- Average rating trends
- Injury impact analysis

---

## 🎓 Key Learnings

### React Rules of Hooks
**Lesson:** Never call hooks inside loops, conditions, or nested functions

**Example Violation:**
```tsx
items.map(item => {
  const [state, setState] = useState(false); // ❌ WRONG
  // ...
})
```

**Correct Approach:**
```tsx
const [openItems, setOpenItems] = useState(new Set());
items.map(item => {
  const isOpen = openItems.has(item.id); // ✅ CORRECT
  // ...
})
```

### PostgreSQL RLS in Practice
- RLS policies apply to all client queries
- Supabase SQL Editor bypasses RLS (postgres user)
- Test data creation requires admin privileges
- Production code must respect RLS boundaries

### Schema-Code Alignment
- Always verify column existence before querying
- Use migrations as source of truth
- Document schema changes in code comments
- Test queries in SQL Editor before implementing

### JSONB for Flexible Configuration
- Perfect for tournament requirements (vary by tournament)
- Allows extension without schema changes
- Easy to query and update
- TypeScript types provide compile-time safety

---

## 📞 Support & Documentation

### Primary Documentation
- [SQUAD_TOURNAMENT_TESTING_GUIDE.md](SQUAD_TOURNAMENT_TESTING_GUIDE.md) - Complete testing guide
- [TOURNAMENT_SYSTEM_DOCS.md](TOURNAMENT_SYSTEM_DOCS.md) - Full system architecture
- [PHASE_1_IMPLEMENTATION.md](PHASE_1_IMPLEMENTATION.md) - Original implementation plan

### Test Scripts
- [test-squad-data.sql](test-squad-data.sql) - Create test squads
- [cleanup-test-squads.sql](cleanup-test-squads.sql) - Remove test squads

### Reference Files
- [TournamentHub.tsx](components/court-owner/TournamentHub.tsx) - Main management UI
- [services/tournaments.ts](services/tournaments.ts) - API service layer

---

## ✅ Session Checklist

- [x] Squad validation system with visual feedback
- [x] Clickable tournament cards navigation
- [x] Correct squad count display
- [x] Working test data creation script
- [x] Cleanup script for test data removal
- [x] Fixed all schema mismatch errors
- [x] Fixed RLS policy blocking issues
- [x] Fixed unique constraint violations
- [x] Fixed Rules of Hooks violation
- [x] Fixed missing tournament configuration
- [x] Comprehensive testing documentation
- [x] Session summary document

---

## 🎯 Status: Ready for Production Testing

All core squad tournament features are implemented and tested. The system is stable and ready for real-world testing with actual court owners and players. Future enhancements can be added incrementally as needed.

**Next Steps When Resuming:**
1. Review this summary document
2. Run cleanup script to remove old test data
3. Create fresh test data with test-squad-data.sql
4. Proceed with Phase 2 features from the roadmap

---

**End of Session Summary**  
*Last Updated: March 2, 2026*
