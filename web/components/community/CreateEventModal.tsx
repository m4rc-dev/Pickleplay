import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Group, GroupEvent, EventType } from '../../types';
import { createGroupEvent } from '../../services/community';

interface CreateEventModalProps {
  show: boolean;
  onClose: () => void;
  onEventCreated: (event: GroupEvent) => void;
  groups: Group[];
  defaultGroupId?: string;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ show, onClose, onEventCreated, groups, defaultGroupId }) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    group_id: defaultGroupId || (groups[0]?.id || ''),
    title: '',
    description: '',
    event_type: 'meetup' as EventType,
    location: '',
    start_time: '',
    max_attendees: ''
  });

  // Update group_id when groups change
  useEffect(() => {
    if (!form.group_id && groups.length > 0) {
      setForm(prev => ({ ...prev, group_id: groups[0].id }));
    }
  }, [groups, form.group_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.group_id || !form.title.trim() || !form.start_time) return;
    setCreating(true);
    try {
      const newEvent = await createGroupEvent({
        group_id: form.group_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        event_type: form.event_type,
        location: form.location.trim() || undefined,
        start_time: new Date(form.start_time).toISOString(),
        max_attendees: form.max_attendees ? Number(form.max_attendees) : undefined
      });
      onEventCreated(newEvent);
      onClose();
      setForm(prev => ({ ...prev, title: '', description: '', location: '', start_time: '', max_attendees: '' }));
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event.');
    } finally {
      setCreating(false);
    }
  };

  if (!show || typeof document === 'undefined') return null;

  return createPortal((
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Create event</h3>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Group</label>
            <select
              value={form.group_id}
              onChange={e => setForm(prev => ({ ...prev, group_id: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
              required
            >
              <option value="" disabled>Select a group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Event type</label>
            <select
              value={form.event_type}
              onChange={e => setForm(prev => ({ ...prev, event_type: e.target.value as EventType }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
            >
              <option value="meetup">Meetup</option>
              <option value="tournament">Tournament</option>
              <option value="social">Social</option>
              <option value="training">Training</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
              placeholder="Saturday Open Play"
              required
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500 min-h-[80px] resize-none"
              placeholder="Casual doubles play for all skill levels..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Location</label>
              <input
                value={form.location}
                onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
                placeholder="Riverside Courts"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Max attendees</label>
              <input
                type="number"
                min="1"
                value={form.max_attendees}
                onChange={e => setForm(prev => ({ ...prev, max_attendees: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
                placeholder="24"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Start time</label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-700 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Cancel</button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
};
