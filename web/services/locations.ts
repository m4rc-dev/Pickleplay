import { supabase } from './supabase';
import { Location } from '../types';

/**
 * Uploads a court image to Supabase Storage
 */
export const uploadCourtImage = async (file: File, userId: string) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `court-${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('locations') // Keep the same bucket for now
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('locations')
            .getPublicUrl(filePath);

        return { success: true, publicUrl };
    } catch (err: any) {
        console.error('Error uploading court image:', err);
        return { success: false, message: err.message };
    }
};

/**
 * Creates a new location record in the database
 */
export const createLocation = async (locationData: Partial<Location>) => {
    try {
        const { data, error } = await supabase
            .from('locations')
            .insert([locationData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        console.error('Error creating location:', err);
        return { success: false, message: err.message };
    }
};
