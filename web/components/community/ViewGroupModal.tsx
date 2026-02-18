import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, MapPin, Calendar, Shield, Crown } from 'lucide-react';
import { Group, GroupMember } from '../../types';
import { getGroupMembers } from '../../services/community';

interface ViewGroupModalProps {
  show: boolean;
  onClose: () => void;
  group: Group | null;
  onJoinGroup: (groupId: string) => void;
  isJoining: boolean;
  currentUserId: string | null;
}

export const ViewGroupModal: React.FC<ViewGroupModalProps> = ({ 
  show, onClose, group, onJoinGroup, isJoining, currentUserId 
}) => {
  const [members, setMembers] = useState<(GroupMember & { user: any })[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (group && show) {
      loadMembers();
    }
  }, [group, show]);

  const loadMembers = async () => {
    if (!group) return;
    setIsLoadingMembers(true);
    try {
      const data = await getGroupMembers(group.id);
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const isMember = members.some(m => m.user_id === currentUserId && m.status === 'active');
  const isCreator = group?.created_by === currentUserId;

  if (!show || !group || typeof document === 'undefined') return null;

  return createPortal((
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-black text-slate-900">{group.name}</h3>
              {isCreator && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-indigo-600 text-white">YOUR SQUAD</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 font-semibold">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                group.privacy === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {group.privacy}
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} /> {group.member_count} members
              </span>
              {group.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {group.location}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 shrink-0 ml-4">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {group.description && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">About</p>
              <p className="text-sm text-slate-700 leading-relaxed">{group.description}</p>
            </div>
          )}

          {group.tags && group.tags.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Members ({members.length})</p>
              {isLoadingMembers && <span className="text-xs text-slate-400">Loading...</span>}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <img 
                    src={member.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} 
                    className="w-10 h-10 rounded-xl bg-white" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 text-sm truncate">{member.user?.full_name || 'Unknown'}</p>
                      {member.role === 'admin' && (
                        <Crown size={12} className="text-amber-500 shrink-0" />
                      )}
                      {member.role === 'moderator' && (
                        <Shield size={12} className="text-indigo-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {member.role}
                      {member.user?.user_role && ` • ${member.user.user_role}`}
                    </p>
                  </div>
                  {member.status === 'pending' && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            {!isCreator && !isMember && (
              <button
                onClick={() => onJoinGroup(group.id)}
                disabled={isJoining}
                className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Join this squad'}
              </button>
            )}
            {isMember && !isCreator && (
              <div className="flex-1 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-widest text-center">
                ✓ You're a member
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-2xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
};
