import React from 'react';
import { Users } from 'lucide-react';
import { PlayerCard } from './PlayerCard';
import type { SmartPlayer } from './findPartners.types';

interface PlayersSectionProps {
  title: string;
  subtitle: string;
  players: SmartPlayer[];
  emptyText: string;
  onSendRequest: (player: SmartPlayer) => void;
  onMessage: (userId: string) => void;
  onFollow: (userId: string) => void;
  onInvite: (player: SmartPlayer) => void;
  onViewProfile: (player: SmartPlayer) => void;
  followedUserIds: Set<string>;
  loadingFollowIds: Set<string>;
}

export const PlayersSection: React.FC<PlayersSectionProps> = ({
  title,
  subtitle,
  players,
  emptyText,
  onSendRequest,
  onMessage,
  onFollow,
  onInvite,
  onViewProfile,
  followedUserIds,
  loadingFollowIds,
}) => {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-[28px]">
            {title}
          </h2>
          <p className="max-w-2xl text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
          {players.length} player{players.length === 1 ? '' : 's'}
        </span>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <Users className="mx-auto mb-4 text-slate-200" size={38} />
          <p className="text-lg font-black tracking-tight text-slate-400">
            No players in this section
          </p>
          <p className="mt-2 text-sm text-slate-400">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onSendRequest={() => onSendRequest(player)}
              onMessage={onMessage}
              onFollow={onFollow}
              onInvite={() => onInvite(player)}
              onViewProfile={() => onViewProfile(player)}
              isFollowing={followedUserIds.has(player.id)}
              isFollowLoading={loadingFollowIds.has(player.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
