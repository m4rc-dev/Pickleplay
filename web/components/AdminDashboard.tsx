
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  PlusCircle,
  Sparkles,
  Check,
  X,
  Search,
  GraduationCap,
  Lock,
  Eye,
  ShieldCheck,
  Radio,
  Database,
  Trophy,
  Calendar,
  DollarSign,
  MapPin,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  FileText,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { supabase } from '../services/supabase';
import { ProfessionalApplication, Tournament } from '../types';
// Fix: Import UserRole from the centralized types.ts file.
import { UserRole } from '../types';
import { INITIAL_TOURNAMENTS } from '../data/mockData';

const GROWTH_DATA = [
  { name: 'Mon', active: 120 },
  { name: 'Tue', active: 150 },
  { name: 'Wed', active: 180 },
  { name: 'Thu', active: 140 },
  { name: 'Fri', active: 210 },
  { name: 'Sat', active: 350 },
  { name: 'Sun', active: 310 },
];

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Suspended' | 'Pending';
  joinedDate: string;
  dupr: number;
}

const MOCK_USERS: PlatformUser[] = [
  { id: 'u1', name: 'David Smith', email: 'david@pickleplay.com', role: 'PLAYER', status: 'Active', joinedDate: '2025-01-12', dupr: 5.12 },
  { id: 'u2', name: 'Marcus Chen', email: 'marcus@procoach.me', role: 'COACH', status: 'Active', joinedDate: '2025-02-01', dupr: 4.85 },
];

interface AdminDashboardProps {
  applications?: ProfessionalApplication[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  currentAdminRole?: UserRole;
}

type AdminTab = 'overview' | 'applications' | 'users' | 'tournaments' | 'security' | 'staff' | 'audit';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ applications = [], onApprove, onReject, currentAdminRole = 'ADMIN' }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userList, setUserList] = useState<PlatformUser[]>(MOCK_USERS);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [newTournament, setNewTournament] = useState<Omit<Tournament, 'id' | 'registeredCount'>>({
    name: '',
    date: '',
    location: '',
    prizePool: '',
    status: 'UPCOMING',
    skillLevel: 'Intermediate',
    maxPlayers: 64
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);

  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    loadTournaments();
    if (currentAdminRole === 'ADMIN') {
      fetchAdminData();
    }
  }, [currentAdminRole]);

  const fetchAdminData = async () => {
    // 1. Fetch Total Users Count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (count !== null) setTotalUsers(count);

    // 2. Fetch Users List
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, active_role, created_at, account_status')
      .order('created_at', { ascending: false })
      .limit(50);

    if (profiles) {
      const mappedUsers: PlatformUser[] = profiles.map(p => ({
        id: p.id,
        name: p.full_name || 'Anonymous',
        email: p.email || 'No email',
        role: p.active_role as UserRole,
        status: (p.account_status as any) || 'Active',
        joinedDate: p.created_at?.split('T')[0] || '',
        dupr: 0 // Placeholder
      }));
      setUserList(mappedUsers);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active_role: newRole, roles: [newRole] }) // Simple sync for now
        .eq('id', userId);

      if (error) throw error;

      setUserList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert(`User role updated to ${newRole}`);
    } catch (err: any) {
      console.error('Role update failed:', err);
      alert('Failed to update role: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === userId) {
        alert("You cannot suspend your own administrative access.");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setUserList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
      alert(`User account is now ${newStatus}`);
    } catch (err: any) {
      console.error('Status update failed:', err);
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    }
  };

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error loading tournaments:', error);
      return;
    }

    if (data) {
      const mappedData: Tournament[] = data.map(t => ({
        id: t.id,
        name: t.name,
        date: t.date,
        location: t.location,
        prizePool: t.prize_pool,
        status: t.status as 'UPCOMING' | 'LIVE' | 'COMPLETED',
        skillLevel: t.skill_level,
        maxPlayers: t.max_players,
        registeredCount: t.registered_count
      }));
      setTournaments(mappedData);
    }
  };

  const openEditModal = (t: Tournament) => {
    setNewTournament({
      name: t.name,
      date: t.date,
      location: t.location,
      prizePool: t.prizePool,
      status: t.status,
      skillLevel: t.skillLevel,
      maxPlayers: t.maxPlayers
    });
    setEditingTournamentId(t.id);
    setShowTournamentModal(true);
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tournamentData = {
        name: newTournament.name,
        date: newTournament.date,
        location: newTournament.location,
        prize_pool: newTournament.prizePool,
        status: newTournament.status,
        skill_level: newTournament.skillLevel,
        max_players: newTournament.maxPlayers,
        created_by: user.id
      };

      if (editingTournamentId) {
        const { data, error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', editingTournamentId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const updatedTournament: Tournament = {
            id: data.id,
            name: data.name,
            date: data.date,
            location: data.location,
            prizePool: data.prize_pool,
            status: data.status as 'UPCOMING' | 'LIVE' | 'COMPLETED',
            skillLevel: data.skill_level,
            maxPlayers: data.max_players,
            registeredCount: data.registered_count
          };

          setTournaments(prev => prev.map(t => t.id === editingTournamentId ? updatedTournament : t));
          alert('Tournament successfully updated!');
        }
      } else {
        const { data, error } = await supabase
          .from('tournaments')
          .insert(tournamentData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const createdTournament: Tournament = {
            id: data.id,
            name: data.name,
            date: data.date,
            location: data.location,
            prizePool: data.prize_pool,
            status: data.status as 'UPCOMING' | 'LIVE' | 'COMPLETED',
            skillLevel: data.skill_level,
            maxPlayers: data.max_players,
            registeredCount: data.registered_count
          };

          setTournaments(prev => [createdTournament, ...prev]);
          alert('Tournament successfully deployed!');
        }
      }

      setShowTournamentModal(false);
      setEditingTournamentId(null);
      setNewTournament({
        name: '',
        date: '',
        location: '',
        prizePool: '',
        status: 'UPCOMING',
        skillLevel: 'Intermediate',
        maxPlayers: 64
      });
    } catch (err: any) {
      console.error('Failed to save tournament:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!editingTournamentId) return;
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', editingTournamentId);

      if (error) throw error;

      setTournaments(prev => prev.filter(t => t.id !== editingTournamentId));
      setShowTournamentModal(false);
      setEditingTournamentId(null);
      alert('Tournament deleted successfully.');
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Failed to delete tournament.');
    } finally {
      setIsCreating(false);
    }
  };

  const pendingApps = applications.filter(a => a.status === 'PENDING');

  const filteredUsers = userList.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <>
      <div className="space-y-8 animate-fade-in pb-20 w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
          <div className="flex items-center gap-6 shrink-0">
            <div className="p-4 rounded-[24px] text-white shadow-xl bg-indigo-600 shadow-indigo-100 flex-shrink-0">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                Admin Console
              </h1>
              <p className="text-slate-500 font-medium mt-2 text-sm">
                Regional community moderation and operational oversight.
              </p>
            </div>
          </div>

          <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-200 shadow-sm overflow-x-auto scrollbar-hide no-scrollbar flex-nowrap min-w-0 max-w-full lg:max-w-none">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
            <TabButton active={activeTab === 'tournaments'} onClick={() => setActiveTab('tournaments')} label="Tournaments" icon={<Trophy size={14} />} />
            <TabButton active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} label="Apps" badge={pendingApps.length} />
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Users" />
            <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} label="Security" icon={<Lock size={14} />} />
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} label="Audit" icon={<Eye size={14} />} />
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <MetricCard label="Total Players" value={totalUsers.toLocaleString()} change="+12%" up />
              <MetricCard label="Integrity" value="99.9%" change="Optimal" up />
              <MetricCard label="Active Events" value={tournaments.length.toString()} change="live" up />
              <MetricCard label="Latency" value="24ms" change="-2ms" up />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
                <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tight">
                  <Activity className="text-blue-600" /> Infrastructure Traffic
                </h2>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={GROWTH_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="active" radius={[8, 8, 0, 0]}>
                        {GROWTH_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 5 ? '#2563eb' : '#cbd5e1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-950 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                  <h3 className="text-xl font-black flex items-center gap-2 mb-8 uppercase text-lime-400">
                    <ShieldCheck size={24} /> System Health
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                      <span className="text-sm font-bold">API Status</span>
                      <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest flex items-center gap-2">
                        <Radio size={12} className="animate-pulse" /> Operational
                      </span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                      <span className="text-sm font-bold">Global Sync</span>
                      <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest flex items-center gap-2">
                        <Database size={12} /> Syncing
                      </span>
                    </div>
                  </div>
                </div>
                <button className="w-full py-5 bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-lime-400 transition-all mt-8">Run System Scan</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-8 animate-slide-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                  <Trophy className="text-amber-500" /> Tournament Operations
                </h2>
                <p className="text-slate-500 font-medium text-sm">Deploy and manage regional competitive events.</p>
              </div>
              <button
                onClick={() => setShowTournamentModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all"
              >
                <PlusCircle size={20} /> DEPLOY TOURNAMENT
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm group hover:shadow-2xl transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                      <Trophy size={24} />
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${t.status === 'LIVE' ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {t.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 tracking-tighter uppercase mb-2 group-hover:text-indigo-600 transition-colors">{t.name}</h3>
                  <div className="space-y-3 mb-8">
                    <p className="text-xs text-slate-500 flex items-center gap-2 font-bold uppercase tracking-widest">
                      <Calendar size={14} /> {t.date}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 font-bold uppercase tracking-widest">
                      <MapPin size={14} /> {t.location}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 font-bold uppercase tracking-widest">
                      <DollarSign size={14} className="text-green-600" /> {t.prizePool}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Players</p>
                      <p className="font-black text-slate-950 text-lg">{t.registeredCount} / {t.maxPlayers}</p>
                    </div>
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-3 bg-slate-50 hover:bg-slate-950 hover:text-white rounded-xl text-slate-400 transition-all shadow-sm"
                      title="Manage Tournament"
                    >
                      <Settings size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm relative overflow-hidden animate-slide-up">
            <div className="mb-10">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight uppercase">
                <Sparkles className="text-lime-500" /> Professional Upgrade Queue
              </h2>
            </div>
            {pendingApps.length === 0 ? (
              <div className="text-center py-24 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                <Check size={40} className="mx-auto mb-6 text-slate-300" />
                <p className="text-slate-400 font-black uppercase text-sm tracking-[0.2em]">Queue is clear.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app.id} className="p-6 rounded-[32px] bg-white border border-slate-100 flex flex-col lg:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        {app.requestedRole === 'COACH' ? <GraduationCap size={24} /> : <MapPin size={24} />}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-950 text-lg leading-tight">{app.playerName}</h4>
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">{app.requestedRole}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-500 text-xs italic mb-2">"{app.experienceSummary}"</p>
                      {app.documentName && app.documentName !== 'No documents' && app.documentName !== 'No Document' && (
                        <div className="flex flex-wrap gap-2">
                          {app.documentName.split(', ').map((url, index) => {
                            const trimmedUrl = url.trim();
                            if (!trimmedUrl) return null;

                            return (
                              <a
                                key={index}
                                href={trimmedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
                              >
                                <FileText size={14} />
                                Document {app.documentName.split(', ').length > 1 ? `${index + 1}` : ''}
                                <ExternalLink size={12} />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => onReject?.(app.id)} className="h-12 px-6 rounded-2xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">Reject</button>
                      <button onClick={() => onApprove?.(app.id)} className="h-12 px-8 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg">Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">User Registry</h2>
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-3xl py-4 pl-14 pr-6 text-sm outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-6">Identity</th>
                    <th className="px-8 py-6">Role</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100" />
                          <div>
                            <p className="font-black text-slate-950 text-sm">{user.name}</p>
                            <p className="text-[11px] text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-slate-100 text-slate-500">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${user.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {user.role === 'PLAYER' ? (
                            <button
                              onClick={() => handleUpdateUserRole(user.id, 'ADMIN')}
                              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                            >
                              Promote
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateUserRole(user.id, 'PLAYER')}
                              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-bold"
                            >
                              Demote
                            </button>
                          )}

                          {user.status === 'Active' ? (
                            <button
                              onClick={() => handleUpdateUserStatus(user.id, 'Suspended')}
                              className="px-4 py-2 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateUserStatus(user.id, 'Active')}
                              className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL IS NOW OUTSIDE THE WRAPPER TO PREVENT TRANSFORM TRAPPING */}
      {showTournamentModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] p-10 md:p-14 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-500">
            <button
              onClick={() => {
                setShowTournamentModal(false);
                setEditingTournamentId(null);
                setNewTournament({
                  name: '',
                  date: '',
                  location: '',
                  prizePool: '',
                  status: 'UPCOMING',
                  skillLevel: 'Intermediate',
                  maxPlayers: 64
                });
              }}
              className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-950 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase mb-2">
              {editingTournamentId ? 'MANAGE EVENT.' : 'DEPLOY TOURNAMENT.'}
            </h2>
            <p className="text-slate-500 font-medium mb-10">
              {editingTournamentId ? 'Update parameters or terminate this competitive event.' : 'Initialize a new regional sanctioned competitive event.'}
            </p>

            <form onSubmit={handleSaveTournament} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Event Identity</label>
                  <input
                    required
                    type="text"
                    value={newTournament.name}
                    onChange={e => setNewTournament({ ...newTournament, name: e.target.value })}
                    placeholder="e.g. Metro Open 2025"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Prize Pool</label>
                  <input
                    required
                    type="text"
                    value={newTournament.prizePool}
                    onChange={e => setNewTournament({ ...newTournament, prizePool: e.target.value })}
                    placeholder="₱500,000"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date</label>
                  <input
                    required
                    type="date"
                    value={newTournament.date}
                    onChange={e => setNewTournament({ ...newTournament, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location</label>
                  <input
                    required
                    type="text"
                    value={newTournament.location}
                    onChange={e => setNewTournament({ ...newTournament, location: e.target.value })}
                    placeholder="Facility Name"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Skill Level Category</label>
                  <select
                    value={newTournament.skillLevel}
                    onChange={e => setNewTournament({ ...newTournament, skillLevel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  >
                    <option value="Newbie">Newbie (2.0)</option>
                    <option value="Novice">Novice (2.5)</option>
                    <option value="Intermediate">Intermediate (3.0 - 3.5)</option>
                    <option value="Advanced">Advanced (4.0)</option>
                    <option value="Expert">Expert (4.5+)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Max Players</label>
                  <input
                    required
                    type="number"
                    value={newTournament.maxPlayers}
                    onChange={e => setNewTournament({ ...newTournament, maxPlayers: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {editingTournamentId && (
                  <button
                    type="button"
                    onClick={handleDeleteTournament}
                    disabled={isCreating}
                    className="px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                  >
                    Terminate
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`flex-1 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${isCreating
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-indigo-600 text-white hover:bg-lime-400 hover:text-slate-950'
                    }`}
                >
                  {isCreating ? 'PROCESSING...' : (editingTournamentId ? 'SAVE CHANGES' : 'DEPLOY TOURNAMENT')}
                  {!isCreating && <Radio size={18} className="animate-pulse" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string, badge?: number, icon?: React.ReactNode }> = ({ active, onClick, label, badge, icon }) => (
  <button
    onClick={onClick}
    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-3 shrink-0 ${active ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'}`}
  >
    {icon}
    {label}
    {badge ? (
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${active ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {badge}
      </span>
    ) : null}
  </button>
);

const MetricCard: React.FC<{ label: string, value: string, change: string, up: boolean }> = ({ label, value, change, up }) => (
  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
    <div className="relative z-10">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-4xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tighter">{value}</h3>
        <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${up ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-500'}`}>
          {up ? <ArrowUp size={12} /> : ''} {change}
        </div>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
