import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GroupEvent, EventType } from '../../types';
import { updateGroupEvent } from '../../services/community';

interface EditEventModalProps {
  show: boolean;
  onClose: () => void;
  onEventUpdated: (event: GroupEvent) => void;
  event: GroupEvent;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({ show, onClose, onEventUpdated, event }) => {
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    title: event.title,
    description: event.description || '',
    event_type: event.event_type,
    location: event.location || '',
    start_time: '',
    max_attendees: event.max_attendees?.toString() || ''
  });

  // Format datetime for input on mount and when event changes
  useEffect(() => {
    const startDate = new Date(event.start_time);
    const localDatetime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setForm(prev => ({
      ...prev,
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      location: event.location || '',
      start_time: localDatetime,
      max_attendees: event.max_attendees?.toString() || ''
    }));
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time) return;
    setUpdating(true);
    try {
      const updatedEvent = await updateGroupEvent(event.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        event_type: form.event_type,
        location: form.location.trim() || undefined,
        start_time: new Date(form.start_time).toISOString(),
        max_attendees: form.max_attendees ? Number(form.max_attendees) : undefined
      });
      onEventUpdated(updatedEvent);
      onClose();
    } catch (err) {
      console.error('Error updating event:', err);
      alert('Failed to update event.');
    } finally {
      setUpdating(false);
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
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Edit event</h3>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              disabled={updating}
              className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all disabled:opacity-60"
            >
              {updating ? 'Updating...' : 'Update event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
};
