import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MapPin,
  Crown,
  Shield,
  Settings,
  Send,
  Plus,
  Calendar,
  MessageCircle,
  UserPlus,
  LogOut,
  Image as ImageIcon,
  Smile,
  Edit2,
  Save,
  Trash2,
  UserMinus,
  X,
  Loader2,
  ChevronUp,
  Moon,
  Sun
} from 'lucide-react';
import { Group, GroupMember, GroupEvent } from '../../types';
import { supabase } from '../../services/supabase';
import {
  getGroupById,
  getGroupMembers,
  getGroupEvents,
  joinGroup,
  leaveGroup,
  rsvpToEvent,
  removeRsvp,
  deleteGroupEvent
} from '../../services/community';
import { CreateEventModal } from './CreateEventModal';
import { EditEventModal } from './EditEventModal';

const MESSAGE_PAGE_SIZE = 50;

const GroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<(GroupMember & { user: any })[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groupDetailDarkMode') === 'true' || false;
    }
    return false;
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Manage squad state
  const [showManage, setShowManage] = useState(false);
  const [manageTab, setManageTab] = useState<'info' | 'members' | 'events'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GroupEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [manageForm, setManageForm] = useState({
    name: '',
    description: '',
    location: '',
    privacy: 'public' as 'public' | 'private',
    tags: '',
    rules: ''
  });

  const isCreator = group?.created_by === currentUserId;
  const currentMember = members.find(m => m.user_id === currentUserId);
  const isMember = !!currentMember && currentMember.status === 'active';
  const isAdmin = currentMember?.role === 'admin';
  const isModerator = currentMember?.role === 'moderator';

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('groupDetailDarkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('groupDetailDarkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  useEffect(() => {
    if (groupId) {
      loadGroup();
    }
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to group messages in realtime
  useEffect(() => {
    if (!groupId || !isMember) return;

    loadMessages();

    const channel = supabase
      .channel(`group_messages:${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, async (payload) => {
        const newMsg = payload.new as any;
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', newMsg.user_id)
          .single();
        setMessages(prev => [...prev, {
          ...newMsg,
          sender: profile || { id: newMsg.user_id, full_name: 'Unknown', avatar_url: null }
        }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, isMember]);

  // Subscribe to group_members changes in realtime
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group_members:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`
      }, () => {
        // Reload members when someone joins, leaves, or role changes
        getGroupMembers(groupId)
          .then(data => setMembers(data))
          .catch(err => console.error('Error reloading members:', err));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Subscribe to group_events changes in realtime
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group_events:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_events',
        filter: `group_id=eq.${groupId}`
      }, () => {
        // Reload events when one is created/updated/deleted
        getGroupEvents(groupId)
          .then(data => setEvents(data))
          .catch(err => console.error('Error reloading events:', err));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (profile) {
        setCurrentUserProfile({ name: profile.full_name, avatar: profile.avatar_url });
      }
    }
  };

  const loadGroup = async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const [groupData, membersData, eventsData] = await Promise.all([
        getGroupById(groupId),
        getGroupMembers(groupId).catch(err => {
          console.error('Error loading members:', err);
          return [] as (GroupMember & { user: any })[];
        }),
        getGroupEvents(groupId).catch(() => [] as GroupEvent[])
      ]);
      setGroup(groupData);
      setMembers(membersData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error loading group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (before?: string) => {
    if (!groupId) return;
    try {
      let query = supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data: messagesData, error } = await query;

      if (error) {
        console.error('Error loading messages:', error);
        if (!before) setMessages([]);
        return;
      }

      if (!messagesData || messagesData.length === 0) {
        if (!before) setMessages([]);
        setHasMoreMessages(false);
        return;
      }

      // Reverse to chronological order
      const chronological = messagesData.reverse();

      // Fetch sender profiles
      const userIds = [...new Set(chronological.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched = chronological.map(m => ({
        ...m,
        sender: profileMap.get(m.user_id) || { id: m.user_id, full_name: 'Unknown', avatar_url: null }
      }));

      if (before) {
        // Prepend older messages
        setMessages(prev => [...enriched, ...prev]);
      } else {
        setMessages(enriched);
      }

      setHasMoreMessages(messagesData.length === MESSAGE_PAGE_SIZE);
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

    // Maintain scroll position
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      }
    });

    setLoadingEarlier(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !groupId || !currentUserId) return;
    const content = messageInput.trim();
    setMessageInput('');

    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: currentUserId,
          content
        });

      if (error) {
        console.error('Error sending message:', error);
        // Put message back
        setMessageInput(content);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageInput(content);
    }
  };

  const handleJoin = async () => {
    if (!groupId) return;
    setIsJoining(true);
    try {
      // Check if already a member first to avoid 409 conflict
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existingMember) {
        // Already a member, just reload to update UI
        await loadGroup();
        return;
      }

      await joinGroup(groupId);
      await loadGroup();
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!groupId || isCreator) return;
    if (!window.confirm('Are you sure you want to leave this squad?')) return;
    setIsLeaving(true);
    try {
      await leaveGroup(groupId);
      await loadGroup();
    } catch (err) {
      console.error('Error leaving group:', err);
      alert('Failed to leave group.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleRsvp = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    try {
      if (event.user_rsvp_status === 'going') {
        await removeRsvp(eventId);
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_rsvp_status: null, rsvp_count: (e.rsvp_count || 1) - 1 } : e));
      } else {
        await rsvpToEvent(eventId, 'going');
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, user_rsvp_status: 'going', rsvp_count: (e.rsvp_count || 0) + 1 } : e));
      }
    } catch (err) {
      console.error('Error updating RSVP:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-slate-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-[40px] p-10 border border-slate-200 animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-48 bg-slate-100 rounded-lg" />
          <div className="h-20 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-slate-500 font-semibold mb-4">Group not found</p>
        <button onClick={() => navigate('/community')} className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:text-indigo-800">
          Back to Community
        </button>
      </div>
    );
  }

  // Check if user has permission to view this group's details
  const canViewDetails = isMember || isCreator || group.privacy === 'public';

  // If private group and user is not a member, show join prompt only
  if (!canViewDetails && !isLoading) {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/community?tab=groups')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Back to Community</span>
          </button>
        </div>

        {/* Private Group Message */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-3xl font-black mb-6 mx-auto">
              {group.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{group.name}</h2>
            <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 mb-6">
              Private Group
            </span>
            <p className="text-slate-600 font-semibold mb-8">
              This is a private squad. Join to see details and chat with members.
            </p>
            {currentUserId && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="px-8 py-4 rounded-2xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                <UserPlus size={16} />
                {isJoining ? 'Requesting to join...' : 'Request to Join'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sort members: admin first, then moderator, then member
  const sortedMembers = [...members].sort((a, b) => {
    const order = { admin: 0, moderator: 1, member: 2 };
    return (order[a.role] || 2) - (order[b.role] || 2);
  });

  const pendingCount = members.filter(m => m.status === 'pending').length;

  const openManagePanel = () => {
    if (group) {
      setManageForm({
        name: group.name,
        description: group.description || '',
        location: group.location || '',
        privacy: group.privacy,
        tags: (group.tags || []).join(', '),
        rules: group.rules || ''
      });
    }
    setShowManage(true);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setManageTab('info');
  };

  const handleManageSave = async () => {
    if (!group) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: manageForm.name.trim(),
          description: manageForm.description.trim(),
          location: manageForm.location.trim(),
          privacy: manageForm.privacy,
          tags: manageForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          rules: manageForm.rules.trim() || null
        })
        .eq('id', group.id)
        .select()
        .single();
      if (error) throw error;
      setGroup(data);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating group:', err);
      alert('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageDelete = async () => {
    if (!group) return;
    try {
      const { error } = await supabase.from('groups').delete().eq('id', group.id);
      if (error) throw error;
      navigate('/community');
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Failed to delete group');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from this squad?`)) return;
    try {
      const { error } = await supabase.from('group_members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'member' ? 'moderator' : 'member';
    try {
      const { error } = await supabase.from('group_members').update({ role: newRole }).eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role');
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('group_members').update({ status: 'active' }).eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'active' as any } : m));
    } catch (err) {
      console.error('Error approving member:', err);
    }
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Top Bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Back to Community</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {(isCreator || isAdmin) && (
              <button
                onClick={openManagePanel}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-200 ${showManage
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg'
                  : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:shadow-md active:scale-95'
                  }`}
              >
                <Settings size={16} />
                <span>Manage Squad</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR - Squad Profile */}
          <div className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-y-auto">
            {/* Squad Avatar & Info */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-3xl font-black mb-4 mx-auto">
                {group.name.charAt(0)}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 text-center mb-1">{group.name}</h2>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{members.length} members</span>
              </div>
              <span className={`block text-center text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mx-auto w-fit ${group.privacy === 'public' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                {group.privacy}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 space-y-2">
              {/* Only show join button if data is fully loaded and user is definitely not a member/creator */}
              {!isLoading && currentUserId && !isMember && !isCreator && (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full px-4 py-3 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus size={14} />
                  {isJoining ? 'Joining...' : 'Join Squad'}
                </button>
              )}
              {isMember && !isCreator && (
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="w-full px-4 py-3 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <LogOut size={14} />
                  {isLeaving ? 'Leaving...' : 'Leave Squad'}
                </button>
              )}
            </div>

            {/* About Section */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">About</h3>
              {group.description ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{group.description}</p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No description</p>
              )}
            </div>

            {/* Location */}
            {group.location && (
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Location</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-semibold">
                  <MapPin size={14} className="text-indigo-500 dark:text-indigo-400" />
                  {group.location}
                </div>
              </div>
            )}

            {/* Tags */}
            {group.tags && group.tags.length > 0 && (
              <div className="px-6 py-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CENTER - Main Chat Area */}
          <div className="flex-1 bg-white dark:bg-slate-800 flex flex-col">
            {/* MANAGE SQUAD OVERLAY — covers entire center area including Messages header */}
            {showManage ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Manage Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-900">
                  <div className="flex items-center gap-3">
                    <Settings size={20} className="text-white/60" />
                    <div>
                      <h2 className="text-lg font-black text-white">Manage Squad</h2>
                      <p className="text-xs text-slate-300 font-semibold">{group.name} • {members.length} members</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManage(false)}
                    className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Manage Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700 px-8 bg-white dark:bg-slate-800">
                  <div className="flex gap-1">
                    {[
                      { key: 'info' as const, label: 'Squad Info', icon: Edit2 },
                      { key: 'members' as const, label: `Members (${members.length})${pendingCount ? ` • ${pendingCount} pending` : ''}`, icon: Users },
                      { key: 'events' as const, label: `Events (${events.length})`, icon: Calendar }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setManageTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${manageTab === tab.key
                          ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                      >
                        <tab.icon size={15} /> {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manage Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 bg-white dark:bg-slate-800">
                  {/* INFO TAB */}
                  {manageTab === 'info' && (
                    <div className="space-y-6 max-w-2xl">
                      {isEditing ? (
                        <div className="space-y-5">
                          <div>
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Squad Name</label>
                            <input
                              value={manageForm.name}
                              onChange={e => setManageForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                            <textarea
                              value={manageForm.description}
                              onChange={e => setManageForm(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                              rows={4}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Location</label>
                              <input
                                value={manageForm.location}
                                onChange={e => setManageForm(prev => ({ ...prev, location: e.target.value }))}
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Privacy</label>
                              <select
                                value={manageForm.privacy}
                                onChange={e => setManageForm(prev => ({ ...prev, privacy: e.target.value as any }))}
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-5 py-3.5 text-sm font-medium bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                              >
                                <option value="public">Public — Anyone can join</option>
                                <option value="private">Private — Approval required</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Tags</label>
                            <input
                              value={manageForm.tags}
                              onChange={e => setManageForm(prev => ({ ...prev, tags: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                              placeholder="Comma separated (e.g. beginner, social, competitive)"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Squad Rules</label>
                            <textarea
                              value={manageForm.rules}
                              onChange={e => setManageForm(prev => ({ ...prev, rules: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                              rows={3}
                              placeholder="Optional community guidelines..."
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                if (group) {
                                  setManageForm({
                                    name: group.name,
                                    description: group.description || '',
                                    location: group.location || '',
                                    privacy: group.privacy,
                                    tags: (group.tags || []).join(', '),
                                    rules: group.rules || ''
                                  });
                                }
                              }}
                              className="flex-1 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleManageSave}
                              disabled={isSaving || !manageForm.name.trim()}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-50"
                            >
                              <Save size={14} /> {isSaving ? 'Saving...' : 'Save changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Squad Name</p>
                              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{group.name}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Privacy</p>
                              <p className="text-base font-bold text-slate-900 dark:text-slate-100 capitalize">{group.privacy}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Location</p>
                              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{group.location || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Created</p>
                              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{new Date(group.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Description</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{group.description || 'No description yet'}</p>
                          </div>

                          {group.tags && group.tags.length > 0 && (
                            <div>
                              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {group.tags.map(tag => (
                                  <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {group.rules && (
                            <div>
                              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Rules</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{group.rules}</p>
                            </div>
                          )}

                          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                              onClick={() => setIsEditing(true)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
                            >
                              <Edit2 size={14} /> Edit info
                            </button>
                            {isCreator && (
                              <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all border border-rose-100 dark:border-rose-800"
                              >
                                <Trash2 size={14} /> Delete squad
                              </button>
                            )}
                          </div>

                          {showDeleteConfirm && (
                            <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 rounded-2xl p-6 space-y-4">
                              <p className="font-black text-rose-800 dark:text-rose-300 text-sm">Are you sure you want to delete "{group.name}"?</p>
                              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">This will permanently remove all members, events, and messages. This action cannot be undone.</p>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="flex-1 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleManageDelete}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 dark:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest hover:bg-rose-700 dark:hover:bg-rose-600 transition-all"
                                >
                                  <Trash2 size={14} /> Delete permanently
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEMBERS TAB */}
                  {manageTab === 'members' && (
                    <div className="space-y-3">
                      {sortedMembers.map(member => (
                        <div key={member.id} className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${member.status === 'pending'
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-700/50'
                          : member.role === 'admin'
                            ? 'bg-blue-50/30 dark:bg-blue-900/20 border-blue-200/30 dark:border-blue-700/30'
                            : 'bg-white dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500'
                          }`}>
                          <div className="flex items-center gap-3">
                            <img
                              src={member.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-600"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-900 dark:text-slate-100 text-sm">{member.user?.full_name || 'Unknown'}</p>
                                {member.role === 'admin' && (
                                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    <Crown size={10} /> Creator
                                  </span>
                                )}
                                {member.role === 'moderator' && (
                                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                                    <Shield size={10} /> Mod
                                  </span>
                                )}
                                {member.status === 'pending' && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                                {member.role} • Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          {member.role !== 'admin' && (
                            <div className="flex gap-2">
                              {member.status === 'pending' && (
                                <button
                                  onClick={() => handleApproveMember(member.id)}
                                  className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleUpdateRole(member.id, member.role)}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                              >
                                {member.role === 'member' ? 'Make Mod' : 'Demote'}
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id, member.user?.full_name || 'member')}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all flex items-center gap-1"
                              >
                                <UserMinus size={12} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {members.length === 0 && (
                        <div className="text-center py-12">
                          <Users size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">No members yet</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EVENTS TAB */}
                  {manageTab === 'events' && (
                    <div className="space-y-6 max-w-3xl">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Squad Events</h3>
                        <button
                          onClick={() => setShowCreateEvent(true)}
                          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
                        >
                          <Plus size={14} /> Create Event
                        </button>
                      </div>

                      <div className="space-y-3">
                        {events.map(event => (
                          <div key={event.id} className="bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-500 transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                                    {event.event_type}
                                  </span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                                    {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                </div>
                                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mb-1">{event.title}</h4>
                                {event.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">{event.description}</p>
                                )}
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin size={12} className="text-indigo-500 dark:text-indigo-400" />
                                      {event.location}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Users size={12} className="text-indigo-500 dark:text-indigo-400" />
                                    {event.rsvp_count || 0} going{event.max_attendees ? ` / ${event.max_attendees}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingEvent(event)}
                                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                                  title="Edit event"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingEventId(event.id)}
                                  className="p-2.5 rounded-xl text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
                                  title="Delete event"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {deletingEventId === event.id && (
                              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 bg-rose-50 dark:bg-rose-900/30 rounded-xl p-4">
                                <p className="font-black text-rose-800 dark:text-rose-400 text-sm mb-2">Delete this event?</p>
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-3">This will remove all RSVPs. This action cannot be undone.</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setDeletingEventId(null)}
                                    className="flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await deleteGroupEvent(event.id);
                                        setEvents(prev => prev.filter(e => e.id !== event.id));
                                        setDeletingEventId(null);
                                      } catch (err) {
                                        console.error('Error deleting event:', err);
                                        alert('Failed to delete event.');
                                      }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-rose-600 dark:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 dark:hover:bg-rose-600 transition-all"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {events.length === 0 && (
                          <div className="text-center py-12">
                            <Calendar size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-4">No events yet</p>
                            <button
                              onClick={() => setShowCreateEvent(true)}
                              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
                            >
                              <Plus size={14} /> Create your first event
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <>
                {/* Chat Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={24} className="text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Messages</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{messages.length} messages</p>
                    </div>
                  </div>
                </div>

                {isMember ? (
                  <>
                    {/* Messages Area */}
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                      {/* Load Earlier Messages Button */}
                      {hasMoreMessages && messages.length > 0 && (
                        <div className="flex justify-center pb-2">
                          <button
                            onClick={loadEarlierMessages}
                            disabled={loadingEarlier}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                          >
                            {loadingEarlier ? (
                              <><Loader2 size={14} className="animate-spin" /> Loading...</>
                            ) : (
                              <><ChevronUp size={14} /> Load earlier messages</>
                            )}
                          </button>
                        </div>
                      )}
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mb-4">
                            <MessageCircle size={28} className="text-indigo-300 dark:text-indigo-400" />
                          </div>
                          <p className="font-black text-slate-900 dark:text-slate-100 mb-1">No messages yet</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Be the first to say something to the squad!</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isOwn = msg.user_id === currentUserId;
                          const showAvatar = idx === 0 || messages[idx - 1]?.user_id !== msg.user_id;
                          return (
                            <div key={msg.id || idx} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              {showAvatar ? (
                                <img
                                  src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`}
                                  className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-600 shrink-0"
                                />
                              ) : (
                                <div className="w-10 shrink-0" />
                              )}
                              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                {showAvatar && (
                                  <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                    <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                                      {isOwn ? 'You' : msg.sender?.full_name || 'Unknown'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                      {formatMessageTime(msg.created_at)}
                                    </p>
                                  </div>
                                )}
                                <div className={`rounded-2xl px-4 py-3 ${isOwn
                                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-tr-sm'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                                  }`}>
                                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full rounded-3xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-6 py-4 text-sm font-medium dark:text-slate-100 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!messageInput.trim()}
                          className="p-4 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 dark:disabled:hover:bg-indigo-500 shrink-0"
                        >
                          <Send size={20} />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center px-8">
                    <div>
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <MessageCircle size={28} className="text-indigo-300 dark:text-indigo-400" />
                      </div>
                      <p className="font-black text-slate-900 dark:text-slate-100 mb-2">Join to access group chat</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">Members can send messages and coordinate games</p>
                      <button
                        onClick={handleJoin}
                        disabled={isJoining}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-50"
                      >
                        <UserPlus size={14} className="inline mr-2" />
                        {isJoining ? 'Joining...' : 'Join this squad'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT SIDEBAR - Directory (Members & Events) */}
          <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-y-auto">
            {/* Directory Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Directory</h2>
            </div>

            {/* Team Members Section */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Team Members
                </h3>
                <span className="text-xs font-black bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">
                  {members.length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(showAllMembers ? sortedMembers : sortedMembers.slice(0, 8)).map(member => (
                  <Link
                    key={member.id}
                    to={`/profile/${member.user_id}`}
                    className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group ${member.role === 'admin' ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''
                      }`}
                  >
                    <div className="relative">
                      <img
                        src={member.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                        className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-white dark:border-slate-800"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {member.user?.full_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {member.role === 'admin' && (
                          <span className="flex items-center gap-0.5 text-[9px] text-blue-600 dark:text-blue-400">
                            <Crown size={10} /> Admin
                          </span>
                        )}
                        {member.role === 'moderator' && (
                          <span className="flex items-center gap-0.5 text-[9px] text-indigo-600 dark:text-indigo-400">
                            <Shield size={10} /> Mod
                          </span>
                        )}
                        {member.user_id === currentUserId && (
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-black">• You</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {members.length > 8 && (
                  <button
                    onClick={() => setShowAllMembers(!showAllMembers)}
                    className="w-full text-center text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 py-2 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    {showAllMembers ? 'Show less' : `See all (${members.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* Events Section */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Upcoming Events
                </h3>
                <div className="flex items-center gap-2">
                  {(isCreator || isAdmin) && (
                    <>
                      <button
                        onClick={() => {
                          setManageTab('events');
                          setShowManage(true);
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title="Manage Events"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => setShowCreateEvent(true)}
                        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md"
                        title="Create Event"
                      >
                        <Plus size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {events.length > 0 ? (
                  (showAllEvents ? events : events.slice(0, 5)).map(event => (
                    <div key={event.id} className="border border-slate-100 dark:border-slate-700 rounded-2xl p-4 hover:border-indigo-200 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all group dark:bg-slate-800/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
                            {formatTime(event.start_time)}
                          </p>
                          <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{event.title}</h4>
                        </div>
                        {(isCreator || isAdmin) && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                              title="Edit event"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => setDeletingEventId(event.id)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                              title="Delete event"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-3">
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {event.rsvp_count || 0} going
                        </span>
                        {event.location && (
                          <>
                            <span>•</span>
                            <span className="truncate flex-1">{event.location}</span>
                          </>
                        )}
                      </div>

                      {deletingEventId === event.id ? (
                        <div className="bg-rose-50 dark:bg-rose-900/30 dark:border dark:border-rose-700 rounded-xl p-3 space-y-2">
                          <p className="font-black text-rose-800 dark:text-rose-300 text-xs">Delete this event?</p>
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">This will remove all RSVPs.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeletingEventId(null)}
                              className="flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteGroupEvent(event.id);
                                  setEvents(prev => prev.filter(e => e.id !== event.id));
                                  setDeletingEventId(null);
                                } catch (err) {
                                  console.error('Error deleting event:', err);
                                  alert('Failed to delete event.');
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-600 dark:bg-rose-700 text-white text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 dark:hover:bg-rose-600 transition-all"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        isMember && (
                          <button
                            onClick={() => handleRsvp(event.id)}
                            className={`w-full text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${event.user_rsvp_status === 'going'
                              ? 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                          >
                            {event.user_rsvp_status === 'going' ? '✓ Going' : 'RSVP'}
                          </button>
                        )
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No upcoming events</p>
                )}
                {events.length > 5 && (
                  <button
                    onClick={() => setShowAllEvents(!showAllEvents)}
                    className="w-full text-center text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 py-2 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    {showAllEvents ? 'Show less' : `See all (${events.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {group && (
        <>
          <CreateEventModal
            show={showCreateEvent}
            onClose={() => setShowCreateEvent(false)}
            onEventCreated={(newEvent) => setEvents(prev => [newEvent, ...prev])}
            groups={[group]}
            defaultGroupId={group.id}
          />
          {editingEvent && (
            <EditEventModal
              show={!!editingEvent}
              onClose={() => setEditingEvent(null)}
              onEventUpdated={(updatedEvent) => {
                setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
                setEditingEvent(null);
              }}
              event={editingEvent}
            />
          )}
        </>
      )}
    </>
  );
};

export default GroupDetail;
