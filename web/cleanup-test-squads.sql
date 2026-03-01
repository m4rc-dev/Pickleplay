-- ==============================================================
-- CLEANUP: Remove all test squads and related data
-- Run this in Supabase SQL Editor
-- ==============================================================

DO $$
DECLARE
  v_tournament_id UUID := '6167b1c0-fb1b-4e9a-b3e8-a9a058e9e9e8'; -- CHANGE IF NEEDED
BEGIN
  RAISE NOTICE 'Removing test squads...';

  -- 1. Remove tournament roster entries
  DELETE FROM tournament_roster
  WHERE squad_registration_id IN (
    SELECT id FROM squad_registrations
    WHERE squad_id IN (
      SELECT id FROM squads
      WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad')
    )
  );
  RAISE NOTICE 'Deleted tournament_roster entries';

  -- 2. Remove squad registrations
  DELETE FROM squad_registrations
  WHERE squad_id IN (
    SELECT id FROM squads
    WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad')
  );
  RAISE NOTICE 'Deleted squad_registrations';

  -- 3. Remove squad members
  DELETE FROM squad_members
  WHERE squad_id IN (
    SELECT id FROM squads
    WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad')
  );
  RAISE NOTICE 'Deleted squad_members';

  -- 4. Remove squads
  DELETE FROM squads
  WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad');
  RAISE NOTICE 'Deleted squads';

  -- Optional: revert tournament registration mode
  -- Uncomment if you want to reset the tournament back to individual mode:
  -- UPDATE tournaments SET registration_mode = 'individual' WHERE id = v_tournament_id;

  RAISE NOTICE '';
  RAISE NOTICE 'Cleanup complete. All test squads removed.';
END $$;
