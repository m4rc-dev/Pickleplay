import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../services/supabase';
import {
  UsersRound,
  Search,
  Plus,
  Trophy,
  TrendingUp,
  ChevronRight,
  UserPlus,
  Shield,
  Zap,
  X,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
// Fix: Import UserRole from the centralized types.ts file.
import { UserRole } from '../types';

interface Team {
  id: string;
  name: string;
  description: string;
  image_url: string;
  is_private: boolean;
  is_official: boolean;
  tags: string[];
  members_count?: number;
  avg_rating?: number; // DB column is avg_rating
  wins?: number;
  created_by?: string;
}

interface TeamsProps {
  userRole?: UserRole;
  isSidebarCollapsed?: boolean;
}

const Teams: React.FC<TeamsProps> = ({ userRole = 'PLAYER', isSidebarCollapsed = false }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-teams'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', isPrivate: false, isOfficial: false });
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);

  const themeColor = userRole === 'ADMIN' ? 'indigo' : 'blue';

  useEffect(() => {
    loadSquads();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadSquads = async () => {
    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading squads:', error);
      return;
    }

    if (data) {
      // Add random member counts for demo effect since squad_members is empty initially
      const mappedTeams: Team[] = data.map(t => ({
        ...t,
        members_count: Math.floor(Math.random() * 50) + 1, // Placeholder
        avg_rating: t.avg_rating || (3.0 + Math.random() * 2.0),
        wins: t.wins || Math.floor(Math.random() * 20)
      }));
      setTeams(mappedTeams);
    }
  };

  const handleSaveSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const squadData = {
        name: newTeam.name,
        description: newTeam.description,
        is_private: newTeam.isPrivate,
        is_official: userRole === 'ADMIN' && newTeam.isOfficial,
        tags: userRole === 'ADMIN' && newTeam.isOfficial
          ? ['OFFICIAL', 'MOD-LED']
          : ['New', 'Member-Owned'],
        // Only update created_by if creating new
        ...(editingSquadId ? {} : { created_by: user.id, image_url: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=400' })
      };

      let result;
      if (editingSquadId) {
        // Update
        result = await supabase
          .from('squads')
          .update(squadData)
          .eq('id', editingSquadId)
          .select()
          .single();
      } else {
        // Create
        result = await supabase
          .from('squads')
          .insert(squadData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (result.data) {
        if (editingSquadId) {
          setTeams(teams.map(t => t.id === editingSquadId ? { ...t, ...result.data } : t));
          alert('Squad updated successfully!');
        } else {
          setTeams([result.data, ...teams]);
          alert('Squad deployed successfully!');
        }

        closeModal();
      }

    } catch (err: any) {
      console.error('Failed to save squad:', err);
      alert('Error saving squad: ' + err.message);
    }
  };

  const openEditModal = (team: Team) => {
    setEditingSquadId(team.id);
    setNewTeam({
      name: team.name,
      description: team.description,
      isPrivate: team.is_private,
      isOfficial: team.is_official
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingSquadId(null);
    setNewTeam({ name: '', description: '', isPrivate: false, isOfficial: false });
  };

  const joinTeam = (id: string) => {
    setJoinedTeamId(id);
    setTimeout(() => {
      setJoinedTeamId(null);
      setActiveTab('my-teams');
    }, 1500);
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const myTeams = teams.filter(t => {
    if (userRole === 'ADMIN') {
      return t.is_official || t.created_by === currentUserId;
    }
    return t.created_by === currentUserId; // simplified for now, should also include joined squads
  });

  const displayTeams = activeTab === 'discover' ? filteredTeams : myTeams;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className={`text-xs font-black text-${themeColor}-600 uppercase tracking-[0.4em] mb-4`}>
            {userRole === 'ADMIN' ? 'PLATFORM GOVERNANCE / SQUAD CONTROL' : 'TEAM NETWORK / 2025'}
          </p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">
            {userRole === 'ADMIN' ? 'ORGANIZE.' : 'SQUAD UP.'}
          </h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-8 py-4 bg-${themeColor === 'indigo' ? 'indigo-600 text-white' : 'lime-400 text-slate-950'} hover:opacity-90 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl`}
          >
            <Plus size={20} /> {userRole === 'ADMIN' ? 'DEPLOY NEW SQUAD' : 'CREATE TEAM'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm sticky top-4 z-40">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'discover' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
              }`}
          >
            DISCOVER
          </button>
          <button
            onClick={() => setActiveTab('my-teams')}
            className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'my-teams' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
              }`}
          >
            {userRole === 'ADMIN' ? 'MODERATED SQUADS' : 'MY TEAMS'}
          </button>
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search teams by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayTeams.length > 0 ? (
          displayTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onJoin={() => joinTeam(team.id)}
              onManage={() => openEditModal(team)}
              isJoining={joinedTeamId === team.id}
              themeColor={themeColor}
              currentUserId={currentUserId}
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <UsersRound size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-950">
                {activeTab === 'discover'
                  ? 'NO SQUADS FOUND.'
                  : (userRole === 'ADMIN' ? 'NO DEPLOYED SQUADS.' : 'NO ACTIVE SQUADS.')}
              </h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">
                {activeTab === 'discover'
                  ? 'Try adjusting your search terms or be the first to found a new dynasty.'
                  : (userRole === 'ADMIN'
                    ? 'As an administrator, you can deploy official platform teams to lead community initiatives.'
                    : "You haven't joined or created any teams yet. Start a legacy or join the top-rated Metro Manila players.")}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('discover')}
              className={`text-${themeColor}-600 font-black text-xs uppercase tracking-widest hover:underline`}
            >
              {activeTab === 'discover' ? 'CLEAR SEARCH' : 'BROWSE ALL SQUADS'}
            </button>
          </div>
        )}
      </div>

      {showCreateModal && ReactDOM.createPortal(
        <div className={`fixed top-0 left-0 right-0 bottom-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
          <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <div className={`absolute top-0 right-0 w-48 h-48 bg-${themeColor}-400/10 blur-[60px] -z-10`}></div>

            <button
              onClick={closeModal}
              className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500"
            >
              <X size={18} />
            </button>

            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-slate-950 tracking-tighter mb-2 uppercase">
                {editingSquadId ? 'MANAGE SQUAD.' : (userRole === 'ADMIN' ? 'DEPLOY SQUAD.' : 'FOUND A DYNASTY.')}
              </h2>
              <p className="text-slate-500 font-medium">
                {editingSquadId ? 'Update mission parameters or security credentials.' : (userRole === 'ADMIN' ? 'Initialize an official platform-governed squad.' : 'Define your team identity and attract top players.')}
              </p>
            </div>

            <form onSubmit={handleSaveSquad} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Identity Name</label>
                <input
                  required
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="e.g. Metro Manila Elites"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Manifesto / Mission</label>
                <textarea
                  required
                  rows={4}
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="What is this squad's purpose?"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-900 resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Shield size={20} className={`text-${themeColor}-600`} />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Private Node</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">INVITE ONLY MEMBERSHIP</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewTeam({ ...newTeam, isPrivate: !newTeam.isPrivate })}
                    className={`w-14 h-8 rounded-full transition-all relative ${newTeam.isPrivate ? `bg-${themeColor}-600` : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${newTeam.isPrivate ? 'left-7 shadow-md' : 'left-1'}`} />
                  </button>
                </div>

                {userRole === 'ADMIN' && (
                  <div className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={20} className="text-indigo-600" />
                      <div>
                        <p className="font-bold text-indigo-950 text-sm">Official Platform Status</p>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">VERIFIED SQUAD ASSETS</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTeam({ ...newTeam, isOfficial: !newTeam.isOfficial })}
                      className={`w-14 h-8 rounded-full transition-all relative ${newTeam.isOfficial ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${newTeam.isOfficial ? 'left-7 shadow-md' : 'left-1'}`} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`w-full h-16 bg-${themeColor === 'indigo' ? 'indigo-600' : 'lime-400'} text-${themeColor === 'indigo' ? 'white' : 'slate-950'} rounded-3xl font-black text-base uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3`}
              >
                {editingSquadId ? 'UPDATE SQUAD' : (userRole === 'ADMIN' ? 'DEPLOY SQUADRON' : 'FOUND TEAM')} <Plus size={22} className={editingSquadId ? 'hidden' : ''} />
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const TeamCard: React.FC<{ team: Team, onJoin: () => void, onManage: () => void, isJoining: boolean, themeColor: string, currentUserId: string | null }> = ({ team, onJoin, onManage, isJoining, themeColor, currentUserId }) => {
  const isCreator = currentUserId === team.created_by;

  return (
    <div className="group relative bg-white rounded-[48px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
      <div className="aspect-[16/10] relative overflow-hidden">
        <img src={team.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

        <div className="absolute top-6 left-6 flex gap-2">
          {team.is_official ? (
            <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl">
              <ShieldCheck size={14} /> OFFICIAL
            </span>
          ) : team.is_private ? (
            <span className="bg-slate-950/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Shield size={10} /> INVITE ONLY
            </span>
          ) : (
            <span className="bg-lime-400 text-slate-950 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">OPEN ROSTER</span>
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h3 className="text-2xl font-black text-white tracking-tighter leading-tight uppercase">{team.name}</h3>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3">
          {team.description}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Squad Rating</p>
            <div className="flex items-center gap-2">
              <Zap size={14} className={`text-${themeColor}-600 fill-${themeColor}-600`} />
              <span className="font-black text-slate-950 text-xl tracking-tight">{(team.avg_rating || 0).toFixed(1)}</span>
            </div>
          </div>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Roster</p>
            <div className="flex items-center gap-2">
              <UsersRound size={14} className={`text-${themeColor}-600`} />
              <span className="font-black text-slate-950 text-xl tracking-tight">{team.members_count || 0}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {team.tags && team.tags.map(tag => (
            <span key={tag} className={`px-3 py-1 ${tag === 'OFFICIAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'} text-[9px] font-black rounded-lg uppercase tracking-widest`}>
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={isCreator ? onManage : onJoin}
          disabled={isJoining}
          className={`w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden ${isJoining ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-lime-400 text-slate-950 hover:bg-lime-500 shadow-xl shadow-lime-100'
            }`}
        >
          {isJoining ? (
            isCreator ? (
              <>ACCESSING SQUAD... <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
            ) : (
              <>DEPLOYMENT REQUEST SENT <CheckCircle2 size={18} /></>
            )
          ) : isCreator ? (
            <>MANAGE SQUAD <ArrowRight size={18} /></>
          ) : (
            <>ENTER THE SQUAD <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default Teams;
