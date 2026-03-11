import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Clock, DollarSign, Plus, Trash2, X,
  Loader2, CheckCircle2, Calendar, Tag, Sun, Moon, AlertCircle,
  Copy, Pencil, ToggleLeft, ToggleRight, Save
} from 'lucide-react';
import { supabase } from '../../services/supabase';

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
}

interface CourtPricingProps {
  courtId?: string;
  onClose?: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generate hour options for select
const HOUR_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  const hh = h.toString().padStart(2, '0');
  HOUR_OPTIONS.push(`${hh}:00`);
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `₱${price}`;
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
  const [calendarDate, setCalendarDate] = useState(new Date());
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
    }
  }, [selectedCourtId, user]);

  const fetchCourts = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('courts')
      .select('id, name, base_price, location_id, locations(name)')
      .eq('owner_id', ownerId)
      .order('name');
    if (!error && data) {
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        base_price: c.base_price || 0,
        location_id: c.location_id,
        location_name: c.locations?.name || '',
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

  // ──────── Calendar Helpers ────────
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));

  const isToday = (day: number) => {
    const now = new Date();
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

  const handleDayClick = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(date);
    setViewMode('date');
  };

  // ──────── Get rules for current view ────────
  const getDisplayRules = useCallback(() => {
    if (viewMode === 'date' && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
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
    setFormStartTime('08:00');
    setFormEndTime('12:00');
    setFormPrice('');
    setFormLabel('');

    if (viewMode === 'date' && selectedDate) {
      setFormSpecificDate(selectedDate.toISOString().split('T')[0]);
      setFormDayOfWeek(null);
    } else if (dayOfWeek !== undefined) {
      setFormDayOfWeek(dayOfWeek);
      setFormSpecificDate(null);
    } else {
      setFormDayOfWeek(null);
      setFormSpecificDate(null);
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

  // ──────── Save rule ────────
  const saveRule = async () => {
    if (!user || !selectedCourtId) return;
    if (!formPrice || parseFloat(formPrice) < 0) { alert('Please enter a valid price.'); return; }
    if (formStartTime >= formEndTime) { alert('End time must be after start time.'); return; }
    if (formDayOfWeek === null && !formSpecificDate) { alert('Please select a day or date.'); return; }

    setIsSaving(true);
    try {
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
        updated_at: new Date().toISOString(),
      };

      if (editingRule) {
        const { error } = await supabase
          .from('court_pricing_rules')
          .update(payload)
          .eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('court_pricing_rules')
          .insert(payload);
        if (error) throw error;
      }

      setShowForm(false);
      await fetchRules(selectedCourtId);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ──────── Delete rule ────────
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this pricing rule?')) return;
    const { error } = await supabase.from('court_pricing_rules').delete().eq('id', ruleId);
    if (!error) await fetchRules(selectedCourtId);
    else alert(`Delete failed: ${error.message}`);
  };

  // ──────── Copy day rules to other days ────────
  const copyDayRulesToDays = async (sourceDow: number, targetDows: number[]) => {
    if (!user || !selectedCourtId) return;
    const sourceRules = rules.filter(r => r.day_of_week === sourceDow && r.specific_date === null);
    if (sourceRules.length === 0) { alert('No rules to copy.'); return; }

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

  // ──────── RENDER ────────
  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Court Pricing</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Set custom hourly rates for different times &amp; days</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Court Selector */}
          <select
            value={selectedCourtId}
            onChange={e => setSelectedCourtId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none min-w-[200px]"
          >
            {courts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.location_name ? `• ${c.location_name}` : ''} — Base ₱{c.base_price}
              </option>
            ))}
          </select>
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

      {/* Base Price Info */}
      {selectedCourt && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <DollarSign size={18} className="text-blue-600" />
          <div className="text-sm">
            <span className="font-bold text-blue-900">{selectedCourt.name}</span>
            <span className="text-blue-600 font-medium"> — Default base price: </span>
            <span className="font-black text-blue-700">₱{selectedCourt.base_price}/hr</span>
            <span className="text-blue-500 text-xs font-medium ml-2">(Used when no custom pricing rule matches a time slot)</span>
          </div>
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
                const selected = isSelectedDay(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-xl text-sm font-bold transition-all relative flex items-center justify-center ${
                      selected
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                        : today
                          ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                    {hasRules && !selected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center gap-4 text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Has pricing rules
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Selected
              </div>
            </div>

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
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
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
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
                        <div key={rule.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
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
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditForm(rule)}
                              className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
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
                    const dateStr = selectedDate.toISOString().split('T')[0];
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
                                <div key={rule.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
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
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => openEditForm(rule)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                      <Pencil size={12} />
                                    </button>
                                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                      <Trash2 size={12} />
                                    </button>
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
              <DollarSign size={48} className="text-slate-200 mx-auto mb-4" />
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
                  {DAY_SHORT.map((d, idx) => (
                    <button
                      key={d}
                      onClick={() => setFormDayOfWeek(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        formDayOfWeek === idx
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formSpecificDate && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Date-Specific Rate</p>
                <p className="text-sm font-bold text-amber-800 mt-0.5">
                  {new Date(formSpecificDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
                  {HOUR_OPTIONS.map(h => (
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
                  {HOUR_OPTIONS.filter(h => h > formStartTime).map(h => (
                    <option key={h} value={h}>{formatTime12(h)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Time Bar */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="relative h-8 bg-slate-200 rounded-lg overflow-hidden">
                {(() => {
                  const startH = parseInt(formStartTime.split(':')[0]);
                  const endH = parseInt(formEndTime.split(':')[0]);
                  const left = (startH / 24) * 100;
                  const width = ((endH - startH) / 24) * 100;
                  return (
                    <div
                      className="absolute top-0 bottom-0 bg-blue-500 rounded"
                      style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-300 uppercase">
                <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>12AM</span>
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
                    ? new Date(formSpecificDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                onClick={saveRule}
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingRule ? 'Update' : 'Save'} Rate
              </button>
            </div>
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
