import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Award, Star, Sparkles, Target, Clock, Users, Shield,
  Flame, Zap, Medal, Download, Share2, CheckCircle2, AlertCircle,
  TrendingUp, Crown
} from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  getPlayerStats, getAllAchievements, getPlayerAchievements,
  getPlayerCertificates, checkAndAwardAchievements
} from '../services/rewards';
import { Achievement, PlayerAchievement, Certificate, PlayerStats } from '../types';
import { Skeleton } from './ui/Skeleton';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  milestone: <Trophy size={18} />,
  skill: <Target size={18} />,
  social: <Users size={18} />,
  attendance: <Clock size={18} />,
  special: <Crown size={18} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  milestone: 'blue',
  skill: 'purple',
  social: 'lime',
  attendance: 'amber',
  special: 'rose',
};

const Achievements: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'achievements' | 'certificates'>('achievements');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/login'); return; }
      const userId = session.user.id;

      await checkAndAwardAchievements(userId);

      const [statsRes, achieveRes, playerAchieveRes, certsRes] = await Promise.all([
        getPlayerStats(userId),
        getAllAchievements(),
        getPlayerAchievements(userId),
        getPlayerCertificates(userId),
      ]);

      setStats(statsRes.data);
      setAchievements(achieveRes.data || []);
      setPlayerAchievements(playerAchieveRes.data || []);
      setCertificates(certsRes.data || []);
    } catch (err) {
      console.error('Error loading achievements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAchievementProgress = (achievement: Achievement) => {
    const pa = playerAchievements.find(p => p.achievement_id === achievement.id);
    return pa || { progress: 0, is_completed: false, earned_at: null };
  };

  const completedCount = playerAchievements.filter(p => p.is_completed).length;
  const totalPoints = stats?.total_points || 0;

  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Gamification</p>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
            Achievements
          </h1>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button onClick={() => navigate('/dashboard')} className="whitespace-nowrap bg-white border border-slate-200 text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl transition-all flex items-center gap-2 hover:text-slate-950 hover:border-slate-300 shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-32 h-10" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
              <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-amber-50 text-amber-600"><span>Total</span></div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 mb-4 group-hover:scale-105 transition-transform"><Sparkles className="text-amber-600" size={24} /></div>
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Points</h3>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
              <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-blue-600"><span>{completedCount}/{achievements.length}</span></div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 mb-4 group-hover:scale-105 transition-transform"><Trophy className="text-blue-600" size={24} /></div>
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Achievements</h3>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{completedCount}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
              <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-purple-50 text-purple-600"><span>Issued</span></div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50 mb-4 group-hover:scale-105 transition-transform"><Medal className="text-purple-600" size={24} /></div>
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Certificates</h3>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{certificates.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm w-fit">
        {(['achievements', 'certificates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab === 'achievements' ? 'Achievements' : 'Certificates'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2"><Skeleton className="w-32 h-5" /><Skeleton className="w-48 h-4" /><Skeleton className="w-full h-3 mt-2 rounded-full" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {achievements.map(a => {
                const progress = getAchievementProgress(a);
                const color = CATEGORY_COLORS[a.category] || 'blue';
                return (
                  <div key={a.id} className={`bg-white p-6 rounded-3xl border-2 shadow-sm transition-all hover:shadow-md ${progress.is_completed ? 'border-lime-200 bg-lime-50/30' : 'border-slate-100'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        progress.is_completed ? 'bg-lime-100 text-lime-700' : `bg-${color}-50 text-${color}-600`
                      }`}>
                        {progress.is_completed ? <CheckCircle2 size={28} /> : CATEGORY_ICONS[a.category] || <Trophy size={28} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">{a.name}</h3>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                            progress.is_completed ? 'bg-lime-100 text-lime-700' : `bg-${color}-50 text-${color}-600`
                          }`}>
                            {progress.is_completed ? 'Earned' : `+${a.points_reward} pts`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-3">{a.description}</p>
                        {/* Progress bar */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${progress.is_completed ? 'bg-lime-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(progress.progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1.5">{Math.round(progress.progress)}% Complete</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {achievements.length === 0 && (
                <div className="col-span-2 bg-white p-16 rounded-3xl border border-slate-200/60 shadow-sm text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trophy className="text-slate-400" size={40} /></div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Achievements Yet</h3>
                  <p className="text-slate-500 font-medium">Achievements will appear here once set up by admin.</p>
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificates.length > 0 ? certificates.map(c => (
                <div key={c.id} className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                  {/* Certificate visual */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-8 border-b border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 text-center">
                      <Medal size={48} className="text-blue-600 mx-auto mb-3" />
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{c.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">{c.description}</p>
                    </div>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.certificate_number}</p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {c.issued_at ? new Date(c.issued_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
                        <Share2 size={16} />
                      </button>
                      <button className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 bg-white p-16 rounded-3xl border border-slate-200/60 shadow-sm text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><Medal className="text-slate-400" size={40} /></div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Certificates Yet</h3>
                  <p className="text-slate-500 font-medium">Complete achievements to earn your first certificate!</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bottom CTA */}
      {!isLoading && (
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-8 rounded-3xl shadow-2xl shadow-blue-100 relative overflow-hidden group animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight uppercase">Keep Playing!</h3>
              <p className="text-blue-50 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                Every match gets you closer to unlocking new achievements. Book a court and start earning!
              </p>
            </div>
            <button
              onClick={() => navigate('/booking')}
              className="shrink-0 bg-white text-blue-600 font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-3 group/button"
            >
              <Zap size={18} className="group-hover/button:rotate-12 transition-transform" />
              Book a Court
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;
