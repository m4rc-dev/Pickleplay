import { supabase } from './supabase';
import { Location } from '../types';

/**
 * Uploads a location image to Supabase Storage ('locations' bucket)
 */
export const uploadCourtImage = async (file: File, userId: string) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `location-${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('locations')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('locations')
            .getPublicUrl(filePath);

        return { success: true, publicUrl };
    } catch (err: any) {
        console.error('Error uploading location image:', err);
        return { success: false, message: err.message };
    }
};

/**
 * Uploads a court image to Supabase Storage ('courts' bucket)
 */
export const uploadCourtPhoto = async (file: File, userId: string, courtId?: string) => {
    try {
        const fileExt = file.name.split('.').pop();
        const suffix = courtId ? courtId : Date.now().toString();
        const fileName = `court-${userId}-${suffix}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('courts')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('courts')
            .getPublicUrl(filePath);

        return { success: true, publicUrl };
    } catch (err: any) {
        console.error('Error uploading court photo:', err);
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
