# PicklePlay User Testing Guide

## Prerequisites

- App running at `http://localhost:5173`
- At least **2 test accounts** (Account A = primary tester, Account B = second player)
- One account must have **ADMIN** role
- One account must have **COURT_OWNER** role (can be same as ADMIN)

---

## Test Suite 1 — Squad Flow

### 1.1 Create a Squad (Account A — any role)

1. Log in as Account A
2. Navigate to **Teams** (`/teams`)
3. Click **"Found a Team"** (or "Deploy Squad" if ADMIN)
4. Fill in:
   - Name: `Test Squad Alpha`
   - Description: anything
   - Location: anything
   - Privacy: **Public**
5. Click **Create**
6. ✅ You should be redirected to the squad detail page as OWNER

---

### 1.2 Join a Squad (Account B)

1. Log in as Account B
2. Navigate to **Teams** → **Discover** tab
3. Find `Test Squad Alpha`
4. Click **Join**
5. ✅ Account B is now a MEMBER

---

### 1.3 One-Squad Rule

1. Still as Account B, find any other squad
2. Click **Join**
3. ✅ Should show: *"You're already in a squad. Leave your current squad first."*

---

### 1.4 Private Squad Gate

1. As Account A, go to your squad → **Manage** → **Info** tab
2. Toggle **Private** ON → Save
3. Log in as a fresh account (or log out)
4. Navigate to `Test Squad Alpha` in Discover
5. ✅ Should show a locked/blocked view — no chat or members visible

---

### 1.5 Squad Chat (realtime)

1. Account A and Account B both open the squad detail page simultaneously
2. Account A sends a message in the **Chat** panel
3. ✅ Account B should see the message appear in real time without refreshing

---

### 1.6 Squad Events

1. As Account A (OWNER), open squad detail → switch to **Events** tab
2. Click **Create Event**, fill fields, set a future date → Save
3. ✅ Event appears in the list
4. Switch to Account B → open same squad → **Events** tab
5. Click **RSVP**
6. ✅ RSVP toggled; Account B appears in attendees

---

### 1.7 Manage Members

1. As Account A, open **Manage** → **Members** tab
2. Find Account B → change role to **Moderator** → Save
3. ✅ Account B's badge updates to MOD
4. Change back to MEMBER

---

### 1.8 Leave Squad

1. As Account B, click **Leave Squad**
2. Confirm dialog
3. ✅ Redirected to `/teams`, Account B no longer appears in squad members

---

### 1.9 Delete Squad

1. As Account A, go to **Manage** → scroll to bottom
2. Click **Delete Squad** → Confirm
3. ✅ Redirected to `/teams`, squad no longer appears in Discover

---

## Test Suite 2 — Tournament Flow (Court Owner)

### 2.1 Create a Tournament

1. Log in as COURT_OWNER (or ADMIN)
2. Navigate to **Manage Tournaments** (`/tournaments-admin`)
3. Click **Create Tournament**
4. Complete all 7 steps:
   - **Step 1:** Name: `Test Open 2026`, Location, Description
   - **Step 2:** Set date 2+ weeks from today, set registration deadline 1 week from today
   - **Step 3:** Category: `Open`, Skill: `All Levels`, Max Players: `8`
   - **Step 4:** Format: `Single Elimination`, Event type: `Singles`
   - **Step 5:** Registration mode: `Player`, leave squad requirements empty
   - **Step 6:** Prize pool: `₱10,000`
   - **Step 7:** Review → Submit
5. ✅ Tournament card appears in list with **"Pending Review"** badge

---

### 2.2 Approve the Tournament (Admin)

1. Log in as ADMIN
2. Navigate to **Admin** (`/admin`) → **Tournaments** tab
3. Find `Test Open 2026` in the pending list
4. Click **Approve**
5. ✅ Tournament is now visible on the public `/tournaments` page

---

### 2.3 Player Registers

1. Log in as a PLAYER account (Account A)
2. Navigate to **Tournaments** (`/tournaments`)
3. Find `Test Open 2026` → click **Join Tournament**
4. On the tournament detail page — enter optional message → click **Submit Registration**
5. ✅ Card now shows **"Pending Approval"** amber chip

---

### 2.4 Organizer Approves Registration

1. Log in as COURT_OWNER
2. Navigate to **Manage Tournaments** → open `Test Open 2026` → **Hub**
3. Go to **Participants** tab
4. Find Account A in the pending list — review the AI recommendation badge
5. Click **Approve**
6. ✅ Account A moves to the confirmed participants list

---

### 2.5 Check In

1. Still in **Participants** tab as organizer
2. Click the check-in toggle for Account A
   - OR click **Check In All**
3. ✅ Check-in badge appears on the participant row

---

### 2.6 Generate Bracket

1. Navigate to **Bracket** tab inside the Hub
2. Click **Generate Bracket**
3. ✅ Bracket renders with all confirmed participants seeded

---

### 2.7 Score a Match

1. In the **Bracket** tab, click any live match card (or use **Go Live** button first)
2. If scheduling: click **Go Live** → match status turns amber
3. Click score icon / match → **Score Modal** opens
4. Enter scores, select winner
5. Click **Submit Score**
6. ✅ Winner advances to next round; bracket updates

---

### 2.8 Declare Tournament Champion

1. Continue scoring matches until the Final round
2. Submit the Final match score
3. ✅ Champion banner appears on the **Overview** tab
4. ✅ Tournament status auto-changes to COMPLETED (or manually set it)

---

### 2.9 Post Announcement

1. On the **Overview** tab, find the **Announcement** text area
2. Type: `Bracket is now live! Good luck to all players.`
3. Click **Post**
4. ✅ As a PLAYER, navigate to `/tournaments/:id` → announcement banner shows at the top

---

## Test Suite 3 — Squad + Tournament Intersection

### 3.1 Squad Registration Mode

1. As COURT_OWNER, create a new tournament:
   - Step 5: Registration mode → **Squad Only**
   - Min squad size: `2`
2. Approve the tournament as ADMIN
3. As a PLAYER **not in any squad**, try to register
4. ✅ Button shows **"Need a Squad"** — cannot register
5. Have Account A join a squad (min 2 members)
6. Re-attempt registration → squad dropdown appears → select squad → Submit
7. ✅ Registration submitted with squad attached

---

## Test Suite 4 — Admin Demo Data

### 4.1 Tournaments Demo Toggle

1. Log in as ADMIN
2. Navigate to `/tournaments`
3. ✅ A **"Show Demo Data"** button appears in the filters bar (players do NOT see this)
4. Click it → 3 demo tournament cards appear with note: *"Admin preview — demo tournaments are only visible to you"*
5. Switch to a PLAYER account → navigate to `/tournaments`
6. ✅ Demo toggle is invisible; demo cards do not appear

---

### 4.2 Manager Demo Toggle

1. Log in as ADMIN → navigate to `/tournaments-admin`
2. ✅ **"Show Demo"** button appears next to "Create Tournament"
3. Click → 4 demo tournament cards appear
4. Log in as COURT_OWNER (non-admin) → navigate to `/tournaments-admin`
5. ✅ Demo toggle is NOT visible to court owners

---

## Test Suite 5 — Role Switching

### 5.1 Switch from ADMIN to PLAYER

1. Log in as a user with both ADMIN and PLAYER roles
2. Use the role switcher in the sidebar → select **Player**
3. ✅ Role switches to PLAYER, navigates to dashboard
4. ✅ Admin sidebar items disappear
5. ✅ NOT logged out — session preserved

---

### 5.2 Switch back to ADMIN

1. From PLAYER role, use the sidebar role switcher → select **Admin**
2. ✅ Admin sidebar items reappear
3. ✅ NOT logged out

---

## Pass/Fail Checklist

| # | Test | Pass | Fail | Notes |
|---|---|---|---|---|
| 1.1 | Create squad | | | |
| 1.2 | Join squad | | | |
| 1.3 | One-squad rule | | | |
| 1.4 | Private squad gate | | | |
| 1.5 | Real-time chat | | | |
| 1.6 | Squad events + RSVP | | | |
| 1.7 | Manage members | | | |
| 1.8 | Leave squad | | | |
| 1.9 | Delete squad | | | |
| 2.1 | Create tournament | | | |
| 2.2 | Admin approves tournament | | | |
| 2.3 | Player registers | | | |
| 2.4 | Organizer approves registration | | | |
| 2.5 | Check in | | | |
| 2.6 | Generate bracket | | | |
| 2.7 | Score a match | | | |
| 2.8 | Champion declared | | | |
| 2.9 | Post announcement | | | |
| 3.1 | Squad registration mode | | | |
| 4.1 | Tournaments demo toggle (admin only) | | | |
| 4.2 | Manager demo toggle (admin only) | | | |
| 5.1 | Role switch ADMIN → PLAYER | | | |
| 5.2 | Role switch PLAYER → ADMIN | | | |
