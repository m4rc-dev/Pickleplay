# Role-Based Access Implementation - Quick Start Guide

## What Was Implemented

### 1. Three New User Roles
- **Player** (default): Regular users who book courts and play
- **Court Owner**: Users who own and manage pickleball courts
- **Coach**: Users verified by admin to provide coaching (requires admin approval)
- **Both**: Court owners who also play as regular users

### 2. New Screens Created

#### Court Owner Dashboard (`CourtOwnerScreen.js`)
- **Displays statistics**: Total courts, active bookings, monthly revenue
- **Lists all owned courts** with management options
- **Dual interface toggle**: Switch between "Court Owner" view and "Player" view
- **Player view access**: Court owners can access all regular player features

#### Coach Dashboard (`CoachScreen.js`)
- **Three states**:
  1. Not a coach: Shows benefits and "Request Verification" button
  2. Pending: Shows waiting status while admin reviews
  3. Verified: Shows full coach dashboard with students and sessions
- **Statistics**: Total students, upcoming sessions, completed sessions, rating
- **Student management**: View profiles, schedule sessions, track progress

### 3. Registration Updates
- Added role selection during sign-up with visual buttons
- Users choose: Player, Court Owner, or Both
- Role is saved to both profile and auth metadata

### 4. Profile Screen Updates
- **Court Owner Button**: Shows for users with court_owner or both role
- **Coach Button**: Shows ONLY after admin verification
- Both buttons have distinctive styling with icons

## How It Works

### For Court Owners:
1. User registers and selects "Court Owner" or "Both"
2. Button appears immediately on Profile screen
3. Click button → Opens Court Owner Dashboard
4. Can manage courts AND access player features

### For Coaches:
1. User requests coach verification from Coach Dashboard
2. Admin reviews and approves/rejects
3. Once approved, Coach button appears on Profile screen
4. Click button → Opens Coach Dashboard with students list

## Database Requirements

You need to add these columns to your `profiles` table:

```sql
-- Core role field
ALTER TABLE profiles ADD COLUMN role VARCHAR DEFAULT 'player';

-- Coach-specific fields
ALTER TABLE profiles ADD COLUMN is_verified_coach BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN coach_verification_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN coach_specialization TEXT;
ALTER TABLE profiles ADD COLUMN coach_bio TEXT;
ALTER TABLE profiles ADD COLUMN coach_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN coach_experience_years INTEGER;
```

You need to ensure these tables exist:
- `courts` table with `owner_id` column
- `coaching_sessions` table (see RBAC_DOCUMENTATION.md for full schema)
- `bookings` table with proper relationships

## Admin Tasks

### To Approve a Coach:
1. Query pending requests:
   ```sql
   SELECT * FROM profiles 
   WHERE coach_verification_requested = TRUE 
   AND is_verified_coach = FALSE;
   ```

2. Approve:
   ```sql
   UPDATE profiles 
   SET is_verified_coach = TRUE,
       coach_verification_requested = FALSE
   WHERE id = '<user_id>';
   ```

3. Reject:
   ```sql
   UPDATE profiles 
   SET coach_verification_requested = FALSE,
       role = 'player'
   WHERE id = '<user_id>';
   ```

## Testing Steps

1. **Register a new user** with "Court Owner" role
2. **Check Profile screen** - Court Owner button should appear
3. **Click Court Owner button** - Dashboard should load
4. **Toggle to Player view** - Should show player interface access

5. **Register another user** with "Player" role
6. **Navigate to Coach screen** from profile settings
7. **Request verification** - Status should show "Pending"
8. **As admin, approve** the coach request
9. **Check Profile screen** - Coach button should now appear
10. **Click Coach button** - Dashboard should load with students

## Key Files

- `src/screens/CourtOwnerScreen.js` - Court Owner Dashboard
- `src/screens/CoachScreen.js` - Coach Dashboard  
- `src/screens/RegisterScreen.js` - Registration with role selection
- `src/screens/ProfileScreen.js` - Profile with role buttons
- `App.js` - Navigation registration
- `RBAC_DOCUMENTATION.md` - Complete technical documentation

## Next Steps

1. Set up the database schema (profiles table columns)
2. Create the coaching_sessions table
3. Test registration with different roles
4. Create an admin interface for coach approval
5. Add court management features for court owners

## Notes

- Court Owner access is **automatic** upon registration
- Coach access requires **admin verification**
- Users with "both" role can access both court owner AND player features
- The Coach button shows a verified badge (✓) when active
- All role checks are done dynamically from the database
