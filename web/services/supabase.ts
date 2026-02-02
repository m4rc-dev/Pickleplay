import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Connectivity Test Utility
export const testSupabaseConnection = async () => {
    try {
        // Use a simpler query that avoids count-based 500s if table stats are missing
        const { data, status, error } = await supabase.from('profiles').select('id').limit(1);

        if (error) {
            console.error('Supabase Conn Error [Full]:', error);
            return { success: false, message: `${error.code}: ${error.message}` };
        }

        console.log('Supabase Connection: SUCCESS ✅ (Status:', status, ')');
        return { success: true, message: 'Connected to Supabase' };
    } catch (err: any) {
        console.error('Supabase Conn Fatal:', err.message);
        return { success: false, message: err.message };
    }
};
