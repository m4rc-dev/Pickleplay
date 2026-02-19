import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  Trophy,
  Zap,
  Target,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { UserRole } from '../types';
import Toast, { ToastType } from './ui/Toast';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  target_count: number;
  reward_points: number;
  is_active: boolean;
}

interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  current_count: number;
  is_completed: boolean;
  completed_at: string | null;
  achievements: Achievement;
}

interface AchievementsProps {
  userRole?: UserRole;
  isSidebarCollapsed?: boolean;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  court_conqueror: <Calendar size={28} className="text-lime-400" />,
  default: <Trophy size={28} className="text-amber-400" />,
};

const Achievements: React.FC<AchievementsProps> = ({ userRole = 'PLAYER' }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'completed'>('all');

  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const themeColor = userRole === 'ADMIN' ? 'indigo' : 'blue';

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    await loadData(user.id);
  };

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [achievementsRes, progressRes] = await Promise.all([
        supabase.from('achievements').select('*').eq('is_active', true).order('created_at', { ascending: true }),
        supabase.from('player_achievements').select('*, achievements(*)').eq('player_id', userId),
      ]);

      if (achievementsRes.error) throw achievementsRes.error;
      if (progressRes.error) throw progressRes.error;

      setAchievements(achievementsRes.data || []);
      setPlayerAchievements(progressRes.data || []);
    } catch (err: any) {
      showToast('Error loading achievements: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`achievements-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_achievements', filter: `player_id=eq.${currentUserId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            const { data: full } = await supabase
              .from('player_achievements')
              .select('*, achievements(*)')
              .eq('id', row.id)
              .single();

            if (full) {
              setPlayerAchievements((prev) => {
                const exists = prev.find((p) => p.id === full.id);
                if (exists) {
                  return prev.map((p) => (p.id === full.id ? full : p));
                }
                return [...prev, full];
              });

              if (full.is_completed && payload.eventType === 'UPDATE') {
                showToast(`Achievement Unlocked: ${full.achievements?.name}!`, 'success');
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const getProgressForAchievement = (achievementId: string): PlayerAchievement | undefined => {
    return playerAchievements.find((pa) => pa.achievement_id === achievementId);
  };

  const completedAchievements = achievements.filter((a) => {
    const p = getProgressForAchievement(a.id);
    return p?.is_completed;
  });

  const displayAchievements = activeTab === 'completed'
    ? achievements.filter((a) => getProgressForAchievement(a.id)?.is_completed)
    : achievements;

  const totalPoints = playerAchievements
    .filter((pa) => pa.is_completed)
    .reduce((sum, pa) => sum + (pa.achievements?.reward_points || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className={`text-xs font-black text-${themeColor}-600 uppercase tracking-[0.4em] mb-4`}>
            MILESTONES / 2026
          </p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">
            ACHIEVE.
          </h1>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 px-8 py-4 bg-slate-950 rounded-2xl shadow-xl">
            <Sparkles size={20} className="text-amber-400" fill="currentColor" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points Earned</p>
              <p className="text-2xl font-black text-white tracking-tight">{totalPoints}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Trophy size={20} className="text-lime-500" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
              <p className="text-2xl font-black text-slate-950 tracking-tight">
                {completedAchievements.length}/{achievements.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + filter bar */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm sticky top-4 z-40">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'all'
                ? 'bg-slate-950 text-white shadow-xl'
                : 'text-slate-400 hover:text-slate-950'
            }`}
          >
            ALL ACHIEVEMENTS
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'completed'
                ? 'bg-slate-950 text-white shadow-xl'
                : 'text-slate-400 hover:text-slate-950'
            }`}
          >
            COMPLETED
          </button>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
          <TrendingUp size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-500">
            {completedAchievements.length} of {achievements.length} unlocked
          </span>
        </div>
      </div>

      {/* Achievement Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[48px] border border-slate-200 p-8 animate-pulse">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mb-6" />
              <div className="h-6 bg-slate-100 rounded-lg w-3/4 mb-3" />
              <div className="h-4 bg-slate-100 rounded-lg w-full mb-6" />
              <div className="h-3 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayAchievements.length > 0 ? (
            displayAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                progress={getProgressForAchievement(achievement.id)}
                themeColor={themeColor}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center space-y-6">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Trophy size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-950">
                  {activeTab === 'completed' ? 'NO ACHIEVEMENTS YET.' : 'NO ACHIEVEMENTS AVAILABLE.'}
                </h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto">
                  {activeTab === 'completed'
                    ? 'Start booking courts and playing matches to earn your first badge!'
                    : 'Check back later for new challenges.'}
                </p>
              </div>
              {activeTab === 'completed' && (
                <button
                  onClick={() => setActiveTab('all')}
                  className={`text-${themeColor}-600 font-black text-xs uppercase tracking-widest hover:underline`}
                >
                  VIEW ALL ACHIEVEMENTS
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface AchievementCardProps {
  achievement: Achievement;
  progress?: PlayerAchievement;
  themeColor: string;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, progress, themeColor }) => {
  const currentCount = progress?.current_count || 0;
  const targetCount = achievement.target_count;
  const isCompleted = progress?.is_completed || false;
  const percentage = Math.min((currentCount / targetCount) * 100, 100);
  const icon = ACHIEVEMENT_ICONS[achievement.key] || ACHIEVEMENT_ICONS.default;

  return (
    <div
      className={`group relative bg-white rounded-[48px] border overflow-hidden shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 duration-500 ${
        isCompleted ? 'border-lime-200 ring-2 ring-lime-400/20' : 'border-slate-200'
      }`}
    >
      {/* Top banner */}
      <div
        className={`relative h-40 overflow-hidden ${
          isCompleted
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
            : 'bg-gradient-to-br from-slate-100 via-slate-50 to-white'
        }`}
      >
        {isCompleted && (
          <div className="absolute inset-0">
            <div className="absolute top-4 left-8 w-32 h-32 bg-lime-400/10 blur-[50px] rounded-full" />
            <div className="absolute bottom-2 right-8 w-24 h-24 bg-amber-400/10 blur-[40px] rounded-full" />
          </div>
        )}

        <div className="absolute top-6 left-6 flex gap-2">
          {isCompleted ? (
            <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl">
              <CheckCircle2 size={14} /> COMPLETED
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Lock size={10} /> IN PROGRESS
            </span>
          )}
        </div>

        {/* Reward badge */}
        <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 rounded-xl border border-amber-400/30">
          <Sparkles size={12} className={isCompleted ? 'text-amber-300' : 'text-amber-500'} fill="currentColor" />
          <span className={`text-[10px] font-black ${isCompleted ? 'text-amber-300' : 'text-amber-600'}`}>
            +{achievement.reward_points} PTS
          </span>
        </div>

        {/* Achievement icon */}
        <div className="absolute bottom-6 left-6">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
              isCompleted ? 'bg-lime-400 text-slate-950' : 'bg-white text-slate-400 border border-slate-200'
            }`}
          >
            {icon}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        <div>
          <h3 className="text-2xl font-black text-slate-950 tracking-tighter leading-tight uppercase">
            {achievement.name}
          </h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mt-2">
            {achievement.description}
          </p>
        </div>

        {/* Progress section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
            <span className="text-sm font-black text-slate-950">
              {currentCount} / {targetCount}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isCompleted ? 'bg-lime-400' : 'bg-blue-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 text-right">
            {percentage.toFixed(0)}% complete
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
            <div className="flex items-center gap-2">
              <Target size={14} className={`text-${themeColor === 'indigo' ? 'indigo-600' : 'blue-500'}`} />
              <span className="font-black text-slate-950 text-sm tracking-tight capitalize">{achievement.category}</span>
            </div>
          </div>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reward</p>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-500 fill-amber-500" />
              <span className="font-black text-slate-950 text-sm tracking-tight">{achievement.reward_points} pts</span>
            </div>
          </div>
        </div>

        {/* Completed date or CTA */}
        {isCompleted && progress?.completed_at ? (
          <div className="w-full h-16 rounded-2xl bg-slate-950 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3">
            <CheckCircle2 size={18} className="text-lime-400" />
            UNLOCKED {new Date(progress.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
        ) : (
          <div className="w-full h-16 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3">
            <Lock size={18} />
            {targetCount - currentCount} MORE TO GO
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
