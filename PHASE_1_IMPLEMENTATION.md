# Phase 1 Implementation Guide - Security Settings & Sessions

## What Was Implemented

### 1. **New Database Tables**

#### `security_settings` table
Stores user security configurations separate from profile data:
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `two_factor_enabled` - Boolean (2FA status)
- `two_factor_method` - Enum (authenticator|sms|email|none)
- `two_factor_secret` - Encrypted 2FA secret (ready for Phase 2)
- `backup_codes` - JSON array of encrypted backup codes (ready for Phase 2)
- `last_2fa_used` - Timestamp of last 2FA use
- `created_at`, `updated_at` - Timestamps with auto-update trigger

#### `sessions` table
Tracks active user sessions across devices:
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `device_name` - Detected device name (iPhone, Windows PC, etc.)
- `ip_address` - User's IP address
- `user_agent` - Browser/app user agent string
- `is_active` - Boolean flag for active sessions
- `last_activity` - Last activity timestamp
- `created_at` - Session creation timestamp

### 2. **Database Indexes & Performance**
- `idx_security_settings_user_id` - Fast lookups by user
- `idx_sessions_user_id` - Fast session queries
- `idx_sessions_is_active` - Fast active session filtering
- `idx_sessions_user_id_active` - Combined index for common query

### 3. **Row Level Security (RLS) Policies**
All tables protected with policies ensuring users can only:
- View their own security settings and sessions
- Update/modify their own data
- Delete their own sessions

### 4. **Backend Functions** (supabase.ts)

**New Functions:**
```typescript
getSecuritySettings(userId)      // Fetch 2FA settings, auto-create if missing
createSession(userId, deviceName, ipAddress)  // Log a new session
detectDevice()                    // Auto-detect device name from user agent
getUserIpAddress()               // Fetch public IP address
```

**Updated Functions:**
```typescript
enableTwoFactorAuth(userId)      // Now uses security_settings table
disableTwoFactorAuth(userId)     // Now uses security_settings table
getActiveSessions(userId)        // Now sorts by last_activity desc
revokeSession(sessionId)         // Same, but more robust
```

### 5. **Frontend Updates** (Profile.tsx)

**New Imports:**
```typescript
getSecuritySettings, createSession, detectDevice, getUserIpAddress
```

**Updated Flow:**
1. When profile loads, fetch security_settings for current user
2. Auto-populate 2FA toggle state from database
3. Load active sessions sorted by most recent activity
4. 2FA toggle now updates security_settings table

## How to Deploy Phase 1

### Step 1: Run the SQL Migration
1. Open Supabase dashboard → SQL Editor
2. Create new query
3. Copy contents of `migrations/001_create_security_settings.sql`
4. Execute the query

Or use Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Tables Created
In Supabase dashboard → Tables:
- ✅ `security_settings` table exists
- ✅ `sessions` table exists
- ✅ RLS policies enabled
- ✅ Indexes created

### Step 3: Test in Application

**Test 2FA:**
1. Navigate to Profile → Security tab
2. Toggle 2FA on/off
3. Verify change persists in `security_settings` table

**Test Sessions:**
1. Open Profile → Security tab
2. View active sessions
3. Try revoking a session (will set `is_active = false`)

## Database Schema Diagram

```
auth.users (Supabase built-in)
    ├── id (UUID)
    └── email

security_settings (NEW)
    ├── id (UUID)
    ├── user_id (FK → auth.users)
    ├── two_factor_enabled (boolean)
    ├── two_factor_method (enum)
    ├── two_factor_secret (text, encrypted)
    ├── backup_codes (JSON)
    └── last_2fa_used (timestamp)

sessions (NEW)
    ├── id (UUID)
    ├── user_id (FK → auth.users)
    ├── device_name (text)
    ├── ip_address (text)
    ├── user_agent (text)
    ├── is_active (boolean)
    └── last_activity (timestamp)

profiles (EXISTING)
    ├── id (FK → auth.users)
    ├── full_name
    ├── location
    ├── bio
    ├── preferred_language
    ├── dupr_rating
    ├── matches_played
    ├── avatar_url
    └── active_role
```

## What's Ready for Phase 2

✅ `two_factor_secret` column ready for encrypted secrets
✅ `backup_codes` column ready for recovery codes
✅ `last_2fa_used` timestamp for audit logs
✅ Sessions table ready to track login attempts
✅ Database structure supports future expansions

## Troubleshooting

**Issue: "No rows found" when loading security settings**
- Solution: Auto-creation is built-in. Check that users have been created in auth.users

**Issue: Sessions not showing up**
- Solution: Sessions are only created when explicitly called. They must be created when user logs in

**Issue: RLS policies blocking queries**
- Solution: Ensure user is authenticated. Check that auth.uid() matches user_id

## Next: Phase 2 Plan
- Add backup codes generation & validation
- Encrypt 2FA secrets
- Add login attempt tracking
- Add password history
