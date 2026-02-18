

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
import { submitCourtReview } from '../services/reviews';
import { getSubscription, calculateDaysRemaining, createTrialSubscription } from '../services/subscriptions';
import { Subscription } from '../types';
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
  Radio,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
// Fix: Import UserRole from the centralized types.ts file.
import { UserRole, ProfessionalApplication } from '../types';
import { Skeleton } from './ui/Skeleton';
import { calculateGraceDaysRemaining, isInGracePeriod, isHardLocked } from '../services/subscriptions';

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
  const [applicationType, setApplicationType] = useState<string>('');
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [recentCourts, setRecentCourts] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCourtReviewModalOpen, setIsCourtReviewModalOpen] = useState(false);
  const [selectedLessonForReview, setSelectedLessonForReview] = useState<any>(null);
  const [selectedCourtForReview, setSelectedCourtForReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7D' | '1M' | '6M' | '1Y'>('6M');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeLogs, setActiveLogs] = useState<any[]>([]);
  const [showStatusModal, setShowStatusModal] = useState<{ show: boolean, type: 'success' | 'error', title: string, message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const fetchUserData = () => {
    if (userRole === 'PLAYER') {
      fetchPlayerLessons();
      fetchPlayerCourts();
    }
  };

  const handleFileUpload = (files: File[]) => {
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

    files.forEach((file: File) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type.`);
        return;
      }
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large.`);
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
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);

    // Fetch Announcements (For Everyone) - handle missing table
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase.from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data) setAnnouncements(data);
      } catch (err) {
        // Announcements table might not exist
      }
    };
    fetchAnnouncements();

    if (userRole === 'PLAYER' && currentUserId) {
      fetchPlayerLessons();
      fetchPlayerCourts();
    }

    if (userRole === 'COURT_OWNER' && currentUserId) {
      const fetchSubscriptionData = async () => {
        const { data, error } = await getSubscription(currentUserId);
        if (!error && data) {
          setSubscription(data);
          const remaining = calculateDaysRemaining(data.trial_ends_at);
          setDaysRemaining(remaining);

          // Don't auto-expire anymore - let grace period handle it
          // Users get 10 days grace after trial ends before features lock
        } else if (!data) {
          // Self-Healing: Create trial if missing
          console.log('Self-healing: initializing trial for court owner...');
          const { data: newSub } = await createTrialSubscription(currentUserId);
          if (newSub) {
            setSubscription(newSub);
            setDaysRemaining(calculateDaysRemaining(newSub.trial_ends_at));
          }
        }
      };
      fetchSubscriptionData();
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

      // 3. User Growth Data
      const fetchUserGrowth = async () => {
        try {
          const now = new Date();
          let startDate = new Date();
          let granularity: 'day' | 'week' | 'month' = 'month';

          if (timeRange === '7D') {
            startDate.setDate(now.getDate() - 7);
            granularity = 'day';
          } else if (timeRange === '1M') {
            startDate.setMonth(now.getMonth() - 1);
            granularity = 'week';
          } else if (timeRange === '6M') {
            startDate.setMonth(now.getMonth() - 6);
            granularity = 'month';
          } else if (timeRange === '1Y') {
            startDate.setFullYear(now.getFullYear() - 1);
            granularity = 'month';
          }

          const { data: profiles } = await supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

          if (profiles) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const labels: string[] = [];
            const tempDate = new Date(startDate);

            // Generate labels based on granularity
            while (tempDate <= now) {
              if (granularity === 'day') {
                labels.push(tempDate.toLocaleDateString([], { weekday: 'short' }));
                tempDate.setDate(tempDate.getDate() + 1);
              } else if (granularity === 'week') {
                labels.push(`W${Math.ceil(tempDate.getDate() / 7)}`);
                tempDate.setDate(tempDate.getDate() + 7);
              } else {
                labels.push(months[tempDate.getMonth()]);
                tempDate.setMonth(tempDate.getMonth() + 1);
              }
            }

            // Get total count before startDate for cumulative baseline
            const { count: baselineCount } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .lt('created_at', startDate.toISOString());

            let cumulative = baselineCount || 0;
            const counts: Record<string, number> = {};

            profiles.forEach(p => {
              const d = new Date(p.created_at);
              let label = '';
              if (granularity === 'day') label = d.toLocaleDateString([], { weekday: 'short' });
              else if (granularity === 'week') label = `W${Math.ceil(d.getDate() / 7)}`;
              else label = months[d.getMonth()];
              counts[label] = (counts[label] || 0) + 1;
            });

            const aggregatedData = labels.map(label => {
              cumulative += (counts[label] || 0);
              return { name: label, growth: cumulative };
            });

            setUserGrowthData(aggregatedData);
          }
        } catch (err) {
          console.error('Error fetching user growth:', err);
        }
      };
      fetchUserGrowth();

      // 4. Fetch System Logs
      const fetchSystemLogs = async () => {
        try {
          const { data } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
          if (data) setActiveLogs(data);
        } catch (err) {
          console.error('Error fetching logs:', err);
        }
      };
      fetchSystemLogs();

      // 5. Fetch Court Metrics for Admin's own courts
      fetchCourtOwnerMetrics();
    } else if (userRole === 'PLAYER') {
      // Fetch Player Stats
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('profiles')
            .select('dupr_rating, win_rate, matches_played, points')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
              if (data) setPlayerStats(data);
            });
        }
      });

      const fetchRatingHistory = async () => {
        if (!currentUserId) return;
        try {
          const now = new Date();
          let startDate = new Date();
          if (timeRange === '7D') startDate.setDate(now.getDate() - 7);
          else if (timeRange === '1M') startDate.setMonth(now.getMonth() - 1);
          else if (timeRange === '6M') startDate.setMonth(now.getMonth() - 6);
          else if (timeRange === '1Y') startDate.setFullYear(now.getFullYear() - 1);

          const { data } = await supabase
            .from('dupr_logs')
            .select('*')
            .eq('player_id', currentUserId)
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: true });

          if (data && data.length > 0) {
            const mappedHistory = data.map(log => ({
              name: new Date(log.recorded_at).toLocaleDateString([], {
                month: (timeRange === '6M' || timeRange === '1Y') ? 'short' : undefined,
                day: (timeRange === '7D' || timeRange === '1M') ? 'numeric' : undefined,
                weekday: timeRange === '7D' ? 'short' : undefined
              }),
              rating: Number(log.rating)
            }));
            setRatingHistory(mappedHistory);
          } else {
            setRatingHistory([{ name: 'No Data', rating: 3.5 }]);
          }
        } catch (err) {
          console.error('Error fetching rating history:', err);
        }
      };
      fetchRatingHistory();
    }
    else if (userRole === 'COACH' && currentUserId) {
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
  }, [userRole, currentUserId, timeRange]);

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
      setShowStatusModal({
        show: true,
        type: 'success',
        title: 'Broadcast Sent!',
        message: 'Your announcement has been dispatched to all users successfully.'
      });
    } catch (err) {
      console.error('Broadcast failed:', err);
      setShowStatusModal({
        show: true,
        type: 'error',
        title: 'Broadcast Failed',
        message: 'Failed to send the broadcast notice. Please try again.'
      });
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

  const fetchPlayerCourts = async () => {
    if (!currentUserId) return;
    try {
      // Find completed court bookings that haven't been reviewed
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          court:courts(name, image_url, address, city)
        `)
        .eq('player_id', currentUserId)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Filter by time locally and check for reviews
      const now = new Date();
      const completedBookings = (bookings || []).filter(b => {
        const bookingEnd = new Date(`${b.booking_date}T${b.end_time}`);
        return bookingEnd < now;
      });

      // For each completed booking, check if a review exists in court_reviews
      // Handle case where court_reviews table might not exist
      const bookingsWithReviewStatus = await Promise.all(
        completedBookings.map(async (b) => {
          try {
            const { data: review } = await supabase
              .from('court_reviews')
              .select('id')
              .eq('booking_id', b.id)
              .maybeSingle();
            return { ...b, has_review: !!review };
          } catch {
            // court_reviews table might not exist yet
            return { ...b, has_review: false };
          }
        })
      );

      setRecentCourts(bookingsWithReviewStatus);
    } catch (err: any) {
      // Silently handle errors - table might not exist or user has no bookings
      if (err?.code !== 'PGRST116' && err?.code !== '42P01') {
        console.error('Error fetching player court sessions:', err);
      }
      setRecentCourts([]);
    }
  };

  const handleSubmitCourtReview = async () => {
    if (!currentUserId || !selectedCourtForReview) return;
    setIsSubmittingReview(true);
    try {
      const result = await submitCourtReview(
        selectedCourtForReview.court_id,
        currentUserId,
        reviewRating,
        reviewComment,
        undefined, // title
        selectedCourtForReview.id
      );

      if (!result.success) throw new Error(result.error);

      setIsCourtReviewModalOpen(false);
      setReviewComment('');
      setReviewRating(5);
      fetchPlayerCourts();
      setShowStatusModal({
        show: true,
        type: 'success',
        title: 'Feedback Received',
        message: 'Court review submitted! Thank you for helping the community.'
      });
      fetchUserData();
    } catch (err: any) {
      console.error('Court review error:', err);
      setShowStatusModal({
        show: true,
        type: 'error',
        title: 'Review Failed',
        message: `Failed to submit review: ${err.message}`
      });
    } finally {
      setIsSubmittingReview(false);
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

      setIsReviewModalOpen(false);
      setReviewComment('');
      setReviewRating(5);
      fetchPlayerLessons();
      setShowStatusModal({
        show: true,
        type: 'success',
        title: 'Review Posted',
        message: 'Your review has been submitted! Thank you for your feedback.'
      });
      fetchUserData();
    } catch (err: any) {
      console.error('Review submission error:', err);
      setShowStatusModal({
        show: true,
        type: 'error',
        title: 'Review Failed',
        message: `Failed to submit review: ${err.message}`
      });
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
        setShowStatusModal({
          show: true,
          type: 'error',
          title: 'Invalid Rating',
          message: 'Please enter a valid DUPR rating between 0.000 and 8.000'
        });
        setIsLoggingDupr(false);
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
        .select('dupr_rating, win_rate, matches_played, points')
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

      setShowStatusModal({
        show: true,
        type: 'success',
        title: 'DUPR Updated',
        message: 'Your DUPR rating has been synchronized successfully.'
      });
      fetchUserData();
    } catch (err: any) {
      console.error('Logging DUPR failed:', err);
      setShowStatusModal({
        show: true,
        type: 'error',
        title: 'Sync Failed',
        message: `Failed to log DUPR: ${err.message}`
      });
    } finally {
      setIsLoggingDupr(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    handleFileUpload(Array.from(files));
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
            {userRole === 'ADMIN' && (
              <button
                onClick={() => setShowLogsModal(true)}
                className="whitespace-nowrap bg-white border border-slate-200 text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl transition-all flex items-center gap-2 hover:text-slate-950 hover:border-slate-300 shadow-sm"
              >
                <History size={16} /> Logs
              </button>
            )}
            {userRole !== 'ADMIN' && (
              <button className="whitespace-nowrap bg-white border border-slate-200 text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl transition-all flex items-center gap-2 hover:text-slate-950 hover:border-slate-300 shadow-sm">
                <History size={16} /> Logs
              </button>
            )}
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


      {/* Active Trial Banner - Days 1-30 */}
      {userRole === 'COURT_OWNER' && !isLoading && subscription && subscription.status === 'trial' && daysRemaining !== null && daysRemaining > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 md:p-8 rounded-3xl text-white shadow-2xl shadow-amber-100 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={20} className="text-amber-200" fill="currentColor" />
                  <span className="text-xs font-black uppercase tracking-widest text-amber-100">Limited Time Offer</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
                  🎉 1 Month Free Trial
                </h3>
                <p className="text-amber-50 text-sm md:text-base leading-relaxed max-w-2xl">
                  You're enjoying full access to all premium features completely free!
                  Manage courts, track bookings, and grow your business.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Check size={16} className="text-amber-100" />
                    <span className="text-xs font-bold text-white">Unlimited Courts</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Check size={16} className="text-amber-100" />
                    <span className="text-xs font-bold text-white">Revenue Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <Check size={16} className="text-amber-100" />
                    <span className="text-xs font-bold text-white">Priority Support</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/30 text-center">
                  <p className="text-xs font-bold text-amber-100 uppercase tracking-widest mb-1">Trial Ends In</p>
                  <p className="text-4xl font-black text-white">{daysRemaining}</p>
                  <p className="text-xs font-bold text-amber-100 uppercase">Days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grace Period Banner - Days 31-40 (Positive messaging!) */}
      {userRole === 'COURT_OWNER' && !isLoading && subscription && isInGracePeriod(subscription) && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 md:p-8 rounded-3xl text-white shadow-2xl shadow-orange-100 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={20} className="text-orange-200" fill="currentColor" />
                  <span className="text-xs font-black uppercase tracking-widest text-orange-100">Special Grace Period</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
                  🎊 Congratulations! You Still Have {calculateGraceDaysRemaining(subscription.trial_ends_at)} Days to Subscribe
                </h3>
                <p className="text-orange-50 text-sm md:text-base leading-relaxed max-w-2xl">
                  <span className="font-black text-white">All features remain fully active!</span>{' '}
                  We've extended your access as a special courtesy. Subscribe now to continue enjoying premium features without interruption.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <CheckCircle2 size={16} className="text-orange-100" />
                    <span className="text-xs font-bold text-white">Still Full Access</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <CheckCircle2 size={16} className="text-orange-100" />
                    <span className="text-xs font-bold text-white">No Features Locked</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 space-y-3">
                <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/30 text-center">
                  <p className="text-xs font-bold text-orange-100 uppercase tracking-widest mb-1">Grace Period</p>
                  <p className="text-4xl font-black text-white">{calculateGraceDaysRemaining(subscription.trial_ends_at)}</p>
                  <p className="text-xs font-bold text-orange-100 uppercase">Days Left</p>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full bg-white text-orange-600 font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-orange-900/20 hover:scale-105 transition-all"
                >
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hard Lock Banner - Day 41+ */}
      {userRole === 'COURT_OWNER' && !isLoading && subscription && isHardLocked(subscription) && (
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 md:p-8 rounded-3xl text-white shadow-2xl shadow-rose-100 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <AlertCircle size={20} className="text-rose-200" fill="currentColor" />
                  <span className="text-xs font-black uppercase tracking-widest text-rose-100">Subscription Required</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">🔒 Subscription Needed to Continue</h3>
                <p className="text-rose-50 text-sm md:text-base leading-relaxed max-w-xl">
                  Your trial and grace period have ended. To continue managing your courts and accessing premium features, please select a subscription plan.
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="bg-white text-rose-600 font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-rose-900/20 hover:scale-105 transition-all"
              >
                Subscribe to Continue
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {renderRoleMetrics()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase">
              {userRole === 'ADMIN' ? (
                <>
                  <Users className="text-indigo-600" />
                  User Growth Velocity
                </>
              ) : (
                <>
                  <Activity className={`text-${themeColor}-600`} />
                  Rating Velocity
                </>
              )}
            </h2>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['7D', '1M', '6M', '1Y'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`w-10 h-8 rounded-lg text-[10px] font-black transition-colors ${t === timeRange ? `bg-${themeColor}-600 text-white shadow-sm` : 'text-slate-500 hover:bg-white/50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[250px] md:h-[300px] w-full min-h-[250px]">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height={250} minHeight={250}>
                <LineChart data={userRole === 'ADMIN' ? (userGrowthData.length > 0 ? userGrowthData : PERFORMANCE_DATA.map(d => ({ ...d, growth: d.rating * 10 }))) : (ratingHistory.length > 0 ? ratingHistory : PERFORMANCE_DATA)} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis hide domain={userRole === 'ADMIN' ? ['auto', 'auto'] : ['dataMin - 0.2', 'dataMax + 0.2']} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b' }}
                    formatter={(value: any) => [value, userRole === 'ADMIN' ? 'Total Users' : 'Rating']}
                  />
                  <Line type="monotone" dataKey={userRole === 'ADMIN' ? "growth" : "rating"} stroke={userRole === 'ADMIN' ? "#4f46e5" : "#3b82f6"} strokeWidth={4} dot={{ r: 5, fill: userRole === 'ADMIN' ? "#4f46e5" : "#3b82f6" }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* PRO UPGRADE Card - Skeleton or Content */}
          {userRole !== 'ADMIN' && (authorizedProRoles.length < 2) && (
            <>
              {isLoading ? (
                <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
                  <Skeleton className="w-40 h-6 mb-4 rounded-xl" />
                  <Skeleton className="w-full h-4 mb-2 rounded-lg" />
                  <Skeleton className="w-3/4 h-4 mb-6 rounded-lg" />
                  <Skeleton className="w-full h-14 rounded-2xl" />
                  <Skeleton className="w-32 h-3 mx-auto mt-4 rounded-lg" />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-lime-500 via-green-500 to-emerald-600 p-8 rounded-3xl shadow-2xl shadow-lime-100 relative overflow-hidden group animate-fade-in">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Trophy className="absolute -bottom-8 -right-8 w-32 h-32 text-white/10 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500" />
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                      PRO UPGRADE.
                    </h3>
                    <p className="text-lime-50 text-sm mb-6 leading-relaxed font-medium">
                      {authorizedProRoles.length === 0
                        ? "Get certified as a coach or register your court facility to join our network."
                        : `You are already a ${authorizedProRoles[0].replace('_', ' ')}. Apply for another role to expand your business.`}
                    </p>
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      className="w-full bg-white text-lime-600 font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 hover:shadow-2xl group/button"
                    >
                      <Award size={18} className="group-hover/button:rotate-12 transition-transform" />
                      SUBMIT DOCS
                      <ArrowRight size={16} className="group-hover/button:translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-bold text-white/70 uppercase tracking-wider">
                      <Sparkles size={12} className="text-white/80" />
                      Unlock professional features
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ADMIN ACTIONS Card */}
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

          {/* NEED HELP Card - Skeleton or Content */}
          {isLoading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
              <Skeleton className="w-32 h-6 mb-4 rounded-xl" />
              <Skeleton className="w-full h-4 mb-2 rounded-lg" />
              <Skeleton className="w-5/6 h-4 mb-6 rounded-lg" />
              <Skeleton className="w-full h-14 rounded-2xl" />
              <Skeleton className="w-36 h-3 mx-auto mt-4 rounded-lg" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-8 rounded-3xl shadow-2xl shadow-blue-100 relative overflow-hidden group animate-fade-in">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-4">Need Help?</h2>
              
              <p className="text-blue-50 text-sm font-medium leading-relaxed mb-6">
                Have questions about Pickleplay? Check out our frequently asked questions for quick answers and helpful tips.
              </p>
              
              <button
                onClick={() => navigate('/faq')}
                className="w-full bg-white text-blue-600 font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 hover:shadow-2xl group/button"
              >
                <BookOpen size={18} className="group-hover/button:rotate-12 transition-transform" />
                View FAQ
                <ArrowRight size={16} className="group-hover/button:translate-x-1 transition-transform" />
              </button>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-bold text-white/70 uppercase tracking-wider">
                <Sparkles size={12} className="text-white/80" />
                Quick answers & guidance
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {userRole === 'PLAYER' && !isLoading && (recentLessons.length > 0 || recentCourts.length > 0) && (
        <div className="space-y-8">
          {recentLessons.length > 0 && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <History className="text-rose-600" /> Recent Coaching
                </h2>
                <Link to="/schedule" className="text-xs font-bold text-rose-600 hover:gap-3 transition-all flex items-center gap-2">
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
                          className="text-[10px] font-black text-white bg-rose-600 px-4 py-2 rounded-xl hover:bg-rose-700 transition-all flex items-center gap-2"
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

          {recentCourts.length > 0 && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <Building2 className="text-blue-600" /> Recent Court Sessions
                </h2>
                <Link to="/bookings" className="text-xs font-bold text-blue-600 hover:gap-3 transition-all flex items-center gap-2">
                  All Bookings <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentCourts.map((booking) => (
                  <div key={booking.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      {booking.court?.image_url ? (
                        <img
                          src={booking.court.image_url}
                          className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-white"
                          alt="Court"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shadow-sm">
                          <MapPin size={24} className="text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{booking.court?.name || 'Pickleball Court'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{booking.booking_date} • {booking.start_time}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest">
                        Finished
                      </span>
                      {!booking.has_review ? (
                        <button
                          onClick={() => {
                            setSelectedCourtForReview(booking);
                            setIsCourtReviewModalOpen(true);
                          }}
                          className="text-[10px] font-black text-white bg-blue-600 px-4 py-2 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                          <Star size={12} fill="currentColor" /> Rate Court
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                          <Check size={12} /> Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Court Review Modal */}
      {isCourtReviewModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={32} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Rate {selectedCourtForReview?.court?.name}</h3>
              <p className="text-slate-500 font-medium text-sm mt-2">How was your game on {selectedCourtForReview?.booking_date}?</p>
            </div>

            <div className="space-y-8">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`transition-all ${reviewRating >= star ? 'text-blue-500 scale-110' : 'text-slate-200 hover:text-slate-300'}`}
                  >
                    <Star size={36} fill={reviewRating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Feedback</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us about the court surface, lighting, and overall experience..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm min-h-[120px] resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsCourtReviewModalOpen(false);
                    setReviewComment('');
                    setReviewRating(5);
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingReview}
                  onClick={handleSubmitCourtReview}
                  className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Submit Docs Application Modal - Refined Stacking logic */}
      {showSubmitConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 my-8">
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmittingReview(true);
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Check if it's an access code submission
                if (accessCodeValue.trim()) {
                  const { data: codeData, error: codeError } = await supabase
                    .from('access_codes')
                    .select('*')
                    .eq('code', accessCodeValue.trim().toUpperCase())
                    .eq('is_used', false)
                    .single();

                  if (codeData) {
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

                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({
                        roles: currentRoles,
                        active_role: requestedRole
                      })
                      .eq('id', user.id);

                    if (updateError) throw updateError;

                    // Explicitly create trial subscription record as well
                    await createTrialSubscription(user.id);

                    await supabase
                      .from('access_codes')
                      .update({
                        is_used: true,
                        used_by: user.id,
                        used_at: new Date().toISOString()
                      })
                      .eq('id', codeData.id);

                    setShowStatusModal({
                      show: true,
                      type: 'success',
                      title: 'Access Granted!',
                      message: `Promotional access granted! Welcome as a ${requestedRole}. THE PAGE WILL REFRESH AUTOMATICALLY.`
                    });
                    setShowSubmitConfirm(false);
                    setTimeout(() => window.location.reload(), 3000);
                    return;
                  } else if (codeError && codeError.code !== 'PGRST116') {
                    throw codeError;
                  } else {
                    setShowStatusModal({
                      show: true,
                      type: 'error',
                      title: 'Invalid Code',
                      message: 'Invalid or expired access code. Please check and try again.'
                    });
                    return;
                  }
                }

                // Standard application path
                if (!accessCodeValue.trim() && selectedFiles.length === 0) {
                  setUploadError('Supporting documents are required.');
                  return;
                }

                const uploadedFileUrls: string[] = [];
                if (selectedFiles.length > 0) {
                  const bucketName = 'application-documents';
                  for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.id}/${Math.random()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);
                    uploadedFileUrls.push(publicUrl);
                  }
                }

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

                setShowStatusModal({
                  show: true,
                  type: 'success',
                  title: 'Submission Received!',
                  message: 'Application submitted successfully! Our team will review your documents within 3-5 business days.'
                });
                setShowSubmitConfirm(false);
                setSelectedFiles([]);
                setUploadError('');
              } catch (error: any) {
                console.error('Submission error:', error);
                setShowStatusModal({
                  show: true,
                  type: 'error',
                  title: 'Submission Failed',
                  message: `Failed to submit application: ${error.message}`
                });
              } finally {
                setIsSubmittingReview(false);
              }
            }}>
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100/50 text-blue-600">
                    <Award size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Become a Professional</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Unlock pro features and grow your pickleball presence.</p>
                </div>

                {/* Application Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Application Type</label>
                  <div className="relative">
                    <select
                      name="applicationType"
                      required
                      value={applicationType}
                      onChange={(e) => setApplicationType(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all"
                    >
                      <option value="">Select type...</option>
                      {!authorizedProRoles.includes('COACH') && !applications.some(a => a.playerId === currentUserId && a.requestedRole === 'COACH' && a.status === 'PENDING') && (
                        <option value="coach">Certified Coach</option>
                      )}
                      {!authorizedProRoles.includes('COURT_OWNER') && !applications.some(a => a.playerId === currentUserId && a.requestedRole === 'COURT_OWNER' && a.status === 'PENDING') && (
                        <option value="court_owner">Court Owner / Facility</option>
                      )}
                    </select>
                    <PlusCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Access Code */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                    Access Code (Promotional)
                    <span className="text-[9px] font-bold text-blue-500 normal-case italic">
                      {accessCodeValue.trim() ? "Applied" : "Optional"}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      name="accessCode"
                      type="text"
                      placeholder="e.g. PRO-JOIN-2024"
                      value={accessCodeValue}
                      onChange={(e) => setAccessCodeValue(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-mono font-black text-sm text-blue-600 focus:outline-none focus:border-blue-500 uppercase transition-all"
                    />
                    <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  </div>
                </div>

                {/* File Upload Zone */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Verification Documents {!accessCodeValue.trim() && <span className="text-red-500">*</span>}
                    </label>
                    <button type="button" onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)} className="text-slate-400 outline-none">
                      <HelpCircle size={16} />
                    </button>

                    {showHelp && (
                      <div className="absolute right-0 bottom-full mb-3 w-72 bg-white/95 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-slate-100/50 z-[120] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-blue-600">
                            <Shield size={16} />
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Verification Guide</p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-[9px] font-black text-slate-900 uppercase tracking-wider mb-2">Certified Coach Requirements:</p>
                              <ul className="text-[10px] text-slate-500 font-bold space-y-1.5 ml-1">
                                <li className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-100" /> Coaching Certificate
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-100" /> Valid Government ID
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-100" /> Professional Experience
                                </li>
                              </ul>
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-slate-900 uppercase tracking-wider mb-2">Court Owner Requirements:</p>
                              <ul className="text-[10px] text-slate-500 font-bold space-y-1.5 ml-1">
                                <li className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-100" /> Valid Business Permit
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-100" /> Facility Utility Bill
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-100" /> Valid Government ID
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Max 10MB per file</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">PDF, DOC, Images</p>
                          </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute right-2 top-full w-4 h-4 bg-white/95 border-r border-b border-slate-100/50 rotate-45 -translate-y-2 z-[-1]" />
                      </div>
                    )}
                  </div>

                  <div
                    className="border-2 border-dashed border-slate-100 bg-slate-50/50 rounded-2xl p-6 text-center hover:bg-slate-50 transition-all relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files) as File[];
                      if (files.length > 0) handleFileUpload(files);
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(Array.from(e.target.files || []) as File[])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <BookOpen className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-[10px] font-black uppercase text-slate-900">Upload Files</p>
                    <p className="text-[9px] font-bold text-slate-400">PDF, DOC, or Images</p>
                  </div>

                  {/* File List */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <BookOpen size={12} className="text-blue-500 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-900 truncate">{file.name}</p>
                          </div>
                          <button type="button" onClick={() => handleRemoveFile(index)} className="text-slate-300 hover:text-rose-600 transition-all p-1">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitConfirm(false);
                      setAccessCodeValue('');
                      setSelectedFiles([]);
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Apply Now'}
                  </button>
                </div>
              </div>
            </form>
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
      {/* Admin Logs Modal */}
      {
        showLogsModal && ReactDOM.createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh] z-[100]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter flex items-center gap-3">
                    <History className="text-indigo-600" /> System Activity.
                  </h3>
                  <p className="text-slate-500 font-medium text-sm mt-1">Real-time administrative and security events.</p>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-950 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                {activeLogs.length > 0 ? (
                  activeLogs.map((log, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 hover:bg-white transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${log.event_type === 'SECURITY' ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'}`}>
                            {log.event_type}
                          </span>
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{log.action}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">
                          {log.agent_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-900 leading-tight mb-1">{log.details}</p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                            Target: <span className="font-bold text-slate-700">{log.target_name}</span> • Agent: <span className="font-bold text-slate-700">{log.agent_name}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 opacity-30 uppercase font-black text-xs">No recent activity found</div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowLogsModal(false);
                    navigate('/admin?tab=audit');
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  Go to Audit Console <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Custom Status Modal (Success/Error) */}
      {
        showStatusModal.show && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className={`p-8 text-center ${showStatusModal.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${showStatusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {showStatusModal.type === 'success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
                </div>
                <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${showStatusModal.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {showStatusModal.title}
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  {showStatusModal.message}
                </p>
              </div>
              <div className="p-6 bg-white">
                <button
                  onClick={() => setShowStatusModal({ ...showStatusModal, show: false })}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all
                  ${showStatusModal.type === 'success'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200'
                      : 'bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700 hover:shadow-rose-200'
                    }`}
                >
                  GOT IT
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

    </div >
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