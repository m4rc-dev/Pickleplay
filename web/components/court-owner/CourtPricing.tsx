import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Clock, PhilippinePeso, Plus, Trash2, X,
  Loader2, CheckCircle2, Calendar, Tag, Sun, Moon, AlertCircle,
  Copy, Pencil, ToggleLeft, ToggleRight, Save, Eye, AlertTriangle,
  CalendarDays, Info, Check, Shield
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import WeeklyPricingSchedule from '../ui/WeeklyPricingSchedule';
import {
  fetchCourtOperationHours,
  saveAllDayHours,
  saveDateOverrideHours,
  deleteCourtHoursEntry,
  type CourtOperationHours as OpHoursEntry,
  DAY_NAMES as OP_DAY_NAMES,
} from '../../services/courtOperationHours';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface PricingRule {
  id: string;
  court_id: string;
  owner_id: string;
  specific_date: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  price_per_hour: number;
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CourtOption {
  id: string;
  name: string;
  base_price: number;
  location_id: string | null;
  location_name?: string;
  setup_complete: boolean;
}

interface CourtPricingProps {
  courtId?: string;
  onClose?: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Default base price if court owner hasn't set one */
const DEFAULT_BASE_PRICE = 300;

/** Get the first 3 Sundays of a month and the range end day (the 3rd Sunday's date).
 *  Returns { sundays: number[], rangeEnd: number } where rangeEnd is the day of the 3rd Sunday. */
function getFirstThreeSundaysInfo(year: number, month: number): { sundays: number[]; rangeEnd: number } {
  const sundays: number[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth && sundays.length < 3; d++) {
    if (new Date(year, month, d).getDay() === 0) sundays.push(d);
  }
  const rangeEnd = sundays.length >= 3 ? sundays[2] : (sundays.length > 0 ? sundays[sundays.length - 1] : 0);
  return { sundays, rangeEnd };
}

// Generate hour options for select
const HOUR_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  const hh = h.toString().padStart(2, '0');
  HOUR_OPTIONS.push(`${hh}:00`);
}
const HOUR_CLOSE_OPTIONS: string[] = [...HOUR_OPTIONS, '24:00'];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  if (h === 24) return `12:${(m || 0).toString().padStart(2, '0')} AM`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `₱${price}`;
}

/** Get the current date/time in Philippine Time (Asia/Manila, UTC+8) */
function getNowPH(): Date {
  const phStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  return new Date(phStr);
}

/** Convert a Date to a YYYY-MM-DD string in Philippine Time (avoids UTC shift from toISOString) */
function toPhDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Format a Date for display using Philippine timezone */
function formatDatePH(d: Date, options: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString('en-US', { ...options, timeZone: 'Asia/Manila' });
}

// ────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────
const CourtPricing: React.FC<CourtPricingProps> = ({ courtId: initialCourtId, onClose }) => {
  const [searchParams] = useSearchParams();
  const urlCourtId = initialCourtId || searchParams.get('court') || '';
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [courts, setCourts] = useState<CourtOption[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(urlCourtId);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(getNowPH());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'date' | 'weekly'>('weekly');

  // Form state for adding/editing a rule
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formPrice, setFormPrice] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number | null>(null);
  const [formSpecificDate, setFormSpecificDate] = useState<string | null>(null);

  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<any>(null);

  // Preview toggle
  const [showPreview, setShowPreview] = useState(false);

  // View rule detail
  const [viewingRule, setViewingRule] = useState<PricingRule | null>(null);

  // Dropdown open state
  const [courtDropdownOpen, setCourtDropdownOpen] = useState(false);

  // Base price editing state
  const [editingBasePrice, setEditingBasePrice] = useState(false);
  const [basePriceInput, setBasePriceInput] = useState('');

  // ─── Operation Hours state ───
  const [showOperationHours, setShowOperationHours] = useState(false);
  const [operationHours, setOperationHours] = useState<OpHoursEntry[]>([]);
  const [opHoursSchedule, setOpHoursSchedule] = useState<Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>>(
    Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, openTime: '08:00', closeTime: '18:00', isClosed: false }))
  );
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [opHoursLoaded, setOpHoursLoaded] = useState(false);

  // ─── Date-specific operation hours override state ───
  const [showDateOverrideForm, setShowDateOverrideForm] = useState(false);
  const [dateOverrideDate, setDateOverrideDate] = useState('');
  const [dateOverrideOpen, setDateOverrideOpen] = useState('08:00');
  const [dateOverrideClose, setDateOverrideClose] = useState('18:00');
  const [dateOverrideClosed, setDateOverrideClosed] = useState(false);
  const [isSavingDateOverride, setIsSavingDateOverride] = useState(false);
  const [opHoursMonth, setOpHoursMonth] = useState(getNowPH()); // month calendar for date overrides

  // Setup review + celebration
  const [showSetupReview, setShowSetupReview] = useState(false);
  const [showReadyCelebration, setShowReadyCelebration] = useState(false);
  const [isConfirmingSetup, setIsConfirmingSetup] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({ message: '', type: 'info', visible: false });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  // ──────── Init ────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        await fetchCourts(u.id);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedCourtId && user) {
      fetchRules(selectedCourtId);
      loadOperationHours(selectedCourtId);
    }
  }, [selectedCourtId, user]);

  const loadOperationHours = async (courtId: string) => {
    setOpHoursLoaded(false);
    const hours = await fetchCourtOperationHours(courtId);
    setOperationHours(hours);

    // Populate the schedule form from existing data
    const schedule = Array.from({ length: 7 }, (_, i) => {
      const existing = hours.find(h => h.day_of_week === i && h.specific_date === null);
      if (existing) {
        return {
          dayOfWeek: i,
          openTime: existing.open_time.slice(0, 5),
          closeTime: existing.close_time.slice(0, 5),
          isClosed: existing.is_closed,
        };
      }
      return { dayOfWeek: i, openTime: '08:00', closeTime: '18:00', isClosed: false };
    });
    setOpHoursSchedule(schedule);
    setOpHoursLoaded(true);
  };

  const handleSaveOperationHours = async () => {
    if (!user || !selectedCourtId) return;
    const invalidDay = opHoursSchedule.find((d) => !d.isClosed && d.openTime >= d.closeTime);
    if (invalidDay) {
      showToast(`Invalid hours for ${DAY_SHORT[invalidDay.dayOfWeek]}: close time must be after open time.`, 'error');
      return;
    }
    setIsSavingHours(true);
    const result = await saveAllDayHours(selectedCourtId, user.id, opHoursSchedule);
    if (result.success) {
      showToast('Operation hours saved successfully!', 'success');
      await loadOperationHours(selectedCourtId);

      // Auto-mark setup_complete if both hours saved and base_price > 0
      if (selectedCourt && selectedCourt.base_price > 0 && !selectedCourt.setup_complete) {
        await markCourtSetupComplete(selectedCourtId);
      }
    } else {
      showToast(`Failed to save: ${result.error}`, 'error');
    }
    setIsSavingHours(false);
  };

  const updateDaySchedule = (dayOfWeek: number, field: 'openTime' | 'closeTime' | 'isClosed', value: string | boolean) => {
    setOpHoursSchedule(prev => prev.map(d =>
      d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d
    ));
  };

  const applyToAllDays = (sourceDow: number) => {
    const source = opHoursSchedule.find(d => d.dayOfWeek === sourceDow);
    if (!source) return;
    setOpHoursSchedule(prev => prev.map(d => ({
      ...d,
      openTime: source.openTime,
      closeTime: source.closeTime,
      isClosed: source.isClosed,
    })));
  };

  const applyToWeekdays = (sourceDow: number) => {
    const source = opHoursSchedule.find(d => d.dayOfWeek === sourceDow);
    if (!source) return;
    setOpHoursSchedule(prev => prev.map(d =>
      (d.dayOfWeek >= 1 && d.dayOfWeek <= 5)
        ? { ...d, openTime: source.openTime, closeTime: source.closeTime, isClosed: source.isClosed }
        : d
    ));
  };

  const applyToWeekends = (sourceDow: number) => {
    const source = opHoursSchedule.find(d => d.dayOfWeek === sourceDow);
    if (!source) return;
    setOpHoursSchedule(prev => prev.map(d =>
      (d.dayOfWeek === 0 || d.dayOfWeek === 6)
        ? { ...d, openTime: source.openTime, closeTime: source.closeTime, isClosed: source.isClosed }
        : d
    ));
  };

  // ─── Date-specific override handlers ───
  const dateOverrides = operationHours.filter(h => h.specific_date !== null && h.day_of_week === null);

  const handleSaveDateOverride = async () => {
    if (!user || !selectedCourtId || !dateOverrideDate) return;
    if (!dateOverrideClosed && dateOverrideOpen >= dateOverrideClose) {
      showToast('End time must be after start time for date override.', 'error');
      return;
    }
    setIsSavingDateOverride(true);
    const result = await saveDateOverrideHours(
      selectedCourtId,
      user.id,
      dateOverrideDate,
      dateOverrideOpen,
      dateOverrideClose,
      dateOverrideClosed
    );
    if (result.success) {
      showToast(`Date override for ${dateOverrideDate} saved!`, 'success');
      await loadOperationHours(selectedCourtId);
      setShowDateOverrideForm(false);
      setDateOverrideDate('');
      setDateOverrideClosed(false);
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
    setIsSavingDateOverride(false);
  };

  const handleDeleteDateOverride = async (entryId: string) => {
    const result = await deleteCourtHoursEntry(entryId);
    if (result.success) {
      showToast('Date override removed', 'success');
      await loadOperationHours(selectedCourtId);
    } else {
      showToast(`Failed: ${result.error}`, 'error');
    }
  };

  // How many days have custom court hours set
  const daysWithCustomHours = operationHours.filter(h => h.day_of_week !== null && h.specific_date === null).length;

  const fetchCourts = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('courts')
      .select('id, name, base_price, location_id, setup_complete, locations(name)')
      .eq('owner_id', ownerId)
      .order('name');
    if (!error && data) {
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        base_price: c.base_price || DEFAULT_BASE_PRICE,
        location_id: c.location_id,
        location_name: c.locations?.name || '',
        setup_complete: c.setup_complete ?? true,
      }));
      setCourts(mapped);
      if (!selectedCourtId && mapped.length > 0) {
        setSelectedCourtId(initialCourtId || mapped[0].id);
      }
    }
  };

  const fetchRules = async (courtId: string) => {
    const { data, error } = await supabase
      .from('court_pricing_rules')
      .select('*')
      .eq('court_id', courtId)
      .order('start_time', { ascending: true });
    if (!error && data) setRules(data);
  };

  const selectedCourt = courts.find(c => c.id === selectedCourtId);

  /** Update the base price for a court */
  const updateBasePrice = async (courtId: string, price: number) => {
    if (isNaN(price) || price < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    const { error } = await supabase
      .from('courts')
      .update({ base_price: price })
      .eq('id', courtId);
    if (!error) {
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, base_price: price } : c));
      setEditingBasePrice(false);
      showToast(`Base price updated to ₱${price}/hr`, 'success');

      // Auto-mark setup_complete if both price > 0 and operation hours are set
      const court = courts.find(c => c.id === courtId);
      if (price > 0 && daysWithCustomHours > 0 && court && !court.setup_complete) {
        await markCourtSetupComplete(courtId);
      }
    } else {
      showToast('Failed to update base price', 'error');
    }
  };

  /** Mark a court as setup_complete in the database and update local state */
  const markCourtSetupComplete = async (courtId: string) => {
    const { error } = await supabase
      .from('courts')
      .update({ setup_complete: true })
      .eq('id', courtId);
    if (!error) {
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, setup_complete: true } : c));
      showToast('🎉 Court setup complete! This court is now visible to players on the booking page.', 'success');
    }
  };

  /** Manual override: let owner mark court as ready even with base_price = 0 (free court) */
  const handleManualSetupComplete = () => {
    if (!selectedCourtId || !selectedCourt) return;
    if (daysWithCustomHours === 0) {
      showToast('Please set operation hours first before marking as ready.', 'error');
      return;
    }
    setShowSetupReview(true);
  };

  const confirmSetupReady = async () => {
    if (!selectedCourtId || !selectedCourt) return;
    setIsConfirmingSetup(true);
    try {
      await markCourtSetupComplete(selectedCourtId);
      setShowSetupReview(false);
      setShowReadyCelebration(true);
    } finally {
      setIsConfirmingSetup(false);
    }
  };

  // ──────── Calendar Helpers ────────
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));

  const isToday = (day: number) => {
    const now = getNowPH();
    return day === now.getDate() && calendarMonth === now.getMonth() && calendarYear === now.getFullYear();
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && calendarMonth === selectedDate.getMonth() && calendarYear === selectedDate.getFullYear();
  };

  const dateHasRules = (day: number) => {
    const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dow = new Date(calendarYear, calendarMonth, day).getDay();
    return rules.some(r =>
      (r.specific_date === dateStr) ||
      (r.day_of_week === dow && r.specific_date === null)
    );
  };

  const dateHasSpecificRules = (day: number) => {
    const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return rules.some(r => r.specific_date === dateStr);
  };

  const readableWeeklyHours = () => {
    const openDays = opHoursSchedule.filter(d => !d.isClosed).length;
    const firstOpen = opHoursSchedule.find(d => !d.isClosed);
    return {
      openDays,
      sampleLabel: firstOpen ? `${DAY_SHORT[firstOpen.dayOfWeek]} ${formatTime12(firstOpen.openTime)} – ${formatTime12(firstOpen.closeTime)}` : 'No open days yet'
    };
  };

  const { sundays: first3Sundays, rangeEnd: thirdSundayDay } = getFirstThreeSundaysInfo(calendarYear, calendarMonth);

  /** Is this day within the first-3-Sundays range (day 1 through the 3rd Sunday)? */
  const isInFirst3SundaysRange = (day: number) => {
    return thirdSundayDay > 0 && day >= 1 && day <= thirdSundayDay;
  };

  /** Is this day one of the actual first 3 Sundays? */
  const isFirst3Sunday = (day: number) => first3Sundays.includes(day);

  const isCurrentOrFutureMonth = calendarYear > getNowPH().getFullYear() ||
    (calendarYear === getNowPH().getFullYear() && calendarMonth >= getNowPH().getMonth());

  /** Check if a calendar day is in the past and NOT in the current Sun–Sat week */
  const isDayDisabled = (day: number) => {
    const now = getNowPH();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cellDate = new Date(calendarYear, calendarMonth, day);
    if (cellDate >= todayDate) return false; // today or future → enabled
    // Find current week's Sunday (start of week)
    const currentDow = todayDate.getDay(); // 0=Sun
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - currentDow); // go back to Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    // If the cell date is within the current Sun–Sat week, still editable
    return cellDate < weekStart || cellDate > weekEnd;
  };

  const handleDayClick = (day: number) => {
    if (isDayDisabled(day)) return; // past day outside current week
    const date = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(date);
    setViewMode('date');
  };

  // ──────── Get rules for current view ────────
  const getDisplayRules = useCallback(() => {
    if (viewMode === 'date' && selectedDate) {
      const dateStr = toPhDateStr(selectedDate);
      const dow = selectedDate.getDay();
      // Specific date rules take priority, then recurring
      const specificRules = rules.filter(r => r.specific_date === dateStr);
      const recurringRules = rules.filter(r => r.day_of_week === dow && r.specific_date === null);
      return specificRules.length > 0 ? specificRules : recurringRules;
    }
    // Weekly view: show recurring rules
    return rules.filter(r => r.day_of_week !== null && r.specific_date === null);
  }, [rules, selectedDate, viewMode]);

  const displayRules = getDisplayRules();

  // ──── Get operation-hours-aware hour options for the pricing form ────
  // Returns only hours within the court's operation schedule for the given day/date
  const getFormHourOptions = useCallback((): { options: string[]; openTime: string; closeTime: string } => {
    let dayOfWeek: number | null = null;

    if (formSpecificDate) {
      // Specific date → find its day-of-week
      dayOfWeek = new Date(formSpecificDate + 'T00:00:00').getDay();
    } else if (formDayOfWeek !== null) {
      dayOfWeek = formDayOfWeek;
    }

    if (dayOfWeek !== null) {
      const dayHours = opHoursSchedule.find(d => d.dayOfWeek === dayOfWeek);
      if (dayHours && !dayHours.isClosed) {
        const openH = parseInt(dayHours.openTime.split(':')[0], 10);
        const closeH = parseInt(dayHours.closeTime.split(':')[0], 10);
        if (closeH > openH) {
          const filtered = HOUR_CLOSE_OPTIONS.filter((_, idx) => idx >= openH && idx <= closeH);
          return { options: filtered, openTime: dayHours.openTime, closeTime: dayHours.closeTime };
        }
      }
      // If day is closed, return empty (shouldn't normally add pricing for closed days)
      if (dayHours?.isClosed) {
        return { options: [], openTime: '00:00', closeTime: '00:00' };
      }
    }

    // Fallback: use default 08:00–18:00 if no custom hours set
    return {
      options: HOUR_CLOSE_OPTIONS.filter((_, idx) => idx >= 8 && idx <= 18),
      openTime: '08:00',
      closeTime: '18:00',
    };
  }, [formSpecificDate, formDayOfWeek, opHoursSchedule]);

  const formHourInfo = getFormHourOptions();
  const formHourOptions = formHourInfo.options;

  // Group weekly rules by day
  const weeklyRulesByDay = DAY_NAMES.map((name, idx) => ({
    dayName: name,
    dayShort: DAY_SHORT[idx],
    dayIndex: idx,
    rules: rules.filter(r => r.day_of_week === idx && r.specific_date === null),
  }));

  // ──────── Open form ────────
  const openAddForm = (dayOfWeek?: number) => {
    setEditingRule(null);
    setFormPrice('');
    setFormLabel('');

    // Determine the day so we can look up operation hours
    let targetDow: number | null = null;
    if (viewMode === 'date' && selectedDate) {
      setFormSpecificDate(toPhDateStr(selectedDate));
      setFormDayOfWeek(null);
      targetDow = selectedDate.getDay();
    } else if (dayOfWeek !== undefined) {
      setFormDayOfWeek(dayOfWeek);
      setFormSpecificDate(null);
      targetDow = dayOfWeek;
    } else {
      setFormDayOfWeek(null);
      setFormSpecificDate(null);
    }

    // Default start/end to the court's operation hours for that day
    const dayHours = targetDow !== null ? opHoursSchedule.find(d => d.dayOfWeek === targetDow) : null;
    if (dayHours && !dayHours.isClosed) {
      setFormStartTime(dayHours.openTime);
      // Default end time to midpoint or +4h, whichever is smaller
      const openH = parseInt(dayHours.openTime.split(':')[0], 10);
      const closeH = parseInt(dayHours.closeTime.split(':')[0], 10);
      const midH = Math.min(openH + 4, closeH);
      setFormEndTime(midH.toString().padStart(2, '0') + ':00');
    } else {
      setFormStartTime('08:00');
      setFormEndTime('12:00');
    }

    setShowForm(true);
  };

  const openEditForm = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormStartTime(rule.start_time.slice(0, 5));
    setFormEndTime(rule.end_time.slice(0, 5));
    setFormPrice(rule.price_per_hour.toString());
    setFormLabel(rule.label || '');
    setFormDayOfWeek(rule.day_of_week);
    setFormSpecificDate(rule.specific_date);
    setShowForm(true);
  };

  // ──────── Prepare save (with confirmation) ────────
  const prepareSave = () => {
    if (!user || !selectedCourtId) return;
    if (!formPrice || parseFloat(formPrice) < 0) { showToast('Please enter a valid price.', 'error'); return; }
    if (formStartTime >= formEndTime) { showToast('End time must be after start time.', 'error'); return; }
    if (formDayOfWeek === null && !formSpecificDate) { showToast('Please select a day or date.', 'error'); return; }

    const payload = {
      court_id: selectedCourtId,
      owner_id: user.id,
      specific_date: formSpecificDate || null,
      day_of_week: formSpecificDate ? null : formDayOfWeek,
      start_time: formStartTime + ':00',
      end_time: formEndTime + ':00',
      price_per_hour: parseFloat(formPrice),
      label: formLabel.trim() || null,
      is_active: true,
      updated_at: getNowPH().toISOString(),
    };

    setPendingSavePayload(payload);
    setShowConfirmation(true);
  };

  // ──────── Confirm & Save rule ────────
  const confirmSave = async () => {
    if (!pendingSavePayload) return;
    setIsSaving(true);
    try {
      if (editingRule) {
        const { error } = await supabase
          .from('court_pricing_rules')
          .update(pendingSavePayload)
          .eq('id', editingRule.id);
        if (error) throw error;
        showToast('Pricing rule updated successfully!', 'success');
      } else {
        const { error } = await supabase
          .from('court_pricing_rules')
          .insert(pendingSavePayload);
        if (error) throw error;
        showToast('Pricing rule added successfully!', 'success');
      }

      setShowConfirmation(false);
      setShowForm(false);
      setPendingSavePayload(null);
      await fetchRules(selectedCourtId);
    } catch (err: any) {
      showToast(`Failed to save: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ──────── Delete rule ────────
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this pricing rule? This action cannot be undone.')) return;
    const { error } = await supabase.from('court_pricing_rules').delete().eq('id', ruleId);
    if (!error) {
      await fetchRules(selectedCourtId);
      showToast('Pricing rule deleted.', 'info');
    } else {
      showToast(`Delete failed: ${error.message}`, 'error');
    }
  };

  // ──────── Toggle rule active/inactive ────────
  const toggleRuleActive = async (rule: PricingRule) => {
    const { error } = await supabase
      .from('court_pricing_rules')
      .update({ is_active: !rule.is_active, updated_at: getNowPH().toISOString() })
      .eq('id', rule.id);
    if (!error) {
      await fetchRules(selectedCourtId);
      showToast(`Rule ${rule.is_active ? 'deactivated' : 'activated'}.`, 'info');
    }
  };

  // ──────── Copy day rules to other days ────────
  const copyDayRulesToDays = async (sourceDow: number, targetDows: number[]) => {
    if (!user || !selectedCourtId) return;
    const sourceRules = rules.filter(r => r.day_of_week === sourceDow && r.specific_date === null);
    if (sourceRules.length === 0) { showToast('No rules to copy.', 'error'); return; }

    setIsSaving(true);
    try {
      for (const dow of targetDows) {
        // Delete existing rules for target day
        await supabase.from('court_pricing_rules')
          .delete()
          .eq('court_id', selectedCourtId)
          .eq('day_of_week', dow)
          .is('specific_date', null);

        // Insert copies
        const inserts = sourceRules.map(r => ({
          court_id: selectedCourtId,
          owner_id: user.id,
          day_of_week: dow,
          specific_date: null,
          start_time: r.start_time,
          end_time: r.end_time,
          price_per_hour: r.price_per_hour,
          label: r.label,
          is_active: true,
        }));
        const { error } = await supabase.from('court_pricing_rules').insert(inserts);
        if (error) throw error;
      }
      await fetchRules(selectedCourtId);
    } catch (err: any) {
      alert(`Copy failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ──────── Copy modal ────────
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<number>(0);
  const [copyTargetDays, setCopyTargetDays] = useState<Set<number>>(new Set());

  const openCopyModal = (sourceDow: number) => {
    setCopySourceDay(sourceDow);
    setCopyTargetDays(new Set());
    setShowCopyModal(true);
  };

  const toggleCopyDay = (dow: number) => {
    setCopyTargetDays(prev => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow); else next.add(dow);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  // Total rules count
  const totalRulesCount = rules.filter(r => r.specific_date === null).length;
  const daysWithRules = new Set(rules.filter(r => r.day_of_week !== null && r.specific_date === null).map(r => r.day_of_week)).size;

  // ──────── RENDER ────────
  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      {/* Toast Notification */}
      {toast.visible && ReactDOM.createPortal(
        <div className="fixed top-6 right-6 z-[99999] animate-in slide-in-from-right-5 duration-300 max-w-sm">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-500 shrink-0" />}
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Court Pricing</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Set custom hourly rates for different times &amp; days</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* ──── CLEAN COURT DROPDOWN ──── */}
          <div className="relative">
            <button
              onClick={() => setCourtDropdownOpen(!courtDropdownOpen)}
              className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-300 transition-all min-w-[280px] shadow-sm"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <PhilippinePeso size={14} className="text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                {selectedCourt ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black text-slate-900 truncate">{selectedCourt.name}</p>
                      {!selectedCourt.setup_complete && (
                        <span className="text-[8px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200 uppercase tracking-wider shrink-0 animate-pulse">NEW</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold truncate">
                      {selectedCourt.location_name || 'No Location'} • ₱{selectedCourt.base_price}/hr • {
                        (() => {
                          const courtRuleCount = rules.length;
                          if (courtRuleCount === 0 && selectedCourt.base_price <= 0) return 'Pricing Not Set';
                          if (courtRuleCount === 0) return 'Base Price Only';
                          return `${courtRuleCount} Rules`;
                        })()
                      }
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 font-bold">Select a court...</p>
                )}
              </div>
              <ChevronRight size={16} className={`text-slate-300 transition-transform ${courtDropdownOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {courtDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCourtDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[320px] overflow-y-auto">
                  {courts.map(court => {
                    const isActive = court.id === selectedCourtId;
                    return (
                      <button
                        key={court.id}
                        onClick={() => { setSelectedCourtId(court.id); setCourtDropdownOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          isActive ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-600' : 'bg-slate-100'}`}>
                          <PhilippinePeso size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-black truncate ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>{court.name}</p>
                            {!court.setup_complete && (
                              <span className="text-[7px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200 uppercase tracking-wider shrink-0">NEW</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold truncate">{court.location_name || 'No Location'} • ₱{court.base_price}/hr</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider border shrink-0 ${
                          !court.setup_complete ? 'text-orange-600 bg-orange-50 border-orange-200' :
                          court.base_price <= 0 ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-emerald-500 bg-emerald-50 border-emerald-100'
                        }`}>
                          {!court.setup_complete ? 'Setup Needed' : court.base_price <= 0 ? 'Not Set' : 'Ready'}
                        </span>
                        {isActive && <Check size={14} className="text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => { setViewMode('weekly'); setSelectedDate(null); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('date')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'date' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              By Date
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SETUP YOUR NEW ADDED COURT BANNER ═══ */}
      {selectedCourt && !selectedCourt.setup_complete && (
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 rounded-[28px] p-6 shadow-lg shadow-orange-100/50 animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0 border border-orange-200">
              <AlertTriangle size={28} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-orange-900 tracking-tight flex items-center gap-2">
                🆕 Setup Your New Added Court
                <span className="text-[9px] font-black text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full uppercase tracking-widest border border-orange-200 animate-pulse">Action Required</span>
              </h2>
              <p className="text-sm text-orange-700/80 font-medium mt-1 leading-relaxed">
                Complete the setup below so this court will be visible to players on the booking page. Set both the <strong>Default Base Price</strong> and <strong>Operation Hours</strong> to activate.
              </p>

              {/* Setup checklist */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                {/* Step 1: Base Price */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 flex-1 transition-all ${
                  selectedCourt.base_price > 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-orange-200'
                }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedCourt.base_price > 0 ? 'bg-emerald-500' : 'bg-orange-100'
                  }`}>
                    {selectedCourt.base_price > 0
                      ? <CheckCircle2 size={16} className="text-white" />
                      : <span className="text-xs font-black text-orange-500">1</span>
                    }
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-wider ${selectedCourt.base_price > 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                      Default Base Price
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {selectedCourt.base_price > 0 ? `✅ Set to ₱${selectedCourt.base_price}/hr` : '⬜ Click "Edit Price" below to set'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Operation Hours */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 flex-1 transition-all ${
                  daysWithCustomHours > 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-orange-200'
                }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    daysWithCustomHours > 0 ? 'bg-emerald-500' : 'bg-orange-100'
                  }`}>
                    {daysWithCustomHours > 0
                      ? <CheckCircle2 size={16} className="text-white" />
                      : <span className="text-xs font-black text-orange-500">2</span>
                    }
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-wider ${daysWithCustomHours > 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                      Operation Hours
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {daysWithCustomHours > 0 ? `✅ ${daysWithCustomHours}/7 days configured` : '⬜ Expand "Operation Hours" below to set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual "Mark as Ready" button for free courts or when both steps done */}
              {selectedCourt.base_price > 0 && daysWithCustomHours > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleManualSetupComplete}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Review & Activate Court
                  </button>
                </div>
              )}
              {selectedCourt.base_price <= 0 && daysWithCustomHours > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <p className="text-xs text-orange-600 font-bold">
                    <Info size={12} className="inline mr-1 -mt-0.5" />
                    If this is a <strong>free court</strong>, you can still activate it:
                  </p>
                  <button
                    onClick={handleManualSetupComplete}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} /> Review & Activate as Free Court
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Base Price Info + Editable */}
      {selectedCourt && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PhilippinePeso size={18} className="text-blue-600" />
            {editingBasePrice ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-900 text-sm">{selectedCourt.name}</span>
                <span className="text-blue-600 font-medium text-sm">— Base price:</span>
                <div className="flex items-center gap-1 bg-white rounded-xl border border-blue-200 px-3 py-1.5">
                  <span className="text-blue-700 font-bold text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={basePriceInput}
                    onChange={(e) => setBasePriceInput(e.target.value)}
                    className="w-24 text-sm font-black text-blue-700 bg-transparent outline-none"
                    placeholder="e.g. 450"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateBasePrice(selectedCourt.id, parseFloat(basePriceInput));
                      if (e.key === 'Escape') setEditingBasePrice(false);
                    }}
                  />
                  <span className="text-blue-500 text-sm font-medium">/hr</span>
                </div>
                <button
                  onClick={() => updateBasePrice(selectedCourt.id, parseFloat(basePriceInput))}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingBasePrice(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-300 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="text-sm flex items-center gap-2">
                <span className="font-bold text-blue-900">{selectedCourt.name}</span>
                <span className="text-blue-600 font-medium"> — Default base price: </span>
                <span className="font-black text-blue-700">₱{selectedCourt.base_price}/hr</span>
                <span className="text-blue-500 text-xs font-medium">(Used when no custom pricing rule matches a time slot)</span>
              </div>
            )}
          </div>
          {!editingBasePrice && (
            <button
              onClick={() => { setBasePriceInput(selectedCourt.base_price.toString()); setEditingBasePrice(true); }}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 whitespace-nowrap flex items-center gap-1.5"
            >
              <Pencil size={12} /> Edit Price
            </button>
          )}
        </div>
      )}

      {/* ═══ OPERATION HOURS SECTION — 2 COLUMN LAYOUT ═══ */}
      {selectedCourt && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          {/* Header — always visible, click to expand */}
          <button
            onClick={() => setShowOperationHours(!showOperationHours)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Operation Hours</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {daysWithCustomHours > 0
                    ? `Custom hours set for ${daysWithCustomHours}/7 days${dateOverrides.length > 0 ? ` • ${dateOverrides.length} date override${dateOverrides.length > 1 ? 's' : ''}` : ''}`
                    : 'Using default hours (08:00 – 18:00) — click to customize'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {daysWithCustomHours > 0 && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                  {daysWithCustomHours}/7 Days
                </span>
              )}
              {dateOverrides.length > 0 && (
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-100">
                  {dateOverrides.length} Override{dateOverrides.length > 1 ? 's' : ''}
                </span>
              )}
              <ChevronRight size={16} className={`text-slate-300 transition-transform duration-300 ${showOperationHours ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {/* Expanded — 2-Column Layout */}
          {showOperationHours && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ══════ LEFT COLUMN: Weekly Schedule ══════ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-indigo-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Weekly Schedule</h4>
                    </div>
                    <button
                      onClick={() => applyToAllDays(opHoursSchedule[1]?.dayOfWeek ?? 1)}
                      className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                      title="Apply Monday's hours to all days"
                    >
                      Mon → All
                    </button>
                  </div>

                  {/* Day-by-day schedule */}
                  <div className="space-y-1.5">
                    {opHoursSchedule.map((day) => {
                      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                      const existingEntry = operationHours.find(h => h.day_of_week === day.dayOfWeek && h.specific_date === null);
                      return (
                        <div
                          key={day.dayOfWeek}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                            day.isClosed
                              ? 'bg-rose-50/50 border-rose-100'
                              : existingEntry
                                ? 'bg-emerald-50/30 border-emerald-100'
                                : 'bg-slate-50/50 border-slate-100'
                          }`}
                        >
                          {/* Day label */}
                          <div className="w-16 shrink-0">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              day.isClosed ? 'text-rose-400' : isWeekend ? 'text-amber-700' : 'text-slate-700'
                            }`}>
                              {DAY_SHORT[day.dayOfWeek]}
                            </span>
                          </div>

                          {/* Closed toggle */}
                          <button
                            onClick={() => updateDaySchedule(day.dayOfWeek, 'isClosed', !day.isClosed)}
                            className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all shrink-0 ${
                              day.isClosed
                                ? 'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            }`}
                          >
                            {day.isClosed ? 'Closed' : 'Open'}
                          </button>

                          {!day.isClosed && (
                            <button
                              onClick={() => {
                                updateDaySchedule(day.dayOfWeek, 'isClosed', false);
                                updateDaySchedule(day.dayOfWeek, 'openTime', '00:00');
                                updateDaySchedule(day.dayOfWeek, 'closeTime', '24:00');
                              }}
                              className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all shrink-0 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                              title="Set to open 24 hours"
                            >
                              24 Hrs
                            </button>
                          )}

                          {/* Time selects */}
                          {!day.isClosed ? (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <select
                                value={day.openTime}
                                onChange={(e) => {
                                  const nextOpen = e.target.value;
                                  updateDaySchedule(day.dayOfWeek, 'openTime', nextOpen);
                                  if (day.closeTime <= nextOpen) {
                                    const nextClose = HOUR_CLOSE_OPTIONS.find((h) => h > nextOpen) || '24:00';
                                    updateDaySchedule(day.dayOfWeek, 'closeTime', nextClose);
                                  }
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-blue-200 outline-none"
                              >
                                {HOUR_OPTIONS.map(h => (
                                  <option key={h} value={h}>{formatTime12(h)}</option>
                                ))}
                              </select>
                              <span className="text-slate-300 font-bold text-[10px]">–</span>
                              <select
                                value={day.closeTime}
                                onChange={(e) => updateDaySchedule(day.dayOfWeek, 'closeTime', e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-blue-200 outline-none"
                              >
                                {HOUR_CLOSE_OPTIONS.filter((h) => h > day.openTime).map(h => (
                                  <option key={h} value={h}>{formatTime12(h)}</option>
                                ))}
                              </select>

                              {/* Quick copy */}
                              <button
                                onClick={() => isWeekend ? applyToWeekends(day.dayOfWeek) : applyToWeekdays(day.dayOfWeek)}
                                className="ml-auto px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0"
                                title={isWeekend ? 'Apply to weekends' : 'Apply to weekdays'}
                              >
                                → {isWeekend ? 'Wknd' : 'Wkday'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <span className="text-[10px] font-medium text-rose-400 italic">Closed</span>
                            </div>
                          )}

                          {existingEntry && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Saved" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Save weekly hours button */}
                  <button
                    onClick={handleSaveOperationHours}
                    disabled={isSavingHours}
                    className="w-full mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingHours ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Weekly Hours
                  </button>
                </div>

                {/* ══════ RIGHT COLUMN: Monthly Calendar + Date Overrides ══════ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-amber-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Date-Specific Hours</h4>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">Holidays, Events, etc.</span>
                  </div>

                  {/* ─── Mini Month Calendar ─── */}
                  {(() => {
                    const ohYear = opHoursMonth.getFullYear();
                    const ohMonth = opHoursMonth.getMonth();
                    const ohDaysInMonth = new Date(ohYear, ohMonth + 1, 0).getDate();
                    const ohFirstDow = new Date(ohYear, ohMonth, 1).getDay();
                    const ohMonthLabel = opHoursMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    const ohNow = getNowPH();

                    // Map of date string → override entry
                    const overrideMap = new Map<string, OpHoursEntry>();
                    dateOverrides.forEach(ov => { if (ov.specific_date) overrideMap.set(ov.specific_date, ov); });

                    return (
                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-2">
                          <button onClick={() => setOpHoursMonth(new Date(ohYear, ohMonth - 1, 1))} className="p-1 hover:bg-slate-200 rounded-lg transition-all">
                            <ChevronLeft size={14} className="text-slate-400" />
                          </button>
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{ohMonthLabel}</span>
                          <button onClick={() => setOpHoursMonth(new Date(ohYear, ohMonth + 1, 1))} className="p-1 hover:bg-slate-200 rounded-lg transition-all">
                            <ChevronRight size={14} className="text-slate-400" />
                          </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-0.5 mb-1">
                          {DAY_SHORT.map(d => (
                            <div key={d} className="text-center text-[8px] font-black text-slate-400 uppercase">{d}</div>
                          ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: ohFirstDow }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-8" />
                          ))}
                          {Array.from({ length: ohDaysInMonth }, (_, i) => i + 1).map(day => {
                            const ds = `${ohYear}-${(ohMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const ov = overrideMap.get(ds);
                            const dayDate = new Date(ohYear, ohMonth, day);
                            const isPast = dayDate < new Date(ohNow.getFullYear(), ohNow.getMonth(), ohNow.getDate());
                            const isTodays = day === ohNow.getDate() && ohMonth === ohNow.getMonth() && ohYear === ohNow.getFullYear();
                            const isSelected = dateOverrideDate === ds;

                            return (
                              <button
                                key={day}
                                disabled={isPast}
                                onClick={() => {
                                  setDateOverrideDate(ds);
                                  if (ov) {
                                    setDateOverrideOpen(ov.open_time.slice(0, 5));
                                    setDateOverrideClose(ov.close_time.slice(0, 5));
                                    setDateOverrideClosed(ov.is_closed);
                                  } else {
                                    // Default from weekly schedule for that day
                                    const dow = dayDate.getDay();
                                    const weeklyDay = opHoursSchedule.find(d => d.dayOfWeek === dow);
                                    setDateOverrideOpen(weeklyDay?.openTime || '08:00');
                                    setDateOverrideClose(weeklyDay?.closeTime || '18:00');
                                    setDateOverrideClosed(weeklyDay?.isClosed || false);
                                  }
                                  setShowDateOverrideForm(true);
                                }}
                                className={`h-8 rounded-lg text-[10px] font-bold transition-all relative ${
                                  isPast
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-amber-500 text-white shadow-md'
                                      : ov
                                        ? ov.is_closed
                                          ? 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200'
                                          : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                                        : isTodays
                                          ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                                          : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {day}
                                {ov && (
                                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${ov.is_closed ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 mt-2 justify-center">
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[7px] font-bold text-slate-400 uppercase">Custom Hours</span></div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[7px] font-bold text-slate-400 uppercase">Closed</span></div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[7px] font-bold text-slate-400 uppercase">Today</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ─── Date Override Form (shown when a date is clicked) ─── */}
                  {showDateOverrideForm && dateOverrideDate && (
                    <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-amber-800">
                          {formatDatePH(new Date(dateOverrideDate + 'T00:00:00'), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <button onClick={() => setShowDateOverrideForm(false)} className="p-1 hover:bg-amber-100 rounded-lg transition-all">
                          <X size={14} className="text-amber-400" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDateOverrideClosed(!dateOverrideClosed)}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all shrink-0 ${
                            dateOverrideClosed
                              ? 'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                          }`}
                        >
                          {dateOverrideClosed ? 'Closed' : 'Open'}
                        </button>

                        {!dateOverrideClosed && (
                          <button
                            onClick={() => {
                              setDateOverrideClosed(false);
                              setDateOverrideOpen('00:00');
                              setDateOverrideClose('24:00');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all shrink-0 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                            title="Set this date to open 24 hours"
                          >
                            24 Hrs
                          </button>
                        )}

                        {!dateOverrideClosed && (
                          <>
                            <select
                              value={dateOverrideOpen}
                              onChange={(e) => setDateOverrideOpen(e.target.value)}
                              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-amber-200 outline-none"
                            >
                              {HOUR_OPTIONS.map(h => (
                                <option key={h} value={h}>{formatTime12(h)}</option>
                              ))}
                            </select>
                            <span className="text-slate-300 font-bold text-[10px]">–</span>
                            <select
                              value={dateOverrideClose}
                              onChange={(e) => setDateOverrideClose(e.target.value)}
                              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-amber-200 outline-none"
                            >
                              {HOUR_CLOSE_OPTIONS.filter(h => h > dateOverrideOpen).map(h => (
                                <option key={h} value={h}>{formatTime12(h)}</option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveDateOverride}
                          disabled={isSavingDateOverride}
                          className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingDateOverride ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save Override
                        </button>
                        {/* Delete existing override if it exists */}
                        {dateOverrides.find(ov => ov.specific_date === dateOverrideDate) && (
                          <button
                            onClick={() => {
                              const existing = dateOverrides.find(ov => ov.specific_date === dateOverrideDate);
                              if (existing) handleDeleteDateOverride(existing.id);
                              setShowDateOverrideForm(false);
                            }}
                            className="px-3 py-2 bg-rose-100 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-200 transition-all flex items-center gap-1.5"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <p className="text-[9px] text-amber-600/60 font-medium">
                        <Info size={9} className="inline mr-0.5 -mt-0.5" />
                        Overrides take highest priority over the weekly schedule
                      </p>
                    </div>
                  )}

                  {/* ─── Upcoming date overrides list ─── */}
                  {dateOverrides.length > 0 && (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Overrides</p>
                      {dateOverrides
                        .sort((a, b) => (a.specific_date || '').localeCompare(b.specific_date || ''))
                        .map((ov) => {
                          const dateObj = new Date(ov.specific_date + 'T00:00:00');
                          const isPast = dateObj < getNowPH();
                          return (
                            <div
                              key={ov.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                                ov.is_closed
                                  ? 'bg-rose-50/50 border-rose-100'
                                  : isPast
                                    ? 'bg-slate-50/30 border-slate-100 opacity-50'
                                    : 'bg-amber-50/30 border-amber-100 hover:bg-amber-50'
                              }`}
                              onClick={() => {
                                setDateOverrideDate(ov.specific_date || '');
                                setDateOverrideOpen(ov.open_time.slice(0, 5));
                                setDateOverrideClose(ov.close_time.slice(0, 5));
                                setDateOverrideClosed(ov.is_closed);
                                setShowDateOverrideForm(true);
                              }}
                            >
                              <CalendarDays size={12} className={ov.is_closed ? 'text-rose-400' : 'text-amber-500'} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-700 truncate">
                                  {formatDatePH(dateObj, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              <span className={`text-[8px] font-bold ${ov.is_closed ? 'text-rose-500' : 'text-amber-600'}`}>
                                {ov.is_closed ? 'Closed' : `${formatTime12(ov.open_time.slice(0, 5))} – ${formatTime12(ov.close_time.slice(0, 5))}`}
                              </span>
                              {isPast && (
                                <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase">Past</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {dateOverrides.length === 0 && !showDateOverrideForm && (
                    <div className="py-6 text-center">
                      <CalendarDays size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] text-slate-300 font-medium">Click a date on the calendar to add special hours</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Bar */}
      {selectedCourt && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><PhilippinePeso size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Rules</p>
              <p className="text-xl font-black text-slate-900">{totalRulesCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Calendar size={18} className="text-blue-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Days Covered</p>
              <p className="text-xl font-black text-slate-900">{daysWithRules}/7</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><Tag size={18} className="text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</p>
              <p className="text-xl font-black text-slate-900">₱{selectedCourt.base_price}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-50/30 transition-all" onClick={() => setShowPreview(!showPreview)}>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Eye size={18} className="text-indigo-600" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview</p>
              <p className="text-sm font-black text-indigo-600">{showPreview ? 'Hide' : 'Show'} Preview</p>
            </div>
          </div>
        </div>
      )}

      {/* ──── WEEKLY PRICING PREVIEW ──── */}
      {showPreview && selectedCourt && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="mb-3 flex items-center gap-2">
            <Eye size={14} className="text-indigo-600" />
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Player View Preview</span>
            <span className="text-[10px] text-slate-400 font-medium">— This is what players will see on the booking page</span>
          </div>
          <WeeklyPricingSchedule
            courtId={selectedCourtId}
            basePricePerHour={selectedCourt.base_price}
            courtName={selectedCourt.name}
          />
        </div>
      )}

      {/* Main Layout: Calendar Left + Rules Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ═══ LEFT: Calendar ═══ */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sticky top-6">
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronLeft size={18} className="text-slate-400" />
              </button>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{monthName}</h3>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_SHORT.map(d => (
                <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for first week offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const hasRules = dateHasRules(day);
                const hasSpecific = dateHasSpecificRules(day);
                const selected = isSelectedDay(day);
                const today = isToday(day);
                const disabled = isDayDisabled(day);
                const inRange = isInFirst3SundaysRange(day) && !hasRules;
                const isSunday = isFirst3Sunday(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={disabled}
                    className={`aspect-square rounded-xl text-sm font-bold transition-all relative flex items-center justify-center ${
                      disabled
                        ? 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                        : selected
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                          : hasRules
                            ? 'bg-lime-100 text-lime-800 ring-2 ring-lime-300 hover:bg-lime-200'
                            : inRange
                              ? isSunday
                                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300 hover:bg-amber-200 font-black'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100'
                              : today
                                ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                    {hasRules && !selected && !disabled && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-lime-500 shadow-sm shadow-lime-300" />
                    )}
                    {hasSpecific && !selected && !disabled && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                    {isSunday && inRange && !disabled && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-lime-100 ring-1 ring-lime-300" /> Pricing Set
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300" /> 1st 3 Sundays
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-50 ring-1 ring-amber-200" /> Days in Range
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600" /> Selected
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-50 ring-1 ring-slate-200" /> Past
              </div>
            </div>

            {/* First 3 Sundays of the Month Alert */}
            {first3Sundays.some(d => !dateHasRules(d)) && isCurrentOrFutureMonth && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Set First 3 Sundays of the Month</p>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                      Set pricing for the days within the first 3 Sundays ({monthName.split(' ')[0]} 1–{thirdSundayDay}). Unset Sundays: {first3Sundays.filter(d => !dateHasRules(d)).map(d => `${monthName.split(' ')[0]} ${d}`).join(', ')}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick day-of-week selection for weekly mode */}
            {viewMode === 'weekly' && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Jump by Day</p>
                <div className="flex flex-wrap gap-2">
                  {DAY_SHORT.map((d, idx) => {
                    const hasDay = weeklyRulesByDay[idx].rules.length > 0;
                    return (
                      <button
                        key={d}
                        onClick={() => openAddForm(idx)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          hasDay
                            ? 'bg-lime-50 text-lime-700 border border-lime-200 hover:bg-lime-100'
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Pricing Rules Panel ═══ */}
        <div className="lg:col-span-8 space-y-4">
          {/* Panel Header */}
          <div className="flex items-center justify-between">
            <div>
              {viewMode === 'date' && selectedDate ? (
                <h2 className="text-lg font-black text-slate-900">
                  {formatDatePH(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
              ) : (
                <h2 className="text-lg font-black text-slate-900">Weekly Recurring Pricing</h2>
              )}
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {viewMode === 'date'
                  ? 'Set custom prices for this specific date (overrides weekly rules)'
                  : 'These prices repeat every week. Click a calendar date to override for a specific day.'
                }
              </p>
            </div>
            <button
              onClick={() => openAddForm(viewMode === 'date' && selectedDate ? undefined : undefined)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Rate
            </button>
          </div>

          {/* ─── WEEKLY VIEW ─── */}
          {viewMode === 'weekly' && (
            <div className="space-y-3">
              {weeklyRulesByDay.map(({ dayName, dayShort, dayIndex, rules: dayRules }) => (
                <div key={dayIndex} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{dayName}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayRules.length === 0 ? '— Base price' : `${dayRules.length} rate${dayRules.length > 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dayRules.length > 0 && (
                        <button
                          onClick={() => openCopyModal(dayIndex)}
                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Copy to other days"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => openAddForm(dayIndex)}
                        className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title={`Add rate for ${dayName}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  {dayRules.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {dayRules.map(rule => (
                        <div key={rule.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors ${!rule.is_active ? 'opacity-40' : ''}`}>
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Clock size={12} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-700">
                              {formatTime12(rule.start_time.slice(0, 5))} – {formatTime12(rule.end_time.slice(0, 5))}
                            </span>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-sm font-black text-blue-700">₱{rule.price_per_hour}/hr</span>
                            {rule.label && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {rule.label}
                              </span>
                            )}
                            {!rule.is_active && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-100">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewingRule(rule)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View details"><Eye size={12} /></button>
                            <button onClick={() => openEditForm(rule)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit"><Pencil size={12} /></button>
                            <button onClick={() => toggleRuleActive(rule)} className={`p-1.5 rounded-lg transition-all ${rule.is_active ? 'text-emerald-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'}`} title={rule.is_active ? 'Deactivate' : 'Activate'}>{rule.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}</button>
                            <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-4 text-xs text-slate-300 font-medium italic">
                      No custom rates — uses base price ({formatPrice(selectedCourt?.base_price || 0)}/hr)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─── DATE-SPECIFIC VIEW ─── */}
          {viewMode === 'date' && (
            <div className="space-y-3">
              {!selectedDate ? (
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center">
                  <Calendar size={48} className="text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-black text-slate-400">Select a Date</h3>
                  <p className="text-sm text-slate-300 font-medium mt-1">Click a day on the calendar to set date-specific pricing</p>
                </div>
              ) : (
                <>
                  {/* Date-specific rules */}
                  {(() => {
                    const dateStr = toPhDateStr(selectedDate);
                    const dateRules = rules.filter(r => r.specific_date === dateStr);
                    const dow = selectedDate.getDay();
                    const recurringRules = rules.filter(r => r.day_of_week === dow && r.specific_date === null);

                    return (
                      <>
                        {/* Date-specific overrides */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-3 bg-amber-50/80 border-b border-amber-100">
                            <div className="flex items-center gap-2">
                              <Tag size={14} className="text-amber-600" />
                              <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Date-Specific Override</span>
                            </div>
                            <button
                              onClick={() => openAddForm()}
                              className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {dateRules.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                              {dateRules.map(rule => (
                                <div key={rule.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors ${!rule.is_active ? 'opacity-40' : ''}`}>
                                  <div className="flex items-center gap-2 min-w-[140px]">
                                    <Clock size={12} className="text-slate-300" />
                                    <span className="text-xs font-bold text-slate-700">
                                      {formatTime12(rule.start_time.slice(0, 5))} – {formatTime12(rule.end_time.slice(0, 5))}
                                    </span>
                                  </div>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-black text-amber-700">₱{rule.price_per_hour}/hr</span>
                                    {rule.label && (
                                      <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-100">
                                        {rule.label}
                                      </span>
                                    )}
                                    {!rule.is_active && (
                                      <span className="text-[9px] font-bold text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-100">Inactive</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setViewingRule(rule)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Eye size={12} /></button>
                                    <button onClick={() => openEditForm(rule)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={12} /></button>
                                    <button onClick={() => toggleRuleActive(rule)} className={`p-1.5 rounded-lg transition-all ${rule.is_active ? 'text-emerald-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'}`}>{rule.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}</button>
                                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-5 py-4 text-xs text-slate-300 font-medium italic">
                              No date-specific overrides — weekly rules apply
                            </div>
                          )}
                        </div>

                        {/* Show the weekly rules for context */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden opacity-70">
                          <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                                Weekly ({DAY_NAMES[dow]}) — {dateRules.length > 0 ? 'Overridden' : 'Active'}
                              </span>
                            </div>
                          </div>
                          {recurringRules.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                              {recurringRules.map(rule => (
                                <div key={rule.id} className={`flex items-center gap-4 px-5 py-3 ${dateRules.length > 0 ? 'line-through opacity-50' : ''}`}>
                                  <div className="flex items-center gap-2 min-w-[140px]">
                                    <Clock size={12} className="text-slate-300" />
                                    <span className="text-xs font-bold text-slate-700">
                                      {formatTime12(rule.start_time.slice(0, 5))} – {formatTime12(rule.end_time.slice(0, 5))}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-slate-500">₱{rule.price_per_hour}/hr</span>
                                  {rule.label && (
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      {rule.label}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-5 py-4 text-xs text-slate-300 font-medium italic">
                              No weekly rules for {DAY_NAMES[dow]}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Empty state when no court selected */}
          {courts.length === 0 && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center">
              <PhilippinePeso size={48} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-400">No Courts Found</h3>
              <p className="text-sm text-slate-300 font-medium mt-1">Add courts first to configure pricing rules.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ADD/EDIT FORM MODAL ═══ */}
      {showForm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                {editingRule ? 'Edit' : 'Add'} Pricing Rate
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Day / Date Selection */}
            {!formSpecificDate && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Day of Week</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_SHORT.map((d, idx) => {
                    const dayH = opHoursSchedule.find(dh => dh.dayOfWeek === idx);
                    const isClosed = dayH?.isClosed ?? false;
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setFormDayOfWeek(idx);
                          // Reset times to this day's operation hours
                          if (dayH && !dayH.isClosed) {
                            setFormStartTime(dayH.openTime);
                            const openH = parseInt(dayH.openTime.split(':')[0], 10);
                            const closeH = parseInt(dayH.closeTime.split(':')[0], 10);
                            const midH = Math.min(openH + 4, closeH);
                            setFormEndTime(midH.toString().padStart(2, '0') + ':00');
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          formDayOfWeek === idx
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                            : isClosed
                              ? 'bg-rose-50 text-rose-300 hover:bg-rose-100 line-through'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formSpecificDate && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Date-Specific Rate</p>
                <p className="text-sm font-bold text-amber-800 mt-0.5">
                  {formatDatePH(new Date(formSpecificDate + 'T00:00:00'), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Operation hours hint */}
            {formHourOptions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Clock size={12} className="text-indigo-500 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-600">
                  Court hours: {formatTime12(formHourInfo.openTime)} – {formatTime12(formHourInfo.closeTime)}
                </p>
              </div>
            )}
            {formHourOptions.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
                <AlertCircle size={12} className="text-rose-500 shrink-0" />
                <p className="text-[10px] font-bold text-rose-600">
                  Court is closed on this day. You can still add a rate override if needed.
                </p>
              </div>
            )}

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Start Time</label>
                <select
                  value={formStartTime}
                  onChange={e => setFormStartTime(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  {(formHourOptions.length > 0 ? formHourOptions : HOUR_OPTIONS).slice(0, -1).map(h => (
                    <option key={h} value={h}>{formatTime12(h)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">End Time</label>
                <select
                  value={formEndTime}
                  onChange={e => setFormEndTime(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  {(formHourOptions.length > 0 ? formHourOptions : HOUR_OPTIONS).filter(h => h > formStartTime).map(h => (
                    <option key={h} value={h}>{formatTime12(h)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Time Bar — scoped to operation hours */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="relative h-8 bg-slate-200 rounded-lg overflow-hidden">
                {(() => {
                  const opOpen = parseInt(formHourInfo.openTime.split(':')[0]);
                  const opClose = parseInt(formHourInfo.closeTime.split(':')[0]);
                  const opRange = opClose - opOpen || 24;
                  const startH = parseInt(formStartTime.split(':')[0]);
                  const endH = parseInt(formEndTime.split(':')[0]);
                  const left = ((startH - opOpen) / opRange) * 100;
                  const width = ((endH - startH) / opRange) * 100;
                  return (
                    <div
                      className="absolute top-0 bottom-0 bg-blue-500 rounded"
                      style={{ left: `${Math.max(left, 0)}%`, width: `${Math.max(width, 2)}%` }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-300 uppercase">
                <span>{formatTime12(formHourInfo.openTime)}</span>
                {(() => {
                  const opOpen = parseInt(formHourInfo.openTime.split(':')[0]);
                  const opClose = parseInt(formHourInfo.closeTime.split(':')[0]);
                  const midH = Math.round((opOpen + opClose) / 2);
                  return <span>{formatTime12(midH.toString().padStart(2, '0') + ':00')}</span>;
                })()}
                <span>{formatTime12(formHourInfo.closeTime)}</span>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Price Per Hour (₱)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g. 350"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Label (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Peak Hours, Morning Rate, Holiday"
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              />
            </div>

            {/* Summary */}
            {formPrice && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Rate Summary</p>
                <p className="text-sm font-bold text-emerald-800">
                  {formSpecificDate
                    ? formatDatePH(new Date(formSpecificDate + 'T00:00:00'), { month: 'short', day: 'numeric' })
                    : formDayOfWeek !== null ? DAY_NAMES[formDayOfWeek] : '—'
                  }
                  {' '}{formatTime12(formStartTime)} – {formatTime12(formEndTime)}
                </p>
                <p className="text-2xl font-black text-emerald-700 mt-1">₱{formPrice}/hr</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button
                onClick={prepareSave}
                disabled={isSaving || !formPrice}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                Review & Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ CONFIRMATION MODAL ═══ */}
      {showConfirmation && pendingSavePayload && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmation(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Confirm Pricing Rule</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Please review before saving</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Court</span>
                <span className="text-xs font-bold text-slate-700">{selectedCourt?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingSavePayload.specific_date ? 'Date' : 'Day'}</span>
                <span className="text-xs font-bold text-slate-700">
                  {pendingSavePayload.specific_date
                    ? new Date(pendingSavePayload.specific_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : DAY_NAMES[pendingSavePayload.day_of_week]
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</span>
                <span className="text-xs font-bold text-slate-700">{formatTime12(pendingSavePayload.start_time.slice(0, 5))} – {formatTime12(pendingSavePayload.end_time.slice(0, 5))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
                <span className="text-xs font-bold text-slate-700">{parseInt(pendingSavePayload.end_time.split(':')[0]) - parseInt(pendingSavePayload.start_time.split(':')[0])} hour(s)</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</span>
                <span className="text-lg font-black text-blue-700">₱{pendingSavePayload.price_per_hour}/hr</span>
              </div>
              {pendingSavePayload.label && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Label</span>
                  <span className="text-xs font-bold text-slate-700">{pendingSavePayload.label}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirmation(false)} className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">Go Back</button>
              <button onClick={confirmSave} disabled={isSaving} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm & Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ VIEW RULE DETAIL MODAL ═══ */}
      {viewingRule && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingRule(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Rate Details</h2>
              <button onClick={() => setViewingRule(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-center text-white">
              <p className="text-3xl font-black">₱{viewingRule.price_per_hour}/hr</p>
              {viewingRule.label && (
                <span className="inline-block mt-2 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">{viewingRule.label}</span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                <span className="text-xs font-bold text-slate-700">{viewingRule.specific_date ? 'Date-Specific' : 'Weekly Recurring'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viewingRule.specific_date ? 'Date' : 'Day'}</span>
                <span className="text-xs font-bold text-slate-700">
                  {viewingRule.specific_date
                    ? new Date(viewingRule.specific_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    : viewingRule.day_of_week !== null ? DAY_NAMES[viewingRule.day_of_week] : '—'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Range</span>
                <span className="text-xs font-bold text-slate-700">{formatTime12(viewingRule.start_time.slice(0, 5))} – {formatTime12(viewingRule.end_time.slice(0, 5))}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                <span className={`text-xs font-bold ${viewingRule.is_active ? 'text-emerald-600' : 'text-rose-500'}`}>{viewingRule.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Updated</span>
                <span className="text-xs font-bold text-slate-700">{new Date(viewingRule.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { openEditForm(viewingRule); setViewingRule(null); }} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"><Pencil size={14} /> Edit</button>
              <button onClick={() => { deleteRule(viewingRule.id); setViewingRule(null); }} className="px-5 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl text-sm hover:bg-rose-100 transition-all border border-rose-100"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ SETUP REVIEW MODAL ═══ */}
      {showSetupReview && selectedCourt && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowSetupReview(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl p-7 space-y-5 overflow-hidden">
            <div className="absolute inset-x-0 -top-14 h-28 bg-gradient-to-r from-emerald-500 via-blue-500 to-lime-400 opacity-20 blur-3xl pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Final Review</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Confirm your court setup</h3>
              <p className="text-sm text-slate-500 font-medium">Review base price and operation hours before activating.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">₱</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</p>
                  <p className="text-lg font-black text-slate-900">₱{selectedCourt.base_price}/hr</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Clock size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Hours</p>
                  <p className="text-sm font-bold text-slate-800">{readableWeeklyHours().openDays}/7 days open</p>
                  <p className="text-[11px] text-slate-500">Sample: {readableWeeklyHours().sampleLabel}</p>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Location: <span className="font-bold text-slate-800">{selectedCourt.location_name || 'Unnamed venue'}</span></div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ready to go live</p>
                <p className="text-sm font-bold text-emerald-800">Players will see this court after activation.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSetupReview(false)} className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">Go Back</button>
              <button
                onClick={confirmSetupReady}
                disabled={isConfirmingSetup}
                className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConfirmingSetup ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm & Activate — Let's dink in!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ CELEBRATION MODAL ═══ */}
      {showReadyCelebration && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowReadyCelebration(false)} />
          <style>{`
            @keyframes confetti-fall { 0% { transform: translateY(-20vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(70vh) rotate(360deg); opacity: 0; } }
          `}</style>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 22 }).map((_, i) => {
              const left = Math.random() * 100;
              const delay = Math.random() * 1.5;
              const duration = 2.8 + Math.random();
              const colors = ['#22c55e', '#2563eb', '#a855f7', '#f59e0b', '#ec4899'];
              const color = colors[i % colors.length];
              return (
                <span
                  key={i}
                  className="absolute block w-2 h-3 rounded-sm"
                  style={{ left: `${left}%`, top: '-10vh', backgroundColor: color, animation: `confetti-fall ${duration}s linear ${delay}s forwards` }}
                />
              );
            })}
          </div>
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Court is live — let's dink in! 🏓</h3>
            <p className="text-sm text-slate-500 font-medium">Your base price and operation hours are set. Players can now see and book this court.</p>
            <button
              onClick={() => setShowReadyCelebration(false)}
              className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50"
            >
              Awesome, take me back
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ COPY RULES MODAL ═══ */}
      {showCopyModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCopyModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Copy Rates</h2>
              <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <p className="text-sm text-slate-500 font-medium">
              Copy <span className="font-bold text-slate-700">{DAY_NAMES[copySourceDay]}</span> rates to:
            </p>

            <div className="space-y-2">
              {DAY_NAMES.map((name, idx) => {
                if (idx === copySourceDay) return null;
                return (
                  <button
                    key={idx}
                    onClick={() => toggleCopyDay(idx)}
                    className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between text-left ${
                      copyTargetDays.has(idx) ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-700">{name}</span>
                    {copyTargetDays.has(idx) && <CheckCircle2 size={16} className="text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCopyModal(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await copyDayRulesToDays(copySourceDay, Array.from(copyTargetDays));
                  setShowCopyModal(false);
                }}
                disabled={copyTargetDays.size === 0 || isSaving}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                Copy to {copyTargetDays.size} Day{copyTargetDays.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CourtPricing;
