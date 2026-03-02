import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  MapPin,
  Settings,
  Calendar,
  ArrowDown,
  Trophy as TrophyIcon,
} from 'lucide-react';
import { Group, GroupEvent } from '../../types';
import { supabase } from '../../services/supabase';
import { getGroups, joinGroup, getGroupEvents, createGroupEvent } from '../../services/community';
import { CreateGroupModal } from './CreateGroupModal';
import { CreateEventModal } from './CreateEventModal';

const Groups: React.FC = () => {
  const navigate = useNavigate();
  const groupsGridRef = useRef<HTMLDivElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userSquadCount = useMemo(() => {
    if (!currentUserId) return 0;
    return groups.filter(g => g.created_by === currentUserId).length;
  }, [groups, currentUserId]);

  // Lock body scroll when modals open
  useEffect(() => {
    document.body.style.overflow = showCreateGroup || showCreateEvent ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showCreateGroup, showCreateEvent]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);

      try {
        const allGroups = await getGroups();
        setGroups(allGroups);
      } catch (err) {
        console.error('Error loading groups:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? groups.filter(g => `${g.name} ${g.description || ''} ${g.category || ''}`.toLowerCase().includes(query))
      : groups;

    return [...filtered].sort((a, b) => {
      const aCreator = a.created_by === currentUserId ? 0 : 1;
      const bCreator = b.created_by === currentUserId ? 0 : 1;
      if (aCreator !== bCreator) return aCreator - bCreator;
      return (a.user_is_member ? 0 : 1) - (b.user_is_member ? 0 : 1);
    });
  }, [groups, searchQuery, currentUserId]);

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroupId(groupId);
    try {
      await joinGroup(groupId);
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, member_count: (g.member_count || 0) + 1, user_is_member: true } : g
      ));
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const isAdminOfAny = groups.some(g => g.created_by === currentUserId);

  return (
    <>
      <div className="h-[calc(100vh-4rem)] md:h-screen overflow-y-auto animate-fade-in" style={{ backgroundColor: '#EBEBE6' }}>
      <div className="p-4 md:p-8 lg:p-14 max-w-[1920px] mx-auto w-full pb-24 space-y-10">
        {/* Page Header */}
        <div>
          <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">PICKLEBALL / GROUPS</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase">Find Groups.</h1>
        </div>

        {/* Hero Banner — Join Group Quick Action */}
        <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 text-indigo-100 rotate-12">
            <Users className="w-full h-full" />
          </div>
          <div className="relative z-10">
            {/* badge */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full mb-4">
              Quick Action
            </span>
            <h3 className="text-3xl font-black mb-3 tracking-tight uppercase leading-none text-slate-900">
              JOIN A <br /> GROUP.
            </h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              Browse open groups and tap <span className="font-bold text-slate-700">Join</span> — or start your own pickleball dynasty.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Primary: scroll to groups list */}
              <button
                onClick={() => groupsGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100"
              >
                Browse &amp; Join <ArrowDown size={15} />
              </button>
              {/* Secondary: create a new group */}
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full bg-slate-100 text-slate-700 font-black py-4 rounded-[24px] hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-slate-200"
              >
                Create group <Plus size={15} />
              </button>
            </div>
            {/* stat strip */}
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900">{groups.length}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Groups</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900">
                  {groups.filter(g => !g.user_is_member && g.created_by !== currentUserId).length}
                </p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Open to Join</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-600">
                  {groups.filter(g => g.user_is_member || g.created_by === currentUserId).length}
                </p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Joined</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search squads by name, location or category…"
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all shadow-sm"
          />
        </div>

        {/* Groups Grid */}
        <div ref={groupsGridRef} />
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 animate-pulse space-y-4">
                <div className="h-5 bg-slate-100 rounded-full w-2/3" />
                <div className="h-4 bg-slate-100 rounded-full w-full" />
                <div className="h-4 bg-slate-100 rounded-full w-1/2" />
                <div className="h-12 bg-slate-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGroups.map(group => {
              const isCreator = group.created_by === currentUserId;
              return (
                <div
                  key={group.id}
                  className={`bg-white p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all ${isCreator ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pickleball</p>
                        {isCreator && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-indigo-100 text-indigo-600">
                            YOUR SQUAD
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight">{group.name}</h4>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {group.description || 'Join this group to connect with other players'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${group.privacy === 'public' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {group.privacy === 'public' ? 'Public' : 'Private'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mb-3">
                    <Users size={14} className="text-indigo-400" /> {group.member_count} members
                    <span>•</span>
                    <MapPin size={14} className="text-indigo-400" /> {group.location || 'Location TBD'}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(group.tags || []).map(tag => (
                      <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/community/groups/${group.id}`)}
                      className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                    >
                      View details
                    </button>
                    {isCreator ? (
                      <button
                        onClick={() => navigate(`/community/groups/${group.id}/manage`)}
                        title="Manage Squad"
                        className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-all"
                      >
                        <Settings size={18} />
                      </button>
                    ) : group.user_is_member ? (
                      <button
                        disabled
                        className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-black uppercase tracking-widest cursor-default"
                      >
                        Joined
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joiningGroupId === group.id}
                        className="px-4 py-3 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {joiningGroupId === group.id ? 'Joining…' : 'Join group'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredGroups.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-700 mb-2">No squads found</h3>
                <p className="text-sm text-slate-400">Try adjusting your search or create a new squad</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        show={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        userSquadCount={userSquadCount}
        onGroupCreated={group => {
          setGroups(prev => [group, ...prev]);
          setShowCreateGroup(false);
        }}
      />

      <CreateEventModal
        show={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        groups={groups.filter(g => g.created_by === currentUserId)}
        onEventCreated={() => setShowCreateEvent(false)}
      />
    </>
  );
};

export default Groups;
