import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  CalendarPlus,
  EllipsisVertical,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Swords,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { SmartPlayerCardData } from './findPartners.types';

interface PlayerCardProps {
  player: SmartPlayerCardData;
  onSendRequest: () => void;
  onMessage: (userId: string) => void;
  onFollow: (userId: string) => void;
  onInvite: () => void;
  onViewProfile: () => void;
  isFollowing: boolean;
  isFollowLoading?: boolean;
}

const matchTone = (score: number) => {
  if (score >= 90) return 'bg-lime-100 text-lime-800';
  if (score >= 82) return 'bg-blue-50 text-blue-700';
  return 'bg-slate-100 text-slate-700';
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const avatarSrc =
    player.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=1e40af&color=fff&size=96`;

  const metadataItems = [
    { label: 'Skill', value: player.skillLabel },
    { label: 'Style', value: player.playStyleLabel },
    { label: 'Availability', value: player.availabilityLabel },
    { label: 'Format', value: player.gamePreferenceLabel },
  ];

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            onClick={onViewProfile}
            className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 transition-all hover:ring-blue-300"
          >
            <img
              src={avatarSrc}
              alt={player.full_name}
              className="h-14 w-14 object-cover"
            />
            {player.isVerified && (
              <span className="absolute bottom-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                <BadgeCheck size={12} className="text-blue-600" />
              </span>
            )}
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onViewProfile}
                className="truncate text-left text-base font-black uppercase tracking-tight text-slate-950 transition-colors hover:text-blue-700"
              >
                {player.full_name}
              </button>
              {player.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-blue-700">
                  <ShieldCheck size={10} />
                  Verified
                </span>
              )}
              {isFollowing && (
                <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-lime-700">
                  Following
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-blue-500" />
                {player.location || 'Location pending'}
              </span>
              <span>{player.lastActiveLabel}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${matchTone(player.matchScore)}`}>
                {player.matchScore}% {player.matchBadge}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                {player.sessionLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
          >
            <EllipsisVertical size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onFollow(player.id);
                }}
                disabled={isFollowLoading}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                {isFollowLoading ? (
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                ) : isFollowing ? (
                  <UserCheck size={14} className="text-blue-600" />
                ) : (
                  <UserPlus size={14} className="text-lime-600" />
                )}
                {isFollowing ? 'Unfollow player' : 'Follow player'}
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onInvite();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <CalendarPlus size={14} className="text-blue-600" />
                Invite to play
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {metadataItems.map((item) => (
          <div
            key={`${player.id}-${item.label}`}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Common court</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{player.commonCourtLabel}</p>
          </div>
          <button
            onClick={onViewProfile}
            className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 transition-colors hover:text-slate-700"
          >
            View Profile
          </button>
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Why this match works</p>
          <p className="mt-1 text-sm text-slate-600">
            {player.matchReasons.slice(0, 2).join(' • ')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onSendRequest}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-700"
        >
          <Swords size={14} />
          Match
        </button>
        <button
          onClick={() => onMessage(player.id)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.16em] text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <MessageCircle size={14} />
          Message
        </button>
      </div>
    </article>
  );
};

export default PlayerCard;
