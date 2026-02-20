import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../services/supabase';
import {
  Trophy,
  Zap,
  Target,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  Calendar,
  Award,
  Download,
  X,
  ArrowRight,
  Search
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

interface Certificate {
  id: string;
  player_id: string;
  achievement_id: string;
  player_achievement_id: string;
  certificate_number: string;
  player_name: string;
  achievement_name: string;
  achievement_description: string;
  claimed_at: string;
}

interface AchievementsProps {
  userRole?: UserRole;
  isSidebarCollapsed?: boolean;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  welcome_player: <Sparkles size={28} className="text-sky-400" />,
  court_conqueror: <Calendar size={28} className="text-lime-400" />,
  default: <Trophy size={28} className="text-amber-400" />,
};

const Achievements: React.FC<AchievementsProps> = ({ userRole = 'PLAYER', isSidebarCollapsed = false }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'certificates'>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      const [achievementsRes, progressRes, certsRes] = await Promise.all([
        supabase.from('achievements').select('*').eq('is_active', true).order('created_at', { ascending: true }),
        supabase.from('player_achievements').select('*, achievements(*)').eq('player_id', userId),
        supabase.from('certificates').select('*').eq('player_id', userId).order('claimed_at', { ascending: false }),
      ]);

      if (achievementsRes.error) throw achievementsRes.error;
      if (progressRes.error) throw progressRes.error;
      if (certsRes.error) throw certsRes.error;

      setAchievements(achievementsRes.data || []);
      setPlayerAchievements(progressRes.data || []);
      setCertificates(certsRes.data || []);
    } catch (err: any) {
      showToast('Error loading achievements: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Realtime: player_achievements
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

  // Realtime: certificates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`certificates-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'certificates', filter: `player_id=eq.${currentUserId}` },
        (payload) => {
          const newCert = payload.new as Certificate;
          setCertificates((prev) => {
            if (prev.some((c) => c.id === newCert.id)) return prev;
            return [newCert, ...prev];
          });
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

  const getCertificateForAchievement = (achievementId: string): Certificate | undefined => {
    return certificates.find((c) => c.achievement_id === achievementId);
  };

  const claimCertificate = async (achievement: Achievement, progress: PlayerAchievement) => {
    if (!currentUserId) return;
    setClaimingId(achievement.id);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();

      const certNumber = `PP-${achievement.key.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('certificates')
        .insert({
          player_id: currentUserId,
          achievement_id: achievement.id,
          player_achievement_id: progress.id,
          certificate_number: certNumber,
          player_name: profile?.full_name || 'PicklePlay Player',
          achievement_name: achievement.name,
          achievement_description: achievement.description,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showToast('Certificate already claimed!', 'info');
        } else {
          throw error;
        }
      } else if (data) {
        setCertificates((prev) => [data, ...prev]);
        showToast('Certificate claimed! View it in the Certificates tab.', 'success');
      }
    } catch (err: any) {
      showToast('Error claiming certificate: ' + err.message, 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const completedAchievements = achievements.filter((a) => {
    const p = getProgressForAchievement(a.id);
    return p?.is_completed;
  });

  const filteredAchievements = achievements
    .filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aProgress = getProgressForAchievement(a.id);
      const bProgress = getProgressForAchievement(b.id);
      const aCompleted = aProgress?.is_completed || false;
      const bCompleted = bProgress?.is_completed || false;
      
      // Uncompleted first (false < true), then by created_at
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      return 0;
    });

  const filteredCertificates = certificates.filter((c) =>
    c.achievement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.achievement_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.certificate_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayAchievements = activeTab === 'certificates' ? [] : filteredAchievements;

  const totalPoints = playerAchievements
    .filter((pa) => pa.is_completed)
    .reduce((sum, pa) => sum + (pa.achievements?.reward_points || 0), 0);

  const completionPercentage = achievements.length > 0
    ? Math.round((completedAchievements.length / achievements.length) * 100)
    : 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      {/* Typographic Header - Same style as Tournaments */}
      <div className="mb-12">
        <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">
          PICKLEPLAY / ACHIEVEMENT SYSTEM
        </p>
        <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[1] uppercase mb-6">
          UNLOCK. ACHIEVE. <br />
          <span className="text-blue-600">CONQUER.</span>
        </h1>
        <p className="text-slate-500 text-base md:text-lg font-medium max-w-xl leading-relaxed">
          Track your progress, earn rewards, and claim certificates as you dominate the courts. Every booking brings you closer to greatness.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Points</span>
          </div>
          <p className="text-3xl font-black tracking-tight">{totalPoints}</p>
          <p className="text-xs font-bold text-blue-100 mt-1">Earned from {completedAchievements.length} achievements</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center">
              <Trophy size={18} className="text-lime-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-slate-950">
            {completedAchievements.length}<span className="text-lg text-slate-400">/{achievements.length}</span>
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full transition-all duration-1000"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-6 text-slate-950 shadow-lg shadow-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Award size={18} className="text-slate-950" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Certificates</span>
          </div>
          <p className="text-3xl font-black tracking-tight">{certificates.length}</p>
          <p className="text-xs font-bold text-amber-900 mt-1">Ready to claim {completedAchievements.length - certificates.length}</p>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Trophy size={14} />
            All Achievements
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'certificates'
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Award size={14} />
            Certificates
            {certificates.length > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                activeTab === 'certificates' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                {certificates.length}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={activeTab === 'all' ? 'Search achievements...' : 'Search certificates...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-16 pr-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
          />
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'all' ? (
        /* Achievement Cards Grid */
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 h-[480px] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayAchievements.length > 0 ? (
              displayAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={getProgressForAchievement(achievement.id)}
                  certificate={getCertificateForAchievement(achievement.id)}
                  themeColor={themeColor}
                  onClaimCertificate={claimCertificate}
                  isClaiming={claimingId === achievement.id}
                />
              ))
            ) : (
              <div className="col-span-full py-32 text-center">
                <Trophy className="w-24 h-24 text-slate-200 mx-auto mb-8" />
                <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">
                  {searchQuery ? 'No achievements found' : 'No achievements available'}
                </h3>
                <p className="text-slate-400 font-medium">
                  {searchQuery ? 'Try adjusting your search query.' : 'Check back later for new challenges.'}
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        /* Certificates Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.length > 0 ? (
            filteredCertificates.map((cert) => (
              <CertificateCard
                key={cert.id}
                certificate={cert}
                onView={() => setViewingCertificate(cert)}
              />
            ))
          ) : certificates.length > 0 ? (
            <div className="col-span-full py-32 text-center">
              <Award className="w-24 h-24 text-slate-200 mx-auto mb-8" />
              <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No certificates found</h3>
              <p className="text-slate-400 font-medium">Try adjusting your search query.</p>
            </div>
          ) : (
            <div className="col-span-full py-32 text-center">
              <Award className="w-24 h-24 text-slate-200 mx-auto mb-8" />
              <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No certificates yet</h3>
              <p className="text-slate-400 font-medium mb-8">
                Complete achievements and claim your certificates to see them here.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
              >
                View All Achievements
              </button>
            </div>
          )}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {viewingCertificate && ReactDOM.createPortal(
        <CertificateViewer
          certificate={viewingCertificate}
          onClose={() => setViewingCertificate(null)}
          isSidebarCollapsed={isSidebarCollapsed}
        />,
        document.body
      )}
    </div>
  );
};

// ─── Achievement Card ───

interface AchievementCardProps {
  achievement: Achievement;
  progress?: PlayerAchievement;
  certificate?: Certificate;
  themeColor: string;
  onClaimCertificate: (achievement: Achievement, progress: PlayerAchievement) => void;
  isClaiming: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement, progress, certificate, themeColor, onClaimCertificate, isClaiming,
}) => {
  const currentCount = progress?.current_count || 0;
  const targetCount = achievement.target_count;
  const isCompleted = progress?.is_completed || false;
  const hasCertificate = !!certificate;
  const percentage = Math.min((currentCount / targetCount) * 100, 100);
  const icon = ACHIEVEMENT_ICONS[achievement.key] || ACHIEVEMENT_ICONS.default;

  return (
    <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col">
      {/* Top banner */}
      <div
        className={`relative h-44 overflow-hidden ${
          isCompleted
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
            : 'bg-gradient-to-br from-slate-50 via-white to-slate-50'
        }`}
      >
        {isCompleted && (
          <div className="absolute inset-0">
            <div className="absolute top-4 left-8 w-32 h-32 bg-lime-400/10 blur-[50px] rounded-full" />
            <div className="absolute bottom-2 right-8 w-24 h-24 bg-amber-400/10 blur-[40px] rounded-full" />
          </div>
        )}

        <div className="absolute top-6 left-6 flex gap-2">
          {hasCertificate ? (
            <span className="bg-amber-400 text-slate-950 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <Award size={12} /> CERTIFIED
            </span>
          ) : isCompleted ? (
            <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <CheckCircle2 size={12} /> COMPLETED
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Lock size={10} /> IN PROGRESS
            </span>
          )}
        </div>

        {/* Reward badge */}
        <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 rounded-xl border border-amber-400/30 backdrop-blur-sm">
          <Sparkles size={12} className={isCompleted ? 'text-amber-300' : 'text-amber-500'} fill="currentColor" />
          <span className={`text-[10px] font-black ${isCompleted ? 'text-amber-300' : 'text-amber-600'}`}>
            +{achievement.reward_points} PTS
          </span>
        </div>

        {/* Achievement icon */}
        <div className="absolute bottom-6 left-6">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 ${
              isCompleted ? 'bg-lime-400 text-slate-950' : 'bg-white text-slate-400 border-2 border-slate-200'
            }`}
          >
            {icon}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-6">
          <h3 className="text-xl font-black text-slate-950 tracking-tight leading-tight uppercase mb-2">
            {achievement.name}
          </h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            {achievement.description}
          </p>
        </div>

        {/* Progress section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
            <span className="text-sm font-black text-slate-950">
              {currentCount} / {targetCount}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isCompleted ? 'bg-gradient-to-r from-lime-400 to-lime-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 text-right">
            {percentage.toFixed(0)}% complete
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
            <div className="flex items-center gap-2">
              <Target size={12} className="text-blue-500" />
              <span className="font-black text-slate-950 text-xs tracking-tight capitalize">{achievement.category}</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reward</p>
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-amber-500 fill-amber-500" />
              <span className="font-black text-slate-950 text-xs tracking-tight">{achievement.reward_points} pts</span>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-auto">
          {isCompleted && progress ? (
            hasCertificate ? (
              <div className="w-full h-14 rounded-2xl bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                <Award size={16} className="text-amber-400" />
                CERTIFICATE CLAIMED
              </div>
            ) : (
              <button
                onClick={() => onClaimCertificate(achievement, progress)}
                disabled={isClaiming}
                className="w-full h-14 rounded-2xl bg-lime-400 text-slate-950 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-lime-500 transition-all shadow-lg shadow-lime-200 active:scale-95 disabled:opacity-60"
              >
                {isClaiming ? (
                  <>CLAIMING... <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /></>
                ) : (
                  <><Award size={16} /> CLAIM CERTIFICATE <ArrowRight size={14} /></>
                )}
              </button>
            )
          ) : (
            <div className="w-full h-14 rounded-2xl bg-slate-100 text-slate-400 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
              <Lock size={16} />
              {targetCount - currentCount} MORE TO GO
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Certificate Card (Certificates Tab) ───

interface CertificateCardProps {
  certificate: Certificate;
  onView: () => void;
}

const CertificateCard: React.FC<CertificateCardProps> = ({ certificate, onView }) => {
  return (
    <div className="group bg-white rounded-3xl border border-amber-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col">
      {/* Certificate header */}
      <div className="relative h-52 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-4 left-8 w-40 h-40 bg-amber-400/10 blur-[60px] rounded-full" />
          <div className="absolute bottom-2 right-8 w-32 h-32 bg-lime-400/8 blur-[50px] rounded-full" />
        </div>

        {/* Decorative border pattern */}
        <div className="absolute inset-4 border-2 border-dashed border-white/10 rounded-2xl" />

        <div className="absolute top-6 left-6">
          <span className="bg-amber-400 text-slate-950 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
            <Award size={12} /> CERTIFICATE
          </span>
        </div>

        <div className="absolute top-6 right-6 text-right">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Certificate No.</p>
          <p className="text-[10px] font-black text-amber-400 tracking-wider mt-0.5">{certificate.certificate_number}</p>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Awarded To</p>
          <p className="text-xl font-black text-white tracking-tight truncate">{certificate.player_name}</p>
        </div>
      </div>

      {/* Certificate body */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Achievement</p>
          <h3 className="text-xl font-black text-slate-950 tracking-tight leading-tight uppercase mb-2">
            {certificate.achievement_name}
          </h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            {certificate.achievement_description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issued</p>
            <p className="font-black text-slate-950 text-xs tracking-tight">
              {new Date(certificate.claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-lime-500" />
              <span className="font-black text-slate-950 text-xs tracking-tight">Verified</span>
            </div>
          </div>
        </div>

        <button
          onClick={onView}
          className="w-full h-14 rounded-2xl bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 active:scale-95 mt-auto"
        >
          <Award size={16} className="text-amber-400" />
          VIEW CERTIFICATE
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Certificate Viewer Modal ───

interface CertificateViewerProps {
  certificate: Certificate;
  onClose: () => void;
  isSidebarCollapsed: boolean;
}

const CertificateViewer: React.FC<CertificateViewerProps> = ({ certificate, onClose, isSidebarCollapsed }) => {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      // @ts-ignore - html2canvas is an optional runtime dependency
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `PicklePlay-Certificate-${certificate.certificate_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      const printWindow = window.open('', '_blank');
      if (printWindow && certRef.current) {
        printWindow.document.write(`
          <html><head><title>Certificate - ${certificate.certificate_number}</title>
          <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8f8f8;font-family:system-ui,-apple-system,sans-serif;}</style>
          </head><body>${certRef.current.outerHTML}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 bottom-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500 z-10"
        >
          <X size={18} />
        </button>

        {/* Certificate Preview */}
        <div className="p-8">
          <div
            ref={certRef}
            className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[32px] p-10 overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-64 h-64 bg-amber-400/5 blur-[80px] rounded-full" />
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-lime-400/5 blur-[60px] rounded-full" />
            </div>
            <div className="absolute inset-6 border-2 border-dashed border-white/10 rounded-[24px]" />

            <div className="relative text-center space-y-6 py-6">
              {/* Logo area */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-xl">
                  <Trophy size={24} className="text-slate-900" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black text-amber-400 uppercase tracking-[0.5em]">PicklePlay Philippines</p>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mt-2">
                  Certificate of Achievement
                </h2>
              </div>

              <div className="w-24 h-0.5 bg-amber-400/40 mx-auto rounded-full" />

              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">This Certifies That</p>
                <p className="text-2xl md:text-3xl font-black text-white mt-2 tracking-tight">
                  {certificate.player_name}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Has Successfully Completed</p>
                <p className="text-xl font-black text-lime-400 mt-2 uppercase tracking-wider">
                  {certificate.achievement_name}
                </p>
                <p className="text-sm text-white/60 font-medium mt-1 max-w-md mx-auto">
                  {certificate.achievement_description}
                </p>
              </div>

              <div className="w-24 h-0.5 bg-amber-400/40 mx-auto rounded-full" />

              <div className="flex items-center justify-between px-8">
                <div className="text-left">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Date Issued</p>
                  <p className="text-sm font-black text-white/80 mt-1">
                    {new Date(certificate.claimed_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Certificate No.</p>
                  <p className="text-sm font-black text-amber-400 mt-1">{certificate.certificate_number}</p>
                </div>
              </div>

              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest pt-4">
                pickleplay.ph &bull; Verified Digital Certificate
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex gap-4">
          <button
            onClick={handleDownload}
            className="flex-1 h-16 rounded-2xl bg-lime-400 text-slate-950 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-lime-500 transition-all shadow-xl shadow-lime-100 active:scale-95"
          >
            <Download size={18} /> DOWNLOAD PNG
          </button>
          <button
            onClick={onClose}
            className="px-8 h-16 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
