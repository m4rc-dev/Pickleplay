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
import {
    createCourtEvent,
    getOwnerEvents,
    updateCourtEvent,
    deleteCourtEvent,
    getEventColorByType
} from '../../services/courtEvents';

interface Court {
    id: string;
    name: string;
    address: string;
    city: string;
}

// Event Modal Component
const EventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: Partial<CourtEvent>) => Promise<void>;
    courts: Court[];
    editingEvent?: CourtEvent | null;
}> = ({ isOpen, onClose, onSave, courts, editingEvent }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        court_id: '',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
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
                date: startDate.toISOString().split('T')[0],
                start_time: startDate.toTimeString().slice(0, 5),
                end_time: endDate.toTimeString().slice(0, 5),
                event_type: editingEvent.event_type,
                blocks_bookings: editingEvent.blocks_bookings
            });
        } else {
            setFormData({
                court_id: courts[0]?.id || '',
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                start_time: '08:00',
                end_time: '17:00',
                event_type: 'maintenance',
                blocks_bookings: true
            });
        }
    }, [editingEvent, courts, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
            const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();

            await onSave({
                ...(editingEvent && { id: editingEvent.id }),
                court_id: formData.court_id,
                title: formData.title,
                description: formData.description || undefined,
                start_datetime: startDateTime,
                end_datetime: endDateTime,
                event_type: formData.event_type,
                blocks_bookings: formData.blocks_bookings,
                color: getEventColorByType(formData.event_type)
            });

            onClose();
        } catch (err) {
            console.error('Error saving event:', err);
            alert('Failed to save event');
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                            {editingEvent ? 'Edit Event' : 'Block Time'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {editingEvent ? 'Modify event details' : 'Create maintenance, closure, or private event'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Court Selection */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Select Court
                        </label>
                        <select
                            value={formData.court_id}
                            onChange={(e) => setFormData(prev => ({ ...prev, court_id: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium"
                            required
                        >
                            <option value="">Choose a court...</option>
                            {courts.map(court => (
                                <option key={court.id} value={court.id}>{court.name}</option>
                            ))}
                        </select>
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
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Monthly Maintenance, VIP Booking..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium"
                            required
                        />
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
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Block Bookings Toggle */}
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl">
                                <AlertCircle size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-amber-900">Block Player Bookings</p>
                                <p className="text-xs text-amber-700">Prevents players from booking during this time</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, blocks_bookings: !prev.blocks_bookings }))}
                            className={`w-12 h-7 rounded-full transition-all relative ${formData.blocks_bookings ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${formData.blocks_bookings ? 'right-1' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    {/* Actions */}
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
                            disabled={isSubmitting || !formData.court_id || !formData.title}
                            className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200"
                        >
                            {isSubmitting ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
                        </button>
                    </div>
                </form>
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CourtEvent | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [selectedCourt, setSelectedCourt] = useState<string>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) return;

            // Fetch courts and events in parallel
            const [courtsResponse, eventsResponse] = await Promise.all([
                supabase.from('courts').select('id, name, address, city').eq('owner_id', userId),
                getOwnerEvents()
            ]);

            if (courtsResponse.error) throw courtsResponse.error;

            setCourts(courtsResponse.data || []);
            setEvents(eventsResponse.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveEvent = async (eventData: Partial<CourtEvent>) => {
        try {
            if (eventData.id) {
                // Update existing event
                await updateCourtEvent(eventData.id, {
                    title: eventData.title,
                    description: eventData.description,
                    start_datetime: eventData.start_datetime,
                    end_datetime: eventData.end_datetime,
                    event_type: eventData.event_type,
                    blocks_bookings: eventData.blocks_bookings,
                    color: eventData.color
                });
            } else {
                // Create new event
                await createCourtEvent(
                    eventData.court_id!,
                    eventData.title!,
                    eventData.description,
                    eventData.start_datetime!,
                    eventData.end_datetime!,
                    eventData.event_type!,
                    eventData.blocks_bookings!,
                    eventData.color
                );
            }
            fetchData();
            setEditingEvent(null);
        } catch (err) {
            throw err;
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            const result = await deleteCourtEvent(eventId);
            if (result.error) {
                console.error('Delete error:', result.error);
                alert('Failed to delete event: ' + (result.error as Error).message);
                return;
            }
            // Refresh the events list
            fetchData();
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Failed to delete event');
        }
    };

    const handleEditEvent = (event: CourtEvent) => {
        setEditingEvent(event);
        setIsModalOpen(true);
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Court Management</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">
                        Event Calendar
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage maintenance, closures, and private events</p>
                </div>
                <button
                    onClick={() => {
                        setEditingEvent(null);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-4 bg-amber-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-95"
                >
                    <Plus size={18} /> Block Time
                </button>
            </div>

            {/* Stats Cards */}
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

            {/* Calendar Controls */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
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
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                        </div>
                        <button
                            onClick={goToToday}
                            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-colors"
                        >
                            Today
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Court Filter */}
                        <select
                            value={selectedCourt}
                            onChange={(e) => setSelectedCourt(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                        >
                            <option value="all">All Courts</option>
                            {courts.map(court => (
                                <option key={court.id} value={court.id}>{court.name}</option>
                            ))}
                        </select>

                        {/* View Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'
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
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : viewMode === 'month' ? (
                    <div className="p-4">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => (
                                <div
                                    key={idx}
                                    className={`min-h-[100px] md:min-h-[120px] p-2 rounded-2xl border transition-all ${day
                                        ? isToday(day)
                                            ? 'bg-amber-50 border-amber-200'
                                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                        : 'bg-transparent border-transparent'
                                        }`}
                                >
                                    {day && (
                                        <>
                                            <div className={`text-sm font-black mb-1 ${isToday(day) ? 'text-amber-600' : 'text-slate-900'
                                                }`}>
                                                {day}
                                            </div>
                                            <div className="space-y-1">
                                                {getEventsForDay(day).slice(0, 3).map(event => (
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
                                                {getEventsForDay(day).length > 3 && (
                                                    <p className="text-[9px] font-bold text-slate-400 pl-1">
                                                        +{getEventsForDay(day).length - 3} more
                                                    </p>
                                                )}
                                            </div>
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
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all"
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
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[9px] font-bold uppercase">
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
                courts={courts}
                editingEvent={editingEvent}
            />
        </div>
    );
};

export default CourtCalendar;
