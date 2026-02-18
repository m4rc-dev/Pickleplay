import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import { Group } from '../../types';
import { createGroup } from '../../services/community';
import { supabase } from '../../services/supabase';
import { PHILIPPINES_CITIES } from '../../services/nominatim';

const MAX_SQUADS_PER_USER = 3;
const COOLDOWN_DAYS = 7;

// Predefined squad tags
const PREDEFINED_TAGS = [
  'Beginner Friendly',
  'Advanced/Competitive',
  'Open Play',
  'Ladders',
  'Social',
  'Doubles Focus',
  'Clinics/Training',
  'Mixed Doubles',
  'Women Only',
  'Tournaments',
  'Recreational',
  'Casual'
];

interface CreateGroupModalProps {
  show: boolean;
  onClose: () => void;
  onGroupCreated: (group: Group) => void;
  userSquadCount: number;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ show, onClose, onGroupCreated, userSquadCount }) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    privacy: 'public' as 'public' | 'private',
    selectedTags: [] as string[]
  });
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!form.location.trim()) {
      alert('Please select a location');
      return;
    }
    if (form.selectedTags.length === 0) {
      alert('Please select at least one tag');
      return;
    }

    // Check squad limit
    if (userSquadCount >= MAX_SQUADS_PER_USER) {
      setLimitError(`You've reached the maximum of ${MAX_SQUADS_PER_USER} squads. Upgrade to create more.`);
      return;
    }

    // Check cooldown
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: lastGroup } = await supabase
          .from('groups')
          .select('created_at')
          .eq('created_by', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastGroup) {
          const daysSince = (Date.now() - new Date(lastGroup.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < COOLDOWN_DAYS) {
            const daysLeft = Math.ceil(COOLDOWN_DAYS - daysSince);
            setLimitError(`You can create a new squad in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. One squad per ${COOLDOWN_DAYS} days.`);
            return;
          }
        }
      }
    } catch (err) {
      // If check fails, allow creation (fail open for UX)
      console.warn('Could not verify cooldown:', err);
    }

    setLimitError(null);
    setCreating(true);
    try {
      const newGroup = await createGroup({
        name: form.name.trim(),
        description: form.description.trim(),
        privacy: form.privacy,
        location: form.location.trim(),
        tags: form.selectedTags
      });
      onGroupCreated(newGroup);
      onClose();
      setForm({ name: '', description: '', location: '', privacy: 'public', selectedTags: [] });
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group.');
    } finally {
      setCreating(false);
    }
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  if (!show || typeof document === 'undefined') return null;

  return createPortal((
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">Create Squad</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X size={18} /></button>
        </div>

        {/* Squad limit indicator */}
        <div className="mb-4 flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Squads created
          </span>
          <span className={`text-[11px] font-black uppercase tracking-widest ${userSquadCount >= MAX_SQUADS_PER_USER ? 'text-rose-500' : 'text-indigo-600'}`}>
            {userSquadCount}/{MAX_SQUADS_PER_USER}
          </span>
        </div>

        {limitError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm text-rose-600 font-semibold">
            {limitError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Squad Name */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Squad Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-300"
              placeholder="e.g., Metro Morning Dink, ATL Advanced Ladder"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-indigo-300"
              rows={2}
              placeholder="Tell members about your squad... e.g., 'Daily open play, weekday mornings, all skill levels welcome'"
            />
          </div>

          {/* Location Dropdown */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Location *</label>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-left focus:outline-none focus:border-indigo-300 bg-white flex items-center justify-between"
              >
                <span className={form.location ? 'text-slate-900' : 'text-slate-400'}>
                  {form.location || 'Select a city...'}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-10 max-h-64 overflow-y-auto">
                  {PHILIPPINES_CITIES.map(city => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, location: city.name }));
                        setShowLocationDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-indigo-50 transition-colors ${
                        form.location === city.name ? 'bg-indigo-100 font-bold text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Privacy</label>
            <select
              value={form.privacy}
              onChange={e => setForm(prev => ({ ...prev, privacy: e.target.value as 'public' | 'private' }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white focus:outline-none focus:border-indigo-300"
            >
              <option value="public">🌐 Public — Anyone can join</option>
              <option value="private">🔒 Private — You approve members</option>
            </select>
          </div>

          {/* Tags Dropdown */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Squad Type *</label>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-2">Select at least 1</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-left focus:outline-none focus:border-indigo-300 bg-white flex items-center justify-between"
              >
                <span className={form.selectedTags.length > 0 ? 'text-slate-900' : 'text-slate-400'}>
                  {form.selectedTags.length > 0
                    ? `${form.selectedTags.length} selected`
                    : 'Choose tags...'}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showTagsDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showTagsDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-10 max-h-72 overflow-y-auto p-2 space-y-1">
                  {PREDEFINED_TAGS.map(tag => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedTags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{tag}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Selected tags display */}
            {form.selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-indigo-600 text-white flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="ml-1 hover:opacity-70"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || userSquadCount >= MAX_SQUADS_PER_USER}
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Squad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
};
