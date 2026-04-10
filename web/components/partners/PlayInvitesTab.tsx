import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, XCircle, MessageCircle, Clock, Inbox, MapPin, Zap } from 'lucide-react';
import {
  getReceivedInvitations,
  respondToInvitation,
  type PlayerInvitation,
} from '../../services/invitations';
import { getOrCreateConversation } from '../../services/directMessages';
import { AvatarImg } from './PlaceholderAvatar';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-lime-50 text-lime-700 border-lime-200',
  declined: 'bg-rose-50 text-rose-600 border-rose-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface PlayInvitesTabProps {
  onCountChange?: (count: number) => void;
}

const PlayInvitesTab: React.FC<PlayInvitesTabProps> = ({ onCountChange }) => {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<PlayerInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [responding, setResponding] = useState<Record<string, 'accepting' | 'declining'>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    const data = await getReceivedInvitations();
    setInvites(data);
    const pendingCount = data.filter(i => i.status === 'pending').length;
    onCountChange?.(pendingCount);
    setIsLoading(false);
  };

  const handleRespond = async (id: string, response: 'accepted' | 'declined') => {
    setResponding(prev => ({ ...prev, [id]: response === 'accepted' ? 'accepting' : 'declining' }));
    const result = await respondToInvitation(id, response);
    if (result.success) {
      setInvites(prev =>
        prev.map(inv => inv.id === id ? { ...inv, status: response } : inv)
      );
      const updated = invites.map(inv => inv.id === id ? { ...inv, status: response } : inv);
      onCountChange?.(updated.filter(i => i.status === 'pending').length);
    }
    setResponding(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleMessage = async (inviterId: string) => {
    try {
      const convId = await getOrCreateConversation(inviterId);
      navigate(`/messages?conversation=${convId}`);
    } catch { /* silent */ }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="py-32 text-center">
        <Inbox className="w-24 h-24 text-slate-200 mx-auto mb-8" />
        <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No invites yet</h3>
        <p className="text-slate-400 font-medium">When players invite you to play, they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map(invite => {
        const inviter = invite.inviter;
        const isPending = invite.status === 'pending';
        const isAccepting = responding[invite.id] === 'accepting';
        const isDeclining = responding[invite.id] === 'declining';

        return (
          <div key={invite.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              {/* Avatar */}
              <AvatarImg
                src={inviter?.avatar_url}
                alt={inviter?.full_name || 'Player'}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-slate-100 object-cover"
                placeholderClassName="h-12 w-12 shrink-0 border-2 border-slate-100"
                placeholderIconSize={24}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 text-sm uppercase tracking-tight">
                    {inviter?.full_name || 'A player'}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[invite.status]}`}>
                    {invite.status}
                  </span>
                </div>

                {/* Booking badge */}
                {invite.booking ? (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-blue-600 font-semibold">
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate">
                      {(invite.booking.court as any)?.name ?? 'Court'} ·{' '}
                      {new Date((invite.booking as any).date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    <Zap size={9} />
                    <span>General invite</span>
                  </div>
                )}

                {invite.message ? (
                  <p className="text-xs text-slate-500 mt-0.5 italic line-clamp-2">"{invite.message}"</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Wants to play pickleball with you</p>
                )}

                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                  <Clock size={10} />
                  {formatDate(invite.created_at)}
                </div>
              </div>

              {/* Mail icon */}
              <Mail size={18} className="text-slate-300 shrink-0" />
            </div>

            {/* Action buttons — only when pending */}
            {isPending && (
              <div className="border-t border-slate-50 grid grid-cols-3 divide-x divide-slate-50">
                <button
                  onClick={() => handleRespond(invite.id, 'accepted')}
                  disabled={!!responding[invite.id]}
                  className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-wider text-lime-700 hover:bg-lime-50 transition-all disabled:opacity-60"
                >
                  {isAccepting
                    ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-lime-600 border-t-transparent" />
                    : <CheckCircle2 size={13} />
                  }
                  Accept
                </button>

                <button
                  onClick={() => handleMessage(inviter!.id)}
                  disabled={!!responding[invite.id]}
                  className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-60"
                >
                  <MessageCircle size={13} />
                  Message
                </button>

                <button
                  onClick={() => handleRespond(invite.id, 'declined')}
                  disabled={!!responding[invite.id]}
                  className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-60"
                >
                  {isDeclining
                    ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-rose-500 border-t-transparent" />
                    : <XCircle size={13} />
                  }
                  Decline
                </button>
              </div>
            )}

            {/* Accepted: message button */}
            {invite.status === 'accepted' && inviter && (
              <div className="border-t border-slate-50">
                <button
                  onClick={() => handleMessage(inviter.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 transition-all"
                >
                  <MessageCircle size={13} />
                  Send a Message
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PlayInvitesTab;
