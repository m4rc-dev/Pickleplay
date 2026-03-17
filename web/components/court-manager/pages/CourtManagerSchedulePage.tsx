import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Sparkles,
  UserX,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import {
  createCourtEvent,
  deleteCourtEvent,
  getCourtEventsInRange,
  getEventColorByType,
  updateCourtEvent,
} from '../../../services/courtEvents';
import { performCourtManagerBookingAction } from '../../../services/courtManagers';
import type { CourtEvent, CourtEventType } from '../../../types';
import ConfirmDialog from '../../ui/ConfirmDialog';
import ManagerEmptyState from '../ManagerEmptyState';
import { useCourtManagerLayoutContext } from '../CourtManagerLayout';
import { COURT_MANAGER_ROUTES } from '../../../lib/court-manager/constants';

type ViewMode = 'day' | 'month';
type BookingAction = 'check_in' | 'check_out' | 'no_show';

interface LocationInfo {
  id: string;
  name: string;
  opening_time?: string | null;
  closing_time?: string | null;
}

interface OperationHoursRow {
  court_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  is_active: boolean;
}

interface ScheduleBooking {
  id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status?: 'paid' | 'unpaid' | 'refunded';
  is_checked_in?: boolean;
  checked_out_at?: string;
  is_no_show?: boolean;
  guest_name?: string;
  guest_email?: string;
  booked_by?: string;
  profiles?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
    username?: string;
  };
}

type SelectedItem =
  | { type: 'booking'; booking: ScheduleBooking }
  | { type: 'event'; event: CourtEvent }
  | null;

interface BlockModalState {
  mode: 'create' | 'edit';
  event?: CourtEvent | null;
  date: string;
  startTime: string;
  endTime: string;
}

export interface CourtManagerScheduleWorkspaceProps {
  initialViewMode?: ViewMode;
  lockedViewMode?: ViewMode;
  showViewToggle?: boolean;
  contextLabel?: string;
}

const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '18:00';
const HOUR_HEIGHT = 72;
const SLOT_MINUTES = 30;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);
const trimTime = (value?: string | null) => (value || DEFAULT_OPEN).slice(0, 5);

const toMinutes = (time: string) => {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.min(24 * 60, minutes));
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, '0');
  const mins = String(safeMinutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
};

const formatTimeLabel = (time: string) =>
  new Date(`2000-01-01T${time}:00`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatHourLabel = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${suffix}`;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const buildMonthCells = (anchorDate: Date) => {
  const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      key: formatDateKey(date),
      isCurrentMonth: date.getMonth() === anchorDate.getMonth(),
    };
  });
};

const getBookingUser = (booking: ScheduleBooking) => {
  const isGuest = Boolean(booking.guest_name && booking.booked_by);
  return {
    name: isGuest
      ? booking.guest_name || 'Guest Player'
      : booking.profiles?.full_name || booking.profiles?.username || 'Guest Player',
    email: isGuest ? booking.guest_email || 'No email' : booking.profiles?.email || 'No email',
    isGuest,
  };
};

const getBookingStatusMeta = (booking: ScheduleBooking) => {
  if (booking.is_no_show) return { label: 'No-Show', chip: 'border-rose-200 bg-rose-50 text-rose-700', block: 'border-rose-200 bg-rose-50/95 text-rose-900', accent: 'bg-rose-500' };
  if (booking.checked_out_at || booking.status === 'completed') return { label: 'Checked Out', chip: 'border-slate-200 bg-slate-100 text-slate-700', block: 'border-slate-200 bg-slate-100/95 text-slate-900', accent: 'bg-slate-500' };
  if (booking.is_checked_in) return { label: 'Checked In', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', block: 'border-emerald-200 bg-emerald-50/95 text-emerald-900', accent: 'bg-emerald-500' };
  if (booking.status === 'pending') return { label: 'Pending', chip: 'border-amber-200 bg-amber-50 text-amber-700', block: 'border-amber-200 bg-amber-50/95 text-amber-900', accent: 'bg-amber-500' };
  return { label: booking.payment_status === 'paid' ? 'Booked' : 'Reserved', chip: 'border-blue-200 bg-blue-50 text-blue-700', block: 'border-blue-200 bg-blue-50/95 text-blue-900', accent: 'bg-blue-500' };
};

const getBookingActionState = (booking: ScheduleBooking) => {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const start = new Date(`${booking.date}T${booking.start_time}`);
  const end = new Date(`${booking.date}T${booking.end_time}`);
  const fiveMinutesBeforeEnd = new Date(end.getTime() - 5 * 60 * 1000);
  const isPastEnd = now > end;
  const isLate = now > start && !booking.is_checked_in && booking.status !== 'cancelled';

  return {
    canCheckIn:
      booking.date === todayKey &&
      !booking.is_checked_in &&
      booking.status === 'confirmed' &&
      booking.payment_status === 'paid' &&
      !isPastEnd &&
      !booking.is_no_show,
    canCheckOut:
      now >= fiveMinutesBeforeEnd &&
      booking.is_checked_in &&
      booking.status !== 'completed' &&
      !booking.checked_out_at,
    canMarkNoShow:
      !booking.is_checked_in &&
      !booking.is_no_show &&
      booking.status !== 'cancelled' &&
      booking.status !== 'completed' &&
      (isLate || isPastEnd),
  };
};

const getEventMeta = (event: CourtEvent) => {
  if (event.event_type === 'maintenance') return { label: 'Maintenance', block: 'border-rose-200 bg-rose-50/95 text-rose-900', chip: 'border-rose-200 bg-rose-50 text-rose-700', accent: 'bg-rose-500', Icon: Wrench };
  if (event.event_type === 'cleaning') return { label: 'Cleaning', block: 'border-sky-200 bg-sky-50/95 text-sky-900', chip: 'border-sky-200 bg-sky-50 text-sky-700', accent: 'bg-sky-500', Icon: Sparkles };
  if (event.event_type === 'private_event') return { label: 'Private Use', block: 'border-violet-200 bg-violet-50/95 text-violet-900', chip: 'border-violet-200 bg-violet-50 text-violet-700', accent: 'bg-violet-500', Icon: Users };
  if (event.event_type === 'closure') return { label: 'Closure', block: 'border-slate-200 bg-slate-100/95 text-slate-900', chip: 'border-slate-200 bg-slate-100 text-slate-700', accent: 'bg-slate-500', Icon: AlertCircle };
  return { label: event.blocks_bookings ? 'Blocked Slot' : 'Court Note', block: 'border-amber-200 bg-amber-50/95 text-amber-900', chip: 'border-amber-200 bg-amber-50 text-amber-700', accent: 'bg-amber-500', Icon: Ban };
};

const getTimeRangeState = (dateKey: string, startMinutes: number, endMinutes: number) => {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isPast = dateKey < todayKey || (dateKey === todayKey && endMinutes <= currentMinutes);
  const isLive = dateKey === todayKey && startMinutes <= currentMinutes && currentMinutes < endMinutes;
  const isUpcoming = !isPast && !isLive;

  return {
    isPast,
    isLive,
    isUpcoming,
    label: isLive ? 'Live Now' : isPast ? 'Past' : 'Upcoming',
    chip: isLive
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : isPast
          ? 'border-slate-200 bg-slate-100 text-slate-600'
          : 'border-blue-200 bg-blue-50 text-blue-700',
  };
};

const BlockModal: React.FC<{
  state: BlockModalState | null;
  assignedCourtName: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; description: string; start_datetime: string; end_datetime: string; event_type: CourtEventType; blocks_bookings: boolean }) => Promise<void>;
}> = ({ state, assignedCourtName, isSaving, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState(DEFAULT_OPEN);
  const [endTime, setEndTime] = useState('09:00');
  const [eventType, setEventType] = useState<CourtEventType>('other');
  const [blocksBookings, setBlocksBookings] = useState(true);

  useEffect(() => {
    if (!state) return;
    if (state.mode === 'edit' && state.event) {
      const start = new Date(state.event.start_datetime);
      const end = new Date(state.event.end_datetime);
      setTitle(state.event.title);
      setDescription(state.event.description || '');
      setDate(formatDateKey(start));
      setStartTime(minutesToTime(start.getHours() * 60 + start.getMinutes()));
      setEndTime(minutesToTime(end.getHours() * 60 + end.getMinutes()));
      setEventType(state.event.event_type);
      setBlocksBookings(state.event.blocks_bookings);
      return;
    }

    setTitle('Blocked Slot');
    setDescription('');
    setDate(state.date);
    setStartTime(state.startTime);
    setEndTime(state.endTime);
    setEventType('other');
    setBlocksBookings(true);
  }, [state]);

  if (!state) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">
              {state.mode === 'edit' ? 'Edit Court Block' : 'Block Time'}
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{assignedCourtName}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { value: 'maintenance' as CourtEventType, label: 'Maintenance', classes: 'border-rose-200 bg-rose-50 text-rose-700' },
            { value: 'other' as CourtEventType, label: 'Blocked Slot', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
            { value: 'cleaning' as CourtEventType, label: 'Cleaning', classes: 'border-sky-200 bg-sky-50 text-sky-700' },
            { value: 'private_event' as CourtEventType, label: 'Private Use', classes: 'border-violet-200 bg-violet-50 text-violet-700' },
            { value: 'closure' as CourtEventType, label: 'Closure', classes: 'border-slate-200 bg-slate-100 text-slate-700' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setEventType(option.value)}
              className={`rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${eventType === option.value ? option.classes : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Block Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:bg-white"
              placeholder="Blocked slot, maintenance, private clinic..."
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:bg-white"
              placeholder="Optional notes for the next shift or court owner."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-300 focus:bg-white"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={blocksBookings}
              onChange={(event) => setBlocksBookings(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                Prevent Player Bookings
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Keep this on when the slot should stay blocked on the court timeline.
              </p>
            </div>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const start = new Date(`${date}T${startTime}:00`);
              const end = new Date(`${date}T${endTime}:00`);

              if (!title.trim()) {
                alert('Add a title for this court block.');
                return;
              }
              if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
                alert('End time must be later than the start time.');
                return;
              }

              void onSave({
                title: title.trim(),
                description: description.trim(),
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString(),
                event_type: eventType,
                blocks_bookings: blocksBookings,
              });
            }}
            disabled={isSaving}
            className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : state.mode === 'edit' ? 'Save Block' : 'Create Block'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const CourtManagerScheduleWorkspace: React.FC<CourtManagerScheduleWorkspaceProps> = ({
  initialViewMode = 'day',
  lockedViewMode,
  showViewToggle = true,
  contextLabel = 'Court Manager / Schedule',
}) => {
  const navigate = useNavigate();
  const { context } = useCourtManagerLayoutContext();
  const [viewMode, setViewMode] = useState<ViewMode>(lockedViewMode || initialViewMode);
  const [renderedView, setRenderedView] = useState<ViewMode>(lockedViewMode || initialViewMode);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [operationHours, setOperationHours] = useState<OperationHoursRow[]>([]);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [events, setEvents] = useState<CourtEvent[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [blockModalState, setBlockModalState] = useState<BlockModalState | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<CourtEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const contentRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const selectedDateKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(new Date());
  const monthCells = buildMonthCells(selectedDate);
  const canSwitchViews = !lockedViewMode;

  const resolveHoursForDate = (dateKey: string) => {
    const dateMatch = operationHours.find((row) => row.specific_date === dateKey);
    if (dateMatch) {
      return { open: trimTime(dateMatch.open_time), close: trimTime(dateMatch.close_time), isClosed: dateMatch.is_closed };
    }

    const dayOfWeek = fromDateKey(dateKey).getDay();
    const weeklyMatch = operationHours.find(
      (row) => row.day_of_week === dayOfWeek && row.specific_date === null
    );
    if (weeklyMatch) {
      return { open: trimTime(weeklyMatch.open_time), close: trimTime(weeklyMatch.close_time), isClosed: weeklyMatch.is_closed };
    }

    return {
      open: trimTime(locationInfo?.opening_time || DEFAULT_OPEN),
      close: trimTime(locationInfo?.closing_time || DEFAULT_CLOSE),
      isClosed: false,
    };
  };

  const loadScheduleData = async (anchorDate: Date = selectedDate) => {
    setIsLoading(true);
    setError(null);

    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59);
    const monthStartKey = formatDateKey(monthStart);
    const monthEndKey = formatDateKey(monthEnd);

    try {
      const [locationResponse, hoursResponse, bookingsResponse, eventsResponse] = await Promise.all([
        context.court.location_id
          ? supabase
              .from('locations')
              .select('id, name, opening_time, closing_time')
              .eq('id', context.court.location_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as const),
        supabase
          .from('court_operation_hours')
          .select('court_id, day_of_week, specific_date, open_time, close_time, is_closed, is_active')
          .eq('court_id', context.court.id)
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select(`
            id,
            court_id,
            date,
            start_time,
            end_time,
            total_price,
            status,
            payment_status,
            is_checked_in,
            checked_out_at,
            is_no_show,
            guest_name,
            guest_email,
            booked_by,
            profiles (full_name, email, username)
          `)
          .eq('court_id', context.court.id)
          .gte('date', monthStartKey)
          .lte('date', monthEndKey)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true }),
        getCourtEventsInRange(context.court.id, monthStart.toISOString(), monthEnd.toISOString()),
      ]);

      if (locationResponse && 'error' in locationResponse && locationResponse.error) throw locationResponse.error;
      if (hoursResponse.error) throw hoursResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;

      setLocationInfo(locationResponse && 'data' in locationResponse ? (locationResponse.data as LocationInfo | null) : null);
      setOperationHours((hoursResponse.data || []) as OperationHoursRow[]);
      setBookings((bookingsResponse.data || []) as ScheduleBooking[]);
      setEvents((eventsResponse.data || []) as CourtEvent[]);
    } catch (loadError: any) {
      console.error('Failed to load court manager schedule:', loadError);
      setError(loadError?.message || 'Failed to load the assigned-court schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadScheduleData(selectedDate);
  }, [context.court.id, selectedDate.getFullYear(), selectedDate.getMonth()]);

  useEffect(() => {
    setSelectedItem(null);
  }, [selectedDateKey, viewMode]);

  useEffect(() => {
    if (lockedViewMode && viewMode !== lockedViewMode) {
      setViewMode(lockedViewMode);
    }
  }, [lockedViewMode, viewMode]);

  useEffect(() => {
    if (lockedViewMode) {
      setRenderedView(lockedViewMode);
      setTransitionStage('idle');
    }
  }, [lockedViewMode]);

  useEffect(() => () => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
    }
  }, []);

  const handleViewModeChange = (nextView: ViewMode, nextDate?: Date) => {
    if (nextDate) {
      setSelectedDate(nextDate);
    }

    if (lockedViewMode) {
      setViewMode(lockedViewMode);
      setRenderedView(lockedViewMode);
      return;
    }

    if (nextView === viewMode) {
      setRenderedView(nextView);
      return;
    }

    setViewMode(nextView);

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
    }

    setTransitionDirection(nextView === 'day' ? 'forward' : 'backward');
    setTransitionStage('exit');

    exitTimerRef.current = window.setTimeout(() => {
      setRenderedView(nextView);
      setViewMode(nextView);
      setTransitionStage('enter');

      window.requestAnimationFrame(() => {
        settleTimerRef.current = window.setTimeout(() => {
          setTransitionStage('idle');
        }, 220);
      });
    }, 130);
  };

  const selectedDayHours = resolveHoursForDate(selectedDateKey);
  const openMinutes = toMinutes(selectedDayHours.open);
  const closeMinutes = toMinutes(selectedDayHours.close);
  const timelineStartHour = Math.max(0, Math.floor(openMinutes / 60) - 1);
  const timelineEndHour = Math.min(24, Math.ceil(closeMinutes / 60) + 1);
  const timelineHeight = Math.max(480, (timelineEndHour - timelineStartHour) * HOUR_HEIGHT);
  const timelineHours = Array.from(
    { length: Math.max(1, timelineEndHour - timelineStartHour + 1) },
    (_, index) => timelineStartHour + index
  );
  const positionForMinutes = (minutes: number) =>
    ((minutes - timelineStartHour * 60) / 60) * HOUR_HEIGHT;

  const selectedDayBookings = bookings
    .filter((booking) => booking.date === selectedDateKey && booking.status !== 'cancelled')
    .sort((left, right) => toMinutes(left.start_time) - toMinutes(right.start_time));

  const selectedDayEvents = events
    .filter((event) => {
      const eventStart = new Date(event.start_datetime);
      const eventEnd = new Date(event.end_datetime);
      const dayStart = new Date(`${selectedDateKey}T00:00:00`);
      const dayEnd = new Date(`${selectedDateKey}T23:59:59`);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    })
    .sort((left, right) => new Date(left.start_datetime).getTime() - new Date(right.start_datetime).getTime());
  const selectedDayBlockingEvents = selectedDayEvents.filter((event) => event.blocks_bookings);
  const selectedDayMaintenanceCount = selectedDayEvents.filter((event) => event.event_type === 'maintenance').length;
  const selectedDayClosureCount = selectedDayEvents.filter((event) => event.event_type === 'closure').length;
  const nextOperationalBooking = selectedDayBookings.find((booking) => {
    const endMinutes = toMinutes(booking.end_time);
    const rangeState = getTimeRangeState(booking.date, toMinutes(booking.start_time), endMinutes);
    return rangeState.isLive || rangeState.isUpcoming;
  }) || null;

  const currentTime = new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isSelectedToday = selectedDateKey === todayKey;
  const openTop = positionForMinutes(openMinutes);
  const closeTop = positionForMinutes(closeMinutes);
  const pastOverlayHeight =
    selectedDateKey < todayKey
      ? Math.max(0, closeTop - openTop)
      : isSelectedToday
          ? Math.max(0, Math.min(positionForMinutes(currentMinutes), closeTop) - openTop)
          : 0;

  const availableSlots = selectedDayHours.isClosed
    ? []
    : Array.from(
        { length: Math.max(0, Math.ceil((closeMinutes - openMinutes) / SLOT_MINUTES)) },
        (_, index) => {
          const start = openMinutes + index * SLOT_MINUTES;
          const end = Math.min(start + SLOT_MINUTES, closeMinutes);
          return { start, end };
        }
      );
  const activeAvailableSlots = availableSlots.filter(
    (slot) => !(selectedDateKey < todayKey || (selectedDateKey === todayKey && slot.end <= currentMinutes))
  );
  const calendarTransitionClass =
    transitionStage === 'exit'
      ? transitionDirection === 'forward'
        ? '-translate-x-8 opacity-0'
        : 'translate-x-8 opacity-0'
      : transitionStage === 'enter'
        ? transitionDirection === 'forward'
          ? 'translate-x-8 opacity-0'
          : '-translate-x-8 opacity-0'
        : 'translate-x-0 opacity-100';

  useEffect(() => {
    const updateContentHeight = () => {
      if (!contentRef.current) return;
      setContentHeight(contentRef.current.offsetHeight);
    };

    updateContentHeight();
    const rafId = window.requestAnimationFrame(updateContentHeight);
    window.addEventListener('resize', updateContentHeight);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateContentHeight);
    };
  }, [
    renderedView,
    transitionStage,
    selectedDateKey,
    bookings.length,
    events.length,
    selectedItem,
    selectedDayHours.isClosed,
    activeAvailableSlots.length,
    selectedDayBookings.length,
    selectedDayBlockingEvents.length,
    selectedDayMaintenanceCount,
    selectedDayClosureCount,
  ]);

  const handleBookingAction = async (booking: ScheduleBooking, action: BookingAction) => {
    const nextKey = `${booking.id}:${action}`;
    setActionKey(nextKey);

    try {
      await performCourtManagerBookingAction(booking.id, action);
      setSelectedItem(null);
      await loadScheduleData(selectedDate);
    } catch (actionError: any) {
      console.error('Failed to update booking from day view:', actionError);
      alert(actionError?.message || 'Failed to update the booking.');
    } finally {
      setActionKey(null);
    }
  };

  const handleSaveBlock = async (payload: {
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    event_type: CourtEventType;
    blocks_bookings: boolean;
  }) => {
    if (!blockModalState) return;

    setIsSavingBlock(true);
    try {
      if (blockModalState.mode === 'edit' && blockModalState.event) {
        const { error: updateError } = await updateCourtEvent(blockModalState.event.id, {
          title: payload.title,
          description: payload.description || undefined,
          start_datetime: payload.start_datetime,
          end_datetime: payload.end_datetime,
          event_type: payload.event_type,
          blocks_bookings: payload.blocks_bookings,
          color: getEventColorByType(payload.event_type),
        });
        if (updateError) throw updateError;
      } else {
        const { error: createError } = await createCourtEvent(
          context.court.id,
          payload.title,
          payload.description || undefined,
          payload.start_datetime,
          payload.end_datetime,
          payload.event_type,
          payload.blocks_bookings,
          getEventColorByType(payload.event_type)
        );
        if (createError) throw createError;
      }

      setBlockModalState(null);
      setSelectedItem(null);
      await loadScheduleData(selectedDate);
    } catch (saveError: any) {
      console.error('Failed to save court block:', saveError);
      alert(saveError?.message || 'Failed to save the court block.');
    } finally {
      setIsSavingBlock(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirmDeleteEvent) return;

    try {
      const { error: deleteError } = await deleteCourtEvent(confirmDeleteEvent.id);
      if (deleteError) throw deleteError;
      setConfirmDeleteEvent(null);
      setSelectedItem(null);
      await loadScheduleData(selectedDate);
    } catch (deleteError: any) {
      console.error('Failed to reopen availability:', deleteError);
      alert(deleteError?.message || 'Failed to reopen availability.');
    }
  };

  if (error) {
    return <ManagerEmptyState title="Schedule Unavailable" description={error} />;
  }

  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-slate-100 bg-white p-10 text-center shadow-sm">
        <Loader2 size={28} className="mx-auto animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">
          Loading your assigned-court day view...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">
              {contextLabel}
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
              {formatLongDate(selectedDate)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <MapPin size={14} className="text-blue-600" />
                {locationInfo?.name ? `${locationInfo.name} / ${context.court.name}` : context.court.name}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
                <Clock3 size={14} />
                {selectedDayHours.isClosed ? 'Closed for regular operations' : `${formatTimeLabel(selectedDayHours.open)} - ${formatTimeLabel(selectedDayHours.close)}`}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                {selectedDayBookings.length} booking{selectedDayBookings.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                {selectedDayBlockingEvents.length} blocked
              </span>
              <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700">
                {selectedDayMaintenanceCount} maintenance
              </span>
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                {activeAvailableSlots.length} open half-hours
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setSelectedDate((current) => addDays(current, -1))} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-white hover:text-slate-900">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={() => setSelectedDate(new Date())} className="rounded-xl px-4 text-[11px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-white hover:text-slate-900">
                  Today
                </button>
                <button type="button" onClick={() => setSelectedDate((current) => addDays(current, 1))} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-white hover:text-slate-900">
                  <ChevronRight size={18} />
                </button>
              </div>

              {showViewToggle && (
                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => handleViewModeChange('month')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                    <LayoutGrid size={14} />
                    Month
                  </button>
                  <button type="button" onClick={() => handleViewModeChange('day')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                    <CalendarIcon size={14} />
                    Day
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setBlockModalState({
                    mode: 'create',
                    date: selectedDateKey,
                    startTime: selectedDayHours.open,
                    endTime: minutesToTime(Math.min(closeMinutes, openMinutes + 60)),
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700"
              >
                <Plus size={16} />
                Block Time
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ['Available', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
                ['Booked', 'border-blue-200 bg-blue-50 text-blue-700'],
                ['Blocked', 'border-amber-200 bg-amber-50 text-amber-700'],
                ['Maintenance', 'border-rose-200 bg-rose-50 text-rose-700'],
                ['Past', 'border-slate-200 bg-slate-100 text-slate-700'],
              ].map(([label, classes]) => (
                <span key={label} className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${classes}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={contentHeight ? { height: `${contentHeight}px` } : undefined}
      >
        <div
          ref={contentRef}
          className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${calendarTransitionClass}`}
        >
      {renderedView === 'month' ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 grid grid-cols-7 gap-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
            {monthCells.map((cell) => {
              const dayHours = resolveHoursForDate(cell.key);
              const dayBookings = bookings.filter((booking) => booking.date === cell.key && booking.status !== 'cancelled');
              const dayEvents = events.filter((event) => {
                const eventStart = new Date(event.start_datetime);
                const eventEnd = new Date(event.end_datetime);
                const dayStart = new Date(`${cell.key}T00:00:00`);
                const dayEnd = new Date(`${cell.key}T23:59:59`);
                return eventStart <= dayEnd && eventEnd >= dayStart;
              });
              const blockingEvents = dayEvents.filter((event) => event.blocks_bookings);
              const maintenanceCount = dayEvents.filter((event) => event.event_type === 'maintenance').length;
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDateKey;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => handleViewModeChange('day', cell.date)}
                  className={`min-h-[148px] rounded-[28px] border p-3 text-left transition-all ${cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'} ${isSelected ? 'border-blue-400 shadow-[0_12px_32px_-20px_rgba(37,99,235,0.45)]' : 'border-slate-200 hover:border-blue-200 hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-lime-100 text-lime-800' : 'text-slate-900'}`}>
                      {cell.date.getDate()}
                    </span>
                    {!cell.isCurrentMonth && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        Adjacent
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    {dayHours.isClosed && (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                        Closed
                      </span>
                    )}
                    {dayBookings.length > 0 && (
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                        {dayBookings.length} booking{dayBookings.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {blockingEvents.length > 0 && (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                        {blockingEvents.length} blocked
                      </span>
                    )}
                    {maintenanceCount > 0 && (
                      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-rose-700">
                        {maintenanceCount} maintenance
                      </span>
                    )}
                    {!dayHours.isClosed && dayBookings.length === 0 && blockingEvents.length === 0 && (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                        Open availability
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[32px] border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 md:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Day Timeline
                  </p>
                  {canSwitchViews && (
                    <button
                      type="button"
                      onClick={() => handleViewModeChange('month')}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-blue-200 hover:text-blue-700"
                    >
                      <ChevronLeft size={14} />
                      Back to Month
                    </button>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">
                  {context.court.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {formatShortDate(selectedDate)} / single-court operations view
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Operations Window
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {selectedDayHours.isClosed ? 'Closed' : `${formatTimeLabel(selectedDayHours.open)} - ${formatTimeLabel(selectedDayHours.close)}`}
                </p>
              </div>
            </div>

            {selectedDayHours.isClosed ? (
              <div className="p-8">
                <ManagerEmptyState
                  title="Court Closed"
                  description="Regular operating hours are closed for this date. You can still add or edit a court block if you need to document maintenance or a special closure."
                />
              </div>
            ) : (
              <div className="max-h-[78vh] overflow-auto px-4 pb-4 pt-4 md:px-6">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-0">
                    <div />
                    <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Assigned Court
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-900">{context.court.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-0">
                    <div className="relative">
                      {timelineHours.map((hour, index) => (
                        <div key={hour} className="absolute right-4 text-[11px] font-bold uppercase tracking-widest text-slate-400" style={{ top: Math.max(0, index * HOUR_HEIGHT - 8) }}>
                          {formatHourLabel(hour)}
                        </div>
                      ))}
                    </div>

                    <div className="relative rounded-[28px] border border-slate-200 bg-white" style={{ height: `${timelineHeight}px` }}>
                      <div className="absolute left-4 right-4 rounded-[24px] bg-emerald-50/70" style={{ top: `${openTop}px`, height: `${Math.max(0, closeTop - openTop)}px` }} />
                      <div className="pointer-events-none absolute left-8 top-4 z-10 inline-flex rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        Open court window
                      </div>
                      {pastOverlayHeight > 0 && (
                        <div className="absolute left-4 right-4 rounded-[24px] bg-slate-200/70" style={{ top: `${openTop}px`, height: `${pastOverlayHeight}px` }} />
                      )}
                      {timelineHours.slice(0, -1).map((hour, index) => (
                        <div key={hour} className="absolute inset-x-0" style={{ top: `${index * HOUR_HEIGHT}px` }}>
                          <div className="border-t border-slate-100" />
                          <div className="mt-[36px] border-t border-dashed border-slate-100" />
                        </div>
                      ))}

                      {availableSlots.map((slot) => {
                        const slotTop = positionForMinutes(slot.start);
                        const isPastSlot = selectedDateKey < todayKey || (selectedDateKey === todayKey && slot.end <= currentMinutes);
                        return (
                          <button
                            key={`${slot.start}-${slot.end}`}
                            type="button"
                            disabled={isPastSlot}
                            onClick={() =>
                              setBlockModalState({
                                mode: 'create',
                                date: selectedDateKey,
                                startTime: minutesToTime(slot.start),
                                endTime: minutesToTime(slot.end),
                              })
                            }
                            className={`group absolute left-4 right-4 rounded-xl transition-all ${isPastSlot ? 'opacity-0' : 'opacity-0 hover:opacity-100 focus:opacity-100'}`}
                            style={{ top: `${slotTop}px`, height: `${(SLOT_MINUTES / 60) * HOUR_HEIGHT}px` }}
                          >
                            <span className="absolute inset-1 rounded-xl border border-dashed border-blue-300 bg-blue-50/70" />
                            <span className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                              <Plus size={12} />
                              Block
                            </span>
                          </button>
                        );
                      })}

                      {selectedDayEvents.map((event) => {
                        const start = new Date(event.start_datetime);
                        const end = new Date(event.end_datetime);
                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                        const endMinutes = end.getHours() * 60 + end.getMinutes();
                        const top = positionForMinutes(Math.max(startMinutes, timelineStartHour * 60));
                        const height = Math.max(42, positionForMinutes(Math.min(endMinutes, timelineEndHour * 60)) - top - 4);
                        const meta = getEventMeta(event);
                        const rangeState = getTimeRangeState(selectedDateKey, startMinutes, endMinutes);
                        const isActive = selectedItem?.type === 'event' && selectedItem.event.id === event.id;

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedItem({ type: 'event', event })}
                            className={`absolute left-6 right-6 rounded-[22px] border px-4 py-3 text-left shadow-sm transition-all ${meta.block} ${rangeState.isPast ? 'opacity-75' : ''} ${isActive ? 'ring-2 ring-blue-300' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                            style={{ top: `${top}px`, height: `${height}px`, zIndex: 20 }}
                          >
                            <span className={`absolute bottom-3 left-2 top-3 w-1 rounded-full ${meta.accent}`} />
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <meta.Icon size={14} />
                                <p className="truncate text-[11px] font-black uppercase tracking-widest">{meta.label}</p>
                              </div>
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${rangeState.chip}`}>
                                {rangeState.label}
                              </span>
                            </div>
                            <p className="mt-1 truncate pr-16 text-sm font-black">{event.title}</p>
                            <p className="mt-1 text-[11px] font-semibold opacity-80">
                              {formatTimeLabel(minutesToTime(startMinutes))} - {formatTimeLabel(minutesToTime(endMinutes))}
                            </p>
                          </button>
                        );
                      })}

                      {selectedDayBookings.map((booking) => {
                        const startMinutes = toMinutes(booking.start_time);
                        const endMinutes = toMinutes(booking.end_time);
                        const top = positionForMinutes(startMinutes);
                        const height = Math.max(52, positionForMinutes(endMinutes) - top - 4);
                        const status = getBookingStatusMeta(booking);
                        const user = getBookingUser(booking);
                        const rangeState = getTimeRangeState(booking.date, startMinutes, endMinutes);
                        const isActive = selectedItem?.type === 'booking' && selectedItem.booking.id === booking.id;

                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => setSelectedItem({ type: 'booking', booking })}
                            className={`absolute left-6 right-6 rounded-[22px] border px-4 py-3 text-left shadow-sm transition-all ${status.block} ${rangeState.isPast ? 'opacity-80' : ''} ${isActive ? 'ring-2 ring-blue-300' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                            style={{ top: `${top}px`, height: `${height}px`, zIndex: 25 }}
                          >
                            <span className={`absolute bottom-3 left-2 top-3 w-1 rounded-full ${status.accent}`} />
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[11px] font-black uppercase tracking-widest">{status.label}</p>
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${rangeState.chip}`}>
                                {rangeState.label}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-black">{user.name}</p>
                            <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-80">
                              <span>{formatTimeLabel(booking.start_time)} - {formatTimeLabel(booking.end_time)}</span>
                              {user.isGuest && (
                                <span className="inline-flex rounded-full border border-white/70 bg-white/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                                  Guest
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {isSelectedToday &&
                        currentMinutes >= timelineStartHour * 60 &&
                        currentMinutes <= timelineEndHour * 60 && (
                          <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: `${positionForMinutes(currentMinutes)}px` }}>
                            <span className="absolute left-6 top-1/2 -translate-y-[140%] rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                              Now
                            </span>
                            <div className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.45)]" />
                            <div className="ml-6 border-t-2 border-rose-500" />
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:h-fit">
            {selectedItem?.type === 'booking' ? (
              (() => {
                const booking = selectedItem.booking;
                const user = getBookingUser(booking);
                const status = getBookingStatusMeta(booking);
                const actions = getBookingActionState(booking);
                const rangeState = getTimeRangeState(booking.date, toMinutes(booking.start_time), toMinutes(booking.end_time));
                const hasLiveAction = actions.canCheckIn || actions.canCheckOut || actions.canMarkNoShow;

                return (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Booking Selected</p>
                      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{user.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${status.chip}`}>{status.label}</span>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rangeState.chip}`}>{rangeState.label}</span>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booking ID</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{booking.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatTimeLabel(booking.start_time)} - {formatTimeLabel(booking.end_time)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{booking.payment_status || 'unpaid'}</p>
                      </div>
                    </div>

                    {!hasLiveAction && (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manager Status</p>
                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {rangeState.isPast
                            ? 'This booking is already past its playable window.'
                            : 'No immediate court-side action is available yet for this booking.'}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {actions.canCheckIn && (
                        <button type="button" onClick={() => void handleBookingAction(booking, 'check_in')} disabled={actionKey === `${booking.id}:check_in`} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 disabled:opacity-60">
                          {actionKey === `${booking.id}:check_in` ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                          Check In
                        </button>
                      )}
                      {actions.canCheckOut && (
                        <button type="button" onClick={() => void handleBookingAction(booking, 'check_out')} disabled={actionKey === `${booking.id}:check_out`} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-60">
                          {actionKey === `${booking.id}:check_out` ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                          Check Out
                        </button>
                      )}
                      {actions.canMarkNoShow && (
                        <button type="button" onClick={() => void handleBookingAction(booking, 'no_show')} disabled={actionKey === `${booking.id}:no_show`} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-60">
                          {actionKey === `${booking.id}:no_show` ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                          Mark No-Show
                        </button>
                      )}
                      <button type="button" onClick={() => navigate(COURT_MANAGER_ROUTES.bookings)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-blue-200 hover:text-blue-700">
                        <Eye size={16} />
                        View Booking Details
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : selectedItem?.type === 'event' ? (
              (() => {
                const event = selectedItem.event;
                const meta = getEventMeta(event);
                const start = new Date(event.start_datetime);
                const end = new Date(event.end_datetime);
                const rangeState = getTimeRangeState(
                  selectedDateKey,
                  start.getHours() * 60 + start.getMinutes(),
                  end.getHours() * 60 + end.getMinutes()
                );

                return (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Court Block Selected</p>
                      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{event.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${meta.chip}`}>{meta.label}</span>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rangeState.chip}`}>{rangeState.label}</span>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{formatTimeLabel(minutesToTime(start.getHours() * 60 + start.getMinutes()))} - {formatTimeLabel(minutesToTime(end.getHours() * 60 + end.getMinutes()))}</p>
                      </div>
                      {event.description && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{event.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Availability Impact</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{event.blocks_bookings ? 'Bookings blocked during this slot' : 'Informational only'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button type="button" onClick={() => setBlockModalState({ mode: 'edit', event, date: selectedDateKey, startTime: '08:00', endTime: '09:00' })} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700">
                        <CalendarIcon size={16} />
                        Edit Block
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteEvent(event)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-100">
                        <CheckCircle2 size={16} />
                        Reopen Availability
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Operations Panel</p>
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Select a Time Block</h3>
                <p className="text-sm font-medium text-slate-500">
                  Click a booking block to manage check-ins and no-shows, or click an available slot to block time for maintenance and reopened availability.
                </p>
                {nextOperationalBooking && (
                  <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Next On Court</p>
                    <p className="mt-2 text-base font-black text-slate-900">{getBookingUser(nextOperationalBooking).name}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {formatTimeLabel(nextOperationalBooking.start_time)} - {formatTimeLabel(nextOperationalBooking.end_time)}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Bookings Today</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{selectedDayBookings.length}</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Blocked Slots</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{selectedDayBlockingEvents.length}</p>
                  </div>
                  <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Maintenance</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{selectedDayMaintenanceCount}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Closures</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{selectedDayClosureCount}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBlockModalState({
                      mode: 'create',
                      date: selectedDateKey,
                      startTime: selectedDayHours.open,
                      endTime: minutesToTime(Math.min(closeMinutes, openMinutes + 60)),
                    })
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add Court Block
                </button>
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">
                  This timeline stays focused on one assigned court only, so daily court operations stay fast and readable.
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
        </div>
      </div>

      <BlockModal
        state={blockModalState}
        assignedCourtName={context.court.name}
        isSaving={isSavingBlock}
        onClose={() => setBlockModalState(null)}
        onSave={handleSaveBlock}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteEvent)}
        title="Reopen Availability"
        message="This will remove the selected court block and make the time slot available again."
        confirmText="Reopen"
        cancelText="Keep Blocked"
        variant="info"
        onCancel={() => setConfirmDeleteEvent(null)}
        onConfirm={() => void handleDeleteEvent()}
      />
    </div>
  );
};

const CourtManagerSchedulePage: React.FC = () => <CourtManagerScheduleWorkspace />;

export default CourtManagerSchedulePage;
