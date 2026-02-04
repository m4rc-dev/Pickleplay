import { supabase } from './services/supabase';

async function checkSquadsSchema() {
    console.log('--- Squads Table Schema Check ---');
    const { data, error } = await supabase
        .from('squads')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching squads:', error);
    } else {
        console.log('Squads columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Table is empty');
    }
}

checkSquadsSchema();
