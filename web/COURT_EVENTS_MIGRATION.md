# Database Migration Guide - Court Events Calendar

## Overview
This migration adds a **Court Events** system that allows court owners to:
- Create calendar events (maintenance, closures, private events, etc.)
- Block time slots to prevent player bookings
- Manage court availability with a visual calendar

## Files Created

### 1. **Migration File**
- **File**: `migrations/002_create_court_events.sql`
- **What it does**:
  - Creates `court_events` table with all necessary columns
  - Adds indexes for optimal query performance
  - Implements Row Level Security (RLS) policies
  - Adds automatic `updated_at` timestamp trigger

### 2. **TypeScript Types**
- **File**: `types.ts` (updated)
- **New types**:
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

### 3. **Service Functions**
- **File**: `services/courtEvents.ts` (new)
- **Functions**:
  - `createCourtEvent()` - Create new event
  - `getCourtEvents()` - Get all events for a court
  - `getOwnerEvents()` - Get current owner's events
  - `getCourtEventsInRange()` - Get events within date range
  - `isTimeSlotBlocked()` - Check if time is blocked
  - `getCourtBlockingEvents()` - Get blocking events only
  - `updateCourtEvent()` - Update event details
  - `deleteCourtEvent()` - Delete event
  - `getEventColorByType()` - Get UI color by event type

## Database Schema

### Table: `court_events`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `court_id` | UUID | Foreign key to courts |
| `owner_id` | UUID | Foreign key to profiles (court owner) |
| `title` | VARCHAR(255) | Event name |
| `description` | TEXT | Event details |
| `start_datetime` | TIMESTAMP WITH TZ | Event start time |
| `end_datetime` | TIMESTAMP WITH TZ | Event end time |
| `event_type` | TEXT | Type: maintenance, private_event, cleaning, closure, other |
| `blocks_bookings` | BOOLEAN | If true, prevents player bookings |
| `color` | VARCHAR(7) | Hex color for calendar display |
| `created_at` | TIMESTAMP WITH TZ | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | Last update timestamp |

### Indexes Created
- `idx_court_events_court_id` - Fast lookup by court
- `idx_court_events_owner_id` - Fast lookup by owner
- `idx_court_events_start_datetime` - Fast lookup by start time
- `idx_court_events_end_datetime` - Fast lookup by end time
- `idx_court_events_court_start_end` - Composite index for range queries
- `idx_court_events_blocks_bookings` - Fast lookup for blocking events

### Row Level Security (RLS) Policies

| Policy | Purpose |
|--------|---------|
| View own events | Court owners can only see their events |
| Create events | Can only create for owned courts |
| Update events | Can only update own events |
| Delete events | Can only delete own events |
| Player visibility | Players can see blocking events for booking conflicts |

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your PicklePlay project
3. Go to **SQL Editor**
4. Create a new query
5. Copy and paste the contents of `migrations/002_create_court_events.sql`
6. Click **Run**

### Option 2: Using Script (Requires Setup)

```bash
# First, set environment variables
export VITE_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Or set them in .env.local file:
# VITE_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...

# Run migration
npx ts-node scripts/runMigrations.ts
```

### Option 3: Using Supabase CLI

```bash
supabase migration new create_court_events
# Copy contents of 002_create_court_events.sql into the new migration file
supabase db push
```

## Testing the Migration

After running the migration, verify it worked:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'court_events';

-- Check indexes
SELECT * FROM pg_indexes 
WHERE tablename = 'court_events';

-- Insert test event
INSERT INTO court_events (
  court_id,
  owner_id,
  title,
  description,
  start_datetime,
  end_datetime,
  event_type,
  blocks_bookings
) VALUES (
  'your-court-id',
  'your-user-id',
  'Maintenance',
  'Regular maintenance',
  NOW(),
  NOW() + INTERVAL '2 hours',
  'maintenance',
  true
);
```

## Integrating with Booking System

The event system must be integrated with the booking logic to prevent conflicts:

```typescript
// In Booking.tsx or during booking confirmation
import { isTimeSlotBlocked } from '../services/courtEvents';

// Before creating booking:
const isBlocked = await isTimeSlotBlocked(
  selectedCourt.id,
  selectedSlot.startDateTime,
  selectedSlot.endDateTime
);

if (isBlocked) {
  alert('❌ This time slot is unavailable due to a scheduled event');
  return;
}

// Proceed with booking creation...
```

## Event Types & Default Colors

| Type | Color | Use Case |
|------|-------|----------|
| `maintenance` | 🔴 Red (#ef4444) | Court maintenance, repairs |
| `private_event` | 🟣 Purple (#a855f7) | Private tournaments, staff events |
| `cleaning` | 🔵 Blue (#3b82f6) | Court cleaning, setup |
| `closure` | 🔴 Dark Red (#dc2626) | Complete closure |
| `other` | ⚫ Gray (#6b7280) | Other events |

## Next Steps

1. **Create Calendar UI Component** - React component to display and manage events
2. **Update Booking Form** - Add blocking check before booking
3. **Add Court Owner Calendar View** - Allow creating/editing events
4. **Sync with Player Calendar** - Show unavailable times

## Troubleshooting

### "RLS policy violation" error
- Make sure you're authenticated as the court owner
- Check that the court_id belongs to the current user

### "Foreign key violation" error
- Verify the court_id exists in the courts table
- Verify the owner_id matches the authenticated user

### Migration fails to execute
- Use the Supabase Dashboard SQL Editor for better error messages
- Check for syntax errors in the SQL file
- Ensure all dependent tables (courts, profiles) exist first

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [UUID Generation in PostgreSQL](https://www.postgresql.org/docs/current/uuid-ossp.html)
