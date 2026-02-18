import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Calendar, Settings, Trash2, Edit2, UserMinus, Shield, Crown } from 'lucide-react';
import { Group, GroupMember } from '../../types';
import { supabase } from '../../services/supabase';
import { getGroupMembers } from '../../services/community';

interface ManageGroupModalProps {
  show: boolean;
  onClose: () => void;
  group: Group | null;
  onGroupUpdated: (group: Group) => void;
  onGroupDeleted: (groupId: string) => void;
}

export const ManageGroupModal: React.FC<ManageGroupModalProps> = ({ 
  show, onClose, group, onGroupUpdated, onGroupDeleted 
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<(GroupMember & { user: any })[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    privacy: 'public' as 'public' | 'private',
    tags: ''
  });

  useEffect(() => {
    if (group) {
      setForm({
        name: group.name,
        description: group.description || '',
        location: group.location || '',
        privacy: group.privacy,
        tags: (group.tags || []).join(', ')
      });
      loadMembers();
    }
  }, [group]);

  const loadMembers = async () => {
    if (!group) return;
    try {
      const data = await getGroupMembers(group.id);
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
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
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
        .eq('id', group.id)
        .select()
        .single();

      if (error) throw error;
      onGroupUpdated(data);
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
    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This will remove all members and events.`)) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;
      onGroupDeleted(group.id);
      onClose();
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Failed to delete group');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!group) return;
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

  const handlePromoteMember = async (memberId: string, currentRole: string) => {
    if (!group) return;
    const newRole = currentRole === 'member' ? 'moderator' : 'member';

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
    } catch (err) {
      console.error('Error updating member role:', err);
      alert('Failed to update member role');
    }
  };

  if (!show || !group || typeof document === 'undefined') return null;

  return createPortal((
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900">{group.name}</h3>
            <p className="text-sm text-slate-500 font-semibold mt-1">{group.member_count} members • {group.privacy}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {[
            { key: 'info', label: 'Info', icon: Settings },
            { key: 'members', label: 'Members', icon: Users }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.key 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' ? (
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-300"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Location</label>
                    <input
                      value={form.location}
                      onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Privacy</label>
                    <select
                      value={form.privacy}
                      onChange={e => setForm(prev => ({ ...prev, privacy: e.target.value as any }))}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white focus:outline-none focus:border-indigo-300"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tags</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-300"
                    placeholder="Comma separated"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-slate-700">{group.description || 'No description yet'}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Location</p>
                  <p className="text-sm text-slate-700">{group.location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {(group.tags || []).map(tag => (
                      <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Edit info
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-3 rounded-2xl bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={member.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} 
                    className="w-10 h-10 rounded-xl bg-slate-100" 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 text-sm">{member.user?.full_name || 'Unknown'}</p>
                      {member.role === 'admin' && (
                        <Crown size={14} className="text-amber-500" />
                      )}
                      {member.role === 'moderator' && (
                        <Shield size={14} className="text-indigo-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{member.role} • {member.status}</p>
                  </div>
                </div>
                {member.role !== 'admin' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePromoteMember(member.id, member.role)}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                    >
                      {member.role === 'member' ? 'Promote' : 'Demote'}
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
          </div>
        )}
      </div>
    </div>
  ), document.body);
};
