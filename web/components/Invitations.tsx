import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, UserPlus, Link as LinkIcon, Mail, QrCode, Share2,
  Check, X, Clock, Users, Search, Copy, CheckCircle2, AlertCircle,
  Sparkles, ArrowRight, Loader2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  createInvitation, getMyInvitations, respondToInvitation, searchPlayers,
  getInvitationsForBooking
} from '../services/invitations';
import { PlayerInvitation } from '../types';
import { Skeleton } from './ui/Skeleton';

const Invitations: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'invite'>('received');
  const [receivedInvitations, setReceivedInvitations] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite form state
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [inviteMethod, setInviteMethod] = useState<'username' | 'email' | 'link'>('username');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState<{
    show: boolean; type: 'success' | 'error'; title: string; message: string;
  }>({ show: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      const [received, sent, bookings] = await Promise.all([
        getMyInvitations(session.user.id),
        supabase.from('player_invitations')
          .select(`*, invitee:profiles!player_invitations_invitee_id_fkey(full_name, avatar_url, username), booking:bookings(booking_date, start_time, end_time, court:courts(name))`)
          .eq('inviter_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('bookings')
          .select('id, booking_date, start_time, end_time, court:courts(name)')
          .eq('player_id', session.user.id)
          .eq('status', 'confirmed')
          .gte('booking_date', new Date().toISOString().split('T')[0])
          .order('booking_date', { ascending: true })
      ]);

      setReceivedInvitations(received.data || []);
      setSentInvitations(sent.data || []);
      setMyBookings(bookings.data || []);
    } catch (err) {
      console.error('Error loading invitations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await searchPlayers(q, currentUserId ? [currentUserId] : []);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const handleSendInvite = async (inviteeId?: string) => {
    if (!selectedBooking || !currentUserId) return;
    setIsSending(true);
    try {
      const { data, error } = await createInvitation(
        selectedBooking,
        currentUserId,
        inviteMethod,
        inviteeId || undefined,
        inviteMethod === 'email' ? inviteeEmail : undefined,
        inviteMessage || undefined
      );

      if (error) throw new Error(error);

      if (inviteMethod === 'link' && data?.invitation_link) {
        await navigator.clipboard.writeText(data.invitation_link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }

      setShowStatusModal({
        show: true, type: 'success', title: 'Invitation Sent!',
        message: inviteMethod === 'link'
          ? 'Link copied to clipboard! Share it with your friends.'
          : 'Your invitation has been sent successfully.'
      });
      setSearchQuery('');
      setSearchResults([]);
      setInviteeEmail('');
      setInviteMessage('');
      initializeData();
    } catch (err: any) {
      setShowStatusModal({ show: true, type: 'error', title: 'Failed', message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleRespond = async (invitationId: string, accept: boolean) => {
    const { error } = await respondToInvitation(invitationId, accept);
    if (error) {
      setShowStatusModal({ show: true, type: 'error', title: 'Error', message: error });
    } else {
      setShowStatusModal({
        show: true, type: 'success',
        title: accept ? 'Accepted!' : 'Declined',
        message: accept ? 'You have accepted the invitation. See you on the court!' : 'You have declined the invitation.'
      });
      initializeData();
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Matchmaking</p>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
            Player Invitations
          </h1>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button onClick={() => navigate('/dashboard')} className="whitespace-nowrap bg-white border border-slate-200 text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl transition-all flex items-center gap-2 hover:text-slate-950 hover:border-slate-300 shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm w-fit">
        {(['received', 'sent', 'invite'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab === 'received' ? 'Received' : tab === 'sent' ? 'Sent' : 'Invite Players'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="flex-1 space-y-2"><Skeleton className="w-40 h-5 rounded-lg" /><Skeleton className="w-64 h-4 rounded-lg" /></div>
                <Skeleton className="w-24 h-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Received Invitations */}
          {activeTab === 'received' && (
            <div className="space-y-4">
              {receivedInvitations.length > 0 ? receivedInvitations.map((inv: any) => (
                <div key={inv.id} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <img src={inv.inviter?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${inv.inviter_id}`} className="w-12 h-12 rounded-2xl object-cover bg-slate-100" alt="" />
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{inv.inviter?.full_name || 'Player'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {inv.booking?.court?.name || 'Court'} • {inv.booking?.booking_date ? formatDate(inv.booking.booking_date) : ''} • {inv.booking?.start_time ? formatTime(inv.booking.start_time) : ''}
                        </p>
                        {inv.message && <p className="text-xs text-slate-600 mt-1 italic">"{inv.message}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRespond(inv.id, true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100">
                        <Check size={14} /> Accept
                      </button>
                      <button onClick={() => handleRespond(inv.id, false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-white p-16 rounded-3xl border border-slate-200/60 shadow-sm text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Mail className="text-slate-400" size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Invitations</h3>
                  <p className="text-slate-500 font-medium">You don't have any pending invitations right now.</p>
                </div>
              )}
            </div>
          )}

          {/* Sent Invitations */}
          {activeTab === 'sent' && (
            <div className="space-y-4">
              {sentInvitations.length > 0 ? sentInvitations.map((inv: any) => (
                <div key={inv.id} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Send size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-tight text-sm">
                          To: {inv.invitee?.full_name || inv.invitee_email || 'Via Link'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {inv.booking?.court?.name || 'Court'} • {inv.booking?.booking_date ? formatDate(inv.booking.booking_date) : ''} • via {inv.invitation_method}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                      inv.status === 'accepted' ? 'bg-lime-100 text-lime-700' :
                      inv.status === 'declined' ? 'bg-rose-100 text-rose-700' :
                      inv.status === 'expired' ? 'bg-slate-100 text-slate-500' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="bg-white p-16 rounded-3xl border border-slate-200/60 shadow-sm text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Send className="text-slate-400" size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Sent Invitations</h3>
                  <p className="text-slate-500 font-medium">You haven't invited anyone to play yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Invite Players Form */}
          {activeTab === 'invite' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Select Booking */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <Clock className="text-blue-600" size={22} /> Select Your Booking
                  </h2>
                  {myBookings.length > 0 ? (
                    <div className="space-y-3">
                      {myBookings.map((booking: any) => (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking.id)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                            selectedBooking === booking.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div>
                            <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{booking.court?.name || 'Court'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(booking.booking_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                          </div>
                          {selectedBooking === booking.id && <CheckCircle2 size={20} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 font-medium py-8">No upcoming bookings found. Book a court first!</p>
                  )}
                </div>

                {/* Invite Method */}
                {selectedBooking && (
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm animate-fade-in">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                      <UserPlus className="text-blue-600" size={22} /> Invite Method
                    </h2>
                    <div className="flex gap-2 mb-6">
                      {([
                        { key: 'username' as const, icon: <Search size={16} />, label: 'By Username' },
                        { key: 'email' as const, icon: <Mail size={16} />, label: 'By Email' },
                        { key: 'link' as const, icon: <LinkIcon size={16} />, label: 'Copy Link' },
                      ]).map(m => (
                        <button
                          key={m.key}
                          onClick={() => setInviteMethod(m.key)}
                          className={`flex-1 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            inviteMethod === m.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Username search */}
                    {inviteMethod === 'username' && (
                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            type="text" placeholder="Search by name or username..."
                            value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                            className="w-full px-5 py-4 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" size={18} />}
                        </div>
                        {searchResults.length > 0 && (
                          <div className="space-y-2">
                            {searchResults.map((player: any) => (
                              <div key={player.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                                <div className="flex items-center gap-3">
                                  <img src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} className="w-10 h-10 rounded-xl object-cover bg-white" alt="" />
                                  <div>
                                    <p className="font-black text-sm text-slate-900">{player.full_name || player.username}</p>
                                    <p className="text-[10px] font-bold text-slate-400">@{player.username} • DUPR {player.dupr_rating?.toFixed(2) || '3.50'}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleSendInvite(player.id)}
                                  disabled={isSending}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Invite
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email invite */}
                    {inviteMethod === 'email' && (
                      <div className="space-y-4">
                        <input
                          type="email" placeholder="Enter player's email..."
                          value={inviteeEmail} onChange={(e) => setInviteeEmail(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                        <textarea
                          placeholder="Add a personal message (optional)..."
                          value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)}
                          rows={3}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                        />
                        <button
                          onClick={() => handleSendInvite()}
                          disabled={isSending || !inviteeEmail}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          Send Email Invitation
                        </button>
                      </div>
                    )}

                    {/* Link copy */}
                    {inviteMethod === 'link' && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">Generate a shareable link that anyone can use to join your game.</p>
                        <button
                          onClick={() => handleSendInvite()}
                          disabled={isSending}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSending ? <Loader2 size={16} className="animate-spin" /> : copiedLink ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          {copiedLink ? 'Link Copied!' : 'Generate & Copy Link'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar Info Card */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-8 rounded-3xl shadow-2xl shadow-blue-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">How It Works</h3>
                    <div className="space-y-4">
                      {[
                        { step: '1', text: 'Select an upcoming booking' },
                        { step: '2', text: 'Choose how to invite' },
                        { step: '3', text: 'Players accept and join' },
                        { step: '4', text: 'Meet at the court!' },
                      ].map(s => (
                        <div key={s.step} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 font-black text-white text-xs">{s.step}</div>
                          <p className="text-blue-50 text-sm font-medium">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Status Modal */}
      {showStatusModal.show && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`p-8 text-center ${showStatusModal.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${showStatusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {showStatusModal.type === 'success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
              </div>
              <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${showStatusModal.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>{showStatusModal.title}</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">{showStatusModal.message}</p>
            </div>
            <div className="p-6 bg-white">
              <button onClick={() => setShowStatusModal({ ...showStatusModal, show: false })} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${showStatusModal.type === 'success' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700' : 'bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700'}`}>
                GOT IT
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Invitations;
