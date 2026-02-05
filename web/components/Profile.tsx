
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  MapPin,
  Save,
  Sparkles,
  UserPlus,
  UserCheck
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className={`text-xs font-black text-${themeColor}-600 uppercase tracking-[0.4em] mb-4`}>User Identity / {displayRole}</p>
          <h1 className="text-5xl font-black text-slate-950 tracking-tighter uppercase">{displayName}.</h1>
        </div>

        {isCurrentUser ? (
          <button onClick={handleSave} disabled={isSaving} className={`bg-slate-900 hover:bg-slate-800 text-white h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 disabled:opacity-50`}>
            {isSaving ? 'SYNCING...' : 'SAVE CHANGES'} <Save size={18} />
          </button>
        ) : (
          <button onClick={() => onFollow(profileId!, displayName)} className={`h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${isFollowing ? `bg-blue-600 text-white shadow-xl shadow-blue-100` : `bg-slate-900 text-white hover:bg-blue-600 shadow-xl`}`}>
            {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
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
            <p className={`text-[10px] text-${themeColor}-600 font-black uppercase tracking-widest mt-1 mb-8`}>
              {displayRole.replace('_', ' ')}
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
            </p>

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

        <div className="lg:col-span-2 space-y-10">
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
      </div>
    </div>
  );
};

export default Profile;
