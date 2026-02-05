import { supabase } from './services/supabase';

async function checkSchema() {
    console.log('--- Database Schema Check ---');

    // Try to fetch one row to see columns
    const { data, error } = await supabase
        .from('courts')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching courts:', error);
    } else {
        console.log('Courts record:', data);
        if (data && data.length > 0) {
            console.log('Available columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot determine columns via SELECT *');
        }
    }

    // Try to insert a dummy row to a non-existent column to see error (diagnostic)
    // This is a bit hacky but if we don't have results, it's a way.
}

checkSchema();
