import { testSupabaseConnection } from './supabase';

export const backend = {
    /**
     * Performs a health check on the connection to Supabase.
     * This serves as the "Backend" heartbeat.
     */
    checkConnection: async () => {
        return await testSupabaseConnection();
    },

    // Add more backend-like wrappers here if needed
};
