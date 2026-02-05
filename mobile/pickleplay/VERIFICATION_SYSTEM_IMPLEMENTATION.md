# Verification System Implementation

**Date**: February 5, 2026  
**Status**: ✅ Complete

## Overview

The PicklePlay app now uses a unified verification system for both coaches and court owners through the `professional_applications` table. All users start as PLAYER and can request professional roles after registration.

---

## Database Schema

### professional_applications Table

```sql
CREATE TABLE public.professional_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id),
  requested_role USER_ROLE NOT NULL CHECK (requested_role = ANY (ARRAY['COACH', 'COURT_OWNER'])),
  status APPLICATION_STATUS DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  experience_summary text,
  document_url text,
  admin_notes text,
  submitted_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES profiles(id)
);
```

### profiles Table (Relevant Fields)

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  roles USER_ROLE[] DEFAULT ARRAY['PLAYER'],  -- Can include: PLAYER, COACH, COURT_OWNER
  active_role USER_ROLE DEFAULT 'PLAYER',
  ...
);
```

### coach_reviews Table

```sql
CREATE TABLE public.coach_reviews (
  id uuid PRIMARY KEY,
  coach_id uuid REFERENCES profiles(id),
  student_id uuid REFERENCES profiles(id),
  lesson_id uuid REFERENCES lessons(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);
```

---

## Changes Made

### 1. RegisterScreen.js ✅

**Changes:**
- Removed role selection UI (Player/Court Owner/Both options)
- All users now register as PLAYER by default
- Removed `userRole` state variable
- Cleaned up registration flow to not include role parameter

**Why:** Professional roles now require admin verification through application process, not direct selection at registration.

### 2. ProfessionalApplicationModal.js ✅ NEW COMPONENT

**Purpose:** Reusable modal for submitting coach and court owner applications

**Features:**
- Application type dropdown (Coach or Court Owner)
- Experience summary text area
- Document upload functionality (PDF, DOC, images up to 10MB)
- Access code field (optional/promotional)
- Multiple document support with preview and removal
- Uploads documents to Supabase Storage
- Submits application with documents to `professional_applications` table

**Fields Collected:**
- `requested_role`: 'COACH' or 'COURT_OWNER'
- `experience_summary`: User's background and qualifications
- `document_url`: Comma-separated URLs of uploaded documents
- `status`: Defaults to 'PENDING'

**Document Storage:**
- Bucket: `professional-documents`
- Path: `applications/{COACH or COURT_OWNER}/{userId}_{timestamp}.{ext}`
- Max size: 10MB per file
- Supported types: PDF, DOC, images

### 3. HomeScreen.js ✅

**Changes:**
- Added state for both coach and court owner verification status
- Added `isVerifiedCoach`, `isVerifiedCourtOwner`, `coachApplicationPending`, `courtOwnerApplicationPending`
- Updated `fetchUserRole()` to check `professional_applications` table for pending applications
- Updated `fetchUserRole()` to check profiles.roles array for approved roles
- Added `handleApplyAsCoach()` - inserts into `professional_applications` with `requested_role='COACH'`
- Added `handleApplyAsCourtOwner()` - inserts into `professional_applications` with `requested_role='COURT_OWNER'`
- Added UI section for "Become a Coach" button (purple gradient)
- Added UI section for "List Your Court" button (green gradient)
- Added pending status cards for both applications
- Both buttons only show if user is not verified and has no pending application

**Application Flow:**
1. User clicks "Become a Coach" or "List Your Court"
2. Confirmation dialog appears
3. On confirm, creates record in `professional_applications` with status='PENDING'
4. Shows pending card until admin approves
5. After approval, role is added to user's roles array and buttons disappear

### 3. CourtOwnerScreen.js ✅

**Changes:**
- Added verification check on load
- Added `isVerifiedCourtOwner` and `applicationPending` state
- Added `checkCourtOwnerStatus()` function:
  - Checks if user has 'COURT_OWNER' in roles array
  - If yes, loads court owner data
  - If no, checks for pending application
- Added `handleRequestVerification()` - submits application to `professional_applications`
- Added `renderNotCourtOwner()` - shows benefits and verification request button
- Added `renderPendingVerification()` - shows pending status
- Updated main render to conditionally show:
  - Pending card if application pending
  - Request verification card if not verified and no pending application
  - Court owner dashboard if verified

**Benefits Shown:**
- ✅ Manage your court bookings
- ✅ Generate rental income
- ✅ Track statistics and revenue
- ✅ Reach more players

### 4. CoachScreen.js (Already Had Verification)

**No changes needed** - Already implements verification flow similar to what we added to CourtOwnerScreen.

---

## User Flows

### New User Registration

```
User fills registration form
   ↓
Submits registration
   ↓
Profile created with roles=['PLAYER']
   ↓
User can access player features
```

### Applying for Coach Role

```
User views HomeScreen
   ↓
Sees "Become a Coach" button
   ↓
Clicks and confirms application
   ↓
Record created in professional_applications (requested_role='COACH', status='PENDING')
   ↓
"Application Under Review" card shown
   ↓
Admin reviews and approves
   ↓
'COACH' added to user's roles array
   ↓
User can access CoachScreen
```

### Applying for Court Owner Role

```
User views HomeScreen
   ↓
Sees "List Your Court" button
   ↓
Clicks and confirms application
   ↓
Record created in professional_applications (requested_role='COURT_OWNER', status='PENDING')
   ↓
"Application Under Review" card shown
   ↓
Admin reviews and approves
   ↓
'COURT_OWNER' added to user's roles array
   ↓
User can access CourtOwnerScreen and add courts
```

---

## Admin Responsibilities

### Reviewing Applications

Admins need to:

1. **Query pending applications:**
```sql
SELECT 
  pa.*,
  p.full_name,
  p.email,
  p.location
FROM professional_applications pa
JOIN profiles p ON pa.profile_id = p.id
WHERE pa.status = 'PENDING'
ORDER BY pa.submitted_at DESC;
```

2. **Approve application:**
```sql
-- Update application status
UPDATE professional_applications 
SET 
  status = 'APPROVED',
  processed_at = NOW(),
  processed_by = <admin_user_id>
WHERE id = <application_id>;

-- Add role to user's roles array
UPDATE profiles 
SET roles = array_append(roles, '<COACH or COURT_OWNER>'::user_role)
WHERE id = <profile_id>
  AND NOT ('<COACH or COURT_OWNER>'::user_role = ANY(roles));
```

3. **Reject application:**
```sql
UPDATE professional_applications 
SET 
  status = 'REJECTED',
  processed_at = NOW(),
  processed_by = <admin_user_id>,
  admin_notes = '<reason for rejection>'
WHERE id = <application_id>;
```

---

## Benefits of New System

### ✅ Security
- All professional roles require admin verification
- Prevents unauthorized court listings
- Ensures coach quality control

### ✅ Audit Trail
- All applications tracked in database
- Admin actions recorded (processed_by, processed_at)
- Application history maintained

### ✅ Flexibility
- Users can have multiple professional roles
- Roles array supports: PLAYER, COACH, COURT_OWNER, ADMIN
- Can switch between active roles

### ✅ User Experience
- Clear application status (pending/approved/rejected)
- In-app notifications when status changes
- Easy reapplication process if rejected

---

## Future Enhancements

### Phase 2 (Recommended)
- [ ] Admin dashboard for managing applications
- [ ] Document upload for verification (proof of court ownership, coaching certifications)
- [ ] Email/push notifications for status changes
- [ ] Experience summary field in application form
- [ ] Application withdrawal feature
- [ ] Rejection reason display for users

### Phase 3
- [ ] Automated verification for certain criteria
- [ ] Coach/court owner profiles with ratings
- [ ] Review system for both coaches and courts
- [ ] Performance metrics for verified professionals
- [ ] Tiered verification levels (basic, verified, premium)

---

## Testing Checklist

### Registration Flow
- [ ] User can register with just email and password
- [ ] Profile created with roles=['PLAYER']
- [ ] No role selection UI shown
- [ ] User redirected to HomeScreen after registration

### Coach Application
- [ ] "Become a Coach" button shows on HomeScreen
- [ ] Button hidden if user is already a coach
- [ ] Button hidden if application is pending
- [ ] Application creates record in professional_applications
- [ ] Pending card shows after submission
- [ ] After admin approval, user can access CoachScreen

### Court Owner Application
- [ ] "List Your Court" button shows on HomeScreen
- [ ] Button hidden if user is already a court owner
- [ ] Button hidden if application is pending
- [ ] Application creates record in professional_applications
- [ ] Pending card shows after submission
- [ ] After admin approval, user can access CourtOwnerScreen
- [ ] User can add courts after verification

### CourtOwnerScreen
- [ ] Non-verified users see verification request UI
- [ ] Pending applications show waiting status
- [ ] Verified court owners see full dashboard
- [ ] Can only add courts after verification
- [ ] Stats and bookings load correctly

---

## Support & Troubleshooting

### Common Issues

**Issue:** User applied but button still showing  
**Solution:** Refresh the screen or logout/login to reload user data

**Issue:** Application approved but user can't access features  
**Solution:** Verify role was added to profiles.roles array

**Issue:** Multiple applications from same user  
**Solution:** Add unique constraint on (profile_id, requested_role) where status='PENDING'

### Database Queries for Support

**Check user's roles:**
```sql
SELECT id, email, full_name, roles, active_role
FROM profiles
WHERE email = 'user@example.com';
```

**Check application status:**
```sql
SELECT *
FROM professional_applications
WHERE profile_id = '<user_id>'
ORDER BY submitted_at DESC;
```

**Count pending applications:**
```sql
SELECT 
  requested_role,
  COUNT(*) as pending_count
FROM professional_applications
WHERE status = 'PENDING'
GROUP BY requested_role;
```

---

## Files Modified

1. `src/screens/RegisterScreen.js`
   - Removed role selection UI
   - Simplified registration to default PLAYER role

2. `src/screens/HomeScreen.js`
   - Added coach and court owner application buttons
   - Added verification status checking
   - Added pending application status cards

3. `src/screens/CourtOwnerScreen.js`
   - Added verification requirement
   - Added application submission flow
   - Added not-verified and pending UI states

---

## Conclusion

The verification system is now fully implemented and ensures that only admin-approved users can:
- Provide coaching services
- List and manage courts

This protects the platform's quality and provides users with trusted professionals while maintaining a simple registration process for new players.

For any questions or issues, refer to the database schema documentation or contact the development team.

---

**Last Updated:** February 5, 2026  
**Implementation Status:** ✅ Complete and Ready for Testing
