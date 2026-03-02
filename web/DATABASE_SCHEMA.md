# PicklePlay Database Schema Reference
> Last updated: March 2, 2026

---

## Key Notes
- `profiles.skill_level` — **DOES NOT EXIST**. Use `profiles.dupr_rating` (numeric)
- `profiles.dupr_rating` — numeric, e.g. `4.25` (player's DUPR rating)
- `tournaments.skill_level` — text, this one DOES exist (separate table, separate column)
- `player_ratings.skill_level` — integer 1–5 (rating score, not a profile column)
- `match_requests` FK to profiles — uses `auth.users` not `profiles` for sender/receiver

---

## Tables

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → auth.users |
| email | text unique | |
| full_name | text | |
| roles | array | default `['PLAYER']` |
| active_role | user_role | default `PLAYER` |
| avatar_url | text | |
| bio | text | |
| location | text | |
| **dupr_rating** | numeric | default 0 — **the skill rating column** |
| win_rate | numeric | |
| matches_played | integer | |
| username | text unique | |
| rating | numeric | nullable |
| experience_years | integer | |
| profile_visibility | text | default `public` |
| availability_status | text | default `offline` |
| availability_start | time | |
| availability_end | time | |
| availability_note | text | |
| preferred_location_ids | array | |
| preferred_court_ids | array | |
| preferred_skill_min | numeric | |
| preferred_skill_max | numeric | |
| preferred_court_type | text | Indoor/Outdoor/Both |
| referral_code | text unique | |
| referred_by_id | uuid | FK → profiles |
| points | integer | default 0 |
| skill_rating | varchar | nullable (quiz-based label) |
| skill_rating_updated_at | timestamptz | |
| followed_tags | array | |
| terms_accepted_at | timestamptz | |
| bookings_completed | integer | |
| phone_verified | boolean | |
| id_verified | boolean | |
| id_document_url | text | |
| skill_verified | boolean | |
| skill_verified_by | uuid | FK → profiles |
| tournaments_played | integer | |
| tournaments_won | integer | |
| matches_won | integer | |
| matches_lost | integer | |
| no_show_count | integer | |
| late_cancel_count | integer | |
| playing_since | date | |
| date_of_birth | date | |
| gender | text | male/female/other/prefer_not_to_say |
| player_endorsements | integer | |
| player_review_count | integer | |
| player_avg_rating | numeric | |
| account_status | text | default `Active` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| court_id | uuid | FK → courts |
| player_id | uuid | FK → profiles |
| date | date | |
| start_time | time | |
| end_time | time | |
| total_price | numeric | |
| status | text | default `pending` |
| payment_status | text | paid/unpaid/refunded |
| payment_method | text | default `cash` |
| is_checked_in | boolean | |
| cancelled_reason | text | |
| amount_tendered | numeric | |
| change_amount | numeric | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `courts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid | FK → profiles |
| name | text | |
| num_courts | integer | |
| surface_type | text | |
| amenities | jsonb | |
| base_price | numeric | |
| is_active | boolean | |
| latitude | double precision | |
| longitude | double precision | |
| cleaning_time_minutes | integer | |
| location_id | uuid | FK → locations |
| image_url | text | |
| court_type | text | Indoor/Outdoor/Both |
| status | text | Available/Fully Booked/Coming Soon/Maintenance |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `locations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid | FK → auth.users |
| name | varchar | |
| description | text | |
| address | varchar | |
| city | varchar | default `Manila` |
| state | varchar | |
| postal_code | varchar | |
| latitude | double precision | |
| longitude | double precision | |
| amenities | jsonb | |
| phone | varchar | |
| base_cleaning_time | integer | |
| is_active | boolean | |
| court_type | text | |
| image_url | text | |
| region | text | |
| barangay | text | |
| status | text | default `Active` |
| opening_time | text | default `08:00` |
| closing_time | text | default `18:00` |
| google_place_id | text unique | |
| google_rating | numeric | |
| google_rating_count | integer | |
| source | text | manual/google/imported |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| last_message_at | timestamptz | |

### `conversation_participants`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| conversation_id | uuid | FK → conversations |
| user_id | uuid | FK → auth.users |
| joined_at | timestamptz | |
| last_read_at | timestamptz | |
| is_archived | boolean | |
| is_muted | boolean | |

### `direct_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| conversation_id | uuid | FK → conversations |
| sender_id | uuid | FK → auth.users |
| content | text | |
| is_read | boolean | |
| read_at | timestamptz | |
| deleted_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `message_read_receipts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| message_id | uuid | FK → direct_messages |
| user_id | uuid | FK → auth.users |
| read_at | timestamptz | |

---

### `match_requests`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| sender_id | uuid | FK → **auth.users** (not profiles!) |
| receiver_id | uuid | FK → **auth.users** (not profiles!) |
| status | text | pending/accepted/declined/cancelled |
| proposed_date | timestamptz | |
| proposed_court_id | uuid | FK → courts |
| game_type | text | singles/doubles/mixed_doubles/casual |
| duration_minutes | integer | default 60 |
| skill_level_preference | text | preference text (not a profile join) |
| message | text | |
| responded_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> ⚠️ `match_requests` FK to profiles — foreign keys point to `auth.users`, not `profiles`. Profile joins using named FKs (`!match_requests_sender_id_fkey`) may fail if not in PostgREST schema cache.

---

### `player_invitations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid | FK → bookings — **nullable** (generic invites have no booking) |
| inviter_id | uuid | FK → profiles |
| invitee_id | uuid | FK → profiles |
| invitee_email | text | |
| invitee_username | text | |
| invitation_method | text | username/email/link/qr/social |
| status | text | pending/accepted/declined/expired |
| invitation_link | text unique | |
| qr_code_data | text | |
| message | text | |
| expires_at | timestamptz | default now + 7 days |
| created_at | timestamptz | |
| responded_at | timestamptz | |

---

### `user_follows`
| Column | Type | Notes |
|--------|------|-------|
| follower_id | uuid PK | FK → profiles |
| followed_id | uuid PK | FK → profiles |
| created_at | timestamptz | |

---

### `tournaments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid | FK → profiles |
| organizer_id | uuid | FK → auth.users |
| name | text | |
| date | timestamptz | |
| location | text | |
| prize_pool | text | |
| status | text | UPCOMING/LIVE/COMPLETED/CANCELLED |
| **skill_level** | text | ✅ EXISTS on tournaments table |
| max_players | integer | |
| registered_count | integer | |
| image_url | text | |
| court_id | uuid | |
| location_id | uuid | |
| description | text | |
| format | text | round_robin/single_elim/double_elim |
| event_type | text | singles/doubles/mixed_doubles |
| category | text | beginner/intermediate/advanced/open |
| start_time | time | |
| check_in_time | time | |
| registration_deadline | timestamptz | |
| num_courts | integer | |
| is_approved | boolean | |
| is_featured | boolean | |
| rules | text | |
| prizes | text | |
| registration_mode | text | individual/squad |
| tournament_mode | text | casual/competitive |
| roster_lock_timing | text | |
| require_email_verified | boolean | |
| require_phone_verified | boolean | |
| require_id_verified | boolean | |
| require_skill_verified | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `tournament_registrations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tournament_id | uuid | FK → tournaments |
| player_id | uuid | FK → profiles |
| status | text | pending/confirmed/waitlisted/withdrawn/rejected |
| team_id | uuid | FK → tournament_teams |
| checked_in | boolean | |
| registered_at | timestamptz | |
| approved_by | uuid | FK → profiles |
| application_message | text | |
| rejection_reason | text | |

### `tournament_teams`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tournament_id | uuid | FK → tournaments |
| player1_id | uuid | FK → auth.users |
| player2_id | uuid | FK → auth.users |
| team_name | text | |
| seed | integer | |

### `tournament_rounds`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tournament_id | uuid | FK → tournaments |
| round_number | integer | |
| round_name | text | |

### `tournament_matches`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tournament_id | uuid | FK → tournaments |
| round_id | uuid | FK → tournament_rounds |
| match_number | integer | |
| court_number | integer | |
| participant_a_id | uuid | |
| participant_b_id | uuid | |
| score_a | integer | |
| score_b | integer | |
| winner_id | uuid | |
| match_time | timestamptz | |
| status | text | scheduled/live/completed/forfeited/bye |

---

### `squads`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | |
| description | text | |
| image_url | text | |
| is_private | boolean | |
| is_official | boolean | |
| tags | array | |
| wins | integer | |
| losses | integer | |
| avg_rating | numeric | |
| members_count | integer | |
| location | text | |
| slug | text unique | |
| require_approval | boolean | |
| invite_code | text unique | |
| created_by | uuid | FK → profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `squad_members`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| squad_id | uuid | FK → squads |
| user_id | uuid unique | FK → profiles |
| role | text | MEMBER/etc |
| status | text | active/pending |
| joined_at | timestamptz | |

### `squad_registrations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tournament_id | uuid | FK → tournaments |
| squad_id | uuid | FK → squads |
| registered_by | uuid | FK → profiles |
| status | text | pending/confirmed/waitlisted/withdrawn/rejected |
| approved_by | uuid | FK → auth.users |
| roster_locked_at | timestamptz | |

### `squad_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| squad_id | uuid | FK → squads |
| user_id | uuid | FK → profiles |
| content | text | |
| created_at | timestamptz | |

### `squad_message_reads`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → auth.users |
| squad_id | uuid | FK → squads |
| last_read_at | timestamptz | |
| last_read_message_id | uuid | FK → squad_messages |

---

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → auth.users |
| type | text | match_request / new_message / FOLLOW / ACHIEVEMENT / player_invitation / etc |
| title | text | |
| message | text | |
| related_user_id | uuid | |
| related_match_request_id | uuid | |
| related_conversation_id | uuid | |
| related_group_id | uuid | |
| actor_id | uuid | |
| booking_id | uuid | |
| related_squad_id | uuid | |
| is_read | boolean | |
| read_at | timestamptz | |
| action_url | text | |
| created_at | timestamptz | |
| expires_at | timestamptz | |

---

### `matches` (casual match system)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| host_id | uuid | FK → profiles |
| court_id | uuid | FK → courts |
| type | match_type | Singles/Doubles |
| status | match_status | Upcoming/etc |
| verification_code | text | |
| match_date | date | |
| start_time | time | |
| end_time | time | |
| score | text | |

### `match_players`
| Column | Type | Notes |
|--------|------|-------|
| match_id | uuid PK | FK → matches |
| player_id | uuid PK | FK → profiles |
| is_verified | boolean | |
| verified_at | timestamptz | |

### `player_ratings` (post-match ratings)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| match_id | uuid | FK → matches |
| rater_id | uuid | FK → profiles |
| ratee_id | uuid | FK → profiles |
| skill_level | integer 1–5 | rating score (not profile column) |
| sportsmanship | integer 1–5 | |
| reliability | integer 1–5 | |
| fair_play | integer 1–5 | |
| comment | text | |

---

### `achievements` + `player_achievements`
| Column | Type | Notes |
|--------|------|-------|
| achievements.key | text unique | |
| achievements.category | text | |
| achievements.target_count | integer | |
| achievements.reward_points | integer | |
| player_achievements.player_id | uuid | FK → profiles |
| player_achievements.is_completed | boolean | |
| player_achievements.certificate_claimed | boolean | |

### `certificates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| player_id | uuid | FK → profiles |
| achievement_id | uuid | FK → achievements |
| player_achievement_id | uuid | FK → player_achievements |
| certificate_number | text unique | |

---

### `partner_reviews`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| reviewer_id | uuid | FK → auth.users |
| reviewed_user_id | uuid | FK → auth.users |
| rating | integer 1–5 | overall |
| skill_rating | integer 1–5 | |
| communication_rating | integer 1–5 | |
| sportsmanship_rating | integer 1–5 | |
| reliability_rating | integer 1–5 | |
| game_type | text | |

### `player_endorsements`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| endorser_id | uuid | FK → auth.users |
| endorsed_user_id | uuid | FK → auth.users |
| skill_type | text | great_partner/skilled_player/good_sportsman/reliable/friendly/competitive/etc |

---

### `security_settings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid unique | FK → auth.users |
| two_factor_enabled | boolean | |
| two_factor_method | text | email/none |
| two_factor_secret | text | |
| backup_codes | json | |
| verification_code | text | |
| verification_code_expires_at | timestamp | |
| verification_attempts | integer | |
| password_set_at | timestamptz | |
| email_verified | boolean | |

---

### `subscriptions` + `subscription_plans`
| Column | Type | Notes |
|--------|------|-------|
| subscriptions.court_owner_id | uuid unique | FK → profiles |
| subscriptions.status | text | trial/active/etc |
| subscriptions.trial_ends_at | timestamptz | |
| subscriptions.plan_type | text | monthly/yearly |
| subscription_plans.price_monthly | numeric | |
| subscription_plans.max_courts | integer | |

---

### `clinics` + `clinic_participants`
| Column | Type | Notes |
|--------|------|-------|
| clinics.coach_id | uuid | FK → profiles |
| clinics.level | text | Intro/Intermediate/Advanced |
| clinics.capacity | integer | |
| clinics.participants | integer | running count |
| clinic_participants.clinic_id | uuid | |
| clinic_participants.player_id | uuid | |

### `lessons`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| coach_id | uuid | FK → profiles |
| student_id | uuid | FK → profiles |
| date | date | |
| type | text | Private/Semi-Private/Group |
| status | text | pending/confirmed/completed/cancelled |
| price | numeric | |

---

### `groups` + `group_members` + `group_messages`
| Column | Type | Notes |
|--------|------|-------|
| groups.privacy | text | public/private |
| groups.created_by | uuid | FK → auth.users |
| group_members.role | text | admin/moderator/member |
| group_members.status | text | active/pending/banned |
| group_members.user_id | uuid | FK → auth.users AND profiles |
| group_messages.user_id | uuid | FK → auth.users |

---

### `guides` + `skill_levels` + `user_quiz_results`
| Column | Type | Notes |
|--------|------|-------|
| guides.slug | varchar unique | |
| guides.type | varchar | guide/video/etc |
| guides.content | jsonb | |
| skill_levels.level | varchar | |
| skill_levels.min_score | integer | |
| skill_levels.max_score | integer | |
| user_quiz_results.skill_level_id | uuid | FK → skill_levels |
| user_quiz_results.skill_rating | varchar | label like "Intermediate" |

---

### `marketing_posters`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid unique | FK → bookings |
| profile_id | uuid | FK → profiles |
| court_name | text | |
| skill_level | text | ✅ text label stored here (not from profiles) |
| date | date | |
| available_slots | integer | |

---

### `court_events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| court_id | uuid | FK → courts |
| owner_id | uuid | FK → profiles |
| title | varchar | |
| event_type | text | maintenance/private_event/cleaning/closure/other |
| start_datetime | timestamptz | |
| end_datetime | timestamptz | |
| blocks_bookings | boolean | |
| color | varchar | default `#ef4444` |

---

### `maintenance_settings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| enabled | boolean | |
| message | text | |
| updated_by | uuid | FK → auth.users |

---

### `access_codes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| code | text unique | |
| assigned_role | text | default `COURT_OWNER` |
| is_used | boolean | |
| used_by | uuid | FK → profiles |
| created_by | uuid | FK → profiles |

---

## Common FK Gotchas

| Table | Column | Points to |
|-------|--------|-----------|
| match_requests | sender_id, receiver_id | **auth.users** (not profiles) |
| partner_reviews | reviewer_id, reviewed_user_id | **auth.users** (not profiles) |
| player_endorsements | endorser_id, endorsed_user_id | **auth.users** (not profiles) |
| locations | owner_id | **auth.users** (not profiles) |
| group_events | created_by | **auth.users** |
| groups | created_by | **auth.users** |
| tournament_teams | player1_id, player2_id | **auth.users** |
| conversation_participants | user_id | **auth.users** |
| direct_messages | sender_id | **auth.users** |
| player_stats | user_id | **auth.users** |
| squad_registrations | approved_by | **auth.users** |

All others (courts, bookings, clinics, lessons, matches, profiles, squads, etc.) → **profiles**
