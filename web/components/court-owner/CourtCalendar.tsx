import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    MapPin,
    AlertCircle,
    Trash2,
    Edit3,
    Filter,
    LayoutGrid,
    List,
    Wrench,
    Users,
    Sparkles,
    Ban,
    MoreHorizontal
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { CourtEvent, CourtEventType } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
    createCourtEvent,
    getOwnerEvents,
    updateCourtEvent,
    deleteCourtEvent,
    getEventColorByType
} from '../../services/courtEvents';
import { getCurrentActiveRole, getCurrentCourtManagerContext } from '../../services/courtManagers';

interface Court {
    id: string;
    name: string;
}

type TimeBlock = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
};

const formatDateInput = (date: Date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().split('T')[0];
};

const getTodayInputDate = () => formatDateInput(new Date());

const createTimeBlock = (overrides: Partial<TimeBlock> = {}): TimeBlock => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: getTodayInputDate(),
    start_time: '08:00',
    end_time: '17:00',
    ...overrides,
});

// Event Modal Component
const EventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: Partial<CourtEvent> | Partial<CourtEvent>[]) => Promise<void>;
    onDelete?: (event: CourtEvent) => void;
    courts: Court[];
    editingEvent?: CourtEvent | null;
}> = ({ isOpen, onClose, onSave, onDelete, courts, editingEvent }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([createTimeBlock()]);
    const [formError, setFormError] = useState<string | null>(null);
    const [titleError, setTitleError] = useState(false);
    const [courtError, setCourtError] = useState(false);
    const [invalidBlockIds, setInvalidBlockIds] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        court_id: '',
        title: '',
        description: '',
        date: getTodayInputDate(),
        start_time: '08:00',
        end_time: '17:00',
        event_type: 'maintenance' as CourtEventType,
        blocks_bookings: true
    });

    useEffect(() => {
        if (editingEvent) {
            const startDate = new Date(editingEvent.start_datetime);
            const endDate = new Date(editingEvent.end_datetime);
            setFormData({
                court_id: editingEvent.court_id,
                title: editingEvent.title,
                description: editingEvent.description || '',
                date: formatDateInput(startDate),
                start_time: startDate.toTimeString().slice(0, 5),
                end_time: endDate.toTimeString().slice(0, 5),
                event_type: editingEvent.event_type,
                blocks_bookings: editingEvent.blocks_bookings
            });
            setTimeBlocks([
                createTimeBlock({
                    date: formatDateInput(startDate),
                    start_time: startDate.toTimeString().slice(0, 5),
                    end_time: endDate.toTimeString().slice(0, 5),
                }),
            ]);
        } else {
            const initialBlock = createTimeBlock();
            setFormData({
                court_id: courts[0]?.id || '',
                title: '',
                description: '',
                date: initialBlock.date,
                start_time: '08:00',
                end_time: '17:00',
                event_type: 'maintenance',
                blocks_bookings: true
            });
            setTimeBlocks([initialBlock]);
        }
        setFormError(null);
        setTitleError(false);
        setCourtError(false);
        setInvalidBlockIds([]);
    }, [editingEvent, courts, isOpen]);

    const updateTimeBlock = (id: string, updates: Partial<TimeBlock>) => {
        setFormError(null);
        setInvalidBlockIds([]);
        setTimeBlocks(prev => prev.map(block => block.id === id ? { ...block, ...updates } : block));
    };

    const addTimeBlock = () => {
        setFormError(null);
        setInvalidBlockIds([]);
        const lastBlock = timeBlocks[timeBlocks.length - 1];
        setTimeBlocks(prev => [
            ...prev,
            createTimeBlock({
                date: lastBlock?.date || getTodayInputDate(),
                start_time: lastBlock?.end_time || '08:00',
                end_time: '17:00',
            }),
        ]);
    };

    const removeTimeBlock = (id: string) => {
        setFormError(null);
        setInvalidBlockIds([]);
        setTimeBlocks(prev => prev.length === 1 ? prev : prev.filter(block => block.id !== id));
    };

    const getBlocksToSubmit = () => editingEvent
        ? [{ date: formData.date, start_time: formData.start_time, end_time: formData.end_time }]
        : timeBlocks;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTitle = formData.title.trim();
        const blocksToSubmit = getBlocksToSubmit();
        const blockEntries = blocksToSubmit.map((block, index) => ({
            ...block,
            id: editingEvent ? `editing-block-${index}` : (block as TimeBlock).id,
        }));

        const conflictingBlockIds = new Set<string>();
        const invalidBlock = blockEntries.find(block => {
            const start = new Date(`${block.date}T${block.start_time}:00`);
            const end = new Date(`${block.date}T${block.end_time}:00`);
            return end <= start;
        });

        const hasCourtError = !formData.court_id;
        const hasTitleError = !trimmedTitle;
        setCourtError(hasCourtError);
        setTitleError(hasTitleError);

        if (hasCourtError || hasTitleError) {
            setFormError('Complete the required fields first before saving this block.');
            return;
        }

        if (invalidBlock) {
            setInvalidBlockIds([invalidBlock.id]);
            setFormError('End time must be later than start time. For overnight closures, create a separate next-day block.');
            return;
        }

        if (!editingEvent) {
            for (let i = 0; i < blockEntries.length; i += 1) {
                const current = blockEntries[i];
                const currentStart = new Date(`${current.date}T${current.start_time}:00`).getTime();
                const currentEnd = new Date(`${current.date}T${current.end_time}:00`).getTime();

                for (let j = i + 1; j < blockEntries.length; j += 1) {
                    const compare = blockEntries[j];
                    if (current.date !== compare.date) continue;

                    const compareStart = new Date(`${compare.date}T${compare.start_time}:00`).getTime();
                    const compareEnd = new Date(`${compare.date}T${compare.end_time}:00`).getTime();
                    const overlaps = currentStart < compareEnd && compareStart < currentEnd;

                    if (overlaps) {
                        conflictingBlockIds.add(current.id);
                        conflictingBlockIds.add(compare.id);
                    }
                }
            }
        }

        if (conflictingBlockIds.size > 0) {
            setInvalidBlockIds(Array.from(conflictingBlockIds));
            setFormError('Schedules on the same day cannot use the same or overlapping allotted time. Adjust the conflicting rows and try again.');
            return;
        }

        setFormError(null);
        setInvalidBlockIds([]);
        setIsSubmitting(true);

        try {
            const eventPayloads = blocksToSubmit.map(block => ({
                ...(editingEvent && { id: editingEvent.id }),
                court_id: formData.court_id,
                title: trimmedTitle,
                description: formData.description || undefined,
                start_datetime: new Date(`${block.date}T${block.start_time}:00`).toISOString(),
                end_datetime: new Date(`${block.date}T${block.end_time}:00`).toISOString(),
                event_type: formData.event_type,
                blocks_bookings: formData.blocks_bookings,
                color: getEventColorByType(formData.event_type)
            }));

            await onSave(editingEvent ? eventPayloads[0] : eventPayloads);

            onClose();
        } catch (err) {
            console.error('Error saving event:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to save event';
            setFormError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const eventTypes: { value: CourtEventType; label: string; icon: React.ReactNode; color: string }[] = [
        { value: 'maintenance', label: 'Maintenance', icon: <Wrench size={16} />, color: 'bg-red-100 text-red-600 border-red-200' },
        { value: 'private_event', label: 'Private Event', icon: <Users size={16} />, color: 'bg-purple-100 text-purple-600 border-purple-200' },
        { value: 'cleaning', label: 'Cleaning', icon: <Sparkles size={16} />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
        { value: 'closure', label: 'Court Closure', icon: <Ban size={16} />, color: 'bg-rose-100 text-rose-600 border-rose-200' },
        { value: 'other', label: 'Other', icon: <MoreHorizontal size={16} />, color: 'bg-gray-100 text-gray-600 border-gray-200' }
    ];

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-2xl max-h-[95vh] flex flex-col rounded-[32px] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                            {editingEvent ? 'Edit Event' : 'Block Time'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {editingEvent ? 'Modify event details' : 'Create maintenance, closure, or private event'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                    {formError && (
                        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            <div className="mt-0.5 rounded-xl bg-white/80 p-2 shrink-0">
                                <AlertCircle size={16} className="text-rose-600" />
                            </div>
                            <div>
                                <p className="font-bold uppercase tracking-wide text-[11px] text-rose-700">Check this form</p>
                                <p className="mt-1 leading-relaxed">{formError}</p>
                            </div>
                        </div>
                    )}
                    {/* Court Selection */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Select Court
                        </label>
                        <select
                            value={formData.court_id}
                            onChange={(e) => {
                                setFormError(null);
                                setCourtError(false);
                                setFormData(prev => ({ ...prev, court_id: e.target.value }));
                            }}
                            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium ${
                                courtError ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                            }`}
                        >
                            <option value="">Choose a court...</option>
                            {courts.map(court => (
                                <option key={court.id} value={court.id}>{court.name}</option>
                            ))}
                        </select>
                        {courtError && (
                            <p className="mt-2 text-xs font-medium text-rose-600">Select a court to continue.</p>
                        )}
                    </div>

                    {/* Event Type */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Event Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {eventTypes.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, event_type: type.value }))}
                                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all text-left ${formData.event_type === type.value
                                        ? type.color + ' border-current'
                                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {type.icon}
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Event Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => {
                                setFormError(null);
                                setTitleError(false);
                                setFormData(prev => ({ ...prev, title: e.target.value }));
                            }}
                            placeholder="e.g., Monthly Maintenance, VIP Booking..."
                            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium ${
                                titleError ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                            }`}
                        />
                        {titleError && (
                            <p className="mt-2 text-xs font-medium text-rose-600">Enter an event title before saving.</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Add any notes about this event..."
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {editingEvent ? 'Date & Time' : 'Block Schedules'}
                                </label>
                                {!editingEvent && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Add one or more time blocks for this court. Each row becomes its own blocked event.
                                    </p>
                                )}
                            </div>
                            {!editingEvent && (
                                <button
                                    type="button"
                                    onClick={addTimeBlock}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border-2 border-blue-200 ring-4 ring-blue-100/70 hover:bg-blue-100 transition-all text-[10px] font-black uppercase tracking-widest shrink-0 animate-pulse"
                                >
                                    <Plus size={14} /> Add Time
                                </button>
                            )}
                        </div>

                        {editingEvent ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => {
                                            setFormError(null);
                                            setInvalidBlockIds([]);
                                            setFormData(prev => ({ ...prev, date: e.target.value }));
                                        }}
                                        className={`w-full px-3 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-sm ${
                                            invalidBlockIds.length > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(e) => {
                                            setFormError(null);
                                            setInvalidBlockIds([]);
                                            setFormData(prev => ({ ...prev, start_time: e.target.value }));
                                        }}
                                        className={`w-full px-3 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-sm ${
                                            invalidBlockIds.length > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(e) => {
                                            setFormError(null);
                                            setInvalidBlockIds([]);
                                            setFormData(prev => ({ ...prev, end_time: e.target.value }));
                                        }}
                                        className={`w-full px-3 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-sm ${
                                            invalidBlockIds.length > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                                        }`}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {timeBlocks.map((block, index) => (
                                    <div
                                        key={block.id}
                                        className={`p-3 rounded-2xl border bg-slate-50 ${
                                            invalidBlockIds.includes(block.id) ? 'border-rose-300 bg-rose-50/70' : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                Schedule {index + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeTimeBlock(block.id)}
                                                disabled={timeBlocks.length === 1}
                                                className="p-2 rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                aria-label="Remove time block"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                    Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={block.date}
                                                    onChange={(e) => updateTimeBlock(block.id, { date: e.target.value })}
                                                    className={`w-full px-3 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-sm ${
                                                        invalidBlockIds.includes(block.id) ? 'border-rose-300' : 'border-slate-200'
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={block.start_time}
                                                    onChange={(e) => updateTimeBlock(block.id, { start_time: e.target.value })}
                                                    className={`w-full px-3 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-sm ${
                                                        invalidBlockIds.includes(block.id) ? 'border-rose-300' : 'border-slate-200'
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                    End Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={block.end_time}
                                                    onChange={(e) => updateTimeBlock(block.id, { end_time: e.target.value })}
                                                    className={`w-full px-3 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-sm ${
                                                        invalidBlockIds.includes(block.id) ? 'border-rose-300' : 'border-slate-200'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                        {invalidBlockIds.includes(block.id) && (
                                            <p className="mt-3 text-xs font-medium text-rose-600">
                                                This schedule conflicts with another row on the same day or has an invalid time range.
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Block Bookings Toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <AlertCircle size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-blue-900">Block Player Bookings</p>
                                <p className="text-xs text-blue-700">Prevents players from booking during this time</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, blocks_bookings: !prev.blocks_bookings }))}
                            className={`w-12 h-7 rounded-full transition-all relative ${formData.blocks_bookings ? 'bg-blue-600' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${formData.blocks_bookings ? 'right-1' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    {/* Actions */}
                    {editingEvent && onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(editingEvent)}
                            className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Delete Event
                        </button>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.court_id || !formData.title || (!editingEvent && timeBlocks.length === 0)}
                            className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/10"
                        >
                            {isSubmitting ? 'Saving...' : (editingEvent ? 'Update Event' : timeBlocks.length > 1 ? `Create ${timeBlocks.length} Blocks` : 'Create Event')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const DayEventsModal: React.FC<{
    isOpen: boolean;
    dateLabel: string;
    events: CourtEvent[];
    getCourtName: (courtId: string) => string;
    getEventTypeIcon: (type: CourtEventType) => React.ReactNode;
    onClose: () => void;
    onSelectEvent: (event: CourtEvent) => void;
}> = ({ isOpen, dateLabel, events, getCourtName, getEventTypeIcon, onClose, onSelectEvent }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Day Events</p>
                        <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">{dateLabel}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {events.length} {events.length === 1 ? 'event' : 'events'} scheduled for this day
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-900"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
                    {events.map(event => (
                        <button
                            key={event.id}
                            type="button"
                            onClick={() => onSelectEvent(event)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-slate-300 hover:bg-white"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase"
                                        style={{ backgroundColor: event.color || '#ef4444', color: 'white' }}
                                    >
                                        {getEventTypeIcon(event.event_type)}
                                        {event.event_type.replace('_', ' ')}
                                    </span>
                                    {event.blocks_bookings && (
                                        <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                                            Blocking
                                        </span>
                                    )}
                                </div>
                                <Edit3 size={14} className="shrink-0 text-slate-400" />
                            </div>
                            <p className="mt-3 truncate text-sm font-black text-slate-900">{event.title}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} /> {getCourtName(event.court_id)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {' - '}
                                    {new Date(event.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

// Main Calendar Component
const CourtCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CourtEvent[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isManagerRole, setIsManagerRole] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CourtEvent | null>(null);
    const [expandedDay, setExpandedDay] = useState<{ dateLabel: string; events: CourtEvent[] } | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [selectedCourt, setSelectedCourt] = useState<string>('all');

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'warning' | 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'warning' });

    // Confirm dialog helpers
    const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' | 'info' = 'warning') => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
    };

    const closeConfirm = () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'warning' });
    };

    const handleConfirm = () => {
        confirmDialog.onConfirm();
        closeConfirm();
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) return;
            const activeRole = await getCurrentActiveRole();
            const isManager = activeRole === 'COURT_MANAGER';
            const managerContext = isManager ? await getCurrentCourtManagerContext() : null;
            setIsManagerRole(isManager);

            // Fetch courts and events in parallel
            const [courtsResponse, eventsResponse] = await Promise.all([
                isManager && managerContext
                    ? supabase.from('courts').select('id, name').eq('id', managerContext.court.id)
                    : supabase.from('courts').select('id, name').eq('owner_id', userId),
                getOwnerEvents()
            ]);

            if (courtsResponse.error) throw courtsResponse.error;

            setCourts(courtsResponse.data || []);
            if (isManager && managerContext) {
                setSelectedCourt(managerContext.court.id);
            }
            setEvents(eventsResponse.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveEvent = async (eventData: Partial<CourtEvent> | Partial<CourtEvent>[]) => {
        try {
            const eventsToSave = Array.isArray(eventData) ? eventData : [eventData];

            for (const item of eventsToSave) {
                if (item.id) {
                    // Update existing event
                    const result = await updateCourtEvent(item.id, {
                        title: item.title,
                        description: item.description,
                        start_datetime: item.start_datetime,
                        end_datetime: item.end_datetime,
                        event_type: item.event_type,
                        blocks_bookings: item.blocks_bookings,
                    });
                    if (result.error) throw result.error;
                } else {
                    // Create new event
                    const result = await createCourtEvent(
                        item.court_id!,
                        item.title!,
                        item.description,
                        item.start_datetime!,
                        item.end_datetime!,
                        item.event_type!,
                        item.blocks_bookings,
                        item.color
                    );
                    if (result.error) throw result.error;
                }
            }
            await fetchData();
            setEditingEvent(null);
        } catch (err) {
            throw err;
        }
    };

    const handleDeleteEvent = async (eventId: string, afterDelete?: () => void) => {
        showConfirm(
            'Delete Event?',
            'This will permanently delete this calendar event. Affected time slots will become available for booking again. This action cannot be undone.',
            async () => {
                try {
                    const result = await deleteCourtEvent(eventId);
                    if (result.error) {
                        console.error('Delete error:', result.error);
                        alert('Failed to delete event: ' + (result.error as Error).message);
                        return;
                    }
                    // Refresh the events list
                    await fetchData();
                    setEditingEvent(null);
                    afterDelete?.();
                } catch (err) {
                    console.error('Error deleting event:', err);
                    alert('Failed to delete event');
                }
            },
            'danger'
        );
    };

    const handleEditEvent = (event: CourtEvent) => {
        setExpandedDay(null);
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleOpenDayEvents = (day: number) => {
        const dayEvents = getEventsForDay(day)
            .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        setExpandedDay({
            dateLabel: dayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            events: dayEvents,
        });
    };

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];

        // Add empty slots for days before the first day
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const getEventsForDay = (day: number) => {
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return events.filter(event => {
            const eventStart = new Date(event.start_datetime);
            const eventEnd = new Date(event.end_datetime);
            const dayStart = new Date(dayDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            const isInDateRange = eventStart <= dayEnd && eventEnd >= dayStart;
            const matchesCourt = selectedCourt === 'all' || event.court_id === selectedCourt;

            return isInDateRange && matchesCourt;
        });
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const days = getDaysInMonth(currentDate);
    const today = new Date();
    const isToday = (day: number) =>
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

    const filteredEvents = selectedCourt === 'all'
        ? events
        : events.filter(e => e.court_id === selectedCourt);

    const getEventTypeIcon = (type: CourtEventType) => {
        switch (type) {
            case 'maintenance': return <Wrench size={12} />;
            case 'private_event': return <Users size={12} />;
            case 'cleaning': return <Sparkles size={12} />;
            case 'closure': return <Ban size={12} />;
            default: return <MoreHorizontal size={12} />;
        }
    };

    const getCourtName = (courtId: string) => {
        return courts.find(c => c.id === courtId)?.name || 'Unknown Court';
    };

    return (
        <div className={isManagerRole ? 'space-y-5' : 'space-y-6'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Court Management</p>
                    <h1 className={`${isManagerRole ? 'text-3xl md:text-[2.8rem]' : 'text-3xl md:text-4xl'} font-black text-slate-900 tracking-tighter uppercase`}>
                        Event Calendar
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isManagerRole
                            ? 'Manage availability, maintenance, and closures for your assigned court.'
                            : 'Manage maintenance, closures, and private events.'}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingEvent(null);
                        setIsModalOpen(true);
                    }}
                    className={`flex items-center gap-2 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-blue-900/10 active:scale-95 hover:bg-blue-600 ${isManagerRole ? 'px-5 py-3.5' : 'px-6 py-4'}`}
                >
                    <Plus size={18} /> Block Time
                </button>
            </div>

            {/* Stats Cards */}
            {!isManagerRole && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-red-50 rounded-xl">
                            <Wrench size={18} className="text-red-500" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maintenance</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{events.filter(e => e.event_type === 'maintenance').length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-purple-50 rounded-xl">
                            <Users size={18} className="text-purple-500" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Private</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{events.filter(e => e.event_type === 'private_event').length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl">
                            <Sparkles size={18} className="text-blue-500" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cleaning</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{events.filter(e => e.event_type === 'cleaning').length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-rose-50 rounded-xl">
                            <Ban size={18} className="text-rose-500" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closures</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{events.filter(e => e.event_type === 'closure').length}</p>
                </div>
            </div>
            )}

            {/* Calendar Controls */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className={`${isManagerRole ? 'p-4' : 'p-6'} border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
                    <div className={`flex items-center ${isManagerRole ? 'gap-3' : 'gap-4'}`}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={prevMonth}
                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={nextMonth}
                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div>
                            <h2 className={`${isManagerRole ? 'text-lg md:text-xl' : 'text-xl'} font-black text-slate-900 tracking-tight uppercase`}>
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                        </div>
                        <button
                            onClick={goToToday}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-colors"
                        >
                            Today
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isManagerRole && (
                            <select
                                value={selectedCourt}
                                onChange={(e) => setSelectedCourt(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="all">All Courts</option>
                                {courts.map(court => (
                                    <option key={court.id} value={court.id}>{court.name}</option>
                                ))}
                            </select>
                        )}

                        {/* View Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                {isLoading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : viewMode === 'month' ? (
                    <div className={isManagerRole ? 'p-3' : 'p-4'}>
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className={`grid grid-cols-7 ${isManagerRole ? 'gap-1' : 'gap-1'}`}>
                            {days.map((day, idx) => (
                                <div
                                    key={idx}
                                    className={`${isManagerRole ? 'min-h-[88px] md:min-h-[96px]' : 'min-h-[100px] md:min-h-[120px]'} p-2 rounded-2xl border transition-all ${day
                                        ? isToday(day)
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                        : 'bg-transparent border-transparent'
                                        }`}
                                >
                                    {day && (
                                        <>
                                            {(() => {
                                                const dayEvents = getEventsForDay(day);
                                                return (
                                                    <>
                                            <div className={`text-sm font-black mb-1 ${isToday(day) ? 'text-blue-600' : 'text-slate-900'
                                                }`}>
                                                {day}
                                            </div>
                                            <div className="space-y-1">
                                                {dayEvents.slice(0, 3).map(event => (
                                                    <button
                                                        key={event.id}
                                                        onClick={() => handleEditEvent(event)}
                                                        className="w-full text-left p-1.5 rounded-lg text-[9px] font-bold truncate transition-all hover:scale-[1.02]"
                                                        style={{ backgroundColor: event.color || '#ef4444', color: 'white' }}
                                                        title={`${event.title} - ${getCourtName(event.court_id)}`}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {getEventTypeIcon(event.event_type)}
                                                            <span className="truncate">{event.title}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDayEvents(day)}
                                                        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500 transition-all hover:border-blue-200 hover:text-blue-700"
                                                    >
                                                        <span>+{dayEvents.length - 3} more</span>
                                                        <span>View all</span>
                                                    </button>
                                                )}
                                            </div>
                                                    </>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* List View */
                    <div className="divide-y divide-slate-100">
                        {filteredEvents.length === 0 ? (
                            <div className="p-12 text-center">
                                <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900 mb-2">No Events Scheduled</h3>
                                <p className="text-sm text-slate-500 mb-4">Create your first event to block time on your courts.</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all"
                                >
                                    <Plus size={16} /> Create Event
                                </button>
                            </div>
                        ) : (
                            filteredEvents
                                .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
                                .map(event => (
                                    <div key={event.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                        <div
                                            className="w-2 h-16 rounded-full shrink-0"
                                            style={{ backgroundColor: event.color || '#ef4444' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase flex items-center gap-1`}
                                                    style={{ backgroundColor: event.color || '#ef4444', color: 'white' }}>
                                                    {getEventTypeIcon(event.event_type)}
                                                    {event.event_type.replace('_', ' ')}
                                                </span>
                                                {event.blocks_bookings && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[9px] font-bold uppercase">
                                                        Blocks Bookings
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-black text-slate-900 tracking-tight">{event.title}</h4>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} /> {getCourtName(event.court_id)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon size={12} /> {new Date(event.start_datetime).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleEditEvent(event)}
                                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </div>

            {/* Event Modal */}
            <EventModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                }}
                onSave={handleSaveEvent}
                onDelete={(event) => handleDeleteEvent(event.id, () => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                })}
                courts={courts}
                editingEvent={editingEvent}
            />

            <DayEventsModal
                isOpen={Boolean(expandedDay)}
                dateLabel={expandedDay?.dateLabel || ''}
                events={expandedDay?.events || []}
                getCourtName={getCourtName}
                getEventTypeIcon={getEventTypeIcon}
                onClose={() => setExpandedDay(null)}
                onSelectEvent={handleEditEvent}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={handleConfirm}
                onCancel={closeConfirm}
                variant={confirmDialog.variant}
            />
        </div>
    );
};

export default CourtCalendar;
