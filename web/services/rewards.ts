import { supabase } from './supabase';
import { Achievement, PlayerAchievement, Certificate, PlayerStats } from '../types';

// ==================== Player Stats ====================
export const getPlayerStats = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: newStats, error: createError } = await supabase
        .from('player_stats')
        .insert({ user_id: userId })
        .select()
        .single();
      if (createError) throw createError;
      return { data: newStats, error: null };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

// ==================== Achievements ====================
export const getAllAchievements = async () => {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('requirement_value', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};

export const getPlayerAchievements = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('player_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};

export const checkAndAwardAchievements = async (userId: string) => {
  try {
    const { data: stats } = await getPlayerStats(userId);
    if (!stats) return;

    const { data: achievements } = await getAllAchievements();
    if (!achievements || achievements.length === 0) return;

    for (const achievement of achievements) {
      const { data: existing } = await supabase
        .from('player_achievements')
        .select('id, is_completed')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .maybeSingle();

      if (existing?.is_completed) continue;

      let currentValue = 0;
      switch (achievement.requirement_type) {
        case 'matches_played': currentValue = stats.matches_completed; break;
        case 'hours_played': currentValue = stats.total_hours_played; break;
        case 'attendance_rate': currentValue = stats.attendance_rate; break;
        case 'streak': currentValue = stats.current_streak; break;
        case 'opponents': currentValue = stats.unique_opponents; break;
        case 'tournaments': currentValue = stats.tournaments_played; break;
      }

      const progress = Math.min((currentValue / achievement.requirement_value) * 100, 100);
      const isCompleted = currentValue >= achievement.requirement_value;

      if (existing) {
        await supabase
          .from('player_achievements')
          .update({ progress, is_completed: isCompleted, ...(isCompleted ? { earned_at: new Date().toISOString() } : {}) })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('player_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            progress,
            is_completed: isCompleted
          });
      }

      if (isCompleted && !existing?.is_completed) {
        await supabase.from('player_stats')
          .update({ total_points: stats.total_points + achievement.points_reward })
          .eq('user_id', userId);

        await supabase.from('certificates').insert({
          user_id: userId,
          certificate_type: 'achievement',
          title: achievement.name,
          description: achievement.description,
          certificate_data: { achievement_id: achievement.id, badge_color: achievement.badge_color },
          is_public: true
        });
      }
    }
  } catch (err) {
    console.error('Error checking achievements:', err);
  }
};

// ==================== Certificates ====================
export const getPlayerCertificates = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};
