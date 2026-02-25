# Tournament System — Full Documentation

> **Current state as of Feb 23, 2026.**
> Covers every working capability of the tournament module across all three user roles: **Player**, **Court Owner / Organizer**, and **Admin**.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [Tournament Lifecycle](#3-tournament-lifecycle)
4. [Player-Facing Features](#4-player-facing-features)
5. [Registration System](#5-registration-system)
6. [Bracket System](#6-bracket-system)
7. [Match Management](#7-match-management)
8. [Organizer / Court-Owner Features](#8-organizer--court-owner-features)
9. [Admin Features](#9-admin-features)
10. [Service Layer Reference](#10-service-layer-reference)
11. [Database Tables](#11-database-tables)
12. [Known Limitations & Pending Work](#12-known-limitations--pending-work)

---

## 1. Overview

The tournament system lets court owners create and run competitive pickleball events. Players browse, register, and follow live brackets. Admins approve events before they become public.

**Three roles and their access:**

| Role | Can Do |
|------|--------|
| **Player** | Browse, filter, register, track own status, view brackets |
| **Court Owner / Organizer** | Create, edit, delete, generate bracket, manage status, approve/reject players, post announcements |
| **Admin** | Everything above + approve/reject tournaments for publishing, feature tournaments, direct status override |

---

## 2. Data Model

### Core types (defined in `web/types.ts`)

```
TournamentStatus    = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
TournamentFormat    = 'single_elim' | 'double_elim' | 'round_robin'
TournamentEventType = 'singles' | 'doubles' | 'mixed_doubles'
TournamentCategory  = 'beginner' | 'intermediate' | 'advanced' | 'open'
TournamentMatchStatus = 'scheduled' | 'live' | 'completed' | 'forfeited' | 'bye'
TournamentRegStatus   = 'pending' | 'confirmed' | 'waitlisted' | 'withdrawn' | 'rejected'
```

### Tournament object fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | string | Display name |
| `date` | string | ISO date/datetime |
| `location` | string | Venue text |
| `prizePool` | string | e.g. `₱150,000` |
| `status` | TournamentStatus | Lifecycle stage |
| `skillLevel` | string | e.g. `3.5 – 4.5` |
| `maxPlayers` | number | Capacity cap |
| `registeredCount` | number | Confirmed players |
| `image` | string? | Poster URL |
| `organizerId` | UUID? | Creator's user ID |
| `courtId` | UUID? | Linked court |
| `description` | string? | Long-form about |
| `format` | TournamentFormat? | Bracket style |
| `eventType` | TournamentEventType? | Singles/doubles/mixed |
| `category` | TournamentCategory? | Skill bracket |
| `startTime` | string? | HH:MM |
| `checkInTime` | string? | HH:MM |
| `registrationDeadline` | ISO string? | Cut-off datetime |
| `numCourts` | number? | For auto-court assignment |
| `isApproved` | boolean\|null | `null`=pending, `true`=approved, `false`=rejected |
| `isFeatured` | boolean? | Pinned to top |
| `rules` | string? | Tournament rules text |
| `prizes` | string? | Prize breakdown text |
| `sponsorBannerUrl` | string? | Sponsor image |
| `announcement` | string? | Live announcement banner |
| `registrationMode` | `'player' \| 'squad' \| 'both'` | Who can register |
| `squadRequirements` | SquadRequirements? | Constraints for squad registration |
| `allowSoloFallback` | boolean? | Allow solo in squad-mode tourney |

---

## 3. Tournament Lifecycle

```
NULL (not approved yet)
        │
        ▼
  [Admin approves]──► is_approved = true
        │
  status = UPCOMING     ← default on creation
        │
  [Organizer/Admin] status → LIVE
        │
  [Organizer/Admin] status → COMPLETED
        │
  (or Admin rejects) ──► is_approved = false, status = CANCELLED
```

**Rules:**
- A tournament is only visible to players on the public `/tournaments` page if `is_approved = true`.
- Only `UPCOMING` tournaments can accept new registrations.
- The bracket can be generated at any point after confirmed registrations exist (usually just before going LIVE).
- Once CANCELLED, the tournament is still stored but cannot accept registrations.

---

## 4. Player-Facing Features

**Entry point:** `components/Tournaments.tsx` → route `/tournaments`

### 4.1 Browse & Filter

- **Search bar** — text match on tournament name.
- **Status tabs** — All / UPCOMING / LIVE / COMPLETED.
- **Category filter** — All / Beginner / Intermediate / Advanced / Open.
- Tournaments are ordered by date ascending.
- Only `is_approved = true` tournaments appear in this view.

### 4.2 Tournament Card

Each card shows:
- Poster image (or default photo)
- Name, date, location
- Prize pool (if set)
- **Capacity progress bar** — turns red when full
- Current player count vs. max
- Format badge (single elim / round robin / etc.)
- Status badge (UPCOMING = blue, LIVE = green, COMPLETED/CANCELLED = grey)
- **Action button** — changes dynamically based on state (see §5.2)

### 4.3 Tournament Detail Modal

Opened by tapping a card. Contains:

**Hero image** with overlaid name, status, featured ⭐, and format badges.

**Three tabs:**

| Tab | What you see |
|-----|-------------|
| **Overview** | Announcement banner (if set) · info cards (date, start time, venue, players) · About description · event type, category, skill level, check-in time, courts, deadline · registration mode + squad requirements |
| **Bracket** | Live bracket viewer (see §6) |
| **Participants** | List of confirmed players · organizers also see pending approvals section here |

---

## 5. Registration System

### 5.1 Registration Modes

Set per tournament:

| Mode | Meaning |
|------|---------|
| `player` | Any individual player can apply |
| `squad` | Only a squad can apply; solo blocked unless `allowSoloFallback = true` |
| `both` | Both modes accepted simultaneously |

### 5.2 Player Registration States & Buttons

| State | Button shown | What player sees |
|-------|-------------|-----------------|
| Not registered + UPCOMING + not full | **Join Tournament** | Blue/slate CTA |
| Not registered + full | **Full** (disabled) | Greyed out |
| Not registered + not UPCOMING | **Closed** (disabled) | — |
| Squad-only tournament without a squad | **Need a Squad** (disabled) | Info text |
| Applied → waiting | **Pending Approval** badge + Withdraw | Amber badge |
| Confirmed | **Registered** badge + Leave | Green badge |
| Rejected | **Not Approved** badge + Reapply | Red badge + reapply button |

### 5.3 Registration Flow (player)

1. Player taps **Join Tournament**.
2. System calls `checkRegistrationConflicts()` via RPC.
   - **Errors** (e.g. not verified enough): dialog shown, registration blocked.
   - **Warnings** (e.g. time overlap): dialog shown, player can override and proceed.
   - No conflicts: skip dialog.
3. System upserts a row into `tournament_registrations` with `status = 'pending'`.
4. Player sees "Pending Approval" state until organizer acts.

### 5.4 Conflict Types

| Type | Severity | Meaning |
|------|----------|---------|
| `verification` | error | Player missing required verifications |
| `time_conflict` | warning | Player overlaps with another tournament |
| `pending_limit` | warning | Too many pending applications |
| `capacity` | error | Tournament is full |

### 5.5 Withdrawal

Player taps **Leave** (when confirmed) or **Withdraw** (when pending). Confirmation dialog appears. On confirm the row is deleted from `tournament_registrations`.

### 5.6 Organizer Approval Actions

Organizers (admin, tournament creator, or court owner) see a **Pending Approvals** section inside the Participants tab. Each pending player is shown as a **PlayerApprovalCard** which displays:

- Avatar, full name, username, DUPR rating
- Stats: tournaments played/won, win rate, matches W/L
- Reliability flags: no-show count, late-cancel count
- Verification badges: Email ✓ / Phone ✓ / ID ✓ / Skill ✓
- Social proof: endorsements, avg community rating, review count
- Tournament history (last N events)
- **AI Recommendation** — computed score 0–100 with action (`approve` / `review` / `reject`), confidence level, and bullet reasons

Buttons: **Approve** (→ `confirmed`) | **Reject** (→ `rejected`)

When `confirmed`, the player appears in the confirmed participants list and counts toward `registered_count`.

### 5.7 Application Message

If the organizer has enabled it, players can submit a short application message when joining. This is stored as `application_message` and shown to the organizer on the PlayerApprovalCard.

---

## 6. Bracket System

**Component:** `components/tournaments/TournamentBracket.tsx`

### 6.1 How it Loads

1. Calls `fetchRounds(tournamentId)` which queries `tournament_rounds` + `tournament_matches` (JOIN).
2. Collects all `participant_a_id`, `participant_b_id`, `winner_id`.
3. Calls `resolveParticipantNames(ids)` → looks up `profiles` table for `full_name`.
4. Renders the correct view based on `format`.
5. **Real-time subscription** to `tournament_matches` table via Supabase channel — bracket auto-refreshes whenever a match is updated.

### 6.2 Elimination View (`single_elim` / `double_elim`)

- Horizontal columns, one per round.
- Round headers show the round name (e.g. "Round of 16", "Quarterfinal", "Final").
- Vertical spacing between matches doubles each round to visually represent the bracket tree.
- Each **MatchCard** shows:
  - Participant A name (bold if winner, strikethrough if loser)
  - Participant B name
  - Score A – Score B (if completed)
  - Status indicator: `completed` = checkmark, `live` = pulsing green dot, `scheduled` = clock, `bye` = dash

### 6.3 Round Robin View (`round_robin`)

Two sections:

**Standings Table**

| # | Player | W | L | PF | PA |
|---|--------|---|---|----|----|
| 1 | — | — | — | — | — |

Sorted by wins desc → losses asc. Points For (PF) and Points Against (PA) computed from all match scores.

**Match List per Round**

Each round is shown as a labelled section. Matches displayed as cards in a responsive grid (1/2/3 columns). Clicking a match can trigger `onMatchClick` for score entry.

### 6.4 Bracket Generation

Triggered by organizer via the **Generate Bracket** button in TournamentsManager.

```
generateBracket(tournamentId)
 └─ fetchTournamentById()
 └─ fetchRegistrations()  ← only 'confirmed' players used
 └─ shuffle participants randomly
 └─ if single_elim:  generateSingleElimBracket()
    if double_elim:  generateDoubleElimBracket()
    if round_robin:  generateRoundRobinBracket()
```

- Requires at least 2 confirmed participants.
- Auto-assigns court numbers cycling through `numCourts`.
- Sets `match_time` based on tournament `startTime` and estimated match durations.
- Inserts rows into `tournament_rounds` and `tournament_matches`.

---

## 7. Match Management

### 7.1 Score Submission

Component: `components/tournaments/MatchScoreModal.tsx`

Organizers open a match and enter:
- Score A (player/team A)
- Score B (player/team B)
- Winner (auto-selected based on higher score, can override)

Calls `submitMatchScore(matchId, scoreA, scoreB, winnerId)` which sets `status = 'completed'`.

### 7.2 Rescheduling

`rescheduleMatch(matchId, newTime)` — updates `match_time`.

### 7.3 Court Reassignment

`reassignMatchCourt(matchId, courtNumber)` — updates `court_number`.

### 7.4 Match Statuses

| Status | Meaning |
|--------|---------|
| `scheduled` | Not yet played |
| `live` | Currently in progress |
| `completed` | Finished, scores recorded |
| `forfeited` | One side didn't show |
| `bye` | Player advances without a match (odd bracket) |

---

## 8. Organizer / Court-Owner Features

**Entry point:** `components/court-owner/TournamentsManager.tsx`

### 8.1 Viewing Tournaments

- Toggle between **Grid** view (card layout) and **List** view (compact rows).
- Each card/row shows: name, status badge, approval badge (pending/approved/rejected), date, player count, prize pool.
- Approval badge colors: yellow=pending, green=approved, red=rejected.

### 8.2 Create Tournament (7-Step Modal)

`components/tournaments/CreateTournamentModal.tsx`

| Step | Fields |
|------|--------|
| 1 — Basic Info | Name *, Description, Location *, Tournament Poster (image upload) |
| 2 — Schedule | Date *, Start Time, Check-in Time, Registration Deadline |
| 3 — Divisions | Category (beginner/intermediate/advanced/open), Skill Level text |
| 4 — Format | Format (single_elim/double_elim/round_robin), Event Type (singles/doubles/mixed_doubles), Max Players |
| 5 — Settings | Number of courts, Registration Mode (player/squad/both), Squad Min Size, Squad Rating Min/Max, Squad Regions, Squad Membership, Allow Solo Fallback |
| 6 — Rewards | Total Prize Pool, Prize Breakdown text, Rules text |
| 7 — Review | Summary of all fields before final submit |

- Step progress bar is interactive (click a completed step to go back).
- Required fields: Name (step 1), Date (step 2).
- On submit: calls `createTournament()` → inserts with `is_approved = null` (pending admin review).
- Edit mode: prefills all fields via `editTournament` prop; calls `updateTournament()`.

### 8.3 Delete Tournament

Confirmation dialog → "This will permanently delete the tournament and all associated data including registrations and brackets."
Calls `deleteTournament(id)`.

### 8.4 Generate Bracket

Button in card actions → calls `generateBracket(id)`. Requires confirmed registrations to exist first.

### 8.5 Status Transitions

Dropdown in each card footer (UPCOMING → LIVE → COMPLETED). Calls `updateTournamentStatus(id, status)`.

### 8.6 Manage Hub

**Only visible once `is_approved = true`.**
Button navigates to `/tournaments-admin/manage/:id` which is the full management hub for live tournaments (detailed player check-in, live scoring, etc.).

### 8.7 Post Announcements

From the TournamentDetail → organizer can post a text announcement. Shows as a blue banner at the top of the Overview tab for all viewers.

---

## 9. Admin Features

**Entry point:** `components/AdminDashboard.tsx` → Tournaments tab

### 9.1 View All Tournaments

Admin sees every tournament regardless of approval status, using the `INITIAL_TOURNAMENTS` mock list in development or direct Supabase fetch in production.

### 9.2 Create Tournament

Same 7-step modal available from admin dashboard. Admin-created tournaments can be set directly as approved.

### 9.3 Approve / Reject Tournaments

| Action | What happens |
|--------|-------------|
| Approve | `is_approved = true` — appears on public `/tournaments` page |
| Reject | `is_approved = false`, `status = 'CANCELLED'` — never shown publicly |

### 9.4 Feature Toggle

`featureTournament(id, true/false)` sets `is_featured`. Featured tournaments display a ⭐ badge and can be filtered/promoted in UI.

### 9.5 Direct Status Override

Admin can set status to UPCOMING / LIVE / COMPLETED at any time via `updateTournamentStatus()`.

### 9.6 AI Approval Recommendation Engine

When an organizer reviews a pending player, the system calls `getApprovalRecommendation()`. This uses RPC `get_approval_recommendation` (migration 071); if unavailable, falls back to a client-side scoring algorithm:

**Scoring (0–100 base = 50):**

| Signal | Points |
|--------|--------|
| Email verified | +10 |
| Phone verified | +15 |
| ID verified | +20 |
| Skill verified | +15 |
| >10 tournaments played | +15 |
| 5–10 tournaments played | +10 |
| Win rate ≥70% | +15 |
| Win rate ≥50% | +5 |
| Has tournament wins | +10 |
| Avg community rating ≥4.5 | +15 |
| ≥10 endorsements | +10 |
| No-shows >2 | −40 |
| No-shows = 1–2 | −25 |
| Recent late cancels >2 | −30 |
| Recent late cancels = 1 | −15 |
| Email **not** verified | −25 |

**Result thresholds:**

| Score | Action | Confidence |
|-------|--------|------------|
| ≥80 | approve | high |
| 60–79 | approve | medium |
| 40–59 | review | medium |
| 25–39 | review | low |
| <25 | reject | high |

---

## 10. Service Layer Reference

**File:** `web/services/tournaments.ts`

### Tournament CRUD

| Function | Description |
|----------|-------------|
| `fetchTournaments(filters?)` | List tournaments; filterable by status, category, organizerId, approvedOnly, featuredOnly |
| `fetchTournamentById(id)` | Single tournament by ID |
| `createTournament(input)` | Create new; always starts with `is_approved = null` |
| `updateTournament(id, updates)` | Partial update |
| `deleteTournament(id)` | Hard delete |
| `uploadTournamentPoster(file)` | Upload to `tournaments` Supabase Storage bucket; returns public URL |

### Admin Actions

| Function | Description |
|----------|-------------|
| `approveTournament(id)` | `is_approved = true` |
| `rejectTournament(id)` | `is_approved = false`, `status = CANCELLED` |
| `featureTournament(id, bool)` | Toggle `is_featured` |
| `updateTournamentStatus(id, status)` | Set lifecycle status |
| `postAnnouncement(id, message)` | Update `announcement` field |

### Registrations

| Function | Description |
|----------|-------------|
| `fetchRegistrations(tournamentId)` | Returns **confirmed** players only |
| `getPendingRegistrations(tournamentId)` | Returns **pending** players |
| `getPendingRegistrationsDetailed(tournamentId)` | Returns pending with full player stats (3-level fallback) |
| `registerPlayer(tournamentId, playerId, message?)` | Upsert with status=`pending` |
| `withdrawRegistration(tournamentId, playerId)` | Hard delete the registration row |
| `getPlayerRegistration(tournamentId, playerId)` | Current player's registration row |
| `approveRegistration(tournamentId, playerId, organizerId)` | status → `confirmed` |
| `rejectRegistration(tournamentId, playerId, organizerId)` | status → `rejected` |
| `checkRegistrationConflicts(tournamentId, playerId)` | RPC; returns `TournamentConflict[]` |

### Player Assessment

| Function | Description |
|----------|-------------|
| `getPlayerVerificationStatus(playerId)` | Email/phone/ID/skill verified flags |
| `getApprovalRecommendation(playerId, tournamentId, playerData?)` | Compute approve/review/reject with score |
| `getPlayerApprovalDetails(playerId)` | Full stats object via RPC |
| `evaluateSquadEligibility(requirements, squad)` | Client-side check; returns `{eligible, reasons}` |

### Rounds & Matches

| Function | Description |
|----------|-------------|
| `fetchRounds(tournamentId)` | Rounds with nested matches |
| `fetchMatches(tournamentId)` | Flat match list |
| `submitMatchScore(matchId, scoreA, scoreB, winnerId)` | Record result, mark completed |
| `rescheduleMatch(matchId, newTime)` | Update `match_time` |
| `reassignMatchCourt(matchId, courtNumber)` | Update `court_number` |
| `generateBracket(tournamentId)` | Client-side bracket creation |
| `resolveParticipantNames(ids)` | Batch profile lookup → `Map<id, {name, avatar}>` |

### Teams

| Function | Description |
|----------|-------------|
| `fetchTeams(tournamentId)` | All teams for a tournament |
| `registerTeam(tournamentId, player1Id, player2Id?, teamName?)` | Create a team entry |

---

## 11. Database Tables

### `tournaments`

Primary tournament record. Key columns: `id`, `name`, `date`, `location`, `prize_pool`, `status`, `skill_level`, `max_players`, `registered_count`, `image_url`, `owner_id`, `organizer_id`, `format`, `event_type`, `category`, `start_time`, `check_in_time`, `registration_deadline`, `num_courts`, `is_approved`, `is_featured`, `rules`, `prizes`, `sponsor_banner_url`, `announcement`, `registration_mode`, `squad_requirements` (JSONB), `allow_solo_fallback`.

**Constraints:**
- `status` ∈ `{UPCOMING, LIVE, COMPLETED, CANCELLED}` (migration 072 added CANCELLED)
- `format` ∈ `{round_robin, single_elim, double_elim}`

### `tournament_registrations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `tournament_id` | UUID | FK → tournaments |
| `player_id` | UUID | FK → profiles |
| `status` | text | pending/confirmed/waitlisted/withdrawn/rejected |
| `checked_in` | boolean | check-in gate |
| `registered_at` | timestamptz | |
| `approved_by` | UUID | organizer who acted |
| `approved_at` | timestamptz | |
| `application_message` | text | player's note on signup |

Unique constraint on `(tournament_id, player_id)`.

### `tournament_rounds`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `tournament_id` | UUID | FK |
| `round_number` | int | 1-based |
| `round_name` | text | e.g. "Quarterfinal" |

### `tournament_matches`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `tournament_id` | UUID | FK |
| `round_id` | UUID | FK → tournament_rounds |
| `match_number` | int | within the round |
| `participant_a_id` | UUID? | player/team UUID |
| `participant_b_id` | UUID? | player/team UUID |
| `winner_id` | UUID? | set when status=completed |
| `score_a` | int? | |
| `score_b` | int? | |
| `status` | text | scheduled/live/completed/forfeited/bye |
| `court_number` | int? | |
| `match_time` | timestamptz? | scheduled start |
| `notes` | text? | |

### `tournament_teams`

Used for doubles/mixed_doubles registration.

| Column | Notes |
|--------|-------|
| `player1_id` | Primary player |
| `player2_id` | Partner (optional for solo registration) |
| `team_name` | Optional label |
| `seed` | Bracket seeding |

---

## 12. Known Limitations & Pending Work

| Area | Status | Notes |
|------|--------|-------|
| Double Elimination bracket | Partially implemented | `generateDoubleElimBracket()` exists in service but losers bracket UI rendering is not fully verified |
| Migration 071 | Not yet applied | `get_pending_registrations_detailed` and `get_approval_recommendation` RPCs require this; system falls back gracefully without it |
| Score entry UI | Exists via `MatchScoreModal` | Not yet wired to all match card click actions in bracket view |
| Squad tournament workflow | Logic implemented | `evaluateSquadEligibility()` works but `regions` and `membership` checks are informational only—not strictly enforced |
| Sponsor banner | Field exists | No UI to display `sponsor_banner_url` in the current bracket/detail views |
| Certificate generation | Not implemented | Listed in FEATURE_REQUIREMENTS.md as pending |
| Email notifications | Not implemented | No automated emails on registration approval/rejection |
| Real-time match scoring from player side | Not implemented | Players can only view the bracket; score entry is organizer-only |
| Waitlist auto-promotion | Not implemented | `waitlisted` status can be set but no auto-confirm when a spot opens |
| Featured tournament display | Field implemented | Public sort/promotion by `is_featured` not yet applied in the public listing |
