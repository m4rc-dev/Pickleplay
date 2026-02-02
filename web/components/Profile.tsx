import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  Medal,
  Activity,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  RefreshCw
} from 'lucide-react';
import { UserRole, SocialPost } from '../types';
import { supabase } from '../services/supabase';
import { Skeleton } from './ui/Skeleton';
import NotFound from './NotFound';

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

  if (isLoading) {
    return <div className="max-w-7xl mx-auto"><Skeleton className="w-full h-96" /></div>;
  }

  if (!profileData) {
    return <NotFound />;
  }

  const isTargetAdmin = profileData.active_role === 'ADMIN';

  const stats = isTargetAdmin ? [
    { label: "Access Level", value: "Root", icon: ShieldCheck },
    { label: "Hierarchy", value: "Senior", icon: Zap },
    { label: "Security", value: "Encrypted", icon: Lock },
  ] : [
    { label: "Matches Played", value: profileData.matches_played || "0", icon: Activity },
    { label: "Win Rate", value: `${profileData.win_rate || 0}%`, icon: Medal },
    { label: "Skill Level", value: profileData.dupr_rating?.toFixed(1) || "0.0", icon: User },
  ];

  return (
    <div className="pb-24 pt-2 px-4 md:px-8 max-w-7xl mx-auto animate-fade-in">
      <div className="relative mb-24">
        {/* Cover Photo */}
        <div className="h-48 rounded-3xl bg-gradient-to-r from-slate-700 to-slate-800 overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-600/10" />
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute -bottom-16 left-6 md:left-10 flex items-center gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-slate-700 overflow-hidden shadow-xl">
            {profileData.avatar ? (
              <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-600 text-3xl font-black text-slate-400">
                {(profileData.full_name || 'A')[0]}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{profileData.full_name || 'Anonymous'}</h1>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em]">{profileData.active_role || 'PLAYER'}</p>

            {/* Role Switcher - Show if user has professional roles available */}
            {isCurrentUser && authorizedProRoles.length > 0 && (
              <div className="mt-3 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors text-slate-400`}>
                  Mode: <span className="text-blue-600 ml-1">{profileData.active_role.replace('_', ' ')}</span>
                </span>
                <button
                  onClick={async () => {
                    try {
                      // Define the role sequence for cycling: PLAYER -> pro_roles[0] -> pro_roles[1] -> ... -> PLAYER
                      let newRole: UserRole = 'PLAYER';
                      const currentActive = profileData.active_role as UserRole;

                      if (currentActive === 'PLAYER') {
                        newRole = authorizedProRoles[0];
                      } else {
                        const currentIndex = authorizedProRoles.indexOf(currentActive);
                        if (currentIndex !== -1 && currentIndex < authorizedProRoles.length - 1) {
                          newRole = authorizedProRoles[currentIndex + 1];
                        } else {
                          newRole = 'PLAYER';
                        }
                      }

                      if (onRoleSwitch) {
                        onRoleSwitch(newRole);
                      } else {
                        // Fallback for simulation
                        setProfileData({ ...profileData, active_role: newRole });
                        window.location.reload();
                      }
                    } catch (err) {
                      console.error('Role switch error:', err);
                      alert('Failed to switch role');
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Cycle Mode"
                >
                  <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <button className="p-3 bg-white/90 hover:bg-white rounded-full transition-all shadow-lg text-slate-700">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bio Section */}
      {profileData.bio && (
        <div className="mt-16 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">About</h3>
            <p className="text-slate-700 font-medium leading-relaxed">{profileData.bio}</p>
          </div>
        </div>
      )}

      <div className={profileData.bio ? "" : "mt-16"}>
        {/* Stats Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {isTargetAdmin ? "System Access Status" : "Player Stats"}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all">
                  <Icon className={`w-6 h-6 ${isTargetAdmin ? 'text-indigo-600' : 'text-blue-600'} mb-2`} />
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide font-bold mt-1">{stat.label}</span>
                </div>
              );
            })}
          </div>

          <h2 className="text-xl font-black text-slate-900 mt-8 uppercase tracking-tight">
            {isTargetAdmin ? "Platform Activity" : "Recent Matches"}
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 py-12 shadow-sm">
            <p className="font-medium">
              {isTargetAdmin ? "No recent administrative logs." : "No recent match history available."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
