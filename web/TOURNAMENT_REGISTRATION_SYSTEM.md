# Tournament Registration System - Complete Documentation

## 📋 Overview
This document outlines the tournament registration system implementation, including pending approval workflow, conflict detection, and verification requirements.

---

## ✅ Implemented Solutions

### 1. **Pending Approval Workflow** (Migrations 068-069)

#### Problem Solved
- Tournaments had instant registration with no organizer control
- No approval process for managing participant quality

#### Implementation
- **Migration 068**: Adds `pending`, `confirmed`, `rejected`, `withdrawn` statuses
- **Migration 069**: Updates registered_count trigger to only count confirmed registrations
- **UI Changes**: 
  - Amber "Pending Approval" badge for players
  - Organizer approval section in Participants tab
  - Approve/Reject buttons with audit trail

#### Benefits
✅ Organizers control who participates  
✅ Prevents spam/fake registrations  
✅ Audit trail with `approved_by` and `approved_at` fields  

---

### 2. **Conflict Detection System** (Migration 070)

#### Problems Solved
- Players could register for overlapping tournaments
- No limit on pending registrations
- Race conditions in capacity management
- No verification requirements

#### Implementation

**Database Functions:**
- `check_tournament_conflicts()` - Detects all types of conflicts
- `check_tournament_capacity()` - Atomic capacity validation
- `get_player_verification_status()` - Player verification checker

**Conflict Types:**

##### a) **Verification Conflicts**
```typescript
{
  type: 'verification',
  severity: 'error',
  field: 'phone' | 'email' | 'id' | 'skill',
  message: 'Phone verification required for this tournament'
}
```

##### b) **Time Conflicts**
```typescript
{
  type: 'time_conflict',
  severity: 'warning',
  count: 2,
  message: 'You have 2 other tournament(s) on the same date'
}
```

##### c) **Pending Limit**
```typescript
{
  type: 'pending_limit',
  severity: 'warning',
  count: 4,
  limit: 5,
  message: 'You have 4 pending registrations. Consider waiting for approval.'
}
```

##### d) **Capacity**
```typescript
{
  type: 'capacity',
  severity: 'error',
  message: 'This tournament is at full capacity'
}
```

#### UI Flow
1. Player clicks "Join Tournament"
2. System checks conflicts via `checkRegistrationConflicts()`
3. **If errors exist**: Block registration, show dialog with resolution steps
4. **If warnings exist**: Show dialog but allow "Register Anyway"
5. **If no conflicts**: Proceed with registration

---

### 3. **Player Verification System** (Migration 070)

#### Verification Levels

| Level | Requirements | Use Case |
|-------|-------------|----------|
| **Basic** | Email verified | All tournaments (required) |
| **Standard** | Email + Phone | Competitive tournaments |
| **Full** | Email + Phone + ID + Skill | National championships, high-stakes |

#### Database Schema

**profiles table additions:**
```sql
phone_verified: boolean
id_verified: boolean
id_document_url: text
id_verified_at: timestamptz
skill_verified: boolean
skill_verified_by: uuid -> profiles(id)
skill_verified_at: timestamptz
```

**tournaments table additions:**
```sql
require_email_verified: boolean (default: true)
require_phone_verified: boolean (default: false)
require_id_verified: boolean (default: false)
require_skill_verified: boolean (default: false)
```

#### Verification Process

**Email**: Handled by Supabase Auth (automatic)  
**Phone**: SMS OTP via verification service  
**ID**: Upload document → Admin review → Approval  
**Skill**: Coach/Admin confirms rating accuracy  

---

## ⚠️ Potential Risks & Mitigation

### Risk 1: Race Conditions on Capacity
**Problem**: Multiple users registering simultaneously when 1 spot remains

**Mitigation**:
```sql
-- Atomic capacity check with row-level locking
SELECT registered_count, max_players 
FROM tournaments
WHERE id = tournament_id
FOR UPDATE;
```
✅ Database enforces capacity atomically  
✅ Failed registrations get clear error message  

---

### Risk 2: Verification Bypass
**Problem**: Users might try to bypass verification checks

**Mitigation**:
- ✅ Verification checked in database function (security definer)
- ✅ Status stored in `profiles` table (not user-controlled)
- ✅ Admin-only approval for ID/skill verification
- ✅ RLS policies prevent tampering

---

### Risk 3: Organizer Abuse
**Problem**: Organizers rejecting legitimate registrations

**Mitigation**:
- ✅ Audit trail: `approved_by`, `approved_at` fields
- ✅ Admin dashboard to review rejection patterns
- ✅ Players can reapply after rejection
- 🚧 **TODO**: Implement organizer review system

---

### Risk 4: Time Zone Confusion
**Problem**: Tournament times in different zones cause false conflicts

**Mitigation**:
- ✅ All timestamps stored in UTC (PostgreSQL timestamptz)
- ✅ Display in user's local timezone
- 🚧 **TODO**: Add timezone field to tournaments table
- 🚧 **TODO**: Convert to local time for conflict checking

---

### Risk 5: Spam Registrations
**Problem**: Bots or spam accounts mass-registering

**Mitigation**:
- ✅ Email verification required (always on)
- ✅ Pending approval workflow
- ✅ Limit of 5 pending registrations per player
- 🚧 **TODO**: Rate limiting on registration endpoint
- 🚧 **TODO**: CAPTCHA for high-value tournaments

---

## 🚀 Features Needed (Prioritized)

### High Priority

#### 1. **Verification UI**
**Status**: Not implemented  
**Required for**: Live launch

**Components needed:**
- [ ] Profile verification section (`/profile?tab=verification`)
- [ ] Phone verification flow (SMS OTP)
- [ ] ID upload interface
- [ ] Verification status badges

**Files to create:**
- `web/components/Profile/VerificationSection.tsx`
- `web/services/verification.ts`
- `web/api/verify-phone.ts`

---

#### 2. **Admin Verification Dashboard**
**Status**: Not implemented  
**Required for**: ID/Skill verification

**Features:**
- [ ] List pending ID verifications
- [ ] View uploaded documents
- [ ] Approve/reject with notes
- [ ] Skill verification interface

**Files to create:**
- `web/components/admin/VerificationDashboard.tsx`
- `web/migrations/071_verification_admin_tables.sql`

---

#### 3. **Organizer Settings UI**
**Status**: Partially implemented (DB only)  
**Required for**: Tournament creation

**Add to tournament creation form:**
- [ ] "Player Requirements" section
- [ ] Toggle: Require phone verified
- [ ] Toggle: Require ID verified
- [ ] Toggle: Require skill verified
- [ ] Toggle: Allow overlapping registrations
- [ ] Number input: Max pending per player (default: 5)

**File to update:**
- `web/components/court-owner/TournamentForm.tsx`

---

### Medium Priority

#### 4. **Notification System**
**Status**: Not implemented  
**Nice to have**: Yes

**Notifications needed:**
- [ ] "Your registration was approved"
- [ ] "Your registration was rejected"
- [ ] "[Player] registered for your tournament" (organizer)
- [ ] "New pending registration" (organizer)
- [ ] "Tournament in 24 hours" reminder

**Files to create:**
- `web/migrations/072_tournament_notifications.sql`
- `web/services/notifications.ts`
- Update existing notification system

---

#### 5. **Booking Conflict Detection**
**Status**: Not implemented  
**Nice to have**: Yes

**Feature:**
Check if player has court booking at same time as tournament

```sql
-- Add to check_tournament_conflicts()
SELECT COUNT(*) FROM bookings
WHERE user_id = p_player_id
  AND date = tournament_date
  AND time_overlaps(booking_time, tournament_time);
```

**Files to update:**
- `web/migrations/070_add_conflict_detection_and_verification.sql`

---

#### 6. **Waitlist System**
**Status**: Status exists, logic not implemented  
**Nice to have**: Yes

**Feature:**
When tournament full, players can join waitlist. If someone withdraws, first on waitlist gets notified.

**Database changes:**
- Use existing `waitlisted` status
- Add `waitlist_position` column
- Auto-promote on withdrawal

**Files to create:**
- `web/services/waitlist.ts`
- `web/migrations/073_waitlist_system.sql`

---

### Low Priority

#### 7. **Conflict History Dashboard**
**Status**: Not implemented  
**Nice to have**: Maybe

**Feature:**
Show players their registration history, conflicts, approvals/rejections

**Components:**
- Conflict timeline
- Rejection reasons
- Success rate

---

#### 8. **Rate Limiting**
**Status**: Not implemented  
**Security**: Important for production

**Implementation:**
- Add rate limit middleware
- Limit: 5 registrations per hour per IP
- Bypass for verified users

**Tools:**
- Supabase Edge Functions middleware
- Redis for rate counting

---

## 📊 Database Schema Summary

### New Columns in `profiles`
```sql
phone_verified: boolean
id_verified: boolean
id_document_url: text
id_verified_at: timestamptz
skill_verified: boolean
skill_verified_by: uuid
skill_verified_at: timestamptz
```

### New Columns in `tournaments`
```sql
require_email_verified: boolean (default: true)
require_phone_verified: boolean (default: false)
require_id_verified: boolean (default: false)
require_skill_verified: boolean (default: false)
allow_overlapping_registrations: boolean (default: false)
max_pending_per_player: int (default: 5)
```

### Updated `tournament_registrations`
```sql
status: text CHECK (status IN ('pending','confirmed','waitlisted','withdrawn','rejected'))
approved_by: uuid
approved_at: timestamptz
```

---

## 🔄 Migration Order

1. ✅ **068** - Pending approval workflow
2. ✅ **069** - Fix registration count trigger
3. ✅ **070** - Conflict detection & verification
4. 🚧 **071** - Admin verification tables (TODO)
5. 🚧 **072** - Notification system (TODO)
6. 🚧 **073** - Waitlist system (TODO)

---

## 🧪 Testing Checklist

### Registration Flow
- [ ] Register for tournament → status is pending
- [ ] See amber "Pending Approval" badge
- [ ] Withdraw while pending → registration removed
- [ ] Organizer approves → status becomes confirmed, count increments
- [ ] Organizer rejects → status becomes rejected, player can reapply

### Conflict Detection
- [ ] Register for 2 tournaments same day → warning shown
- [ ] Register without phone verification (when required) → blocked
- [ ] Register with 5 pending registrations → warning shown
- [ ] Register when tournament full → blocked

### Capacity Management
- [ ] 2 users register for last spot simultaneously → only 1 succeeds
- [ ] Count only includes confirmed registrations
- [ ] Approving pending registration increments count
- [ ] Rejecting pending registration keeps count same

### UI States
- [ ] Pending → amber badge
- [ ] Confirmed → green badge
- [ ] Rejected → rose badge with "Reapply" button
- [ ] Organizer sees pending count in overview tab

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "Tournament is at full capacity" when spots available  
**Cause**: Pending registrations counted in capacity  
**Fix**: Migration 069 fixes this - only confirmed count

**Issue**: Conflicts dialog not showing  
**Cause**: RPC function not created  
**Fix**: Run migration 070

**Issue**: Email verified always false  
**Cause**: Checking wrong table  
**Fix**: Check `auth.users.email_confirmed_at` not `profiles`

---

## 🎯 Success Metrics

Track these to measure system success:

1. **Approval Rate**: % of pending registrations approved
2. **Time to Approval**: Average time from pending → confirmed
3. **Conflict Prevention**: # of conflicting registrations prevented
4. **Verification Rate**: % of users completing verification
5. **Capacity Efficiency**: % of tournaments reaching max capacity

---

## 📝 Changelog

### v1.0.0 - Initial Implementation (Current)
- ✅ Pending approval workflow
- ✅ Registration status tracking
- ✅ Organizer approval/rejection
- ✅ Conflict detection system
- ✅ Verification requirements
- ✅ Atomic capacity checks
- ✅ UI for all status states

### v1.1.0 - Planned
- 🚧 Verification UI and flows
- 🚧 Admin verification dashboard
- 🚧 Organizer settings in tournament form
- 🚧 Notification system integration

### v1.2.0 - Future
- 🚧 Waitlist system
- 🚧 Booking conflict detection
- 🚧 Rate limiting
- 🚧 Analytics dashboard

---

## 🤝 Contributing

When adding features to this system:

1. **Database first**: Create migration before code
2. **Security**: Use SECURITY DEFINER functions, not client-side checks
3. **Logging**: Add console logs to services for debugging
4. **UI states**: Handle loading, error, success for all actions
5. **Documentation**: Update this file with changes

---

## 📚 Related Documentation

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/trigger-definition.html)
- [React Portal Pattern](https://reactjs.org/docs/portals.html)
- [Tournament System Overview](./TOURNAMENT_SYSTEM.md) (if exists)

---

**Last Updated**: February 22, 2026  
**Maintainer**: Development Team  
**Status**: ✅ Core features complete, verification UI pending
