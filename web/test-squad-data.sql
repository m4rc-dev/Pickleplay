-- ══════════════════════════════════════════════════════════════
-- SQUAD TOURNAMENT TEST DATA
-- Run this in Supabase SQL Editor to create test squads
-- ══════════════════════════════════════════════════════════════

-- Replace these values:
-- YOUR_TOURNAMENT_ID: Your tournament ID (6167b1c0-fb1b-4e9a-b3e8-a9a058e9e9e8)
-- Note: This script will use existing players from the profiles table as squad members

DO $$
DECLARE
  v_tournament_id UUID := '6167b1c0-fb1b-4e9a-b3e8-a9a058e9e9e8'; -- CHANGE THIS
  v_squad_1_id UUID;
  v_squad_2_id UUID;
  v_squad_3_id UUID;
  v_reg_1_id UUID;
  v_reg_2_id UUID;
  v_reg_3_id UUID;
  v_player_ids UUID[];
BEGIN
  -- ==============================================================
  -- CLEANUP: Remove existing test squads and related data
  -- ==============================================================
  RAISE NOTICE 'Cleaning up existing test data...';
  
  -- Delete tournament roster entries for existing test squads
  DELETE FROM tournament_roster 
  WHERE squad_registration_id IN (
    SELECT id FROM squad_registrations 
    WHERE squad_id IN (
      SELECT id FROM squads 
      WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad')
    )
  );
  
  -- Delete squad registrations for test squads
  DELETE FROM squad_registrations 
  WHERE squad_id IN (
    SELECT id FROM squads 
    WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad')
  );
  
  -- Delete squad members for test squads
  DELETE FROM squad_members 
  WHERE squad_id IN (
    SELECT id FROM squads 
    WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad')
  );
  
  -- Delete the test squads themselves
  DELETE FROM squads 
  WHERE name IN ('Valid Warriors', 'Small Team', 'Odd Squad');
  
  RAISE NOTICE 'Cleanup complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Creating test squads for tournament validation...';

  -- Ensure tournament is in squad registration mode and has correct requirements
  -- minSize=4 means: Valid Warriors (4 players) passes, Small Team (2) and Odd Squad (3) fail
  UPDATE tournaments 
  SET 
    registration_mode = 'squad',
    event_type = 'doubles',
    squad_requirements = '{"minSize": 4, "teamSize": 2}'::jsonb
  WHERE id = v_tournament_id;
  RAISE NOTICE 'Tournament: squad mode, doubles, minSize=4';
  RAISE NOTICE '';

  -- Get 9 profiles that are NOT already in any squad_members
  -- Squad 1: players 1-4 (valid: 4 players >= minSize 4, 4 % 2 = 0)
  -- Squad 2: players 5-6 (invalid: 2 < minSize 4)
  -- Squad 3: players 7-9 (invalid: 3 < minSize 4 AND 3 % 2 != 0)
  SELECT ARRAY_AGG(id) INTO v_player_ids
  FROM (
    SELECT p.id
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM squad_members sm WHERE sm.user_id = p.id
    )
    LIMIT 9
  ) sub;

  IF array_length(v_player_ids, 1) < 9 THEN
    RAISE EXCEPTION 'Need at least 9 available profiles not already in squads for testing';
  END IF;

  -- ==============================================================
  -- SCENARIO 1: Valid Squad (4 players, divisible by 2)
  -- ==============================================================
  RAISE NOTICE '';
  RAISE NOTICE 'SCENARIO 1: Valid Squad (should pass all checks)';
  RAISE NOTICE '===============================================';

  -- Create squad
  INSERT INTO squads (name, description, image_url, is_private, is_official, created_by)
  VALUES (
    'Valid Warriors',
    'Test squad with 4 players - should pass all validation',
    'https://api.dicebear.com/7.x/shapes/svg?seed=valid',
    false,
    false,
    v_player_ids[1]
  )
  RETURNING id INTO v_squad_1_id;

  RAISE NOTICE 'Squad created: %', v_squad_1_id;

  -- Add members (4 players total) - using players 1-4
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES 
    (v_squad_1_id, v_player_ids[1], 'OWNER'),
    (v_squad_1_id, v_player_ids[2], 'MEMBER'),
    (v_squad_1_id, v_player_ids[3], 'MEMBER'),
    (v_squad_1_id, v_player_ids[4], 'MEMBER');

  RAISE NOTICE 'Added 4 members';

  -- Register for tournament
  INSERT INTO squad_registrations (tournament_id, squad_id, registered_by, status, application_message, registered_at)
  VALUES (
    v_tournament_id,
    v_squad_1_id,
    v_player_ids[1],
    'pending',
    'Valid squad ready for approval!',
    NOW()
  )
  RETURNING id INTO v_reg_1_id;

  RAISE NOTICE 'Squad registered for tournament: %', v_reg_1_id;

  -- Add to tournament roster
  INSERT INTO tournament_roster (squad_registration_id, player_id, status, added_at)
  VALUES 
    (v_reg_1_id, v_player_ids[1], 'active', NOW()),
    (v_reg_1_id, v_player_ids[2], 'active', NOW()),
    (v_reg_1_id, v_player_ids[3], 'active', NOW()),
    (v_reg_1_id, v_player_ids[4], 'active', NOW());

  RAISE NOTICE 'Added 4 players to roster';
  RAISE NOTICE 'RESULT: Should show GREEN "Valid" badge';

  -- ==============================================================
  -- SCENARIO 2: Too Small Squad (only 2 players)
  -- ==============================================================
  RAISE NOTICE '';
  RAISE NOTICE 'SCENARIO 2: Roster Too Small';
  RAISE NOTICE '===============================================';

  -- Create squad
  INSERT INTO squads (name, description, image_url, is_private, is_official, created_by)
  VALUES (
    'Small Team',
    'Test squad with only 2 players - should fail validation',
    'https://api.dicebear.com/7.x/shapes/svg?seed=small',
    false,
    false,
    v_player_ids[5]
  )
  RETURNING id INTO v_squad_2_id;

  RAISE NOTICE 'Squad created: %', v_squad_2_id;

  -- Add only 2 members - using players 5-6
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES 
    (v_squad_2_id, v_player_ids[5], 'OWNER'),
    (v_squad_2_id, v_player_ids[6], 'MEMBER');

  RAISE NOTICE 'Added 2 members';

  -- Register for tournament
  INSERT INTO squad_registrations (tournament_id, squad_id, registered_by, status, application_message, registered_at)
  VALUES (
    v_tournament_id,
    v_squad_2_id,
    v_player_ids[5],
    'pending',
    'Small squad - should fail min roster check',
    NOW()
  )
  RETURNING id INTO v_reg_2_id;

  RAISE NOTICE 'Squad registered for tournament: %', v_reg_2_id;

  -- Add to tournament roster (only 2 players)
  INSERT INTO tournament_roster (squad_registration_id, player_id, status, added_at)
  VALUES 
    (v_reg_2_id, v_player_ids[5], 'active', NOW()),
    (v_reg_2_id, v_player_ids[6], 'active', NOW());

  RAISE NOTICE 'Added 2 players to roster';
  RAISE NOTICE 'RESULT: Should show RED "Issues" badge - "Roster too small: 2/4 minimum"';

  -- ==============================================================
  -- SCENARIO 3: Not Divisible (3 players for doubles)
  -- ==============================================================
  RAISE NOTICE '';
  RAISE NOTICE 'SCENARIO 3: Not Divisible by Team Size';
  RAISE NOTICE '===============================================';

  -- Create squad
  INSERT INTO squads (name, description, image_url, is_private, is_official, created_by)
  VALUES (
    'Odd Squad',
    'Test squad with 3 players - not divisible by 2',
    'https://api.dicebear.com/7.x/shapes/svg?seed=odd',
    false,
    false,
    v_player_ids[7]
  )
  RETURNING id INTO v_squad_3_id;

  RAISE NOTICE 'Squad created: %', v_squad_3_id;

  -- Add 3 members - using players 7-9
  INSERT INTO squad_members (squad_id, user_id, role)
  VALUES 
    (v_squad_3_id, v_player_ids[7], 'OWNER'),
    (v_squad_3_id, v_player_ids[8], 'MEMBER'),
    (v_squad_3_id, v_player_ids[9], 'MEMBER');

  RAISE NOTICE 'Added 3 members';

  -- Register for tournament
  INSERT INTO squad_registrations (tournament_id, squad_id, registered_by, status, application_message, registered_at)
  VALUES (
    v_tournament_id,
    v_squad_3_id,
    v_player_ids[7],
    'pending',
    'Odd number squad - should fail divisibility check',
    NOW()
  )
  RETURNING id INTO v_reg_3_id;

  RAISE NOTICE 'Squad registered for tournament: %', v_reg_3_id;

  -- Add to tournament roster (3 players)
  INSERT INTO tournament_roster (squad_registration_id, player_id, status, added_at)
  VALUES 
    (v_reg_3_id, v_player_ids[7], 'active', NOW()),
    (v_reg_3_id, v_player_ids[8], 'active', NOW()),
    (v_reg_3_id, v_player_ids[9], 'active', NOW());

  RAISE NOTICE 'Added 3 players to roster';
  RAISE NOTICE 'RESULT: Should show RED "Issues" badge - "Roster (3) must be divisible by team size (2)"';

  -- ==============================================================
  -- SUMMARY
  -- ==============================================================
  RAISE NOTICE '';
  RAISE NOTICE 'ALL TEST DATA CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tournament set to: squad mode, doubles, minSize=4';
  RAISE NOTICE '';
  RAISE NOTICE 'Now go to your tournament management page:';
  RAISE NOTICE '   /tournaments-admin/manage/%', v_tournament_id;
  RAISE NOTICE '';
  RAISE NOTICE 'You should see 3 pending squads:';
  RAISE NOTICE '   - "Valid Warriors"  4 players  GREEN badge (4>=4 min, 4%%2=0)';
  RAISE NOTICE '   - "Small Team"      2 players  RED badge  (2<4 minimum)';
  RAISE NOTICE '   - "Odd Squad"       3 players  RED badge  (3<4 minimum AND 3%%2!=0)';

END $$;
