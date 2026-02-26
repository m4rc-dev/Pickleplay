import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { UserRole } from '../../types';
import Toast, { ToastType } from '../ui/Toast';
import {
  UsersRound, Search, Plus, Zap, Shield, ShieldCheck,
  ArrowRight, X, Crown, Lock, Trophy, MapPin,
  MessageCircle, CalendarDays, LogOut, Settings,
  Upload, ImageIcon, Loader2
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Squad {
  id: string;
  name: string;
  description: string;
  image_url: string;
  location?: string;
  rules?: string;
  is_private: boolean;
  is_official: boolean;
  tags: string[];
  wins: number;
  losses: number;
  members_count: number;
  avg_rating: number;
  created_by: string;
  is_member?: boolean;
}

interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: string;
  profiles?: { full_name: string; avatar_url: string };
}

interface SquadsListProps {
  userRole?: UserRole;
  isSidebarCollapsed?: boolean;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const SquadsList: React.FC<SquadsListProps> = ({
  userRole = 'PLAYER',
  isSidebarCollapsed = false,
}) => {
  const navigate = useNavigate();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-squads'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joiningSquadId, setJoiningSquadId] = useState<string | null>(null);
  const [leavingSquadId, setLeavingSquadId] = useState<string | null>(null);
  // One-squad-per-player: track the user's current squad
  const [userSquad, setUserSquad] = useState<{ squad: Squad; role: string } | null>(null);
  const [leavingMySquad, setLeavingMySquad] = useState(false);
  const isFirstRender = useRef(true);
  const [isLoading, setIsLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSquadId, setEditingSquadId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', imageUrl: '', location: '', rules: '', tags: '',
    isPrivate: false, isOfficial: false,
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedSquadMembers, setSelectedSquadMembers] = useState<SquadMember[]>([]);
  const [activeSquadName, setActiveSquadName] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '', type: 'info', isVisible: false,
  });

  const isAdmin = userRole === 'ADMIN';
  const themeColor = isAdmin ? 'indigo' : 'blue';

  // ── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    getCurrentUser().then(uid => loadSquads(uid));
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    loadSquads(currentUserId);
  }, [activeTab, searchQuery]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { setCurrentUserId(user.id); return user.id; }
    return null;
  };

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadSquads = async (userId: string | null = currentUserId) => {
    setIsLoading(true);
    try {
      // Fetch all squads — no is_private filter, so null values are included
      const { data: rows, error } = await supabase
        .from('squads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // All squad_members for member counts
      const { data: memberRows } = await supabase
        .from('squad_members')
        .select('squad_id');

      // Current user's memberships
      let userMemberships: string[] = [];
      if (userId) {
        const { data: memberships } = await supabase
          .from('squad_members')
          .select('squad_id')
          .eq('user_id', userId);
        if (memberships) userMemberships = memberships.map(m => m.squad_id);
      }

      const mapped: Squad[] = (rows || []).map(t => ({
        ...t,
        members_count: memberRows ? memberRows.filter(m => m.squad_id === t.id).length : 0,
        avg_rating: t.avg_rating || 0,
        is_member: userMemberships.includes(t.id),
      }));

      // Track the single squad the user belongs to
      if (userId && userMemberships.length > 0) {
        const mySquadRow = mapped.find(s => s.is_member);
        if (mySquadRow) {
          const { data: myMembership } = await supabase.from('squad_members')
            .select('role').eq('squad_id', mySquadRow.id).eq('user_id', userId).single();
          setUserSquad({ squad: mySquadRow, role: myMembership?.role || 'MEMBER' });
        } else { setUserSquad(null); }
      } else { setUserSquad(null); }

      setSquads(activeTab === 'my-squads' ? mapped.filter(s => s.is_member) : mapped);
    } catch (err: any) {
      console.error('Error loading squads:', err);
      showToast('Failed to load squads: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadBannerImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('squad-banners')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('squad-banners')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'error');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
    const uploaded = await uploadBannerImage(file);
    if (uploaded) {
      setFormData(prev => ({ ...prev, imageUrl: uploaded }));
    }
  };

  const handleBannerDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
    const uploaded = await uploadBannerImage(file);
    if (uploaded) {
      setFormData(prev => ({ ...prev, imageUrl: uploaded }));
    }
  };

  const handleSaveSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const userTags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      const baseTags = isAdmin && formData.isOfficial ? ['OFFICIAL', 'MOD-LED'] : [];
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        is_private: formData.isPrivate,
        is_official: isAdmin && formData.isOfficial,
        tags: [...new Set([...baseTags, ...userTags])].length > 0
          ? [...new Set([...baseTags, ...userTags])]
          : ['New', 'Member-Owned'],
        ...(editingSquadId ? {} : { created_by: user.id }),
        // Only include optional columns if they have a value
        // (guards against 400s if migration 063 hasn't been run yet)
        ...(formData.imageUrl  ? { image_url: formData.imageUrl }   : {}),
        ...(formData.location  ? { location:  formData.location }   : {}),
        ...(formData.rules     ? { rules:     formData.rules }      : {}),
      };

      let result;
      if (editingSquadId) {
        result = await supabase.from('squads').update(payload).eq('id', editingSquadId).select().single();
      } else {
        result = await supabase.from('squads').insert(payload).select().single();
      }
      if (result.error) throw result.error;

      if (result.data && !editingSquadId) {
        await supabase.from('squad_members').upsert(
          { squad_id: result.data.id, user_id: user.id, role: 'OWNER' },
          { onConflict: 'squad_id,user_id', ignoreDuplicates: true }
        );
      }

      closeModal();
      await loadSquads();
      showToast(editingSquadId ? 'Squad updated!' : 'Squad created!', 'success');
    } catch (err: any) {
      // Log full Supabase error details to help debug 400s
      console.error('[squad save] error:', JSON.stringify(err, null, 2));
      showToast(err.message || 'Failed to save squad', 'error');
    }
  };

  const leaveMySquad = async () => {
    if (!currentUserId || !userSquad) return;
    if (!confirm(`Leave ${userSquad.squad.name}?`)) return;
    setLeavingMySquad(true);
    try {
      const { error } = await supabase.from('squad_members')
        .delete().eq('squad_id', userSquad.squad.id).eq('user_id', currentUserId);
      if (error) throw error;
      showToast('You left the squad.', 'success');
      await loadSquads();
    } catch (err: any) {
      showToast(err.message || 'Failed to leave', 'error');
    } finally { setLeavingMySquad(false); }
  };

  const joinSquad = async (squadId: string) => {
    if (!currentUserId) { showToast('Please login to join squads', 'error'); return; }
    if (userSquad) { showToast('You\'re already in a squad. Leave your current squad first.', 'error'); return; }
    setJoiningSquadId(squadId);
    try {
      const { error } = await supabase.from('squad_members').upsert(
        { squad_id: squadId, user_id: currentUserId, role: 'MEMBER' },
        { onConflict: 'squad_id,user_id', ignoreDuplicates: true }
      );
      if (error) throw error;
      await loadSquads();
      showToast('You joined the squad!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to join squad', 'error');
    } finally {
      setJoiningSquadId(null);
    }
  };

  const leaveSquad = async (squadId: string) => {
    if (!currentUserId) return;
    if (!confirm('Are you sure you want to leave this squad?')) return;
    setLeavingSquadId(squadId);
    try {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      await loadSquads();
      showToast('You left the squad.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to leave squad', 'error');
    } finally {
      setLeavingSquadId(null);
    }
  };

  const viewMembers = async (squad: Squad) => {
    const { data } = await supabase
      .from('squad_members')
      .select('*, profiles(full_name, avatar_url)')
      .eq('squad_id', squad.id);
    setSelectedSquadMembers(data || []);
    setActiveSquadName(squad.name);
    setShowMembersModal(true);
  };

  const openEditModal = (squad: Squad) => {
    setEditingSquadId(squad.id);
    setFormData({
      name: squad.name,
      description: squad.description,
      imageUrl: squad.image_url || '',
      location: squad.location || '',
      rules: squad.rules || '',
      tags: Array.isArray(squad.tags) ? squad.tags.join(', ') : '',
      isPrivate: squad.is_private,
      isOfficial: squad.is_official,
    });
    setBannerPreview(squad.image_url || '');
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingSquadId(null);
    setFormData({ name: '', description: '', imageUrl: '', location: '', rules: '', tags: '', isPrivate: false, isOfficial: false });
    setBannerPreview('');
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  // ── Filtered display ──────────────────────────────────────────────────────

  const displayed = squads.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-3">
            PICKLEPLAY / SQUAD NETWORK
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[1] uppercase mb-3">
            FIND YOUR <br />
            <span className={`${isAdmin ? 'text-indigo-600' : 'text-blue-600'}`}>SQUAD.</span>
          </h1>
          <p className="text-slate-500 text-base max-w-md leading-relaxed">
            Join a crew, build a dynasty, or found your own legend. The pickleball circuit starts here.
          </p>
        </div>

        <button
          onClick={() => { setEditingSquadId(null); setShowCreateModal(true); }}
          className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] whitespace-nowrap ${
            isAdmin
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-100'
              : 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lime-100'
          }`}
        >
          <Plus size={18} />
          {isAdmin ? 'Deploy Squad' : 'Found a Team'}
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex gap-3">
          {(['discover', 'my-squads'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab
                  ? `${isAdmin ? 'bg-indigo-600' : 'bg-blue-600'} text-white shadow-xl`
                  : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab === 'discover' ? 'All Squads' : userSquad ? 'My Squad ●' : 'My Squad'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search squads, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
          />
        </div>
      </div>

      {/* My Squad HQ — detailed view */}
      {activeTab === 'my-squads' ? (
        isLoading ? (
          <div className="bg-white rounded-[40px] border border-slate-100 h-96 animate-pulse" />
        ) : userSquad ? (
          <MySquadHQ
            squad={userSquad.squad}
            role={userSquad.role}
            isOwner={userSquad.role === 'OWNER'}
            isAdmin={isAdmin}
            onOpen={() => navigate(`/teams/${userSquad.squad.id}`)}
            onEdit={() => openEditModal(userSquad.squad)}
            onLeave={leaveMySquad}
            isLeaving={leavingMySquad}
            onViewMembers={() => viewMembers(userSquad.squad)}
          />
        ) : (
          <div className="py-24 text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto">
              <UsersRound className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No Squad Yet</h3>
            <p className="text-slate-400 font-medium max-w-sm mx-auto">You haven't joined or created a squad yet.</p>
            <button onClick={() => setActiveTab('discover')}
              className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
              Browse All Squads →
            </button>
          </div>
        )
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-[40px] border border-slate-100 h-[520px] animate-pulse" />
          ))
        ) : displayed.length > 0 ? (
          displayed.map(squad => (
            <SquadCard
              key={squad.id}
              squad={squad}
              onJoin={() => joinSquad(squad.id)}
              onLeave={() => leaveSquad(squad.id)}
              onManage={() => openEditModal(squad)}
              onViewMembers={() => viewMembers(squad)}
              isJoining={joiningSquadId === squad.id}
              isLeaving={leavingSquadId === squad.id}
              themeColor={themeColor}
              currentUserId={currentUserId}
              userAlreadyInSquad={!!userSquad}
            />
          ))
        ) : (
          <div className="col-span-full py-32 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto">
              <UsersRound className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">No Squads Found</h3>
            <p className="text-slate-400 font-medium max-w-sm mx-auto">
              Try adjusting your search or be the first to found a dynasty.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
          <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[92vh] overflow-y-auto">
            <div className={`absolute top-0 right-0 w-48 h-48 ${isAdmin ? 'bg-indigo-400/10' : 'bg-blue-400/10'} blur-[60px] -z-10`} />

            <button onClick={closeModal} className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500">
              <X size={18} />
            </button>

            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-slate-950 tracking-tighter mb-2 uppercase">
                {editingSquadId ? 'Manage Squad' : isAdmin ? 'Deploy Squad' : 'Found a Dynasty'}
              </h2>
              <p className="text-slate-500 font-medium text-sm">
                {editingSquadId
                  ? 'Update your squad details.'
                  : isAdmin
                  ? 'Initialize an official platform squad.'
                  : 'Define your team identity and attract top players.'}
              </p>
            </div>

            <form onSubmit={handleSaveSquad} className="space-y-5">
              {/* Squad Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Squad Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Metro Manila Elites"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this squad's purpose?"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 resize-none"
                />
              </div>

              {/* Banner Image */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Banner Image <span className="normal-case font-medium">(optional)</span></label>

                {/* Upload zone */}
                <div
                  onClick={() => !isUploadingImage && bannerFileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleBannerDrop}
                  className={`relative w-full rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                    bannerPreview || formData.imageUrl
                      ? 'border-transparent'
                      : 'border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50/30'
                  }`}
                >
                  {/* Preview */}
                  {(bannerPreview || formData.imageUrl) ? (
                    <div className="relative group">
                      <img
                        src={bannerPreview || formData.imageUrl}
                        alt="banner preview"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        className="w-full h-36 object-cover rounded-3xl"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-all rounded-3xl flex flex-col items-center justify-center gap-2">
                        {isUploadingImage ? (
                          <Loader2 size={24} className="text-white animate-spin" />
                        ) : (
                          <>
                            <Upload size={20} className="text-white" />
                            <span className="text-white text-xs font-black uppercase tracking-widest">Change Photo</span>
                          </>
                        )}
                      </div>
                      {/* Remove button */}
                      {!isUploadingImage && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setFormData(prev => ({ ...prev, imageUrl: '' })); setBannerPreview(''); }}
                          className="absolute top-3 right-3 p-1.5 bg-slate-950/70 hover:bg-rose-600 rounded-full transition-all"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      {isUploadingImage ? (
                        <>
                          <Loader2 size={28} className="text-blue-400 animate-spin" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Uploading…</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <ImageIcon size={22} className="text-slate-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-700">Drop an image or <span className="text-blue-600">browse</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">JPG, PNG, WEBP — max 5 MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleBannerFileChange}
                />

                {/* URL fallback */}
                <div className="relative">
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => { setFormData({ ...formData, imageUrl: e.target.value }); setBannerPreview(e.target.value); }}
                    placeholder="Or paste an image URL…"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 pl-8 pr-8 outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold text-slate-900 placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location <span className="normal-case font-medium">(optional)</span></label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. BGC, Taguig or Quezon City"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 pl-12 pr-8 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tags <span className="normal-case font-medium">(comma-separated, optional)</span></label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. competitive, 4.0+, weekends"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900"
                />
                {formData.tags && (
                  <div className="flex flex-wrap gap-2 px-4">
                    {formData.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rules */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Squad Rules <span className="normal-case font-medium">(optional)</span></label>
                <textarea
                  rows={3}
                  value={formData.rules}
                  onChange={e => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="e.g. Rotate every game. Report scores within 24h."
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-slate-400" />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Private Squad</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Invite only</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                  className={`w-14 h-8 rounded-full transition-all relative ${formData.isPrivate ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${formData.isPrivate ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <div>
                      <p className="font-bold text-indigo-900 text-sm">Official Status</p>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Verified squad</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isOfficial: !formData.isOfficial })}
                    className={`w-14 h-8 rounded-full transition-all relative ${formData.isOfficial ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${formData.isOfficial ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              )}

              <button
                type="submit"
                className={`w-full h-16 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${
                  isAdmin
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-lime-400 hover:bg-lime-300 text-slate-950'
                }`}
              >
                {editingSquadId ? 'Update Squad' : isAdmin ? 'Deploy Squadron' : 'Found Team'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Members Modal */}
      {showMembersModal && ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
          <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <button onClick={() => setShowMembersModal(false)} className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500">
              <X size={18} />
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-950 tracking-tighter mb-1 uppercase line-clamp-1">
                {activeSquadName}
              </h2>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {selectedSquadMembers.length} Active Members
              </p>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {selectedSquadMembers.length > 0 ? (
                selectedSquadMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <img
                      src={member.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles?.full_name || 'User')}&background=random`}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                      alt=""
                    />
                    <div>
                      <p className="font-bold text-slate-900">{member.profiles?.full_name || 'Unknown Player'}</p>
                      {member.role === 'OWNER'
                        ? <span className="text-[10px] font-black text-lime-600 uppercase tracking-widest flex items-center gap-1"><Crown size={10} /> Squad Leader</span>
                        : member.role === 'MODERATOR'
                        ? <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Moderator</span>
                        : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</span>
                      }
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-8">No members yet</p>
              )}
            </div>
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

// ── SquadCard ─────────────────────────────────────────────────────────────────

interface SquadCardProps {
  squad: Squad;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
  onViewMembers: () => void;
  isJoining: boolean;
  isLeaving: boolean;
  themeColor: string;
  currentUserId: string | null;
  userAlreadyInSquad: boolean;
}

const SquadCard: React.FC<SquadCardProps> = ({
  squad, onJoin, onLeave, onManage, onViewMembers, isJoining, isLeaving, themeColor, currentUserId, userAlreadyInSquad,
}) => {
  const isCreator = currentUserId === squad.created_by;
  const isMember = squad.is_member;

  return (
    <div className="group relative bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
      {/* Image */}
      <div className="aspect-[16/10] relative overflow-hidden">
        <img
          src={squad.image_url || 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?auto=format&fit=crop&q=80&w=800'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90"
          alt={squad.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

        {/* Badges */}
        <div className="absolute top-5 left-5 flex gap-2">
          {squad.is_official ? (
            <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={12} /> Official
            </span>
          ) : squad.is_private ? (
            <span className="bg-slate-950/70 backdrop-blur text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Lock size={10} /> Private
            </span>
          ) : (
            <span className="bg-lime-400 text-slate-950 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">
              Open
            </span>
          )}
        </div>

        {/* Edit button for creator */}
        {isCreator && (
          <button
            onClick={e => { e.stopPropagation(); onManage(); }}
            className="absolute top-5 right-5 p-2.5 bg-white/10 backdrop-blur hover:bg-white/25 rounded-2xl text-white transition-all border border-white/10"
          >
            <Shield size={16} />
          </button>
        )}

        {/* Name over image */}
        <div className="absolute bottom-5 left-6 right-6">
          <h3 className="text-2xl font-black text-white tracking-tighter leading-tight uppercase line-clamp-1">
            {squad.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-7 space-y-5">
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{squad.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div onClick={onViewMembers} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 cursor-pointer transition-colors">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rating</p>
            <div className="flex items-center gap-2">
              <Zap size={14} className={`${themeColor === 'indigo' ? 'text-indigo-600' : 'text-lime-500'} fill-current`} />
              <span className="font-black text-slate-950 text-xl">{(squad.avg_rating || 0).toFixed(1)}</span>
            </div>
          </div>
          <div onClick={onViewMembers} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 cursor-pointer transition-colors">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Roster</p>
            <div className="flex items-center gap-2">
              <UsersRound size={14} className={themeColor === 'indigo' ? 'text-indigo-600' : 'text-blue-600'} />
              <span className="font-black text-slate-950 text-xl">{squad.members_count}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {squad.tags && squad.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {squad.tags.map(tag => (
              <span
                key={tag}
                className={`px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest ${
                  tag === 'OFFICIAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        {isMember ? (
          <div className="flex gap-3">
            <button
              onClick={onViewMembers}
              className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-white shadow-lg shadow-slate-200"
            >
              Roster <ArrowRight size={15} />
            </button>
            {!isCreator && (
              <button
                onClick={onLeave}
                disabled={isLeaving}
                className="h-14 px-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 disabled:opacity-50"
              >
                {isLeaving
                  ? <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  : 'Leave'
                }
              </button>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={onJoin}
              disabled={isJoining || userAlreadyInSquad}
              title={userAlreadyInSquad ? 'Leave your current squad first' : ''}
              className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 ${
                isJoining
                  ? 'bg-blue-600 text-white cursor-wait'
                  : userAlreadyInSquad
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : themeColor === 'indigo'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-100'
                  : 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-xl shadow-lime-100'
              }`}
            >
              {isJoining ? (
                <><span>Joining...</span><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /></>
              ) : userAlreadyInSquad ? (
                'Already in a Squad'
              ) : (
                <>Enter the Squad <ArrowRight size={16} /></>
              )}
            </button>
            {userAlreadyInSquad && (
              <p className="text-[9px] text-slate-400 font-bold text-center mt-2">Leave your current squad first</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── MySquadHQ ────────────────────────────────────────────────────────────────

interface MySquadHQProps {
  squad: Squad;
  role: string;
  isOwner: boolean;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onLeave: () => void;
  isLeaving: boolean;
  onViewMembers: () => void;
}

const MySquadHQ: React.FC<MySquadHQProps> = ({
  squad, role, isOwner, isAdmin, onOpen, onEdit, onLeave, isLeaving, onViewMembers,
}) => {
  const winRate =
    squad.wins + squad.losses > 0
      ? Math.round((squad.wins / (squad.wins + squad.losses)) * 100)
      : 0;

  const roleMeta: Record<string, { label: string; color: string }> = {
    OWNER: { label: '👑 Squad Leader', color: 'text-amber-400' },
    MOD:   { label: '⚡ Moderator',    color: 'text-sky-400' },
    MEMBER:{ label: '🎾 Member',       color: 'text-white/60' },
  };
  const { label: roleLabel, color: roleColor } = roleMeta[role] ?? roleMeta['MEMBER'];

  const statItems = [
    { label: 'Members',  value: squad.members_count },
    { label: 'Wins',     value: squad.wins },
    { label: 'Losses',   value: squad.losses },
    { label: 'Win Rate', value: `${winRate}%` },
    { label: 'Avg Skill',value: squad.avg_rating ? squad.avg_rating.toFixed(1) : '—' },
  ];

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative aspect-[21/8] overflow-hidden">
        <img
          src={squad.image_url || 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=1600&q=80'}
          className="w-full h-full object-cover"
          alt={squad.name}
        />
        {/* gradient left-to-right */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent" />
        {/* bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          {/* Badges row */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-xs font-black uppercase tracking-widest ${roleColor}`}>
              {roleLabel}
            </span>
            {squad.is_official && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-lime-400">
                <ShieldCheck size={12} /> Official
              </span>
            )}
            {squad.is_private && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/40">
                <Lock size={12} /> Private
              </span>
            )}
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-2">
            {squad.name}
          </h2>

          {squad.description && (
            <p className="text-white/70 text-sm max-w-xl line-clamp-2">{squad.description}</p>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="p-8 md:p-10 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-3">
          {statItems.map(({ label, value }) => (
            <div key={label} className="text-center p-4 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="text-2xl font-black text-slate-950 tracking-tighter">{value}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        {squad.tags && squad.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {squad.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Primary: open full detail */}
          <button
            onClick={onOpen}
            className="flex items-center gap-2 h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-[0.15em] bg-slate-950 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all"
          >
            <MessageCircle size={16} />
            Chat &amp; Events
            <ArrowRight size={15} />
          </button>

          {/* View roster */}
          <button
            onClick={onViewMembers}
            className="flex items-center gap-2 h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-[0.15em] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
          >
            <UsersRound size={16} />
            Roster
          </button>

          {/* Edit – owner / admin only */}
          {(isOwner || isAdmin) && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-[0.15em] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all"
            >
              <Settings size={16} />
              Edit Squad
            </button>
          )}

          {/* Leave – members only (not owner) */}
          {!isOwner && (
            <button
              onClick={onLeave}
              disabled={isLeaving}
              className="ml-auto flex items-center gap-2 h-14 px-6 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 disabled:opacity-50 transition-all"
            >
              {isLeaving ? (
                <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut size={16} /> Leave
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
