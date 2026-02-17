import { supabase } from './supabase';

export interface LocationPolicy {
    id: string;
    location_id: string;
    owner_id: string;
    title: string;
    content: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

/** Fetch all policies for a specific location */
export const getLocationPolicies = async (locationId: string): Promise<{ data: LocationPolicy[] | null; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('location_policies')
            .select('*')
            .eq('location_id', locationId)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        console.error('Error fetching location policies:', err);
        return { data: null, error: err.message };
    }
};

/** Fetch all policies owned by a specific owner (for management page) */
export const getOwnerPolicies = async (ownerId: string, locationId?: string): Promise<{ data: LocationPolicy[] | null; error: string | null }> => {
    try {
        let query = supabase
            .from('location_policies')
            .select('*')
            .eq('owner_id', ownerId)
            .order('display_order', { ascending: true });

        if (locationId) {
            query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        console.error('Error fetching owner policies:', err);
        return { data: null, error: err.message };
    }
};

/** Create a new policy */
export const createPolicy = async (policy: {
    location_id: string;
    owner_id: string;
    title: string;
    content: string;
    display_order?: number;
}): Promise<{ data: LocationPolicy | null; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('location_policies')
            .insert({
                location_id: policy.location_id,
                owner_id: policy.owner_id,
                title: policy.title,
                content: policy.content,
                display_order: policy.display_order || 0,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        console.error('Error creating policy:', err);
        return { data: null, error: err.message };
    }
};

/** Update an existing policy */
export const updatePolicy = async (policyId: string, updates: {
    title?: string;
    content?: string;
    is_active?: boolean;
    display_order?: number;
}): Promise<{ data: LocationPolicy | null; error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('location_policies')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', policyId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        console.error('Error updating policy:', err);
        return { data: null, error: err.message };
    }
};

/** Delete a policy */
export const deletePolicy = async (policyId: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        const { error } = await supabase
            .from('location_policies')
            .delete()
            .eq('id', policyId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error deleting policy:', err);
        return { success: false, error: err.message };
    }
};
