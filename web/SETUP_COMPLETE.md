# Court Events Calendar - Database Setup Complete ✅

## What's Been Created

### 1. **Database Migration** (`migrations/002_create_court_events.sql`)
- Creates `court_events` table with all necessary fields
- Adds 6 performance indexes
- Implements Row Level Security (RLS) policies
- Adds automatic timestamp trigger for `updated_at`

**Key Features:**
- ✅ Court owners can create events (maintenance, closure, cleaning, private events)
- ✅ Events can block player bookings
- ✅ Color support for UI calendar display
- ✅ Secure - RLS policies ensure data isolation

---

### 2. **TypeScript Types** (`types.ts`)
Added new types for type safety:
```typescript
type CourtEventType = 'maintenance' | 'private_event' | 'cleaning' | 'closure' | 'other'

interface CourtEvent {
  id: string;
  court_id: string;
  owner_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  event_type: CourtEventType;
  blocks_bookings: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

### 3. **Service Layer** (`services/courtEvents.ts`)
Complete API wrapper with functions:

**Create & Manage Events:**
- `createCourtEvent()` - Create new calendar event
- `updateCourtEvent()` - Modify existing event
- `deleteCourtEvent()` - Remove event

**Query Events:**
- `getCourtEvents()` - Get all events for a court
- `getOwnerEvents()` - Get current owner's events
- `getCourtEventsInRange()` - Get events in date range
- `getCourtBlockingEvents()` - Get only blocking events

**Booking Integration:**
- `isTimeSlotBlocked()` - Check if time slot has blocking event
- `getEventColorByType()` - Get color for UI display

---

### 4. **Migration Helper** (`scripts/runMigrations.ts`)
TypeScript script to run migrations programmatically

---

### 5. **Documentation** (`COURT_EVENTS_MIGRATION.md`)
Comprehensive guide including:
- Schema overview
- How to run migration
- Testing instructions
- Integration examples
- Troubleshooting

---

## ⚡ Next Steps

### To Apply the Migration:

**Option A (Recommended): Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/002_create_court_events.sql`
3. Paste and execute

**Option B: CLI**
```bash
supabase migration new create_court_events
# Copy migration contents to new file
supabase db push
```

**Option C: TypeScript Script**
```bash
npm run migrate
```

---

## 📋 Database Schema Summary

```
court_events
├── id (UUID) - Primary key
├── court_id (FK) - Links to courts table
├── owner_id (FK) - Links to profiles table
├── title (VARCHAR) - Event name
├── description (TEXT) - Optional details
├── start_datetime (TIMESTAMP TZ) - When it starts
├── end_datetime (TIMESTAMP TZ) - When it ends
├── event_type (TEXT) - Type (maintenance, closure, etc.)
├── blocks_bookings (BOOLEAN) - Prevents player bookings?
├── color (VARCHAR) - Hex color for UI
├── created_at (TIMESTAMP TZ) - Auto timestamp
└── updated_at (TIMESTAMP TZ) - Auto timestamp

Indexes: 6 performance indexes
RLS: 5 security policies
Trigger: Auto-update timestamp
```

---

## 🔒 Security Features

✅ Row Level Security (RLS) enabled
- Court owners can only access their own events
- Events must be for owned courts
- Players can only see blocking events

✅ Foreign key constraints
- Events must have valid court_id
- Events must have valid owner_id

✅ Data validation
- `end_datetime` must be after `start_datetime`
- `event_type` is restricted to predefined types

---

## 🚀 Usage Example

```typescript
import { createCourtEvent, isTimeSlotBlocked } from './services/courtEvents';

// Create an event
const { data: event, error } = await createCourtEvent(
  'court-id-123',
  'Maintenance',
  'Monthly maintenance',
  '2026-02-10T14:00:00Z',
  '2026-02-10T16:00:00Z',
  'maintenance',
  true, // blocks bookings
  '#ef4444' // red color
);

// Check before booking
const isBlocked = await isTimeSlotBlocked(
  'court-id-123',
  '2026-02-10T14:30:00Z',
  '2026-02-10T15:30:00Z'
);

if (isBlocked) {
  console.log('⚠️ Court unavailable - event scheduled');
}
```

---

## 📂 Files Created/Modified

```
✅ NEW: migrations/002_create_court_events.sql (182 lines)
✅ NEW: services/courtEvents.ts (182 lines)
✅ NEW: scripts/runMigrations.ts (89 lines)
✅ NEW: COURT_EVENTS_MIGRATION.md (documentation)
✅ MODIFIED: types.ts (added CourtEvent & CourtEventType)
```

---

## ✨ Ready for Next Phase

The database is now ready for:
1. **Calendar UI Component** - Visual calendar for court owners
2. **Booking Integration** - Prevent bookings during events
3. **Player Calendar View** - Show unavailable times
4. **Event Management Modal** - Create/edit/delete events

Would you like to proceed with the calendar UI component next?
