/**
 * Test Squad Tournament System
 * 
 * This script helps you set up test data for squad tournaments.
 * Run with: npx tsx test-squad-tournament.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hdruhslfadbaadtgvetf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcnVoc2xmYWRiYWFkdGd2ZXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTEwMTUsImV4cCI6MjA4NTUyNzAxNX0.qmN6_w4J9Y6Jof6RVrEHq3cW8-EE8Bietq8_U4OVehM'
);

// ══════════════════════════════════════════════════════════════
// TEST DATA CREATION
// ══════════════════════════════════════════════════════════════

async function createTestSquad(
  ownerId: string,
  name: string,
  memberCount: number = 4
): Promise<string> {
  console.log(`\n📦 Creating squad: ${name}...`);
  
  // Create squad (only required columns)
  const { data: squad, error: squadError } = await supabase
    .from('squads')
    .insert({
      name,
      description: `Test squad for tournament validation`,
      image_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${name}`,
      is_private: false,
      is_official: false,
      created_by: ownerId,
    })
    .select()
    .single();

  if (squadError) {
    console.error('❌ Error creating squad:', squadError);
    throw squadError;
  }

  console.log(`✅ Squad created: ${squad.id}`);
  
  // Get some test players (first N profiles from DB)
  const { data: players, error: playersError } = await supabase
    .from('profiles')
    .select('id, full_name, rating, dupr_rating')
    .neq('id', ownerId)
    .limit(memberCount - 1); // -1 because owner is also a member

  if (playersError) {
    console.error('❌ Error fetching players:', playersError);
    throw playersError;
  }

  // Add owner as first member
  const members = [
    { squad_id: squad.id, user_id: ownerId, role: 'OWNER' as const },
    ...players.map(p => ({ 
      squad_id: squad.id, 
      user_id: p.id, 
      role: 'MEMBER' as const,
    }))
  ];

  const { error: membersError } = await supabase
    .from('squad_members')
    .insert(members);

  if (membersError) {
    console.error('❌ Error adding members:', membersError);
    throw membersError;
  }

  console.log(`✅ Added ${members.length} members to squad`);
  
  return squad.id;
}

async function registerSquadForTournament(
  tournamentId: string,
  squadId: string,
  ownerId: string,
  rosterSize: number = 4
): Promise<string> {
  console.log(`\n🎫 Registering squad for tournament...`);

  // Get squad members
  const { data: members, error: membersError } = await supabase
    .from('squad_members')
    .select('user_id')
    .eq('squad_id', squadId)
    .limit(rosterSize);

  if (membersError) {
    console.error('❌ Error fetching members:', membersError);
    throw membersError;
  }

  const rosterPlayerIds = members.map(m => m.user_id);

  console.log(`📋 Roster: ${rosterPlayerIds.length} players`);

  // Create squad registration
  const { data: reg, error: regError } = await supabase
    .from('squad_registrations')
    .insert({
      tournament_id: tournamentId,
      squad_id: squadId,
      registered_by: ownerId,
      status: 'pending',
      application_message: 'Test squad registration - ready for approval!',
      registered_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (regError) {
    console.error('❌ Error creating registration:', regError);
    throw regError;
  }

  console.log(`✅ Squad registration created: ${reg.id}`);

  // Add players to tournament roster
  const rosterEntries = rosterPlayerIds.map(playerId => ({
    tournament_id: tournamentId,
    squad_registration_id: reg.id,
    player_id: playerId,
    status: 'active',
    added_at: new Date().toISOString(),
  }));

  const { error: rosterError } = await supabase
    .from('tournament_roster')
    .insert(rosterEntries);

  if (rosterError) {
    console.error('❌ Error adding roster:', rosterError);
    throw rosterError;
  }

  console.log(`✅ Added ${rosterEntries.length} players to tournament roster`);
  
  return reg.id;
}

// ══════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ══════════════════════════════════════════════════════════════

async function testScenario1_ValidSquad(tournamentId: string, ownerId: string) {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('📝 SCENARIO 1: Valid Squad (should pass all checks)');
  console.log('═══════════════════════════════════════════════');
  
  const squadId = await createTestSquad(ownerId, 'Valid Warriors', 4);
  await registerSquadForTournament(tournamentId, squadId, ownerId, 4);
  
  console.log('\n✅ RESULT: Squad should show as VALID with green badge');
}

async function testScenario2_TooSmall(tournamentId: string, ownerId: string) {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('📝 SCENARIO 2: Roster Too Small');
  console.log('═══════════════════════════════════════════════');
  
  const squadId = await createTestSquad(ownerId, 'Small Team', 4);
  await registerSquadForTournament(tournamentId, squadId, ownerId, 2); // Only 2 players instead of 4
  
  console.log('\n❌ RESULT: Should show "Roster too small: 2/4 minimum"');
}

async function testScenario3_NotDivisible(tournamentId: string, ownerId: string) {
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('📝 SCENARIO 3: Not Divisible by Team Size');
  console.log('═══════════════════════════════════════════════');
  
  const squadId = await createTestSquad(ownerId, 'Odd Squad', 5);
  await registerSquadForTournament(tournamentId, squadId, ownerId, 3); // 3 players for doubles (not divisible by 2)
  
  console.log('\n❌ RESULT: Should show "Roster (3) must be divisible by team size (2)"');
}

// ══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('🎾 SQUAD TOURNAMENT TEST DATA GENERATOR');
  console.log('════════════════════════════════════════\n');

  // Get tournament ID and user ID from arguments
  const TOURNAMENT_ID = process.argv[2];
  const USER_ID = process.argv[3];
  
  if (!TOURNAMENT_ID) {
    console.error('\n❌ Missing required arguments!');
    console.log('\n📋 Usage:');
    console.log('   npx tsx test-squad-tournament.ts TOURNAMENT_ID YOUR_USER_ID');
    console.log('\n💡 How to get these:');
    console.log('   • Tournament ID: From URL /tournaments-admin/manage/[THIS_ID]');
    console.log('   • Your User ID: From browser console → supabase.auth.getUser()');
    console.log('   • Or check profiles table in Supabase dashboard');
    return;
  }

  if (!USER_ID) {
    console.error('\n❌ Missing user ID!');
    console.log('\n💡 Get your user ID by running this in browser console:');
    console.log('   const { data } = await supabase.auth.getUser();');
    console.log('   console.log(data.user.id);');
    return;
  }

  console.log(`👤 Using user ID: ${USER_ID}`);
  console.log(`🏆 Using tournament: ${TOURNAMENT_ID}\n`);

  // Run test scenarios
  try {
    await testScenario1_ValidSquad(TOURNAMENT_ID, USER_ID);
    await testScenario2_TooSmall(TOURNAMENT_ID, USER_ID);
    await testScenario3_NotDivisible(TOURNAMENT_ID, USER_ID);

    console.log('\n\n✅ ALL TEST DATA CREATED!');
    console.log('════════════════════════════════════════');
    console.log('🎯 Now go to the tournament management page to see:');
    console.log('   • "Pending Squad Approvals" section');
    console.log('   • Validation badges (Valid/Issues)');
    console.log('   • Detailed error messages');
    console.log('   • Approve/Reject buttons');
    
  } catch (error) {
    console.error('\n❌ Error running tests:', error);
  }
}

main();
