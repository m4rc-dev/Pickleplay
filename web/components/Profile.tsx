
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  User,
  MapPin,
  Save,
  Sparkles,
  UserPlus,
  UserCheck,
  Lock,
  Shield,
  Bell,
  Eye,
  Globe,
  CreditCard,
  BarChart3,
  AlertCircle,
  CheckCircle,
  LogOut
} from 'lucide-react';
import { UserRole, SocialPost } from '../types';
import { supabase, updatePassword, enableTwoFactorAuth, disableTwoFactorAuth, getActiveSessions, revokeSession, getSecuritySettings, createSession } from '../services/supabase';
import { sendEmailCode, verifyCode, generateBackupCodes, saveBackupCodes } from '../services/twoFactorAuth';
import { Skeleton } from './ui/Skeleton';
import NotFound from './NotFound';
import { PostCard } from './Community';

interface ProfileProps {
  userRole: UserRole;
  authorizedProRoles: UserRole[];
  currentUserId: string | null;
  followedUsers: string[];
  onFollow: (userId: string, userName: string) => void;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  onRoleSwitch?: (newRole: UserRole) => void;
}

const Profile: React.FC<ProfileProps> = ({ userRole, authorizedProRoles, currentUserId, followedUsers, onFollow, posts, setPosts, onRoleSwitch }) => {
  const { userId } = useParams<{ userId?: string }>();
  const isCurrentUser = !userId || userId === 'player-current';
  const profileId = isCurrentUser ? 'player-current' : userId;

  const [profileData, setProfileData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Editable fields
  const [editedName, setEditedName] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedBio, setEditedBio] = useState('');

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [tempVisibility, setTempVisibility] = useState('public');
  const [savedVisibility, setSavedVisibility] = useState('public');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'security' | 'preferences' | 'billing' | 'stats'>('profile');
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isTranslating, setIsTranslating] = useState(false);

  // Security-specific state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 2FA Configuration State
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [codeSent, setCodeSent] = useState(false); // Track if code was sent
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Confirmation Dialog State
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Profile message state
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  // Privacy message state
  const [privacyMessage, setPrivacyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Activity stats state
  const [activityStats, setActivityStats] = useState({
    totalBookings: 0,
    courtsVisited: 0,
    totalHours: 0,
    memberSince: ''
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Password strength calculator
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordStrength < 50) {
      setSecurityMessage({ type: 'error', text: 'Password is too weak. Use uppercase, numbers, and symbols' });
      return;
    }

    try {
      const result = await updatePassword(newPassword);
      if (result.success) {
        setSecurityMessage({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(false);
        setTimeout(() => setSecurityMessage(null), 3000);
      } else {
        setSecurityMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to update password' });
    }
  };

  const handleToggleTwoFactor = async () => {
    if (!currentUserId || !isCurrentUser) return;

    try {
      let result;
      if (twoFactorEnabled) {
        result = await disableTwoFactorAuth(currentUserId);
      } else {
        result = await enableTwoFactorAuth(currentUserId);
      }

      if (result.success) {
        setTwoFactorEnabled(!twoFactorEnabled);
        setSecurityMessage({ type: 'success', text: result.message });
        setTimeout(() => setSecurityMessage(null), 3000);
      } else {
        setSecurityMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to update 2FA settings' });
    }
  };

  const loadActiveSessions = async () => {
    if (!currentUserId || !isCurrentUser) return;

    setIsLoadingSessions(true);
    try {
      const result = await getActiveSessions(currentUserId);
      if (result.success) {
        // Sort by last_activity, most recent first
        const sorted = result.data.sort((a: any, b: any) => {
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
        });
        setActiveSessions(sorted);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const result = await revokeSession(sessionId);
      if (result.success) {
        setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
        setSecurityMessage({ type: 'success', text: 'Session revoked successfully' });
        setTimeout(() => setSecurityMessage(null), 3000);
      } else {
        setSecurityMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to revoke session' });
    }
  };

  const handleSetup2FA = async () => {
    if (!currentUserId || !isCurrentUser) return;

    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user?.email) {
        const result = await sendEmailCode(authUser.user.email, currentUserId);
        if (result.success) {
          setCodeSent(true); // Mark code as sent
          setSecurityMessage({ type: 'success', text: `Code sent to ${authUser.user.email}` });
        } else {
          setSecurityMessage({ type: 'error', text: result.message });
        }
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Failed to send code' });
    }
  };

  const handleVerifyCode = async () => {
    if (!currentUserId || !isCurrentUser) return;
    if (!verificationCode || verificationCode.length !== 6) {
      setSecurityMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyCode(currentUserId, verificationCode);
      if (result.success) {
        setSecurityMessage({ type: 'success', text: result.message });
        
        // Generate and save backup codes
        const codes = generateBackupCodes();
        await saveBackupCodes(currentUserId, codes);
        setBackupCodes(codes);
        
        // Update 2FA status
        await enableTwoFactorAuth(currentUserId);
        setTwoFactorEnabled(true);
        
        // Don't auto-close - let user see and copy backup codes
        // User can manually click Cancel when done
      } else {
        setSecurityMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'Verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (isCurrentUser && activeTab === 'security') {
      loadActiveSessions();
    }
  }, [activeTab]);

  useEffect(() => {
    const loadActivityStats = async () => {
      if (!profileId || activeTab !== 'stats') return;

      setIsLoadingStats(true);
      try {
        let targetId = profileId;
        
        if (profileId === 'player-current') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            targetId = session.user.id;
          }
        }

        // Get all bookings for the user
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, court_id, start_time, end_time, status')
          .eq('player_id', targetId);

        if (bookingsError) throw bookingsError;

        // Calculate total bookings (all statuses)
        const totalBookings = bookings?.length || 0;

        // Calculate unique courts visited
        const uniqueCourts = new Set(bookings?.map(b => b.court_id) || []);
        const courtsVisited = uniqueCourts.size;

        // Calculate total hours (only completed bookings)
        let totalHours = 0;
        bookings?.forEach(booking => {
          if (booking.start_time && booking.end_time) {
            const start = new Date(`2000-01-01T${booking.start_time}`);
            const end = new Date(`2000-01-01T${booking.end_time}`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });

        // Get member since date from profile
        const memberSince = profileData?.created_at 
          ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : '';

        setActivityStats({
          totalBookings,
          courtsVisited,
          totalHours: Math.round(totalHours),
          memberSince
        });
      } catch (err) {
        console.error('Error loading activity stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadActivityStats();
  }, [activeTab, profileId, profileData]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        let targetId = userId;

        // If no userId in URL, get current session
        if (!targetId || targetId === 'player-current') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            targetId = session.user.id;
          }
        }

        if (targetId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetId)
            .single();

          if (!error && data) {
            setProfileData(data);
            // Initialize editable fields
            setEditedName(data.full_name || '');
            setEditedLocation(data.location || '');
            setEditedBio(data.bio || '');
            setAvatarUrl(data.avatar_url || '');
            // Set language preference from database
            if (data.preferred_language) {
              setSelectedLanguage(data.preferred_language);
            }
            // Load privacy settings
            if (data.profile_visibility) {
              setProfileVisibility(data.profile_visibility);
              setTempVisibility(data.profile_visibility);
              setSavedVisibility(data.profile_visibility);
            }

            // Load security settings for current user
            if (isCurrentUser) {
              const securityResult = await getSecuritySettings(targetId);
              if (securityResult.success && securityResult.data) {
                setTwoFactorEnabled(securityResult.data.two_factor_enabled || false);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handlePrivacyChange = async () => {
    if (!currentUserId || !isCurrentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_visibility: tempVisibility })
        .eq('id', currentUserId);

      if (error) throw error;

      setProfileVisibility(tempVisibility);
      setSavedVisibility(tempVisibility);
      setPrivacyMessage({ type: 'success', text: 'Privacy settings updated!' });
      setTimeout(() => setPrivacyMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating privacy settings:', err);
      setPrivacyMessage({ type: 'error', text: 'Failed to update settings' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUserId || !isCurrentUser || !e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
    
    setIsUploadingAvatar(true);
    
    try {
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUserId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setAvatarUrl(publicUrl);
      setProfileData((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setProfileMessage({ type: 'success', text: 'Avatar updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setProfileMessage({ type: 'error', text: `Failed to upload avatar: ${err.message}` });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!currentUserId || !isCurrentUser) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedName,
          location: editedLocation,
          bio: editedBio
        })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update local state
      setProfileData((prev: any) => ({
        ...prev,
        full_name: editedName,
        location: editedLocation,
        bio: editedBio
      }));

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setProfileMessage({ type: 'error', text: `Failed to save changes: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLike = (postId: string) => {
    setPosts(currentPosts => currentPosts.map(p => {
      if (p.id === postId) {
        const isLiked = p.likes.includes('player-current');
        const newLikes = isLiked ? p.likes.filter(id => id !== 'player-current') : [...p.likes, 'player-current'];
        return { ...p, likes: newLikes };
      }
      return p;
    }));
  };

  const handleLanguageChange = async (language: string) => {
    setIsTranslating(true);
    try {
      if (!currentUserId || !isCurrentUser) return;

      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update local state
      setSelectedLanguage(language);
      localStorage.setItem('preferredLanguage', language);
      
      alert('✅ Language preference saved successfully!');
    } catch (err: any) {
      console.error('Error saving language preference:', err);
      alert(`❌ Failed to save language: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto"><Skeleton className="w-full h-96" /></div>;
  }

  if (!profileData) {
    return <NotFound />;
  }

  const themeColor = profileData.active_role === 'COACH' ? 'rose' : profileData.active_role === 'ADMIN' ? 'indigo' : 'blue';
  const isFollowing = profileId ? followedUsers.includes(profileId) : false;
  const userPosts = posts.filter(post => post.authorId === profileId);
  const displayRole = profileData.active_role || 'PLAYER';
  const displayName = profileData.full_name || 'Player';

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className={`text-xs font-black text-${themeColor}-600 uppercase tracking-[0.4em] mb-2`}>User Identity / {displayRole}</p>
            <h1 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tighter uppercase">{displayName}.</h1>
          </div>

          {!isCurrentUser && (
            <button onClick={() => onFollow(profileId!, displayName)} className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${isFollowing ? `bg-blue-600 text-white shadow-xl shadow-blue-100` : `bg-slate-900 text-white hover:bg-blue-600 shadow-xl`}`}>
              {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Navigation Tabs - Only show for current user */}
        {isCurrentUser && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <User size={14} className="inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'notifications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <Bell size={14} className="inline mr-2" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'privacy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <Eye size={14} className="inline mr-2" />
              Privacy
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <Shield size={14} className="inline mr-2" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'preferences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <Globe size={14} className="inline mr-2" />
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'billing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <CreditCard size={14} className="inline mr-2" />
              Billing
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              <BarChart3 size={14} className="inline mr-2" />
              Activity
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm text-center">
            <div className="relative inline-block mb-6">
              <div className={`w-32 h-32 rounded-full p-1 border-4 border-${themeColor}-200 shadow-2xl group relative`}>
                <img
                  src={avatarUrl || profileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                  alt="Profile"
                  className="w-full h-full rounded-full bg-slate-50"
                />
                {isCurrentUser && (
                  <>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {isUploadingAvatar ? (
                        <div className="text-white text-xs font-bold">Uploading...</div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" x2="12" y1="3" y2="15"></line>
                        </svg>
                      )}
                    </label>
                  </>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">{displayName}</h2>
            <p className={`text-[10px] text-${themeColor}-600 font-black uppercase tracking-widest mt-1 mb-8`}>
              {displayRole.replace('_', ' ')}
            </p>
            {/* Mobile Role Switcher (md:hidden) */}
            {isCurrentUser && (
              <div className="md:hidden mt-4">
                  {authorizedProRoles.length === 1 && (
                    <button
                      onClick={() => onRoleSwitch && onRoleSwitch(displayRole === 'PLAYER' ? authorizedProRoles[0] : 'PLAYER')}
                      className="w-full p-3 rounded-2xl flex items-center justify-between transition-all group border bg-slate-900 border-slate-800 text-white hover:bg-slate-800 mt-2"
                    >
                      <span className="font-black text-[10px] uppercase tracking-widest">
                        {displayRole === 'PLAYER' ? 'Pro Mode' : `${displayRole.replace('_', ' ')} Mode`}
                      </span>
                      <span className="font-bold text-[9px] uppercase tracking-widest text-slate-400 ml-2">
                        Switch to {displayRole === 'PLAYER' ? authorizedProRoles[0].replace('_', ' ') : 'Player'}
                      </span>
                    </button>
                  )}
                  {authorizedProRoles.length >= 2 && (
                    <div className="space-y-2 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Switch Role</span>
                      <button
                        onClick={() => onRoleSwitch && onRoleSwitch('PLAYER')}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                          displayRole === 'PLAYER'
                            ? 'bg-lime-400 text-slate-900'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <User size={16} />
                        <span className="font-black text-[11px] uppercase tracking-widest">Player</span>
                        {displayRole === 'PLAYER' && <div className="ml-auto w-2 h-2 rounded-full bg-slate-900" />}
                      </button>
                      {authorizedProRoles.map((proRole) => (
                        <button
                          key={proRole}
                          onClick={() => onRoleSwitch && onRoleSwitch(proRole)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                            displayRole === proRole
                              ? 'bg-lime-400 text-slate-900'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {proRole === 'COACH' ? <UserCheck size={16} /> : <UserPlus size={16} />}
                          <span className="font-black text-[11px] uppercase tracking-widest">{proRole.replace('_', ' ')}</span>
                          {displayRole === proRole && <div className="ml-auto w-2 h-2 rounded-full bg-slate-900" />}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DUPR</span>
                <span className="font-black text-slate-950 text-sm">{profileData.dupr_rating?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matches</span>
                <span className="font-black text-slate-950 text-sm">{profileData.matches_played || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {/* Dashboard Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-10">
              <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-10">
                {/* Profile Message */}
                {profileMessage && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl ${profileMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    {profileMessage.type === 'success' ? (
                      <CheckCircle className="text-emerald-600 flex-shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                    )}
                    <p className={`text-sm font-bold ${profileMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                      {profileMessage.text}
                    </p>
                  </div>
                )}

                <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                  <User className={`text-${themeColor}-600`} /> Player Identity
                </h3>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                    {isCurrentUser ? (
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-slate-700 transition-all outline-none"
                        placeholder="Enter your name"
                      />
                    ) : (
                      <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700">{displayName}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Location</label>
                    {isCurrentUser ? (
                      <div className="relative">
                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={editedLocation}
                          onChange={(e) => setEditedLocation(e.target.value)}
                          className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-700 transition-all outline-none"
                          placeholder="e.g., Metro Manila, PH"
                        />
                      </div>
                    ) : (
                      <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700 flex items-center gap-3">
                        <MapPin className="text-slate-400" size={16} />
                        {profileData.location || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Short Manifesto (Bio)</label>
                    {isCurrentUser ? (
                      <textarea
                        value={editedBio}
                        onChange={(e) => setEditedBio(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-50/80 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-slate-700 leading-relaxed transition-all outline-none resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <div className="w-full bg-slate-50/80 rounded-2xl py-4 px-6 font-bold text-slate-700 leading-relaxed">{profileData.bio || 'No bio yet.'}</div>
                    )}
                  </div>

                  {/* Save Changes Button */}
                  {isCurrentUser && (
                    <div className="pt-6 border-t border-slate-100">
                      <button
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={isSaving}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSaving ? 'SAVING...' : 'SAVE CHANGES'} <Save size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-base font-black text-slate-950 uppercase tracking-tight px-4">
                  Player Feed
                </h3>
                {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={() => handleLike(post.id)}
                      isExpanded={expandedComments[post.id]}
                      onToggleComments={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      postsState={posts}
                      setPostsState={setPosts}
                    />
                  ))
                ) : (
                  <div className="bg-white text-center p-12 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">This player hasn't posted anything yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
                  <Bell className="text-blue-600" size={40} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Coming Soon</h3>
                  <p className="text-slate-500 font-medium max-w-md">Notification settings and preferences will be available in a future update.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-full">
                  <Sparkles className="text-blue-600" size={16} />
                  <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Under Development</span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              {/* Success/Error Message */}
              {privacyMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  privacyMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {privacyMessage.type === 'success' ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                  <p className={`text-sm font-semibold ${
                    privacyMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {privacyMessage.text}
                  </p>
                </div>
              )}

              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Eye className="text-emerald-600" /> Privacy & Discovery
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Visibility</p>
                
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    tempVisibility === 'public' 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-emerald-200'
                  } ${isCurrentUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="radio"
                      checked={tempVisibility === 'public'}
                      onChange={() => setTempVisibility('public')}
                      className="w-4 h-4"
                      disabled={!isCurrentUser}
                    />
                    <div>
                      <p className="font-bold text-slate-900">Public</p>
                      <p className="text-xs text-slate-500">Visible to everyone on PicklePlay</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    tempVisibility === 'friends' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-blue-200'
                  } ${isCurrentUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="radio"
                      checked={tempVisibility === 'friends'}
                      onChange={() => setTempVisibility('friends')}
                      className="w-4 h-4"
                      disabled={!isCurrentUser}
                    />
                    <div>
                      <p className="font-bold text-slate-900">Friends Only</p>
                      <p className="text-xs text-slate-500">Only visible to connected players</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    tempVisibility === 'private' 
                      ? 'bg-slate-100 border-slate-300' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  } ${isCurrentUser ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="radio"
                      checked={tempVisibility === 'private'}
                      onChange={() => setTempVisibility('private')}
                      className="w-4 h-4"
                      disabled={!isCurrentUser}
                    />
                    <div>
                      <p className="font-bold text-slate-900">Private</p>
                      <p className="text-xs text-slate-500">Hidden from search results</p>
                    </div>
                  </label>
                </div>

                {/* Apply Changes Button - Only show when there are unsaved changes */}
                {isCurrentUser && tempVisibility !== savedVisibility && (
                  <button
                    onClick={handlePrivacyChange}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <Save size={20} />
                    Apply Changes
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              {/* Only show security message here when modals are closed */}
              {securityMessage && !show2FASetup && !showPasswordModal && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl ${securityMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  {securityMessage.type === 'success' ? (
                    <CheckCircle className="text-emerald-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                  <p className={`text-sm font-bold ${securityMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                    {securityMessage.text}
                  </p>
                </div>
              )}

              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Shield className="text-indigo-600" /> Account Security
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                {/* Change Password Section */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Change Password</p>
                    <p className="text-xs text-slate-500">Update your account password</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all"
                  >
                    Update
                  </button>
                </div>

                {/* Two-Factor Authentication Section */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Add an extra layer of security with SMS or Email</p>
                    <p className="text-xs text-slate-400 mt-2">Status: {twoFactorEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!twoFactorEnabled) {
                        setShow2FASetup(true);
                      } else {
                        setTwoFactorEnabled(false);
                        disableTwoFactorAuth(currentUserId!);
                        setSecurityMessage({ type: 'success', text: '2FA disabled' });
                      }
                    }}
                    className={`px-6 py-2 rounded-xl font-bold text-xs transition-all ${
                      twoFactorEnabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {/* Active Sessions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold text-slate-900">Active Sessions</p>
                      <p className="text-xs text-slate-500">Manage your active logins</p>
                    </div>
                  </div>

                  {isLoadingSessions ? (
                    <div className="p-4 text-center text-slate-500">Loading sessions...</div>
                  ) : activeSessions.length > 0 ? (
                    <div className="space-y-3 ml-4">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">{session.device_name || 'Unknown Device'}</p>
                            <p className="text-xs text-slate-500">{session.ip_address || 'Unknown IP'}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Last active: {new Date(session.last_activity).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-2 whitespace-nowrap ml-3"
                          >
                            <LogOut size={14} />
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">No active sessions to display</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2FA Setup Modal */}
          {show2FASetup && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-100 rounded-2xl">
                    <Shield size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-950">Enable 2FA</h4>
                    <p className="text-xs text-slate-500 mt-1">Secure your account</p>
                  </div>
                </div>

                {/* Security Message inside modal */}
                {securityMessage && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 ${securityMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    {securityMessage.type === 'success' ? (
                      <CheckCircle className="text-emerald-600 flex-shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                    )}
                    <p className={`text-sm font-bold ${securityMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                      {securityMessage.text}
                    </p>
                  </div>
                )}

                {!codeSent && backupCodes.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      A 6-digit verification code will be sent to your registered email address.
                    </p>

                    {/* Send Code Button */}
                    <button
                      onClick={handleSetup2FA}
                      className="w-full py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                    >
                      Send Code to Email
                    </button>
                  </div>
                ) : backupCodes.length === 0 ? (
                  <div className="space-y-5">
                    {/* Code Verification */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-3">Enter verification code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl py-4 px-4 font-black text-slate-900 text-center text-3xl tracking-[0.5em] transition-all outline-none"
                        placeholder="000000"
                      />
                    </div>

                    {/* Verify Button */}
                    <button
                      onClick={handleVerifyCode}
                      disabled={isVerifying}
                      className="w-full py-3 px-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={18} className="text-yellow-700" />
                        <p className="text-sm font-black text-yellow-900 uppercase tracking-wider">Backup Codes</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {backupCodes.map((code, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl font-mono text-sm font-bold text-slate-800 text-center shadow-sm">
                            {code}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-yellow-900 font-medium leading-relaxed">⚠️ Save these codes in a secure location. You'll need them if you lose access to your email.</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => {
                      setShow2FASetup(false);
                      setCodeSent(false);
                      setVerificationCode('');
                      setBackupCodes([]);
                      setSecurityMessage(null);
                    }}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all"
                  >
                    {backupCodes.length > 0 ? 'Close' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Save Confirmation Modal */}
          {showSaveConfirm && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <Save size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-950">Save Changes?</h4>
                    <p className="text-xs text-slate-500 mt-1">Confirm your action</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to save these changes to your profile? This will update your display name, location, and bio.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveConfirm(false)}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveConfirm(false);
                      handleSave();
                    }}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Password Change Modal */}
          {showPasswordModal && ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <h4 className="text-xl font-black text-slate-950 mb-6 flex items-center gap-2">
                  <Lock size={20} className="text-indigo-600" /> Change Password
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                      placeholder="Enter new password"
                    />
                    {newPassword && (
                      <div className="mt-2">
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              passwordStrength < 30 ? 'bg-red-500 w-1/3' :
                              passwordStrength < 60 ? 'bg-yellow-500 w-2/3' :
                              'bg-emerald-500 w-full'
                            }`}
                          />
                        </div>
                        <p className={`text-xs mt-1 font-bold ${
                          passwordStrength < 30 ? 'text-red-600' :
                          passwordStrength < 60 ? 'text-yellow-600' :
                          'text-emerald-600'
                        }`}>
                          Strength: {passwordStrength < 30 ? 'Weak' : passwordStrength < 60 ? 'Fair' : 'Strong'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all outline-none"
                      placeholder="Confirm new password"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-600 mt-1 font-bold">Passwords do not match</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setSecurityMessage(null);
                    }}
                    className="flex-1 py-3 px-4 bg-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePassword}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Globe className="text-rose-600" /> Regional & Formats
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Language</label>
                  <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-2xl py-3 px-4 font-bold text-slate-700 transition-all"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="fil">🇵🇭 Filipino (Tagalog)</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="zh">🇨🇳 Chinese (Mandarin)</option>
                    <option value="ja">🇯🇵 Japanese</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timezone</label>
                  <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-700">
                    🇵🇭 Asia/Manila (PHT) UTC+8
                  </div>
                  <p className="text-[10px] text-slate-500">PicklePlay Philippines - Fixed to Manila Timezone</p>
                </div>

                <button
                  onClick={() => handleLanguageChange(selectedLanguage)}
                  disabled={isTranslating}
                  className="w-full py-3 px-6 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTranslating ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center">
                  <CreditCard className="text-amber-600" size={40} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Coming Soon</h3>
                  <p className="text-slate-500 font-medium max-w-md">Wallet, billing, and payment features will be available in a future update.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 rounded-full">
                  <Sparkles className="text-amber-600" size={16} />
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider">Under Development</span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Stats Tab */}
          {activeTab === 'stats' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <BarChart3 className="text-cyan-600" /> Activity Stats
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-100 pt-8">
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl min-h-[120px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Total Bookings</p>
                  {isLoadingStats ? (
                    <div className="flex justify-center items-center flex-1">
                      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-slate-950">{activityStats.totalBookings}</p>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl min-h-[120px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Courts Visited</p>
                  {isLoadingStats ? (
                    <div className="flex justify-center items-center flex-1">
                      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-slate-950">{activityStats.courtsVisited}</p>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl min-h-[120px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Total Hours</p>
                  {isLoadingStats ? (
                    <div className="flex justify-center items-center flex-1">
                      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-slate-950">{activityStats.totalHours}</p>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl min-h-[120px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Member Since</p>
                  {isLoadingStats ? (
                    <div className="flex justify-center items-center flex-1">
                      <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <p className="text-lg font-black text-slate-950">{activityStats.memberSince || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
