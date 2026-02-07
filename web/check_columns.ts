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

    // Check locations table
    const { data: locData, error: locError } = await supabase
        .from('locations')
        .select('*')
        .limit(1);

    if (locError) {
        console.error('Error fetching locations:', locError);
    } else {
        console.log('Locations record:', locData);
        if (locData && locData.length > 0) {
            console.log('Available locations columns:', Object.keys(locData[0]));
        } else {
            console.log('Locations table is empty, cannot determine columns via SELECT *');
        }
    }
}

checkSchema();
