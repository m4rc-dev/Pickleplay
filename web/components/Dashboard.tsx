

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
  HelpCircle
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string>('');

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

    // Fetch Metrics based on Role
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
    }

    return () => clearTimeout(timer);
  }, [userRole]);

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
            <StatCard label="Booking Revenue" value="₱12,450" change="+14%" icon={<DollarSign className="text-amber-600" />} color="amber" />
            <StatCard label="Court Utilization" value="92%" change="+5%" icon={<Activity className="text-amber-600" />} color="amber" />
            <StatCard label="Player Retention" value="76%" change="+2%" icon={<UserCheck className="text-amber-600" />} color="amber" />
          </>
        );
      case 'COACH':
        return (
          <>
            <StatCard label="Students" value="48" change="+6" icon={<GraduationCap className="text-rose-600" />} color="rose" />
            <StatCard label="Clinic Completion" value="88%" change="+10%" icon={<Award className="text-rose-600" />} color="rose" />
            <StatCard label="Lesson Requests" value="12" change="New" icon={<BookOpen className="text-rose-600" />} color="rose" />
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
              onClick={() => userRole === 'ADMIN' ? setShowBroadcastModal(true) : null}
              className={`whitespace-nowrap bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-${themeColor}-100 transition-all flex items-center gap-2 md:gap-3`}
            >
              <PlusCircle size={18} />
              {userRole === 'ADMIN' ? 'Broadcast' : userRole === 'COURT_OWNER' ? 'Open Slot' : userRole === 'COACH' ? 'New Clinic' : 'Log DUPR'}
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
                <LineChart data={PERFORMANCE_DATA} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
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

      {/* Submit Docs Application Modal */}
      {showSubmitConfirm && ReactDOM.createPortal(
        <div className={`fixed top-0 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-72'} left-0 right-0 bottom-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-40 p-6 animate-fade-in overflow-y-auto`}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-scale-in my-8">
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

                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Not authenticated');

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

                {/* File Upload */}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">
                      Supporting Documents
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
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitConfirm(false);
                      setSelectedFiles([]);
                      setUploadError('');
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
      {/* Broadcast Modal */}
      {showBroadcastModal && ReactDOM.createPortal(
        <div className={`fixed top-0 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-72'} left-0 right-0 bottom-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300`}>
          <div className="bg-white w-full max-w-lg rounded-[48px] p-10 md:p-14 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
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
      )}
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