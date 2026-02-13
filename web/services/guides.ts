// Guides Service - Fetches guide content and manages user progress
import { supabase } from './supabase';

// Types
export interface GuideSection {
    section: number;
    title: string;
    content: string;
    tip?: string;
    is_free: boolean;
}

export interface Guide {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    type: 'guide' | 'quiz' | 'video';
    thumbnail_url: string;
    video_url?: string;
    content: GuideSection[];
    preview_sections: number;
    estimated_read_time: number;
    difficulty_level: string;
    is_featured: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
}

export interface QuizQuestion {
    id: string;
    guide_id: string;
    question_number: number;
    question_text: string;
    question_type: string;
    options: {
        text: string;
        value: string;
        skill_points: number;
    }[];
    explanation?: string;
    image_url?: string;
}

export interface SkillLevel {
    id: string;
    level: string;
    name: string;
    description: string;
    min_score: number;
    max_score: number;
    color: string;
    recommendations: string[];
}

export interface UserGuideProgress {
    id: string;
    user_id: string;
    guide_id: string;
    current_section: number;
    is_completed: boolean;
    completion_percentage: number;
    last_accessed_at: string;
    completed_at?: string;
}

export interface UserQuizResult {
    id: string;
    user_id: string;
    guide_id: string;
    total_score: number;
    skill_level_id: string;
    skill_rating: string;
    answers: {
        question_id: string;
        selected_option: string;
        skill_points: number;
    }[];
    time_taken_seconds: number;
    is_completed: boolean;
    created_at: string;
}

// Fetch all published guides
export const getAllGuides = async (): Promise<{ success: boolean; data: Guide[]; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('guides')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        // Silently handle missing table errors (user hasn't run migration)
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching guides:', err);
        }
        return { success: false, data: [], message: err.message };
    }
};

// Fetch featured guides (for homepage)
export const getFeaturedGuides = async (): Promise<{ success: boolean; data: Guide[]; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('guides')
            .select('*')
            .eq('is_published', true)
            .eq('is_featured', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching featured guides:', err);
        }
        return { success: false, data: [], message: err.message };
    }
};

// Fetch a single guide by slug
export const getGuideBySlug = async (slug: string): Promise<{ success: boolean; data: Guide | null; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('guides')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error) throw error;

        // Increment view count
        if (data) {
            await supabase
                .from('guides')
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq('id', data.id);
        }

        return { success: true, data };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching guide:', err);
        }
        return { success: false, data: null, message: err.message };
    }
};

// Fetch quiz questions for a guide
export const getQuizQuestions = async (guideId: string): Promise<{ success: boolean; data: QuizQuestion[]; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('guide_id', guideId)
            .order('question_number', { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching quiz questions:', err);
        }
        return { success: false, data: [], message: err.message };
    }
};

// Fetch all skill levels
export const getSkillLevels = async (): Promise<{ success: boolean; data: SkillLevel[]; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('skill_levels')
            .select('*')
            .order('min_score', { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching skill levels:', err);
        }
        return { success: false, data: [], message: err.message };
    }
};

// Calculate skill level based on score
export const calculateSkillLevel = (score: number, skillLevels: SkillLevel[]): SkillLevel | null => {
    // Normalize score to 0-100 scale (max possible from quiz is ~685)
    const normalizedScore = Math.min(100, Math.round((score / 685) * 100));
    
    return skillLevels.find(level => 
        normalizedScore >= level.min_score && normalizedScore <= level.max_score
    ) || skillLevels[0] || null;
};

// Get user's progress on a guide
export const getUserGuideProgress = async (userId: string, guideId: string): Promise<{ success: boolean; data: UserGuideProgress | null; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('user_guide_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('guide_id', guideId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
        return { success: true, data: data || null };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching guide progress:', err);
        }
        return { success: false, data: null, message: err.message };
    }
};

// Update user's guide progress
export const updateGuideProgress = async (
    userId: string, 
    guideId: string, 
    currentSection: number, 
    totalSections: number
): Promise<{ success: boolean; message?: string }> => {
    try {
        const isCompleted = currentSection >= totalSections - 1;
        const completionPercentage = Math.round(((currentSection + 1) / totalSections) * 100);

        const { error } = await supabase
            .from('user_guide_progress')
            .upsert({
                user_id: userId,
                guide_id: guideId,
                current_section: currentSection,
                is_completed: isCompleted,
                completion_percentage: completionPercentage,
                last_accessed_at: new Date().toISOString(),
                completed_at: isCompleted ? new Date().toISOString() : null
            }, {
                onConflict: 'user_id,guide_id'
            });

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error updating guide progress:', err);
        }
        return { success: false, message: err.message };
    }
};

// Save quiz result
export const saveQuizResult = async (
    userId: string,
    guideId: string,
    totalScore: number,
    skillLevel: SkillLevel,
    answers: { question_id: string; selected_option: string; skill_points: number }[],
    timeTakenSeconds: number
): Promise<{ success: boolean; data?: UserQuizResult; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('user_quiz_results')
            .insert({
                user_id: userId,
                guide_id: guideId,
                total_score: totalScore,
                skill_level_id: skillLevel.id,
                skill_rating: skillLevel.level,
                answers,
                time_taken_seconds: timeTakenSeconds,
                is_completed: true
            })
            .select()
            .single();

        if (error) throw error;

        // Update user's profile with the skill rating
        await supabase
            .from('profiles')
            .update({
                skill_rating: skillLevel.level,
                skill_rating_updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        return { success: true, data };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error saving quiz result:', err);
        }
        return { success: false, message: err.message };
    }
};

// Get user's quiz results
export const getUserQuizResults = async (userId: string): Promise<{ success: boolean; data: UserQuizResult[]; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('user_quiz_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching quiz results:', err);
        }
        return { success: false, data: [], message: err.message };
    }
};

// Get latest quiz result for a user
export const getLatestQuizResult = async (userId: string, guideId: string): Promise<{ success: boolean; data: UserQuizResult | null; message?: string }> => {
    try {
        const { data, error } = await supabase
            .from('user_quiz_results')
            .select('*')
            .eq('user_id', userId)
            .eq('guide_id', guideId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, data: data || null };
    } catch (err: any) {
        // Silently handle missing table errors
        if (err?.code !== '42P01' && err?.message?.indexOf('does not exist') === -1) {
            console.error('Error fetching latest quiz result:', err);
        }
        return { success: false, data: null, message: err.message };
    }
};
