import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Settings,
  Trash2,
  Edit2,
  UserMinus,
  Shield,
  Crown,
  Save,
  X,
  ChevronDown
} from 'lucide-react';
import { Group, GroupMember } from '../../types';
import { supabase } from '../../services/supabase';
import { getGroupById, getGroupMembers } from '../../services/community';

type Tab = 'info' | 'members';

const GroupManage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<(GroupMember & { user: any })[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    privacy: 'public' as 'public' | 'private',
    tags: '',
    rules: ''
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (groupId && currentUserId) {
      loadGroupData();
    }
  }, [groupId, currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadGroupData = async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const [groupData, membersData] = await Promise.all([
        getGroupById(groupId),
        getGroupMembers(groupId).catch(err => {
          console.error('Error loading members:', err);
          return [] as (GroupMember & { user: any })[];
        })
      ]);

      // Verify creator access
      if (groupData.created_by !== currentUserId) {
        navigate(`/community/groups/${groupId}`);
        return;
      }

      setGroup(groupData);
      setMembers(membersData);
      setForm({
        name: groupData.name,
        description: groupData.description || '',
        location: groupData.location || '',
        privacy: groupData.privacy,
        tags: (groupData.tags || []).join(', '),
        rules: groupData.rules || ''
      });
    } catch (err) {
      console.error('Error loading group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!group) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: form.name.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          privacy: form.privacy,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          rules: form.rules.trim() || null
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

  const handleDelete = async () => {
    if (!group) return;
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', group.id);

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
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

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
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role');
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'active' as any } : m));
    } catch (err) {
      console.error('Error approving member:', err);
    }
  };

  // Sort: admin first, then mods, then members. Pending at the end.
  const sortedMembers = [...members].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return 1;
    if (a.status !== 'pending' && b.status === 'pending') return -1;
    const order = { admin: 0, moderator: 1, member: 2 };
    return (order[a.role] || 2) - (order[b.role] || 2);
  });

  const pendingCount = members.filter(m => m.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-slate-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-[40px] p-10 border border-slate-200 animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
          <div className="h-4 w-48 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-slate-500 font-semibold mb-4">Group not found</p>
        <button onClick={() => navigate('/community?tab=groups')} className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:text-indigo-800">
          Back to Community
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(`/community/groups/${groupId}`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to {group.name}</span>
      </button>

      {/* Page Header */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-10 py-8">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-white/60" />
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Manage Squad</h1>
              <p className="text-sm text-slate-300 font-semibold mt-0.5">{group.name} • {members.length} members</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-10">
          <div className="flex gap-1">
            {([
              { key: 'info' as Tab, label: 'Squad Info', icon: Edit2 },
              { key: 'members' as Tab, label: `Members (${members.length})${pendingCount ? ` • ${pendingCount} pending` : ''}`, icon: Users }
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
              >
                <tab.icon size={15} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Squad Name</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Location</label>
                      <input
                        value={form.location}
                        onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Privacy</label>
                      <select
                        value={form.privacy}
                        onChange={e => setForm(prev => ({ ...prev, privacy: e.target.value as any }))}
                        className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium bg-white focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      >
                        <option value="public">Public — Anyone can join</option>
                        <option value="private">Private — Approval required</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Tags</label>
                    <input
                      value={form.tags}
                      onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      placeholder="Comma separated (e.g. beginner, social, competitive)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Squad Rules</label>
                    <textarea
                      value={form.rules}
                      onChange={e => setForm(prev => ({ ...prev, rules: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                      rows={3}
                      placeholder="Optional community guidelines..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        if (group) {
                          setForm({
                            name: group.name,
                            description: group.description || '',
                            location: group.location || '',
                            privacy: group.privacy,
                            tags: (group.tags || []).join(', '),
                            rules: group.rules || ''
                          });
                        }
                      }}
                      className="flex-1 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !form.name.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      <Save size={14} /> {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Squad Name</p>
                      <p className="text-base font-bold text-slate-900">{group.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Privacy</p>
                      <p className="text-base font-bold text-slate-900 capitalize">{group.privacy}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Location</p>
                      <p className="text-base font-bold text-slate-900">{group.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Created</p>
                      <p className="text-base font-bold text-slate-900">{new Date(group.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{group.description || 'No description yet'}</p>
                  </div>

                  {group.tags && group.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {group.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {group.rules && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rules</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{group.rules}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                      <Edit2 size={14} /> Edit info
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                    >
                      <Trash2 size={14} /> Delete squad
                    </button>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-4">
                      <p className="font-black text-rose-800 text-sm">Are you sure you want to delete "{group.name}"?</p>
                      <p className="text-xs text-rose-600 font-medium">This will permanently remove all members, events, and messages. This action cannot be undone.</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all"
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
          {activeTab === 'members' && (
            <div className="space-y-3">
              {sortedMembers.map(member => (
                <div key={member.id} className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${member.status === 'pending'
                    ? 'bg-blue-50/50 border-blue-200/50'
                    : member.role === 'admin'
                      ? 'bg-blue-50/30 border-blue-200/30'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    <img
                      src={member.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                      className="w-10 h-10 rounded-xl bg-slate-100"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 text-sm">{member.user?.full_name || 'Unknown'}</p>
                        {member.role === 'admin' && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            <Crown size={10} /> Creator
                          </span>
                        )}
                        {member.role === 'moderator' && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            <Shield size={10} /> Mod
                          </span>
                        )}
                        {member.status === 'pending' && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {member.role} • Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions — not for the admin (creator) */}
                  {member.role !== 'admin' && (
                    <div className="flex gap-2">
                      {member.status === 'pending' && (
                        <button
                          onClick={() => handleApproveMember(member.id)}
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateRole(member.id, member.role)}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                      >
                        {member.role === 'member' ? 'Make Mod' : 'Demote'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user?.full_name || 'member')}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-1"
                      >
                        <UserMinus size={12} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {members.length === 0 && (
                <div className="text-center py-12">
                  <Users size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-semibold">No members yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManage;
