

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../services/supabase';
import {
  TrendingUp,
  Target,
  ArrowRight,
  PlusCircle,
  Activity,
  Trophy,
  DollarSign,
  GraduationCap,
  History,
  Award,
  BookOpen,
  UserCheck,
  Bell,
  Shield,
  Users,
  BarChart4,
  Check,
  X,
  Megaphone,
  HelpCircle,
  Building2,
  Key,
  Star,
  Radio
} from 'lucide-react';
// Fix: Import UserRole from the centralized types.ts file.
import { UserRole, ProfessionalApplication } from '../types';
import { Skeleton } from './ui/Skeleton';

const PERFORMANCE_DATA = [
  { name: 'Jan', rating: 3.8 },
  { name: 'Feb', rating: 3.9 },
  { name: 'Mar', rating: 4.1 },
  { name: 'Apr', rating: 4.0 },
  { name: 'May', rating: 4.2 },
  { name: 'Jun', rating: 4.35 },
];

interface DashboardProps {
  userRole: UserRole;
  onSubmitApplication?: (app: Omit<ProfessionalApplication, 'id' | 'status' | 'submissionDate'>) => void;
  setRole: (role: UserRole) => void;
  applications?: ProfessionalApplication[];
  isSidebarCollapsed?: boolean;
  userName?: string | null;
  authorizedProRoles?: UserRole[];
  currentUserId?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, onSubmitApplication, setRole, applications = [], isSidebarCollapsed = false, userName, authorizedProRoles = [], currentUserId }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeSessions, setActiveSessions] = useState<number | null>(null);
  const [playerStats, setPlayerStats] = useState<any>(null); // For PLAYER role

  // Coach specific metrics
  const [coachStats, setCoachStats] = useState({
    studentsCount: 0,
    clinicCompletion: 0,
    lessonRequests: 0,
    totalRevenue: 0
  });

  const [courtOwnerStats, setCourtOwnerStats] = useState({
    bookingRevenue: 0,
    courtUtilization: 0,
    playerRetention: 0
  });

  const [ratingHistory, setRatingHistory] = useState<any[]>([]);
  const [showLogDuprModal, setShowLogDuprModal] = useState(false);
  const [newDuprRating, setNewDuprRating] = useState('');
  const [isLoggingDupr, setIsLoggingDupr] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [accessCodeValue, setAccessCodeValue] = useState<string>('');
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedLessonForReview, setSelectedLessonForReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);

    // Fetch Announcements (For Everyone)
    supabase.from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setAnnouncements(data);
      });

    if (userRole === 'PLAYER' && currentUserId) {
      fetchPlayerLessons();
    }

    const fetchCourtOwnerMetrics = async () => {
      if (!currentUserId) return;
      try {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('total_price, player_id, court_id')
          .eq('status', 'confirmed');

        const { data: myCourts } = await supabase
          .from('courts')
          .select('id, num_courts')
          .eq('owner_id', currentUserId);

        const myCourtIds = myCourts?.map(c => c.id) || [];
        const myBookings = bookingsData?.filter(b => myCourtIds.includes(b.court_id)) || [];

        const revenue = myBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
        const totalCourts = myCourts?.reduce((sum, c) => sum + (c.num_courts || 1), 0) || 0;
        const totalAvailableSlots = totalCourts * 10;
        const utilization = totalAvailableSlots > 0 ? Math.round((myBookings.length / totalAvailableSlots) * 100) : 0;

        const playerBookingCounts: Record<string, number> = {};
        myBookings.forEach(b => {
          if (b.player_id) {
            playerBookingCounts[b.player_id] = (playerBookingCounts[b.player_id] || 0) + 1;
          }
        });

        const uniquePlayers = Object.keys(playerBookingCounts).length;
        const repeatPlayers = Object.values(playerBookingCounts).filter(count => count > 1).length;
        const retention = uniquePlayers > 0 ? Math.round((repeatPlayers / uniquePlayers) * 100) : 0;

        setCourtOwnerStats({
          bookingRevenue: revenue,
          courtUtilization: utilization,
          playerRetention: retention
        });
      } catch (err) {
        console.error('Error fetching court owner metrics:', err);
      }
    };

    const fetchRatingHistory = async () => {
      if (!currentUserId) return;
      try {
        const { data } = await supabase
          .from('dupr_logs')
          .select('*')
          .eq('player_id', currentUserId)
          .order('recorded_at', { ascending: true });

        if (data && data.length > 0) {
          const mappedHistory = data.map(log => ({
            name: new Date(log.recorded_at).toLocaleDateString([], { month: 'short' }),
            rating: Number(log.rating)
          }));
          setRatingHistory(mappedHistory);
        } else {
          // Default data if no logs
          setRatingHistory([
            { name: 'Start', rating: 3.5 },
          ]);
        }
      } catch (err) {
        console.error('Error fetching rating history:', err);
      }
    };

    if (userRole === 'ADMIN') {
      // 1. Total Users
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .then(({ count }) => {
          if (count !== null) setTotalUsers(count);
        });

      // 2. Active Sessions (Last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', oneDayAgo)
        .then(({ count }) => {
          if (count !== null) setActiveSessions(count);
        });

      // 3. Fetch Court Metrics for Admin's own courts
      fetchCourtOwnerMetrics();
    } else if (userRole === 'PLAYER') {
      // Fetch Player Stats
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('profiles')
            .select('dupr_rating, win_rate, matches_played')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
              if (data) setPlayerStats(data);
            });
        }
      });

      fetchRatingHistory();
    } else if (userRole === 'COACH' && currentUserId) {
      // Fetch Coach Metrics
      const fetchCoachMetrics = async () => {
        try {
          // 1. Total Students (Unique student_ids from lessons)
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('student_id, price, status')
            .eq('coach_id', currentUserId);

          const uniqueStudents = new Set(lessonsData?.map(l => l.student_id).filter(Boolean)).size;

          // Calculate Lesson Revenue
          const completedLessons = lessonsData?.filter(l => l.status === 'completed') || [];
          const lessonRevenue = completedLessons.reduce((sum, l) => sum + Number(l.price || 0), 0);

          // 2. Clinic Completion & Revenue
          const { data: clinicsData } = await supabase
            .from('clinics')
            .select('id, status, price, participants')
            .eq('coach_id', currentUserId);

          const completedClinics = clinicsData?.filter(c => c.status === 'completed') || [];
          const totalClinics = clinicsData?.length || 0;
          const completionRate = totalClinics > 0 ? Math.round((completedClinics.length / totalClinics) * 100) : 0;

          // Calculate Clinic Revenue
          const clinicRevenue = clinicsData?.reduce((sum, c) => sum + (Number(c.price || 0) * (c.participants || 0)), 0) || 0;

          // 3. Lesson Requests (Pending status)
          const { count: pendingLessons } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', currentUserId)
            .eq('status', 'pending');

          setCoachStats({
            studentsCount: uniqueStudents,
            clinicCompletion: completionRate,
            lessonRequests: pendingLessons || 0,
            totalRevenue: lessonRevenue + clinicRevenue
          });
        } catch (err) {
          console.error('Error fetching coach metrics:', err);
        }
      };

      fetchCoachMetrics();
    } else if (userRole === 'COURT_OWNER' && currentUserId) {
      // fetchCourtOwnerMetrics is now defined above
      fetchCourtOwnerMetrics();
    }

    return () => clearTimeout(timer);
  }, [userRole, currentUserId]);

  console.log('Dashboard Render - Role:', userRole, 'UserID:', currentUserId);

  const themeColor = userRole === 'COACH' ? 'rose' : userRole === 'COURT_OWNER' ? 'amber' : userRole === 'ADMIN' ? 'indigo' : 'blue';
  const pendingAppsCount = applications.filter(app => app.status === 'PENDING').length;

  const handleBroadcastNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) return;

    setIsBroadcasting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('announcements').insert({
        title: broadcastTitle,
        content: broadcastContent,
        created_by: user?.id
      });

      if (error) throw error;

      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastContent('');
      alert('Broadcast sent successfully to all users!');
    } catch (err) {
      console.error('Broadcast failed:', err);
      alert('Failed to send broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const fetchPlayerLessons = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          coach:profiles!lessons_coach_id_fkey(full_name, avatar_url)
        `)
        .eq('student_id', currentUserId)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentLessons(data || []);
    } catch (err) {
      console.error('Error fetching player sessions:', err);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUserId || !selectedLessonForReview) return;
    setIsSubmittingReview(true);
    try {
      const { error: reviewError } = await supabase
        .from('coach_reviews')
        .insert({
          coach_id: selectedLessonForReview.coach_id,
          student_id: currentUserId,
          lesson_id: selectedLessonForReview.id,
          rating: reviewRating,
          comment: reviewComment
        });

      if (reviewError) throw reviewError;

      alert('Review submitted! Thank you for your feedback.');
      setIsReviewModalOpen(false);
      setReviewComment('');
      setReviewRating(5);
      fetchPlayerLessons();
    } catch (err: any) {
      console.error('Review submission error:', err);
      alert('Failed to submit review: ' + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleLogDupr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDuprRating || !currentUserId) return;

    setIsLoggingDupr(true);
    try {
      const rating = parseFloat(newDuprRating);
      if (isNaN(rating) || rating < 0 || rating > 8.0) {
        alert('Please enter a valid DUPR rating (0.000 - 8.000)');
        return;
      }

      // 1. Insert into logs
      const { error: logError } = await supabase.from('dupr_logs').insert({
        player_id: currentUserId,
        rating: rating,
        source: 'MANUAL'
      });

      if (logError) throw logError;

      // 2. Update profile
      const { error: profileError } = await supabase.from('profiles').update({
        dupr_rating: rating
      }).eq('id', currentUserId);

      if (profileError) throw profileError;

      // 3. Refresh data
      setShowLogDuprModal(false);
      setNewDuprRating('');

      // Refresh player stats
      const { data } = await supabase.from('profiles')
        .select('dupr_rating, win_rate, matches_played')
        .eq('id', currentUserId)
        .single();
      if (data) setPlayerStats(data);

      // Refresh history
      const { data: logs } = await supabase
        .from('dupr_logs')
        .select('*')
        .eq('player_id', currentUserId)
        .order('recorded_at', { ascending: true });

      if (logs) {
        const mappedHistory = logs.map(log => ({
          name: new Date(log.recorded_at).toLocaleDateString([], { month: 'short' }),
          rating: Number(log.rating)
        }));
        setRatingHistory(mappedHistory);
      }

      alert('DUPR rating updated successfully!');
    } catch (err: any) {
      console.error('Logging DUPR failed:', err);
      alert('Failed to log DUPR: ' + err.message);
    } finally {
      setIsLoggingDupr(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    Array.from(files).forEach((file: File) => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG are allowed.`);
        return;
      }

      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large. Maximum size is 10MB.`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    } else {
      setUploadError('');
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadError('');
  };

  const renderRoleMetrics = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-32 h-10" />
          </div>
        </div>
      ));
    }

    switch (userRole) {
      case 'ADMIN':
        return (
          <>
            <StatCard label="Total Users" value={totalUsers !== null ? totalUsers.toLocaleString() : '...'} change="+12%" icon={<Users className="text-indigo-600" />} color="indigo" />
            <StatCard label="Active Sessions" value={activeSessions !== null ? activeSessions.toLocaleString() : '...'} change="+3%" icon={<Activity className="text-lime-600" />} color="lime" />
            <StatCard label="Pending Apps" value={pendingAppsCount.toString()} change={`${pendingAppsCount > 0 ? 'Action Req.' : 'Clear'}`} icon={<BarChart4 className="text-slate-600" />} color="slate" />
          </>
        );
      case 'COURT_OWNER':
        return (
          <>
            <StatCard label="Booking Revenue" value={`₱${courtOwnerStats.bookingRevenue.toLocaleString()}`} change="+14%" icon={<DollarSign className="text-amber-600" />} color="amber" />
            <StatCard label="Court Utilization" value={`${courtOwnerStats.courtUtilization}%`} change="+5%" icon={<Activity className="text-amber-600" />} color="amber" />
            <StatCard label="Player Retention" value={`${courtOwnerStats.playerRetention}%`} change="+2%" icon={<UserCheck className="text-amber-600" />} color="amber" />
          </>
        );
      case 'COACH':
        return (
          <>
            <StatCard label="Session Revenue" value={`₱${coachStats.totalRevenue.toLocaleString()}`} change="+12%" icon={<DollarSign className="text-rose-600" />} color="rose" />
            <StatCard label="Students" value={coachStats.studentsCount.toString()} change={`+${coachStats.studentsCount}`} icon={<GraduationCap className="text-rose-600" />} color="rose" />
            <StatCard label="Clinic Completion" value={`${coachStats.clinicCompletion}%`} change="+10%" icon={<Award className="text-rose-600" />} color="rose" />
          </>
        );
      case 'PLAYER':
      default:
        return (
          <>
            <StatCard
              label="Current DUPR"
              value={playerStats?.dupr_rating ? playerStats.dupr_rating.toFixed(2) : '3.50'}
              change={playerStats?.dupr_rating ? 'Live' : 'Est.'}
              icon={<Target className="text-blue-600" />}
              color="blue"
            />
            <StatCard
              label="Win Rate"
              value={playerStats ? `${playerStats.win_rate || 0}%` : '50%'}
              change={playerStats?.matches_played > 10 ? '+2%' : '-'}
              icon={<TrendingUp className="text-lime-600" />}
              color="lime"
            />
            <StatCard
              label="Matches Played"
              value={playerStats?.matches_played || '0'}
              change="Total"
              icon={<Activity className="text-slate-600" />}
              color="slate"
            />
          </>
        );
    }
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full bg-${themeColor}-500 animate-pulse`} />
            <p className={`text-[10px] font-black text-${themeColor}-600 uppercase tracking-[0.3em]`}>Session: {userRole.replace('_', ' ')}</p>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
            {userName ? `Welcome, ${userName.split(' ')[0]}` : 'Pickleball Intelligence'}
          </h1>
        </div>
        {!isLoading && (
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button className="whitespace-nowrap bg-white border border-slate-200 text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl transition-all flex items-center gap-2 hover:text-slate-950 hover:border-slate-300 shadow-sm">
              <History size={16} /> Logs
            </button>
            <button
              onClick={() => {
                console.log('Action Button Clicked - Role:', userRole);
                if (userRole === 'ADMIN') setShowBroadcastModal(true);
                else if (userRole === 'COACH') navigate('/clinics');
                else if (userRole === 'COURT_OWNER') {
                  // Show a menu or just navigate to courts? 
                  // Let's add a condition or a way to choose.
                  // For now, let's keep it simple and maybe navigate to tournaments if they want.
                  navigate('/tournaments-admin');
                }
                else if (userRole === 'PLAYER') setShowLogDuprModal(true);
              }}
              className={`whitespace-nowrap bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-${themeColor}-100 transition-all flex items-center gap-2 md:gap-3`}
            >
              <PlusCircle size={18} />
              {userRole === 'ADMIN' ? 'Broadcast' : userRole === 'COURT_OWNER' ? 'Add Tournament' : userRole === 'COACH' ? 'New Clinic' : 'Log DUPR'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {renderRoleMetrics()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase">
              <Activity className={`text-${themeColor}-600`} />
              Rating Velocity
            </h2>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {['7D', '1M', '6M', '1Y'].map(t => (
                <button key={t} className={`w-10 h-8 rounded-lg text-[10px] font-black transition-colors ${t === '6M' ? `bg-${themeColor}-600 text-white shadow-sm` : 'text-slate-500 hover:bg-white/50'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-[250px] md:h-[300px] w-full">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingHistory.length > 0 ? ratingHistory : PERFORMANCE_DATA} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis hide domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b' }}
                  />
                  <Line type="monotone" dataKey="rating" stroke={`#3b82f6`} strokeWidth={4} dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {userRole !== 'ADMIN' && (authorizedProRoles.length < 2) && !isLoading && (
            <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-2xl shadow-blue-100 relative overflow-hidden group border border-blue-500 animate-fade-in">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2 flex items-center gap-3 text-white-500 tracking-tighter uppercase">
                  PRO UPGRADE.
                </h3>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed font-medium">
                  {authorizedProRoles.length === 0
                    ? "Get certified as a coach or register your court facility to join our network."
                    : `You are already a ${authorizedProRoles[0].replace('_', ' ')}. Apply for another role to expand your business.`}
                </p>
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full bg-white text-blue-600 font-black py-4 px-6 rounded-2xl hover:bg-lime-400 hover:text-slate-900 transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest shadow-lg"
                >
                  SUBMIT DOCS <ArrowRight size={16} />
                </button>
              </div>
              <Trophy className="absolute -bottom-8 -right-8 w-32 h-32 text-white/10 rotate-12 transition-transform group-hover:scale-110" />
            </div>
          )}
          {userRole === 'ADMIN' && !isLoading && (
            <div className="bg-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group border border-slate-700 animate-fade-in">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2 flex items-center gap-3 text-lime-400 tracking-tighter uppercase">
                  ADMIN ACTIONS
                </h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed font-medium">
                  Manage platform settings and user roles from the admin console.
                </p>
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full bg-white/90 text-slate-900 font-black py-4 px-6 rounded-2xl hover:bg-lime-400 transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest shadow-lg"
                >
                  GO TO CONSOLE <Shield size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-6 uppercase tracking-tighter leading-none">Meta Updates</h2>
            <div className="space-y-5">
              {announcements.length > 0 ? (
                announcements.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Megaphone size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">{item.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400 font-medium italic">No active announcements.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {userRole === 'PLAYER' && !isLoading && recentLessons.length > 0 && (
        <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <History className="text-blue-600" /> Recent Sessions
            </h2>
            <Link to="/schedule" className="text-xs font-bold text-blue-600 hover:gap-3 transition-all flex items-center gap-2">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentLessons.map((lesson) => (
              <div key={lesson.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={lesson.coach?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lesson.coach_id}`}
                    className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-white"
                    alt="Coach"
                  />
                  <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{lesson.coach?.full_name || 'Coach'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{lesson.date} • {lesson.time}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${lesson.status === 'confirmed' ? 'bg-lime-100 text-lime-700' :
                    lesson.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                    {lesson.status}
                  </span>
                  {lesson.status === 'completed' && (
                    <button
                      onClick={() => {
                        setSelectedLessonForReview(lesson);
                        setIsReviewModalOpen(true);
                      }}
                      className="text-[10px] font-black text-white bg-blue-600 px-4 py-2 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Star size={12} fill="currentColor" /> Rate Coach
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-blue-600" fill="currentColor" />
              </div>
              <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Rate {selectedLessonForReview?.coach?.full_name}</h3>
              <p className="text-slate-500 font-medium text-sm mt-2">How was your session on {selectedLessonForReview?.date}?</p>
            </div>

            <div className="space-y-8">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`transition-all ${reviewRating >= star ? 'text-amber-500 scale-110' : 'text-slate-200 hover:text-slate-300'}`}
                  >
                    <Star size={36} fill={reviewRating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Your Comments</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your feedback to help others..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm min-h-[120px] resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingReview}
                  onClick={handleSubmitReview}
                  className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Submit Docs Application Modal - Refined Stacking logic */}
      {showSubmitConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 my-8 z-[100]">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-slate-950 mb-2 uppercase tracking-tighter">Professional Application</h3>
                <p className="text-slate-500 font-medium text-sm">
                  Apply to become a certified coach or register your court facility
                </p>
              </div>

              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();

                const formData = new FormData(e.currentTarget);
                const applicationType = formData.get('applicationType') as string;

                if (!applicationType) {
                  alert('Please select an application type');
                  return;
                }

                const accessCode = formData.get('accessCode') as string;

                // Validate: require files if no access code is provided
                if (!accessCode || !accessCode.trim()) {
                  if (selectedFiles.length === 0) {
                    setUploadError('Please upload at least one supporting document, or enter a valid access code to skip this requirement.');
                    return;
                  }
                }

                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Not authenticated');

                  // 1. Check for Access Code
                  if (accessCode && accessCode.trim()) {
                    const { data: codeData, error: codeError } = await supabase
                      .from('access_codes')
                      .select('*')
                      .eq('code', accessCode.toUpperCase().trim())
                      .eq('is_used', false)
                      .single();

                    if (codeData) {
                      // Fetch current profile to get existing roles
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('roles')
                        .eq('id', user.id)
                        .single();

                      const currentRoles = profile?.roles || ['PLAYER'];
                      const requestedRole = applicationType === 'coach' ? 'COACH' : 'COURT_OWNER';

                      if (!currentRoles.includes(requestedRole)) {
                        currentRoles.push(requestedRole);
                      }

                      // Update profile directly
                      const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                          roles: currentRoles,
                          active_role: requestedRole
                        })
                        .eq('id', user.id);

                      if (updateError) throw updateError;

                      // Mark code as used
                      await supabase
                        .from('access_codes')
                        .update({
                          is_used: true,
                          used_by: user.id,
                          used_at: new Date().toISOString()
                        })
                        .eq('id', codeData.id);

                      alert(`Promotional access granted! Welcome as a ${requestedRole}.`);
                      setShowSubmitConfirm(false);
                      window.location.reload();
                      return;
                    } else if (codeError && codeError.code !== 'PGRST116') {
                      throw codeError;
                    } else {
                      alert('Invalid or expired access code. Please check and try again.');
                      return;
                    }
                  }

                  // Upload files to Supabase Storage
                  const uploadedFileUrls: string[] = [];

                  if (selectedFiles.length > 0) {
                    const bucketName = 'application-documents';

                    for (const file of selectedFiles) {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                      const { data, error } = await supabase.storage
                        .from(bucketName)
                        .upload(fileName, file, {
                          cacheControl: '3600',
                          upsert: false
                        });

                      if (error) {
                        console.error('Upload error:', error);
                        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                      }

                      // Get public URL
                      const { data: { publicUrl } } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(fileName);

                      uploadedFileUrls.push(publicUrl);
                    }
                  }

                  // Submit application with file URLs
                  const requestedRole = applicationType === 'coach' ? 'COACH' : 'COURT_OWNER';

                  if (onSubmitApplication) {
                    onSubmitApplication({
                      playerId: user.id,
                      playerName: user.email || 'Unknown',
                      requestedRole,
                      experienceSummary: `Application submitted with ${selectedFiles.length} document(s)`,
                      documentName: uploadedFileUrls.join(', ') || 'No documents'
                    });
                  }

                  alert('Application submitted successfully! Our team will review your documents within 3-5 business days.');
                  setShowSubmitConfirm(false);
                  setSelectedFiles([]);
                  setUploadError('');
                } catch (error: any) {
                  console.error('Submission error:', error);
                  alert(`Failed to submit application: ${error.message}`);
                }
              }}>
                {/* Application Type */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                    Application Type
                  </label>
                  <select
                    name="applicationType"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    {!authorizedProRoles.includes('COACH') && !applications.some(a => a.playerId === currentUserId && a.requestedRole === 'COACH' && a.status === 'PENDING') && (
                      <option value="coach">Certified Coach</option>
                    )}
                    {!authorizedProRoles.includes('COURT_OWNER') && !applications.some(a => a.playerId === currentUserId && a.requestedRole === 'COURT_OWNER' && a.status === 'PENDING') && (
                      <option value="court_owner">Court Owner / Facility</option>
                    )}
                    {authorizedProRoles.includes('COACH') && authorizedProRoles.includes('COURT_OWNER') && (
                      <option disabled>You already hold all professional roles</option>
                    )}
                    {applications.some(a => a.playerId === currentUserId && a.status === 'PENDING') && (
                      <option disabled>Existing application pending review</option>
                    )}
                  </select>
                </div>

                {/* Access Code */}
                <div className="pt-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Access Code (Promotional)
                    <span className="text-[9px] font-bold text-slate-400 normal-case italic">{accessCodeValue.trim() ? 'Code entered - documents optional' : 'Optional'}</span>
                  </label>
                  <div className="relative">
                    <input
                      name="accessCode"
                      type="text"
                      placeholder="e.g. PICKLE-PRO-2024"
                      value={accessCodeValue}
                      onChange={(e) => {
                        setAccessCodeValue(e.target.value);
                        setUploadError(''); // Clear error when user types access code
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-sm text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30 uppercase"
                    />
                    <Key size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>

                {/* File Upload */}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">
                      Supporting Documents
                      {!accessCodeValue.trim() && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onMouseEnter={() => setShowHelp(true)}
                        onMouseLeave={() => setShowHelp(false)}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <HelpCircle size={16} />
                      </button>
                      {showHelp && (
                        <div className="absolute left-0 top-6 w-72 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 text-left animate-fade-in">
                          <p className="text-xs font-black uppercase tracking-wider text-lime-400 mb-2">Required Documents</p>
                          <div className="space-y-3 text-xs">
                            <div>
                              <p className="font-bold mb-1">For Coaches:</p>
                              <ul className="list-disc list-inside text-slate-300 space-y-1">
                                <li>Coaching certification (PPR, IPTPA, etc.)</li>
                                <li>Valid ID or driver's license</li>
                                <li>Proof of insurance (optional)</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-bold mb-1">For Court Owners:</p>
                              <ul className="list-disc list-inside text-slate-300 space-y-1">
                                <li>Business license or registration</li>
                                <li>Facility photos (courts, amenities)</li>
                                <li>Proof of ownership/lease agreement</li>
                              </ul>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-400">💡 Tip: Clear, high-quality scans are preferred</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="text-slate-400" size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1">Click to upload files</p>
                      <p className="text-xs text-slate-500 font-medium">PDF, DOC, or images (Max 10MB each)</p>
                    </label>
                  </div>

                  {/* Error Messages */}
                  {uploadError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-xs font-bold text-red-600 whitespace-pre-line">{uploadError}</p>
                    </div>
                  )}

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Selected Files ({selectedFiles.length})</p>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <BookOpen className="text-blue-600 shrink-0" size={16} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remove file"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    Upload certifications, licenses, or facility documents
                  </p>
                  {!accessCodeValue.trim() && selectedFiles.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 font-semibold">
                      ⚠️ At least one document is required unless you have an access code
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitConfirm(false);
                      setSelectedFiles([]);
                      setUploadError('');
                      setAccessCodeValue('');
                    }}
                    className="flex-1 bg-slate-100 text-slate-900 font-black py-4 px-6 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white font-black py-4 px-6 rounded-2xl hover:bg-lime-400 hover:text-slate-900 transition-all text-xs uppercase tracking-widest shadow-lg"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Log DUPR Modal */}
      {
        showLogDuprModal && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target size={32} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Log DUPR Rating</h3>
                <p className="text-slate-500 font-medium text-sm mt-2">
                  Update your current performance rating to track your growth.
                </p>
              </div>

              <form onSubmit={handleLogDupr} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Current Rating</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      step="0.001"
                      min="2.0"
                      max="8.0"
                      value={newDuprRating}
                      onChange={e => setNewDuprRating(e.target.value)}
                      placeholder="e.g. 3.750"
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 pr-14 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-lg"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <TrendingUp size={18} className="text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowLogDuprModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingDupr}
                    className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoggingDupr ? 'Logging...' : 'Log Rating'}
                    {!isLoggingDupr && <Radio size={14} className="animate-pulse" />}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      }

      {/* Broadcast Modal - Refined Stacking logic */}
      {
        showBroadcastModal && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[48px] p-10 md:p-14 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden z-[100]">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-950 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-10 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Megaphone size={32} className="text-indigo-600" />
                </div>
                <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase mb-2">Broadcast Notice.</h2>
                <p className="text-slate-500 font-medium text-sm">Send a platform-wide announcement to all users.</p>
              </div>

              <form onSubmit={handleBroadcastNotice} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Subject / Title</label>
                  <input
                    required
                    type="text"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Server Maintenance Notice"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Announcement Message</label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastContent}
                    onChange={e => setBroadcastContent(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className={`w-full h-20 ${isBroadcasting ? 'bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-[32px] font-black text-lg uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/20 mt-4 flex items-center justify-center gap-3`}
                >
                  {isBroadcasting ? 'SENDING...' : 'DISPATCH BROADCAST'}
                  {!isBroadcasting && <Megaphone size={20} />}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, change: string, icon: React.ReactNode, color: string }> = ({ label, value, change, icon, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
    <div className={`absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${change.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
      {/* Fix: Corrected a JSX syntax error where a closing span tag was present without an opening tag. */}
      <span>{change}</span>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-50 mb-4 group-hover:scale-105 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</h3>
    <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

export default Dashboard;