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

// Security Functions
export const updatePassword = async (newPassword: string) => {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return { success: true, message: 'Password updated successfully' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

export const enableTwoFactorAuth = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('security_settings')
            .update({ two_factor_enabled: true, two_factor_method: 'authenticator' })
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, message: '2FA enabled successfully' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

export const disableTwoFactorAuth = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('security_settings')
            .update({ two_factor_enabled: false, two_factor_method: 'none' })
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, message: '2FA disabled successfully' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

export const getActiveSessions = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('last_activity', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        return { success: false, message: err.message, data: [] };
    }
};

export const revokeSession = async (sessionId: string) => {
    try {
        const { error } = await supabase
            .from('sessions')
            .update({ is_active: false })
            .eq('id', sessionId);

        if (error) throw error;
        return { success: true, message: 'Session revoked successfully' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

export const createSession = async (userId: string, deviceName: string, ipAddress?: string) => {
    try {
        const { data, error } = await supabase
            .from('sessions')
            .insert([{
                user_id: userId,
                device_name: deviceName,
                ip_address: ipAddress || 'unknown',
                user_agent: navigator.userAgent,
                is_active: true
            }])
            .select();

        if (error) throw error;
        return { success: true, data: data?.[0], message: 'Session created' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

export const getSecuritySettings = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('security_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        // If no security settings exist, create them
        if (!data) {
            const { data: newSettings, error: insertError } = await supabase
                .from('security_settings')
                .insert([{ user_id: userId }])
                .select()
                .single();

            if (insertError) throw insertError;
            return { success: true, data: newSettings };
        }

        return { success: true, data };
    } catch (err: any) {
        return { success: false, message: err.message, data: null };
    }
};

// Device detection helper
export const detectDevice = () => {
    const ua = navigator.userAgent;
    let deviceName = 'Unknown Device';
    
    if (/iPhone/.test(ua)) deviceName = 'iPhone';
    else if (/iPad/.test(ua)) deviceName = 'iPad';
    else if (/Android/.test(ua)) deviceName = 'Android Device';
    else if (/Windows/.test(ua)) deviceName = 'Windows PC';
    else if (/Mac/.test(ua)) deviceName = 'Mac';
    else if (/Linux/.test(ua)) deviceName = 'Linux PC';
    
    // Add browser info
    if (/Chrome/.test(ua) && !/Chromium/.test(ua)) deviceName += ' (Chrome)';
    else if (/Safari/.test(ua)) deviceName += ' (Safari)';
    else if (/Firefox/.test(ua)) deviceName += ' (Firefox)';
    else if (/Edge/.test(ua)) deviceName += ' (Edge)';
    
    return deviceName;
};

// Get user's public IP
export const getUserIpAddress = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'unknown';
    } catch {
        return 'unknown';
    }
};
