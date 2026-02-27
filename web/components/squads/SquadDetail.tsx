import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { supabase } from '../../services/supabase';
import Toast, { ToastType } from '../ui/Toast';
import { SquadDetailSkeleton } from './SquadDetailSkeleton';
import {
  ArrowLeft, Send, Trophy, UsersRound, Zap, Crown, ShieldCheck,
  Lock, Globe, Hash, Settings, ChevronDown, ChevronUp, Plus,
  Trash2, LogOut, X, Edit2, CalendarDays, MapPin, Users,
  CheckCircle2, Clock, Star, AlertTriangle, Shield, Copy, Link2, Key
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Squad {
  id: string; name: string; description: string; image_url: string;
  is_private: boolean; is_official: boolean; tags: string[];
  wins: number; losses: number; avg_rating: number;
  created_by: string; location: string; rules: string;
  members_count: number;
  slug?: string;
  require_approval?: boolean;
  invite_code?: string;
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
const DEFAULT_SQUAD_BANNER = 'https://images.unsplash.com/photo-1617883861744-5a4d5c632f72?auto=format&fit=crop&w=1200&q=80';

// ── Component ─────────────────────────────────────────────────────────────────

export const SquadDetail: React.FC = () => {
  const { squadId, inviteCode: inviteCodeParam } = useParams<{ squadId: string; inviteCode?: string }>();
  const navigate = useNavigate();

  // Core data
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<SquadEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skelLeaving, setSkelLeaving] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);

  // Chat
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Track pre-loaded messages so the realtime useEffect doesn't reload them
  const messagesPreloadedForRef = useRef<string | null>(null);

  // Manage overlay
  const [showManage, setShowManage] = useState(false);
  const [manageTab, setManageTab] = useState<'info' | 'members' | 'events'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [manageForm, setManageForm] = useState({
    name: '', description: '', location: '', rules: '', isPrivate: false,
    requireApproval: false,
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

  // Private squad invite code
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Join request state (for require_approval squads)
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  // Squad membership count for 5-squad limit
  const [userSquadCount, setUserSquadCount] = useState(0);

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
  // Use the resolved UUID from the loaded squad, not the URL param (which could be slug)
  const resolvedSquadId = squad?.id;

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    load();
  }, [squadId]);

  // Transition: skeleton fade-out then content fade-in
  useEffect(() => {
    if (!isLoading) {
      setSkelLeaving(true);
      const t = setTimeout(() => setContentVisible(true), 150);
      return () => clearTimeout(t);
    } else {
      setSkelLeaving(false);
      setContentVisible(false);
    }
  }, [isLoading]);

  const load = async () => {
    if (!squadId) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setCurrentUserId(uid);

      // Load user's squad count for 5-squad limit indicator
      if (uid) {
        const { count } = await supabase
          .from('squad_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid);
        setUserSquadCount(count || 0);
      }

      // Try loading by UUID first, then by slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(squadId);
      let squadQuery;
      if (isUUID) {
        squadQuery = supabase.from('squads').select('*').eq('id', squadId).single();
      } else {
        squadQuery = supabase.from('squads').select('*').eq('slug', squadId).single();
      }

      const [squadRes, memberResPromise] = await Promise.all([
        squadQuery,
        // We'll need the squad ID for members query, do it after
        Promise.resolve(null),
      ]);

      if (squadRes.error || !squadRes.data) {
        // Fallback: try the other method
        const fallbackQuery = isUUID
          ? supabase.from('squads').select('*').eq('slug', squadId).single()
          : supabase.from('squads').select('*').eq('id', squadId).single();
        const fallback = await fallbackQuery;
        if (fallback.error || !fallback.data) {
          showToast('Squad not found', 'error');
          setTimeout(() => navigate('/teams'), 1200);
          return;
        }
        squadRes.data = fallback.data;
      }

      const realSquadId = squadRes.data.id;

      const memberRes = await supabase.from('squad_members')
        .select('*, profiles(full_name, avatar_url, username)')
        .eq('squad_id', realSquadId);

      setSquad(squadRes.data as Squad);
      const memberList: Member[] = memberRes.data || [];
      setMembers(memberList);
      setCurrentMember(memberList.find(m => m.user_id === uid) ?? null);

      // Check for pending join request
      if (uid && !memberList.find(m => m.user_id === uid)) {
        const { data: pendingReq } = await supabase
          .from('squad_join_requests')
          .select('*')
          .eq('squad_id', realSquadId)
          .eq('user_id', uid)
          .eq('status', 'pending')
          .maybeSingle();
        setHasPendingRequest(!!pendingReq);
      }

      // Load join requests if owner/mod
      const currentMemberData = memberList.find(m => m.user_id === uid);
      if (currentMemberData && (currentMemberData.role === 'OWNER' || currentMemberData.role === 'MODERATOR')) {
        const { data: requests } = await supabase
          .from('squad_join_requests')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .eq('squad_id', realSquadId)
          .eq('status', 'pending');
        setJoinRequests(requests || []);
      }

      // Handle invite code from path slug (/teams/:slug/invite/:code) or legacy query param
      const pathInvite = inviteCodeParam;
      const queryInvite = new URLSearchParams(window.location.search).get('invite');
      const inviteParam = pathInvite || queryInvite;
      if (inviteParam) {
        setInviteCodeInput(inviteParam.toUpperCase());
      }

      await loadEvents(uid);

      // Pre-load messages so they're ready before the skeleton exits
      const loadedMember = memberList.find(m => m.user_id === uid);
      if (loadedMember) {
        await loadMessages(undefined, realSquadId, uid);
        messagesPreloadedForRef.current = realSquadId;
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load squad', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Messages ─────────────────────────────────────────────────────────────

  const loadMessages = async (before?: string, forSquadId?: string, forUserId?: string) => {
    const sqid = forSquadId ?? resolvedSquadId;
    const uid = forUserId ?? currentUserId;
    if (!sqid) return;
    try {
      let q = supabase.from('squad_messages')
        .select('*')
        .eq('squad_id', sqid)
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
      
      // Mark messages as read after loading
      if (uid && sqid && !before) {
        await supabase.rpc('mark_squad_messages_read', { p_user_id: uid, p_squad_id: sqid });
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
    const sid = resolvedSquadId || squad?.id;
    if (!sid) return;
    const { data } = await supabase.from('squad_events')
      .select('*')
      .eq('squad_id', sid)
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
    if (!resolvedSquadId || !isMember) return;

    // Only fetch messages here if they weren't already pre-loaded inside load()
    if (messagesPreloadedForRef.current !== resolvedSquadId) {
      loadMessages();
    }

    const channel = supabase
      .channel(`squad_messages:${resolvedSquadId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'squad_messages',
        filter: `squad_id=eq.${resolvedSquadId}`,
      }, async (payload) => {
        const msg = payload.new as Message;
        const { data: p } = await supabase
          .from('profiles').select('id, full_name, avatar_url').eq('id', msg.user_id).single();
        setMessages(prev => [...prev, { ...msg, profile: p ?? undefined }]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [resolvedSquadId, isMember]);

  // ── Realtime: members ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!resolvedSquadId) return;

    const channel = supabase
      .channel(`squad_members_rt:${resolvedSquadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'squad_members',
        filter: `squad_id=eq.${resolvedSquadId}`,
      }, async () => {
        const { data } = await supabase.from('squad_members')
          .select('*, profiles(full_name, avatar_url, username)')
          .eq('squad_id', resolvedSquadId);
        if (data) {
          setMembers(data);
          setCurrentMember(data.find((m: Member) => m.user_id === currentUserId) ?? null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [resolvedSquadId, currentUserId]);

  // ── Realtime: events ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!resolvedSquadId) return;

    const channel = supabase
      .channel(`squad_events_rt:${resolvedSquadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'squad_events',
        filter: `squad_id=eq.${resolvedSquadId}`,
      }, () => { loadEvents(currentUserId); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [resolvedSquadId, currentUserId]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentUserId || !resolvedSquadId) return;
    const content = messageInput.trim();
    setMessageInput('');
    try {
      const { error } = await supabase.from('squad_messages').insert({
        squad_id: resolvedSquadId, user_id: currentUserId, content,
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
    if (!currentUserId || !resolvedSquadId || !squad) return;

    // Check squad limit (max 5 squads per user)
    try {
      const { count } = await supabase
        .from('squad_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId);
      
      if (count && count >= 5) {
        showToast('You can only join up to 5 squads. Leave a squad first.', 'error');
        return;
      }
    } catch (err) {
      console.error('Error checking squad count:', err);
    }

    // Private squads: valid invite code = direct join
    if (squad.is_private) {
      if (!inviteCodeInput.trim()) {
        setInviteCodeError('Please enter the invite code');
        return;
      }
      if (inviteCodeInput.trim().toUpperCase() !== squad.invite_code?.toUpperCase()) {
        setInviteCodeError('Invalid invite code');
        return;
      }
      setInviteCodeError('');
      // Valid code → direct join
      setIsJoining(true);
      try {
        const { error } = await supabase.from('squad_members').upsert(
          { squad_id: resolvedSquadId, user_id: currentUserId, role: 'MEMBER' },
          { onConflict: 'squad_id,user_id', ignoreDuplicates: true }
        );
        if (error) throw error;
        showToast('You joined the squad!', 'success');
        await load();
      } catch (err: any) {
        showToast(err.message || 'Failed to join', 'error');
      } finally { setIsJoining(false); }
      return;
    }

    // Public squads with require_approval need join request
    if (squad.require_approval) {
      // Check squad limit (max 5 squads per user)
      try {
        const { count } = await supabase
          .from('squad_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId);
        
        if (count && count >= 5) {
          showToast('You can only join up to 5 squads. Leave a squad first.', 'error');
          return;
        }
      } catch (err) {
        console.error('Error checking squad count:', err);
      }
      
      setIsJoining(true);
      try {
        // First check if a request already exists
        const { data: existing, error: selectError } = await supabase
          .from('squad_join_requests')
          .select('status')
          .eq('squad_id', resolvedSquadId)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (existing) {
          if (existing.status === 'pending') {
            setHasPendingRequest(true);
            showToast('You already have a pending join request', 'info');
            setIsJoining(false);
            return;
          } else if (existing.status === 'approved') {
            showToast('Your request was already approved. Refresh the page.', 'info');
            setIsJoining(false);
            return;
          } else if (existing.status === 'rejected') {
            showToast('Your previous request was rejected. Please contact the squad owner.', 'info');
            setIsJoining(false);
            return;
          }
        }

        // Insert new request
        const { error } = await supabase.from('squad_join_requests').insert({
          squad_id: resolvedSquadId,
          user_id: currentUserId,
          status: 'pending'
        });
        
        if (error) {
          // Handle duplicate key constraint
          if (error.code === '23505') {
            showToast('You already have a join request for this squad', 'info');
            setHasPendingRequest(true);
            setIsJoining(false);
            return;
          } else {
            throw error;
          }
        }
        
        setHasPendingRequest(true);
        showToast('Join request sent! Waiting for approval.', 'success');
      } catch (err: any) {
        console.error('Join request error:', err);
        showToast(err.message || 'Failed to send request', 'error');
      } finally { setIsJoining(false); }
      return;
    }

    // Direct join (public squads without approval requirement)
    setIsJoining(true);
    try {
      const { error } = await supabase.from('squad_members').upsert(
        { squad_id: resolvedSquadId, user_id: currentUserId, role: 'MEMBER' },
        { onConflict: 'squad_id,user_id', ignoreDuplicates: true }
      );
      if (error) throw error;
      showToast('You joined the squad!', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Failed to join', 'error');
    } finally { setIsJoining(false); }
  };

  // Request to join private squad without code
  const sendJoinRequest = async () => {
    if (!currentUserId || !resolvedSquadId) return;
    
    // Check squad limit (max 5 squads per user)
    try {
      const { count } = await supabase
        .from('squad_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId);
      
      if (count && count >= 5) {
        showToast('You can only join up to 5 squads. Leave a squad first.', 'error');
        return;
      }
    } catch (err) {
      console.error('Error checking squad count:', err);
    }
    
    setIsJoining(true);
    // Safety: always unlock button after 10s
    const timeout = setTimeout(() => setIsJoining(false), 10000);
    try {
      // First check if a request already exists
      const { data: existing, error: selectError } = await supabase
        .from('squad_join_requests')
        .select('status')
        .eq('squad_id', resolvedSquadId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          setHasPendingRequest(true);
          showToast('You already have a pending join request', 'info');
          setIsJoining(false);
          return;
        } else if (existing.status === 'approved') {
          showToast('Your request was already approved. Refresh the page.', 'info');
          setIsJoining(false);
          return;
        } else if (existing.status === 'rejected') {
          showToast('Your previous request was rejected. Please contact the squad owner.', 'info');
          setIsJoining(false);
          return;
        }
      }

      // Insert new request
      const { error } = await supabase.from('squad_join_requests').insert({
        squad_id: resolvedSquadId,
        user_id: currentUserId,
        status: 'pending'
      });
      
      if (error) {
        // Handle duplicate key constraint
        if (error.code === '23505') {
          showToast('You already have a join request for this squad', 'info');
          setHasPendingRequest(true);
          setIsJoining(false);
          return;
        } else {
          throw error;
        }
      }
      
      setHasPendingRequest(true);
      showToast('Join request sent! Waiting for owner approval.', 'success');
    } catch (err: any) {
      console.error('Join request error:', err);
      showToast(err.message || 'Failed to send request', 'error');
    } finally {
      clearTimeout(timeout);
      setIsJoining(false);
    }
  };

  const handleJoinRequest = async (requestId: string, userId: string, action: 'approved' | 'rejected') => {
    try {
      if (action === 'approved' && resolvedSquadId) {
        // Use secure RPC that handles both status update + member insert atomically
        const { error: rpcError } = await supabase.rpc('approve_squad_join_request', {
          p_request_id: requestId,
          p_squad_id: resolvedSquadId,
          p_user_id: userId,
        });
        if (rpcError) throw rpcError;
      } else {
        // Rejection: just update status
        const { error: updateError } = await supabase
          .from('squad_join_requests')
          .update({ status: action, updated_at: new Date().toISOString() })
          .eq('id', requestId);
        if (updateError) throw updateError;
      }

      showToast(action === 'approved' ? 'Member approved!' : 'Request rejected', action === 'approved' ? 'success' : 'info');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Failed to process request', 'error');
    }
  };

  // Copy invite link/code
  const copyInviteCode = () => {
    if (!squad?.invite_code) return;
    navigator.clipboard.writeText(squad.invite_code);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const copyInviteLink = () => {
    if (!squad) return;
    const slug = squad.slug || squad.id;
    const link = `${window.location.origin}/teams/${slug}/invite/${squad.invite_code || ''}`;
    navigator.clipboard.writeText(link);
    setCopiedInvite(true);
    showToast('Invite link copied!', 'success');
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleLeave = async () => {
    if (!currentUserId || !resolvedSquadId || !confirm('Leave this squad?')) return;
    setIsLeaving(true);
    try {
      const { error } = await supabase.from('squad_members')
        .delete().eq('squad_id', resolvedSquadId).eq('user_id', currentUserId);
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
      requireApproval: squad.require_approval || false,
    });
    setManageTab('info');
    setShowManage(true);
  };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSquadId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('squads').update({
        name: manageForm.name, description: manageForm.description,
        location: manageForm.location, rules: manageForm.rules,
        is_private: manageForm.isPrivate,
        require_approval: manageForm.requireApproval,
      }).eq('id', resolvedSquadId);
      if (error) throw error;
      setSquad(prev => prev ? {
        ...prev, ...manageForm,
        is_private: manageForm.isPrivate,
        require_approval: manageForm.requireApproval,
      } : prev);
      showToast('Squad updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    } finally { setIsSaving(false); }
  };

  const deleteSquad = async () => {
    if (!resolvedSquadId) return;
    try {
      await supabase.from('squads').delete().eq('id', resolvedSquadId);
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
    if (!resolvedSquadId || !currentUserId) return;
    setSavingEvent(true);
    try {
      const payload = {
        squad_id: resolvedSquadId, title: eventForm.title, description: eventForm.description,
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

  if (!contentVisible) {
    return (
      <div
        className={`h-full overflow-y-auto transition-all duration-300 ease-out ${
          skelLeaving ? 'opacity-0 -translate-y-3 scale-[0.99]' : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        <div className="p-4 md:p-8 lg:p-14">
          <div className="h-11 w-11 bg-slate-200/60 rounded-full animate-pulse"></div>
        </div>
        <div className="px-4 md:px-8 lg:px-14">
          <SquadDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!squad) return null;

  // Private gate for non-members
  if (squad.is_private && !isMember) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-white rounded-[40px] border border-slate-100 p-10 max-w-lg w-full shadow-sm">
          <div className="w-24 h-24 rounded-[28px] bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-slate-300" />
          </div>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Private Squad</h2>
            <p className="text-slate-400 font-medium">Enter invite code or request to join</p>
          </div>
          
          {currentUserId && (
            <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-sm mb-6 border-2 ${
              userSquadCount >= 5
                ? 'bg-red-50 text-red-700 border-red-300'
                : userSquadCount >= 4
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <UsersRound size={20} className="flex-shrink-0" />
              <div className="text-left">
                <div className="uppercase tracking-wider">Your Squads: {userSquadCount}/5</div>
                {userSquadCount >= 5 && (
                  <div className="text-[10px] font-bold mt-0.5 opacity-80">Maximum reached - Leave a squad first</div>
                )}
                {userSquadCount === 4 && (
                  <div className="text-[10px] font-bold mt-0.5 opacity-80">1 more squad available</div>
                )}
              </div>
            </div>
          )}

          {hasPendingRequest ? (
            <div className="text-center p-5 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
              <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-amber-700 text-sm">Join request pending</p>
              <p className="text-xs text-amber-500 mt-1">Waiting for squad leader approval</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {/* Option 1: Join with invite code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Option 1: Invite Code</label>
                <div className="relative">
                  <Key size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={e => { setInviteCodeInput(e.target.value.toUpperCase()); setInviteCodeError(''); }}
                    placeholder="Enter invite code"
                    className={`w-full bg-slate-50 border rounded-2xl py-4 pl-12 pr-5 outline-none focus:ring-4 focus:ring-blue-500/10 font-mono font-bold text-sm uppercase tracking-widest ${
                      inviteCodeError ? 'border-rose-300' : 'border-slate-100'
                    }`}
                  />
                </div>
                {inviteCodeError && (
                  <p className="text-xs text-rose-500 font-bold ml-1">{inviteCodeError}</p>
                )}
              </div>

              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full h-14 rounded-2xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-lime-100 disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Join with Code'}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-black text-slate-400 uppercase tracking-widest">Or</span>
                </div>
              </div>

              {/* Option 2: Request to join */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Option 2: Request Access</label>
                <button
                  onClick={sendJoinRequest}
                  disabled={isJoining}
                  className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {isJoining ? 'Sending Request...' : 'Request Owner Approval'}
                </button>
              </div>
            </div>
          )}

          <button onClick={() => navigate('/teams')}
            className="w-full flex items-center justify-center gap-2 h-11 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
            <ArrowLeft size={15} /> Back to Squads
          </button>
        </div>
      </div>
    );
  }

  const winRate = squad.wins + squad.losses > 0
    ? Math.round((squad.wins / (squad.wins + squad.losses)) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both flex h-[calc(100vh-4rem)] md:h-screen bg-slate-50 overflow-hidden">

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
            src={squad.image_url || DEFAULT_SQUAD_BANNER}
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
        <div className="p-4 border-t border-slate-100 space-y-2">
          {/* Invite code display for owner of private squads */}
          {isMember && isOwner && squad.is_private && squad.invite_code && (
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 mb-2">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Invite Code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono font-bold text-indigo-700 tracking-widest">{squad.invite_code}</code>
                <button onClick={copyInviteCode}
                  className="p-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-500 transition-all">
                  <Copy size={12} />
                </button>
              </div>
              <button onClick={copyInviteLink}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-xl text-indigo-600 text-[9px] font-black uppercase tracking-widest transition-all">
                <Link2 size={11} /> {copiedInvite ? 'Copied!' : 'Copy Invite Link'}
              </button>
            </div>
          )}

          {isMember ? (
            !isOwner && (
              <button onClick={handleLeave} disabled={isLeaving}
                className="w-full flex items-center justify-center gap-2 h-11 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                {isLeaving ? <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /> : <><LogOut size={13} /> Leave Squad</>}
              </button>
            )
          ) : hasPendingRequest ? (
            <div className="text-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Request Pending</p>
            </div>
          ) : squad.require_approval ? (
            <button onClick={handleJoin} disabled={isJoining}
              className="w-full flex items-center justify-center gap-2 h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-100 disabled:opacity-50">
              {isJoining ? <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <>Request to Join <Zap size={13} /></>}
            </button>
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

                  {/* Require approval toggle (public squads only) */}
                  {!manageForm.isPrivate && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Require Approval to Join</p>
                        <p className="text-[9px] text-amber-600 font-bold mt-0.5">New members must be approved by leader/mod</p>
                      </div>
                      <button type="button"
                        onClick={() => setManageForm({ ...manageForm, requireApproval: !manageForm.requireApproval })}
                        className={`w-12 h-7 rounded-full transition-all relative shrink-0 ${manageForm.requireApproval ? 'bg-amber-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${manageForm.requireApproval ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </div>
                  )}

                  {/* Invite code display for private squads */}
                  {squad.is_private && squad.invite_code && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Squad Invite Code</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-lg font-mono font-bold text-indigo-700 tracking-[0.3em]">{squad.invite_code}</code>
                        <button type="button" onClick={copyInviteCode}
                          className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-xl text-indigo-500 transition-all">
                          <Copy size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={copyInviteLink}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-100 hover:bg-indigo-200 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-widest transition-all">
                        <Link2 size={12} /> {copiedInvite ? 'Copied!' : 'Copy Invite Link'}
                      </button>
                    </div>
                  )}

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
            {/* Public squad privacy warning */}
            {!squad.is_private && (
              <div className="flex items-center gap-2.5 px-5 py-3 bg-amber-50 border-b border-amber-100 shrink-0">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 leading-snug">
                  <span className="font-black uppercase tracking-wide">Public Chat</span> — Do not share personal info (phone numbers, addresses, financial details). All members can see messages.
                </p>
              </div>
            )}

            {/* Join requests notification for owner/mod */}
            {canManage && joinRequests.length > 0 && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {joinRequests.length} Pending Join Request{joinRequests.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="space-y-2">
                  {joinRequests.slice(0, 3).map(req => (
                    <div key={req.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-100">
                      <img
                        src={req.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.profiles?.full_name || 'U')}&background=random`}
                        className="w-7 h-7 rounded-lg object-cover"
                        alt=""
                      />
                      <span className="flex-1 text-xs font-bold text-slate-800 truncate">{req.profiles?.full_name || 'Unknown'}</span>
                      <button onClick={() => handleJoinRequest(req.id, req.user_id, 'approved')}
                        className="px-2 py-1 bg-lime-100 hover:bg-lime-200 text-lime-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        Accept
                      </button>
                      <button onClick={() => handleJoinRequest(req.id, req.user_id, 'rejected')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        Deny
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <p className="text-slate-400 font-medium text-sm">
                {squad.require_approval
                  ? 'This squad requires approval to join. Request access below.'
                  : 'Join this squad to access the chat and events.'}
              </p>
            </div>
            {hasPendingRequest ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-amber-700 text-sm">Join request pending</p>
                <p className="text-[9px] text-amber-500 mt-1">Waiting for squad leader approval</p>
              </div>
            ) : (
              <button onClick={handleJoin} disabled={isJoining}
                className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 ${
                  squad.require_approval
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-100'
                    : 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lime-100'
                }`}>
                {isJoining ? 'Processing...' : squad.require_approval ? <><Zap size={14} /> Request to Join</> : <><Zap size={14} /> Join Squad</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR: MEMBERS + EVENTS ───────────────────────────────── */}
      <div className="w-72 bg-white border-l border-slate-100 flex flex-col overflow-hidden shrink-0">
        <div className="flex-1 overflow-y-auto">

          {/* Roster */}
          <div className="p-5 border-b border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Members ({members.length})
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
