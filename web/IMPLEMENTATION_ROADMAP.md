# 🎯 Court Events Calendar - Implementation Checklist

## Phase 1: Database Setup ✅ COMPLETE

### Database Migration
- [x] Create `court_events` table
- [x] Add 6 performance indexes
- [x] Implement RLS security policies
- [x] Add timestamp triggers
- [x] Create migration file: `002_create_court_events.sql`

### TypeScript Types
- [x] Add `CourtEventType` type
- [x] Add `CourtEvent` interface
- [x] Update `types.ts`

### Service Layer
- [x] Create `services/courtEvents.ts`
- [x] Implement `createCourtEvent()`
- [x] Implement `getCourtEvents()`
- [x] Implement `getOwnerEvents()`
- [x] Implement `isTimeSlotBlocked()` - **Key for booking integration**
- [x] Implement `updateCourtEvent()`
- [x] Implement `deleteCourtEvent()`
- [x] Implement `getEventColorByType()`

### Documentation
- [x] Create `COURT_EVENTS_MIGRATION.md`
- [x] Create `SETUP_COMPLETE.md`

---

## Phase 2: Calendar UI Component (Next) ⏳

### Components to Build

#### 1. **EventModal Component**
- Modal dialog for creating/editing events
- Form fields:
  - Event title (required)
  - Description (optional)
  - Date range picker
  - Time pickers (start & end)
  - Event type dropdown (maintenance, closure, cleaning, etc.)
  - Checkbox: "Block player bookings?"
  - Color picker
  - Submit & Cancel buttons

#### 2. **CourtEventsList Component**
- Table view of all events for a court
- Columns: Title, Type, Date, Time, Status
- Actions: Edit, Delete, View Details
- Filter/search functionality
- Sorting by date

#### 3. **CourtCalendarView Component**
- Monthly/Weekly calendar view
- Drag-and-drop event creation
- Click to edit events
- Color-coded by type
- Show blocking status
- Legend for event types

#### 4. **Update BookingsAdmin Component**
- Integrate blocking check before confirming bookings
- Show warning if event blocks time
- Prevent manual bookings during blocking events

---

## Phase 3: Booking Integration ⏳

### Modifications Needed

#### In `Booking.tsx`
```typescript
// Before confirming booking:
const isBlocked = await isTimeSlotBlocked(
  selectedCourt.id,
  selectedSlot.startDateTime,
  selectedSlot.endDateTime
);

if (isBlocked) {
  alert('⚠️ This time slot is unavailable');
  return;
}
```

#### In `BookingsAdmin.tsx`
```typescript
// When creating manual booking:
const conflicts = await isTimeSlotBlocked(
  formData.court_id,
  startTime,
  endTime
);

if (conflicts) {
  alert('⚠️ Cannot book - court event scheduled');
  return;
}
```

#### In `GuestBooking.tsx`
```typescript
// Guest booking also needs blocking check
```

---

## Phase 4: Player Calendar View ⏳

### Display for Players
- Show unavailable times in court calendar
- Visual indicator (grayed out or red) for blocking events
- Prevent selecting blocked time slots
- Show reason for unavailability (if available)

---

## File Structure Summary

```
web/
├── migrations/
│   ├── 001_create_security_settings.sql
│   └── 002_create_court_events.sql ✅
├── services/
│   ├── backend.ts
│   ├── courtEvents.ts ✅
│   ├── supabase.ts
│   └── twoFactorAuth.ts
├── components/
│   ├── Booking.tsx (needs update)
│   ├── GuestBooking.tsx (needs update)
│   ├── court-owner/
│   │   ├── BookingsAdmin.tsx (needs update)
│   │   ├── Courts.tsx (needs update)
│   │   ├── CourtCalendarView.tsx (NEW)
│   │   ├── CourtEventsList.tsx (NEW)
│   │   └── EventModal.tsx (NEW)
│   └── ...
├── types.ts ✅ (updated)
├── COURT_EVENTS_MIGRATION.md ✅
├── SETUP_COMPLETE.md ✅
└── scripts/
    └── runMigrations.ts ✅
```

---

## Database Ready! 🎉

### What's Available Now:

✅ **Create Events**
```typescript
await createCourtEvent(courtId, title, description, startDT, endDT, type, blocks, color)
```

✅ **Check Conflicts**
```typescript
const blocked = await isTimeSlotBlocked(courtId, startDT, endDT)
```

✅ **Manage Events**
```typescript
await getCourtEvents(courtId)
await updateCourtEvent(eventId, updates)
await deleteCourtEvent(eventId)
```

✅ **Security**
- RLS policies enforce data isolation
- Only court owners can manage their events
- Events are tied to specific courts

---

## 🚀 How to Proceed

### Step 1: Apply Migration
Execute SQL from `migrations/002_create_court_events.sql` in Supabase Dashboard

### Step 2: Verify Database
```sql
-- Check table creation
SELECT * FROM information_schema.tables WHERE table_name = 'court_events';

-- Try insert
INSERT INTO court_events (court_id, owner_id, title, start_datetime, end_datetime, event_type, blocks_bookings)
VALUES ('{court-id}', '{owner-id}', 'Test', NOW(), NOW() + INTERVAL '1 hour', 'maintenance', true);
```

### Step 3: Build Calendar UI
Create calendar components for court owners to manage events

### Step 4: Integrate with Bookings
Update booking logic to check for conflicts before confirming

### Step 5: Show to Players
Display blocked times in player booking calendar

---

## 📊 Event Types Reference

| Type | Color | Use Case |
|------|-------|----------|
| `maintenance` | 🔴 #ef4444 | Court repair/maintenance |
| `private_event` | 🟣 #a855f7 | Private tournaments, staff events |
| `cleaning` | 🔵 #3b82f6 | Court cleaning/setup |
| `closure` | 🔴 #dc2626 | Complete closure |
| `other` | ⚫ #6b7280 | Other events |

---

## 🔐 Security Checklist

- [x] RLS enabled on court_events
- [x] Court owners can only access own events
- [x] Events must belong to owned courts
- [x] Foreign keys prevent invalid references
- [x] Timestamp auto-updated
- [x] Data validation on datetime

---

## 📝 Next Action

Ready to build the **Calendar UI Components**? Let me know if you want to proceed!
