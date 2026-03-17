import React from 'react';
import { MapPin, Award, MessageCircle, UserPlus, UserCheck, CalendarPlus, Swords, ChevronRight, Loader2 } from 'lucide-react';

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  dupr_rating?: number;
  location?: string;
  bio?: string;
  player_stats?: any;
}

interface PlayerCardProps {
  player: Player;
  onSendRequest: (player: Player) => void;
  onMessage: (userId: string) => void;
  onFollow: (userId: string) => void;
  onInvite: (player: Player) => void;
  onViewProfile: (userId: string) => void;
  isFollowing: boolean;
  isFollowLoading?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onSendRequest,
  onMessage,
  onFollow,
  onInvite,
  onViewProfile,
  isFollowing,
  isFollowLoading = false,
}) => {
  const hasDupr = player.dupr_rating != null && player.dupr_rating > 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer">

      {/* Top row: avatar + info */}
      <div className="flex items-center gap-3 p-4 pb-3">
        {/* Avatar */}
        <button
          onClick={() => onViewProfile(player.id)}
          className="relative shrink-0 rounded-xl overflow-hidden w-12 h-12 ring-2 ring-slate-100 hover:ring-blue-400 transition-all"
        >
          <img
            src={
              player.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=1e40af&color=fff&size=96`
            }
            alt={player.full_name}
            className="w-full h-full object-cover"
          />
        </button>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onViewProfile(player.id)}
            className="text-left flex items-center gap-0.5 group/name w-full cursor-pointer"
          >
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover/name:text-blue-600 group-hover/name:underline transition-all truncate">
              {player.full_name}
            </span>
            <ChevronRight size={12} className="text-slate-300 group-hover/name:text-blue-400 transition-colors shrink-0" />
          </button>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {hasDupr && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-blue-600 uppercase tracking-wider">
                <Award size={9} />
                DUPR {player.dupr_rating!.toFixed(2)}
              </span>
            )}
            {player.location && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
                <MapPin size={9} className="shrink-0" />
                {player.location}
              </span>
            )}
          </div>
        </div>

        {/* Following pill — top right */}
        {isFollowing && (
          <span className="shrink-0 bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
            Following
          </span>
        )}
      </div>

      {/* Bio */}
      {player.bio && (
        <p className="text-[11px] text-slate-500 px-4 pb-3 leading-relaxed line-clamp-2">
          {player.bio}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-slate-50 mx-4" />

      {/* Action grid — 2×2 */}
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {/* Follow / Unfollow */}
        <button
          onClick={() => onFollow(player.id)}
          disabled={isFollowLoading}
          className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-60 ${
            isFollowing
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-lime-400 text-slate-900 hover:bg-lime-300'
          }`}
        >
          {isFollowLoading
            ? <Loader2 size={12} className="animate-spin" />
            : isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />
          }
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>

        {/* Message */}
        <button
          onClick={() => onMessage(player.id)}
          className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider transition-all"
        >
          <MessageCircle size={12} />
          Message
        </button>

        {/* Invite */}
        <button
          onClick={() => onInvite(player)}
          className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider transition-all"
        >
          <CalendarPlus size={12} />
          Invite
        </button>

        {/* Match */}
        <button
          onClick={() => onSendRequest(player)}
          className="flex items-center justify-center gap-1.5 h-9 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
        >
          <Swords size={12} />
          Match
        </button>
      </div>
    </div>
  );
};

export default PlayerCard;

