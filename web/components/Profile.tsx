
import React, { useState, useEffect } from 'react';
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
  BarChart3
} from 'lucide-react';
import { UserRole, SocialPost } from '../types';
import { supabase } from '../services/supabase';
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'security' | 'preferences' | 'billing' | 'stats'>('profile');
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('preferredLanguage') || 'en');
  const [isTranslating, setIsTranslating] = useState(false);

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
            // Set language preference from database
            if (data.preferred_language) {
              setSelectedLanguage(data.preferred_language);
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

      alert('Profile updated successfully!');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      alert('Failed to save changes: ' + err.message);
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

          {isCurrentUser ? (
            <button onClick={handleSave} disabled={isSaving} className={`bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 disabled:opacity-50 whitespace-nowrap`}>
              {isSaving ? 'SYNCING...' : 'SAVE CHANGES'} <Save size={16} />
            </button>
          ) : (
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
              Dashboard
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
                  src={profileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                  alt="Profile"
                  className="w-full h-full rounded-full bg-slate-50"
                />
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase">{displayName}</h2>
            <p className={`text-[10px] text-${themeColor}-600 font-black uppercase tracking-widest mt-1 mb-8`}>{displayRole.replace('_', ' ')}</p>

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
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Bell className="text-blue-600" /> Notification Channels
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Communication Methods</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold text-slate-900">Email Notifications</p>
                      <p className="text-xs text-slate-500">Updates sent to your primary email.</p>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`w-12 h-7 rounded-full transition-all ${emailNotifications ? 'bg-blue-600' : 'bg-slate-300'}`}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold text-slate-900">Push Notifications</p>
                      <p className="text-xs text-slate-500">Real-time alerts on your device.</p>
                    </div>
                    <button
                      onClick={() => setPushNotifications(!pushNotifications)}
                      className={`w-12 h-7 rounded-full transition-all ${pushNotifications ? 'bg-blue-600' : 'bg-slate-300'}`}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold text-slate-900">SMS Notifications</p>
                      <p className="text-xs text-slate-500">Urgent updates via text message.</p>
                    </div>
                    <button
                      onClick={() => setSmsNotifications(!smsNotifications)}
                      className={`w-12 h-7 rounded-full transition-all ${smsNotifications ? 'bg-blue-600' : 'bg-slate-300'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Eye className="text-emerald-600" /> Privacy & Discovery
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Visibility</p>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={profileVisibility === 'public'}
                      onChange={() => setProfileVisibility('public')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Public</p>
                      <p className="text-xs text-slate-500">Visible to everyone on PicklePlay</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={profileVisibility === 'friends'}
                      onChange={() => setProfileVisibility('friends')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Friends Only</p>
                      <p className="text-xs text-slate-500">Only visible to connected players</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={profileVisibility === 'private'}
                      onChange={() => setProfileVisibility('private')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Private</p>
                      <p className="text-xs text-slate-500">Hidden from search results</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <Shield className="text-indigo-600" /> Account Security
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Change Password</p>
                    <p className="text-xs text-slate-500">Update your account password</p>
                  </div>
                  <button className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all">
                    Update
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Add an extra layer of security</p>
                  </div>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`w-12 h-7 rounded-full transition-all ${twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">Active Sessions</p>
                    <p className="text-xs text-slate-500">Manage your active logins</p>
                  </div>
                  <button className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all">
                    View
                  </button>
                </div>
              </div>
            </div>
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
            <div className="bg-white p-10 rounded-3xl border border-slate-200/50 shadow-sm space-y-8">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-3 uppercase tracking-tight">
                <CreditCard className="text-amber-600" /> Wallet & Billing
              </h3>

              <div className="space-y-6 border-t border-slate-100 pt-8">
                <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Account Balance</p>
                  <p className="text-3xl font-black text-slate-950">₱5,250.00</p>
                </div>

                <div className="space-y-3">
                  <button className="w-full py-3 px-6 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all">
                    Add Funds
                  </button>
                  <button className="w-full py-3 px-6 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                    Billing History
                  </button>
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
                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Bookings</p>
                  <p className="text-2xl font-black text-slate-950">24</p>
                </div>

                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Courts Visited</p>
                  <p className="text-2xl font-black text-slate-950">8</p>
                </div>

                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Hours</p>
                  <p className="text-2xl font-black text-slate-950">36</p>
                </div>

                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Member Since</p>
                  <p className="text-sm font-black text-slate-950">Jan 2024</p>
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
