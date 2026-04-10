import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { searchPartnerProfiles } from './findPartners.utils';
import { AvatarImg } from './PlaceholderAvatar';
import type { Player } from './findPartners.types';

export interface SuggestedFriend {
  id: string;
  full_name: string;
  avatar_url?: string;
  username?: string | null;
}

interface NewMessagePanelProps {
  onClose: () => void;
  currentUserId: string | null;
  suggested: SuggestedFriend[];
  onSelectUser: (userId: string) => void | Promise<void>;
}

const UserRow: React.FC<{
  full_name: string;
  username?: string | null;
  avatar_url?: string;
  onGo: () => void;
}> = ({ full_name, username, avatar_url, onGo }) => (
  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-200">
      <AvatarImg
        src={avatar_url}
        alt=""
        className="h-full w-full object-cover"
        placeholderClassName="h-11 w-11"
        placeholderIconSize={22}
      />
    </div>
    <div className="min-w-0 flex-1 text-left">
      <p className="truncate text-sm font-semibold text-slate-900">{full_name}</p>
      <p className="truncate text-xs text-slate-500">{username ? `@${username}` : 'PicklePlay player'}</p>
    </div>
    <button
      type="button"
      onClick={onGo}
      className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-700"
    >
      Message
    </button>
  </div>
);

export const NewMessagePanel: React.FC<NewMessagePanelProps> = ({
  onClose,
  currentUserId,
  suggested,
  onSelectUser,
}) => {
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Player[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    const trim = q.trim();
    if (!trim) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const rows = await searchPartnerProfiles(supabase, currentUserId, trim);
          if (!cancelled) setResults(rows);
        } catch {
          if (!cancelled) setResults([]);
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, currentUserId]);

  const showSuggested = !q.trim();

  const handleGo = async (userId: string) => {
    try {
      await Promise.resolve(onSelectUser(userId));
    } catch {
      /* keep panel open */
    }
  };

  return (
    <div className="flex h-full min-h-[280px] flex-col bg-white text-slate-900">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5">
        <h2 className="text-base font-black uppercase tracking-tight text-slate-900">New message</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <span className="text-sm font-bold text-slate-800">To:</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          autoFocus
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-1 py-2">
        {showSuggested ? (
          <>
            <p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Suggested
            </p>
            {suggested.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm leading-relaxed text-slate-500">
                No mutual friends yet. Search by name or username to start a chat.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {suggested.map((f) => (
                  <li key={f.id}>
                    <UserRow
                      full_name={f.full_name}
                      username={f.username}
                      avatar_url={f.avatar_url}
                      onGo={() => handleGo(f.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {searching && (
              <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>
            )}
            {!searching && results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-slate-500">No players found.</p>
            )}
            <ul className="space-y-0.5">
              {results.map((p) => (
                <li key={p.id}>
                  <UserRow
                    full_name={p.full_name}
                    username={p.username}
                    avatar_url={p.avatar_url}
                    onGo={() => handleGo(p.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Explore</p>
        <Link
          to="/partners"
          onClick={onClose}
          className="mt-1.5 flex items-center gap-2 rounded-xl py-1 text-left text-sm font-bold text-slate-800 transition-colors hover:text-blue-600"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
            <Users size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-tight text-slate-900">Find Partners</span>
            <span className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-500">
              Profiles, skill fit, invites &amp; more
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-slate-400" />
        </Link>
      </div>
    </div>
  );
};
