import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { supabase } from '../../services/supabase';
import Toast, { ToastType } from '../ui/Toast';
import {
  ArrowLeft, Send, Trophy, UsersRound, Zap, Crown, ShieldCheck,
  Lock, Globe, Hash, Settings, ChevronDown, ChevronUp, Plus,
  Trash2, LogOut, X, Edit2, CalendarDays, MapPin, Users,
  CheckCircle2, Clock, Star
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Squad {
  id: string; name: string; description: string; image_url: string;
  is_private: boolean; is_official: boolean; tags: string[];
  wins: number; losses: number; avg_rating: number;
  created_by: string; location: string; rules: string;
  members_count: number;
}

interface Member {
  id: string; user_id: string; role: string;
  joined_at?: string;
  profiles?: { full_name: string; avatar_url: string; username?: string };
}

interface Message {
  id: string; squad_id: string; user_id: string; content: string;
  created_at: string;
  profile?: { full_name: string; avatar_url: string };
}

interface SquadEvent {
  id: string; squad_id: string; title: string; description: string;
  event_type: string; location: string; start_time: string;
  max_attendees?: number; created_by: string;
  rsvp_count?: number; user_rsvp?: boolean;
}

const MESSAGE_PAGE_SIZE = 50;
const EVENT_TYPES = ['meetup', 'tournament', 'training', 'social', 'other'];

// ── Component ─────────────────────────────────────────────────────────────────

export const SquadDetail: React.FC = () => {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();

  // Core data
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<SquadEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);

  // Chat
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Manage overlay
  const [showManage, setShowManage] = useState(false);
  const [manageTab, setManageTab] = useState<'info' | 'members' | 'events'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [manageForm, setManageForm] = useState({
    name: '', description: '', location: '', rules: '', isPrivate: false,
  });

  // Create event modal
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', event_type: 'meetup',
    location: '', start_time: '', max_attendees: '',
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Action states
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // UI
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '', type: 'info', isVisible: false,
  });

  const isCreator = squad?.created_by === currentUserId;
  const isMember = !!currentMember;
  const isOwner = currentMember?.role === 'OWNER';
  const isModerator = currentMember?.role === 'MODERATOR';
  const canManage = isOwner || isModerator;
  const canViewChat = isMember;

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    load();
  }, [squadId]);

  const load = async () => {
    if (!squadId) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setCurrentUserId(uid);

      const [squadRes, memberRes] = await Promise.all([
        supabase.from('squads').select('*').eq('id', squadId).single(),
        supabase.from('squad_members')
          .select('*, profiles(full_name, avatar_url, username)')
          .eq('squad_id', squadId),
      ]);

      if (squadRes.error || !squadRes.data) {
        showToast('Squad not found', 'error');
        setTimeout(() => navigate('/teams'), 1200);
        return;
      }

      setSquad(squadRes.data as Squad);
      const memberList: Member[] = memberRes.data || [];
      setMembers(memberList);
      setCurrentMember(memberList.find(m => m.user_id === uid) ?? null);
      await loadEvents(uid);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load squad', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Messages ─────────────────────────────────────────────────────────────

  const loadMessages = async (before?: string) => {
    if (!squadId) return;
    try {
      let q = supabase.from('squad_messages')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);
      if (before) q = q.lt('created_at', before);

      const { data, error } = await q;
      if (error) { console.error('Error loading messages:', error); return; }
      if (!data || data.length === 0) {
        if (!before) setMessages([]);
        setHasMoreMessages(false);
        return;
      }

      const chronological = data.reverse();
      const uids = [...new Set(chronological.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url').in('id', uids);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const enriched: Message[] = chronological.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));

      setHasMoreMessages(data.length === MESSAGE_PAGE_SIZE);

      if (before) {
        setMessages(prev => [...enriched, ...prev]);
      } else {
        setMessages(enriched);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      if (!before) setMessages([]);
    }
  };

  const loadEarlierMessages = async () => {
    if (loadingEarlier || !hasMoreMessages || messages.length === 0) return;
    setLoadingEarlier(true);
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    await loadMessages(messages[0].created_at);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
    });
    setLoadingEarlier(false);
  };

  const loadEvents = async (uid?: string | null) => {
    if (!squadId) return;
    const { data } = await supabase.from('squad_events')
      .select('*')
      .eq('squad_id', squadId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (!data) return;

    const eventIds = data.map(e => e.id);
    const { data: rsvps } = await supabase
      .from('squad_event_rsvps').select('event_id, user_id').in('event_id', eventIds);

    const enriched: SquadEvent[] = data.map(ev => ({
      ...ev,
      rsvp_count: rsvps?.filter(r => r.event_id === ev.id).length ?? 0,
      user_rsvp: !!(uid && rsvps?.some(r => r.event_id === ev.id && r.user_id === uid)),
    }));
    setEvents(enriched);
  };

  // ── Realtime: messages ────────────────────────────────────────────────────

  useEffect(() => {
    if (!squadId || !isMember) return;

    loadMessages();

    const channel = supabase
      .channel(`squad_messages:${squadId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'squad_messages',
        filter: `squad_id=eq.${squadId}`,
      }, async (payload) => {
        const msg = payload.new as Message;
        const { data: p } = await supabase
          .from('profiles').select('id, full_name, avatar_url').eq('id', msg.user_id).single();
        setMessages(prev => [...prev, { ...msg, profile: p ?? undefined }]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [squadId, isMember]);

  // ── Realtime: members ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!squadId) return;

    const channel = supabase
      .channel(`squad_members_rt:${squadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'squad_members',
        filter: `squad_id=eq.${squadId}`,
      }, async () => {
        const { data } = await supabase.from('squad_members')
          .select('*, profiles(full_name, avatar_url, username)')
          .eq('squad_id', squadId);
        if (data) {
          setMembers(data);
          setCurrentMember(data.find((m: Member) => m.user_id === currentUserId) ?? null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [squadId, currentUserId]);

  // ── Realtime: events ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!squadId) return;

    const channel = supabase
      .channel(`squad_events_rt:${squadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'squad_events',
        filter: `squad_id=eq.${squadId}`,
      }, () => { loadEvents(currentUserId); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [squadId, currentUserId]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentUserId || !squadId) return;
    const content = messageInput.trim();
    setMessageInput('');
    try {
      const { error } = await supabase.from('squad_messages').insert({
        squad_id: squadId, user_id: currentUserId, content,
      });
      if (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
        setMessageInput(content);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageInput(content);
    }
  };

  const handleJoin = async () => {
    if (!currentUserId || !squadId) return;
    setIsJoining(true);
    try {
      const { error } = await supabase.from('squad_members').upsert(
        { squad_id: squadId, user_id: currentUserId, role: 'MEMBER' },
        { onConflict: 'squad_id,user_id', ignoreDuplicates: true }
      );
      if (error) throw error;
      showToast('You joined the squad!', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Failed to join', 'error');
    } finally { setIsJoining(false); }
  };

  const handleLeave = async () => {
    if (!currentUserId || !squadId || !confirm('Leave this squad?')) return;
    setIsLeaving(true);
    try {
      const { error } = await supabase.from('squad_members')
        .delete().eq('squad_id', squadId).eq('user_id', currentUserId);
      if (error) throw error;
      showToast('You left the squad', 'success');
      setTimeout(() => navigate('/teams'), 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to leave', 'error');
      setIsLeaving(false);
    }
  };

  // ── Manage: Info ─────────────────────────────────────────────────────────

  const openManage = () => {
    if (!squad) return;
    setManageForm({
      name: squad.name, description: squad.description,
      location: squad.location || '', rules: squad.rules || '',
      isPrivate: squad.is_private,
    });
    setManageTab('info');
    setShowManage(true);
  };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('squads').update({
        name: manageForm.name, description: manageForm.description,
        location: manageForm.location, rules: manageForm.rules,
        is_private: manageForm.isPrivate,
      }).eq('id', squadId);
      if (error) throw error;
      setSquad(prev => prev ? { ...prev, ...manageForm, is_private: manageForm.isPrivate } : prev);
      showToast('Squad updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally { setIsSaving(false); }
  };

  const deleteSquad = async () => {
    if (!squadId) return;
    try {
      await supabase.from('squads').delete().eq('id', squadId);
      showToast('Squad deleted', 'success');
      setTimeout(() => navigate('/teams'), 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // ── Manage: Members ──────────────────────────────────────────────────────

  const updateMemberRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from('squad_members').update({ role: newRole }).eq('id', memberId);
    if (error) showToast('Failed to update role', 'error');
    else { showToast('Role updated', 'success'); await load(); }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    const { error } = await supabase.from('squad_members').delete().eq('id', memberId);
    if (error) showToast('Failed to remove member', 'error');
    else { showToast('Member removed', 'success'); await load(); }
  };

  // ── Events ──────────────────────────────────────────────────────────────

  const openCreateEvent = (ev?: SquadEvent) => {
    if (ev) {
      setEditingEventId(ev.id);
      setEventForm({
        title: ev.title, description: ev.description || '',
        event_type: ev.event_type, location: ev.location || '',
        start_time: ev.start_time ? new Date(ev.start_time).toISOString().slice(0, 16) : '',
        max_attendees: ev.max_attendees?.toString() || '',
      });
    } else {
      setEditingEventId(null);
      setEventForm({ title: '', description: '', event_type: 'meetup', location: '', start_time: '', max_attendees: '' });
    }
    setShowCreateEvent(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadId || !currentUserId) return;
    setSavingEvent(true);
    try {
      const payload = {
        squad_id: squadId, title: eventForm.title, description: eventForm.description,
        event_type: eventForm.event_type, location: eventForm.location,
        start_time: new Date(eventForm.start_time).toISOString(),
        max_attendees: eventForm.max_attendees ? parseInt(eventForm.max_attendees) : null,
        created_by: currentUserId,
      };
      if (editingEventId) {
        const { error } = await supabase.from('squad_events').update(payload).eq('id', editingEventId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('squad_events').insert(payload);
        if (error) throw error;
      }
      setShowCreateEvent(false);
      await loadEvents(currentUserId);
      showToast(editingEventId ? 'Event updated!' : 'Event created!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save event', 'error');
    } finally { setSavingEvent(false); }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supabase.from('squad_events').delete().eq('id', eventId);
    if (error) showToast('Failed to delete event', 'error');
    else { await loadEvents(currentUserId); showToast('Event deleted', 'success'); }
  };

  const toggleRsvp = async (ev: SquadEvent) => {
    if (!currentUserId) return;
    if (ev.user_rsvp) {
      await supabase.from('squad_event_rsvps').delete()
        .eq('event_id', ev.id).eq('user_id', currentUserId);
    } else {
      await supabase.from('squad_event_rsvps').upsert(
        { event_id: ev.id, user_id: currentUserId, status: 'going' },
        { onConflict: 'event_id,user_id', ignoreDuplicates: false }
      );
    }
    await loadEvents(currentUserId);
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const sortedMembers = [...members].sort((a, b) => {
    const order = { OWNER: 0, MODERATOR: 1, MEMBER: 2 };
    return (order[a.role as keyof typeof order] ?? 3) - (order[b.role as keyof typeof order] ?? 3);
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatMsgTime = (iso: string) => new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Squad...</p>
        </div>
      </div>
    );
  }

  if (!squad) return null;

  // Private gate for non-members
  if (squad.is_private && !isMember) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 rounded-[28px] bg-slate-100 flex items-center justify-center">
          <Lock className="w-10 h-10 text-slate-300" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Private Squad</h2>
          <p className="text-slate-400 font-medium">This squad is invite-only.</p>
        </div>
        <button onClick={() => navigate('/teams')}
          className="flex items-center gap-2 px-6 py-3.5 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
          <ArrowLeft size={15} /> Back to Squads
        </button>
      </div>
    );
  }

  const winRate = squad.wins + squad.losses > 0
    ? Math.round((squad.wins / (squad.wins + squad.losses)) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50 -m-6 overflow-hidden rounded-[32px]">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <div className="w-72 bg-white border-r border-slate-100 flex flex-col overflow-hidden shrink-0">

        {/* Back */}
        <div className="p-4 border-b border-slate-100">
          <button onClick={() => navigate('/teams')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-colors">
            <ArrowLeft size={14} /> All Squads
          </button>
        </div>

        {/* Squad banner */}
        <div className="relative h-36 shrink-0">
          <img
            src={squad.image_url || 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&q=80&w=600'}
            className="w-full h-full object-cover"
            alt={squad.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-tight line-clamp-2">
              {squad.name}
            </h2>
          </div>
          {canManage && (
            <button onClick={openManage}
              className="absolute top-3 right-3 p-2 bg-white/15 backdrop-blur hover:bg-white/30 rounded-xl text-white transition-all border border-white/10">
              <Settings size={14} />
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {squad.is_official && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
              <ShieldCheck size={10} /> Official
            </span>
          )}
          <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
            {squad.is_private ? <><Lock size={10} /> Private</> : <><Globe size={10} /> Open</>}
          </span>
          {currentMember && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
              isOwner ? 'bg-lime-50 text-lime-700' : isModerator ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {isOwner ? <><Crown size={10} /> Leader</> : isModerator ? <><ShieldCheck size={10} /> Mod</> : 'Member'}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="px-4 pt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Members', value: members.length, icon: <UsersRound size={12} className="text-blue-500" /> },
            { label: 'Wins', value: squad.wins || 0, icon: <Trophy size={12} className="text-yellow-500" /> },
            { label: 'Win%', value: `${winRate}%`, icon: <Zap size={12} className="text-lime-500" /> },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-2xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 opacity-70">{s.icon}</div>
              <p className="text-base font-black text-slate-950">{s.value}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Scrollable info */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {squad.description && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">About</p>
              <p className="text-xs text-slate-600 leading-relaxed">{squad.description}</p>
            </div>
          )}
          {squad.location && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              {squad.location}
            </div>
          )}
          {squad.rules && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rules</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{squad.rules}</p>
            </div>
          )}
          {squad.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {squad.tags.map(tag => (
                <span key={tag}
                  className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-lg uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Join / Leave */}
        <div className="p-4 border-t border-slate-100">
          {isMember ? (
            !isOwner && (
              <button onClick={handleLeave} disabled={isLeaving}
                className="w-full flex items-center justify-center gap-2 h-11 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                {isLeaving ? <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /> : <><LogOut size={13} /> Leave Squad</>}
              </button>
            )
          ) : (
            <button onClick={handleJoin} disabled={isJoining}
              className="w-full flex items-center justify-center gap-2 h-11 bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-lime-100 disabled:opacity-50">
              {isJoining ? <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <>Join Squad <Zap size={13} /></>}
            </button>
          )}
        </div>
      </div>

      {/* ── CENTER: CHAT ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Chat header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3 shrink-0">
          <Hash size={16} className="text-slate-400" />
          <span className="font-black text-slate-900 text-sm uppercase tracking-widest">Squad Chat</span>
          {canManage && !showManage && (
            <button onClick={openManage}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
              <Settings size={13} /> Manage
            </button>
          )}
          {showManage && (
            <button onClick={() => setShowManage(false)}
              className="ml-auto p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-all">
              <X size={15} />
            </button>
          )}
        </div>

        {showManage ? (
          /* ── MANAGE OVERLAY ─────────────────────────────────────────── */
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Manage tabs */}
            <div className="flex border-b border-slate-100 bg-white px-6 shrink-0">
              {(['info', 'members', 'events'] as const).map(tab => (
                <button key={tab} onClick={() => setManageTab(tab)}
                  className={`px-5 py-4 font-black text-[10px] uppercase tracking-widest border-b-2 transition-all ${
                    manageTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}>
                  {tab === 'events' ? `Events (${events.length})` : tab === 'members' ? `Members (${members.length})` : tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

              {/* Info tab */}
              {manageTab === 'info' && (
                <form onSubmit={saveInfo} className="max-w-lg space-y-5">
                  {[
                    { label: 'Squad Name', key: 'name', type: 'input' },
                    { label: 'Description', key: 'description', type: 'textarea' },
                    { label: 'Location', key: 'location', type: 'input' },
                    { label: 'Rules', key: 'rules', type: 'textarea' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea rows={3}
                          value={manageForm[field.key as keyof typeof manageForm] as string}
                          onChange={e => setManageForm({ ...manageForm, [field.key]: e.target.value })}
                          className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-5 outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm resize-none"
                        />
                      ) : (
                        <input type="text"
                          value={manageForm[field.key as keyof typeof manageForm] as string}
                          onChange={e => setManageForm({ ...manageForm, [field.key]: e.target.value })}
                          className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-5 outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm"
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                    <p className="font-bold text-slate-800 text-sm">Private Squad</p>
                    <button type="button"
                      onClick={() => setManageForm({ ...manageForm, isPrivate: !manageForm.isPrivate })}
                      className={`w-12 h-7 rounded-full transition-all relative ${manageForm.isPrivate ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${manageForm.isPrivate ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" disabled={isSaving}
                      className="flex-1 h-12 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    {isOwner && !showDeleteConfirm && (
                      <button type="button" onClick={() => setShowDeleteConfirm(true)}
                        className="h-12 px-5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 font-black text-[10px] uppercase tracking-widest transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {showDeleteConfirm && (
                    <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 space-y-3">
                      <p className="text-rose-700 font-bold text-sm">Permanently delete this squad? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={deleteSquad}
                          className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest">Delete</button>
                        <button type="button" onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 h-10 rounded-xl bg-white border border-rose-100 text-rose-500 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Members tab */}
              {manageTab === 'members' && (
                <div className="max-w-xl space-y-3">
                  {sortedMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                      <img
                        src={member.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles?.full_name || 'P')}&background=random`}
                        className="w-10 h-10 rounded-xl object-cover"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{member.profiles?.full_name || 'Unknown'}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${
                          member.role === 'OWNER' ? 'text-lime-600' : member.role === 'MODERATOR' ? 'text-indigo-500' : 'text-slate-400'
                        }`}>{member.role}</p>
                      </div>
                      {isOwner && member.user_id !== currentUserId && (
                        <div className="flex gap-1.5">
                          {member.role === 'MEMBER' && (
                            <button onClick={() => updateMemberRole(member.id, 'MODERATOR')}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                              Promote
                            </button>
                          )}
                          {member.role === 'MODERATOR' && (
                            <button onClick={() => updateMemberRole(member.id, 'MEMBER')}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                              Demote
                            </button>
                          )}
                          <button onClick={() => removeMember(member.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Events management tab */}
              {manageTab === 'events' && (
                <div className="max-w-xl space-y-4">
                  <button onClick={() => openCreateEvent()}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                    <Plus size={14} /> Create Event
                  </button>
                  {events.length === 0 ? (
                    <p className="text-slate-400 text-sm font-medium text-center py-8">No upcoming events</p>
                  ) : events.map(ev => (
                    <div key={ev.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {formatTime(ev.start_time)} {ev.location && `· ${ev.location}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => openCreateEvent(ev)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteEvent(ev.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        ) : canViewChat ? (
          /* ── CHAT ──────────────────────────────────────────────────── */
          <>
            {/* Load earlier */}
            {hasMoreMessages && (
              <div className="text-center py-2 bg-white shrink-0">
                <button onClick={loadEarlierMessages}
                  disabled={loadingEarlier}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                  {loadingEarlier ? 'Loading...' : '↑ Load earlier messages'}
                </button>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <Hash className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.user_id === currentUserId;
                const showAvatar = i === 0 || messages[i - 1]?.user_id !== msg.user_id;
                return (
                  <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <img
                            src={msg.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.profile?.full_name || 'P')}&background=random`}
                            className="w-8 h-8 rounded-xl object-cover"
                            alt=""
                          />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      {showAvatar && !isMe && (
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          {msg.profile?.full_name || 'Unknown'}
                        </p>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                        isMe
                          ? 'bg-slate-950 text-white rounded-br-md'
                          : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <p className="text-[8px] text-slate-300 font-medium mx-1">{formatMsgTime(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-end gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100 focus-within:ring-4 focus-within:ring-blue-500/10">
                <textarea
                  className="flex-1 bg-transparent outline-none resize-none text-sm font-medium text-slate-900 placeholder-slate-400 max-h-32 min-h-[20px]"
                  placeholder="Message the squad..."
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button onClick={sendMessage} disabled={!messageInput.trim()}
                  className="w-9 h-9 flex items-center justify-center bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all shrink-0">
                  <Send size={15} />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 font-medium mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          /* ── NOT A MEMBER yet ──────────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Lock className="w-9 h-9 text-slate-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-2">Members Only</h3>
              <p className="text-slate-400 font-medium text-sm">Join this squad to access the chat and events.</p>
            </div>
            <button onClick={handleJoin} disabled={isJoining}
              className="flex items-center gap-2 px-6 py-3.5 bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50">
              {isJoining ? 'Joining...' : <><Zap size={14} /> Join Squad</>}
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR: ROSTER + EVENTS ────────────────────────────────── */}
      <div className="w-72 bg-white border-l border-slate-100 flex flex-col overflow-hidden shrink-0">
        <div className="flex-1 overflow-y-auto">

          {/* Roster */}
          <div className="p-5 border-b border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Roster ({members.length})
              </p>
              <button onClick={() => setShowAllMembers(!showAllMembers)}
                className="text-slate-400 hover:text-slate-600 transition-colors">
                {showAllMembers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <div className="space-y-2">
              {(showAllMembers ? sortedMembers : sortedMembers.slice(0, 5)).map(member => (
                <div key={member.id} className="flex items-center gap-2.5">
                  <img
                    src={member.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles?.full_name || 'P')}&background=random`}
                    className="w-8 h-8 rounded-xl object-cover shrink-0"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{member.profiles?.full_name || 'Unknown'}</p>
                    <p className={`text-[8px] font-black uppercase tracking-widest ${
                      member.role === 'OWNER' ? 'text-lime-600' : member.role === 'MODERATOR' ? 'text-indigo-500' : 'text-slate-300'
                    }`}>
                      {member.role === 'OWNER' ? '👑 Leader' : member.role === 'MODERATOR' ? '⭐ Mod' : 'Member'}
                    </p>
                  </div>
                  {member.user_id === currentUserId && (
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">You</span>
                  )}
                </div>
              ))}
              {!showAllMembers && sortedMembers.length > 5 && (
                <button onClick={() => setShowAllMembers(true)}
                  className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest w-full text-left pt-1">
                  +{sortedMembers.length - 5} more members
                </button>
              )}
            </div>
          </div>

          {/* Events */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Upcoming Events
              </p>
              {canManage && (
                <button onClick={() => openCreateEvent()}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-all">
                  <Plus size={13} />
                </button>
              )}
            </div>

            {events.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">No upcoming events</p>
                {canManage && (
                  <button onClick={() => openCreateEvent()}
                    className="mt-2 text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                    + Create one
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map(ev => (
                  <div key={ev.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-slate-900 text-xs leading-tight">{ev.title}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                        ev.event_type === 'tournament' ? 'bg-yellow-50 text-yellow-600'
                        : ev.event_type === 'training' ? 'bg-blue-50 text-blue-600'
                        : 'bg-slate-100 text-slate-500'
                      }`}>{ev.event_type}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                        <Clock size={10} /> {formatTime(ev.start_time)}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                          <MapPin size={10} /> {ev.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                        <Users size={10} /> {ev.rsvp_count} going
                        {ev.max_attendees ? ` / ${ev.max_attendees}` : ''}
                      </div>
                    </div>
                    {isMember && (
                      <button onClick={() => toggleRsvp(ev)}
                        className={`w-full h-8 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                          ev.user_rsvp
                            ? 'bg-lime-100 text-lime-700 border border-lime-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}>
                        {ev.user_rsvp ? <><CheckCircle2 size={11} /> Going!</> : "I'm Going"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CREATE/EDIT EVENT MODAL ────────────────────────────────────────── */}
      {showCreateEvent && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[36px] p-8 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 relative">
            <button onClick={() => setShowCreateEvent(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all">
              <X size={16} />
            </button>
            <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase mb-6">
              {editingEventId ? 'Edit Event' : 'Create Event'}
            </h2>
            <form onSubmit={saveEvent} className="space-y-4">
              {[
                { label: 'Title', key: 'title', type: 'input', required: true },
                { label: 'Description', key: 'description', type: 'textarea', required: false },
                { label: 'Location', key: 'location', type: 'input', required: false },
                { label: 'Max Attendees', key: 'max_attendees', type: 'number', required: false },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea rows={2} required={f.required}
                      value={eventForm[f.key as keyof typeof eventForm]}
                      onChange={e => setEventForm({ ...eventForm, [f.key]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 outline-none focus:ring-4 focus:ring-blue-500/10 text-sm resize-none"
                    />
                  ) : (
                    <input type={f.type} required={f.required}
                      value={eventForm[f.key as keyof typeof eventForm]}
                      onChange={e => setEventForm({ ...eventForm, [f.key]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium"
                    />
                  )}
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date & Time</label>
                <input required type="datetime-local"
                  value={eventForm.start_time}
                  onChange={e => setEventForm({ ...eventForm, start_time: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Type</label>
                <select value={eventForm.event_type}
                  onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 outline-none text-sm font-medium">
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <button type="submit" disabled={savingEvent}
                className="w-full h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
                {savingEvent ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, isVisible: false })} />
      )}
    </div>
  );
};
