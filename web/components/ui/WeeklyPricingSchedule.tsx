import React, { useState, useEffect } from 'react';
import { Clock, PhilippinePeso, CalendarDays, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { fetchCourtPricingRules, PricingRule } from '../../services/courtPricingService';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface WeeklyPricingScheduleProps {
  courtId: string;
  basePricePerHour: number;
  courtName?: string;
  compact?: boolean; // For inline use in booking pages
  className?: string;
}

interface DaySchedule {
  dayName: string;
  dayShort: string;
  dayIndex: number;
  date: Date;
  dateStr: string;
  rules: PricingRule[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${(m || 0).toString().padStart(2, '0')} ${period}`;
}

function getNowPH(): Date {
  const phStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  return new Date(phStr);
}

function getWeekRange(referenceDate: Date = getNowPH()): { start: Date; end: Date; dates: Date[] } {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }

  const endOfWeek = new Date(dates[6]);
  endOfWeek.setHours(23, 59, 59, 999);

  return { start: startOfWeek, end: endOfWeek, dates };
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────
const WeeklyPricingSchedule: React.FC<WeeklyPricingScheduleProps> = ({
  courtId,
  basePricePerHour,
  courtName,
  compact = false,
  className = '',
}) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    if (!courtId) return;
    setIsLoading(true);
    fetchCourtPricingRules(courtId).then(data => {
      setRules(data);
      setIsLoading(false);
    });
  }, [courtId]);

  const now = getNowPH();
  const week = getWeekRange(now);
  const weekLabel = `${formatMonthDay(week.start)}–${formatMonthDay(week.end)}, ${week.start.getFullYear()}`;

  // Build schedule for each day
  const schedule: DaySchedule[] = week.dates.map((date, idx) => {
    const dateStr = toDateStr(date);
    const dow = date.getDay();
    // Specific date rules first, then recurring
    const specificRules = rules.filter(r => r.specific_date === dateStr);
    const recurringRules = rules.filter(r => r.day_of_week === dow && r.specific_date === null);
    const dayRules = specificRules.length > 0 ? specificRules : recurringRules;

    return {
      dayName: DAY_NAMES[dow],
      dayShort: DAY_SHORT[dow],
      dayIndex: dow,
      date,
      dateStr,
      rules: dayRules.sort((a, b) => a.start_time.localeCompare(b.start_time)),
    };
  });

  const isToday = (d: Date) => {
    const today = getNowPH();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${className}`}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-200 rounded w-48" />
        </div>
        <div className="mt-4 space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Compact header toggle
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4 flex items-center justify-between hover:shadow-md transition-all group ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50">
            <CalendarDays size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-blue-900 uppercase tracking-wider">This Week's Pricing</p>
            <p className="text-[10px] text-blue-500 font-bold mt-0.5">{weekLabel}</p>
          </div>
        </div>
        <ChevronDown size={16} className="text-blue-400 group-hover:translate-y-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <CalendarDays size={16} className="text-[#a3e635]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                This Week's Pricing
              </h3>
              <p className="text-[10px] text-blue-200 font-bold mt-0.5">{weekLabel}</p>
            </div>
          </div>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronUp size={16} className="text-white/60" />
            </button>
          )}
        </div>
        {courtName && (
          <p className="text-[10px] text-blue-300 font-bold mt-2 ml-12">{courtName} • Base: ₱{basePricePerHour}/hr</p>
        )}
      </div>

      {/* Schedule Table */}
      <div className="divide-y divide-slate-50">
        {schedule.map(day => {
          const today = isToday(day.date);
          return (
            <div
              key={day.dateStr}
              className={`transition-all ${today ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-100' : 'hover:bg-slate-50/50'}`}
            >
              {/* Day Header Row */}
              <div className={`flex items-center gap-3 px-5 py-3 ${day.rules.length > 0 ? '' : 'py-4'}`}>
                {/* Day badge */}
                <div className={`w-14 shrink-0 text-center py-1.5 rounded-lg ${
                  today
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50'
                    : day.rules.length > 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                }`}>
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none">{day.dayShort}</p>
                  <p className="text-lg font-black leading-none mt-0.5">{day.date.getDate()}</p>
                </div>

                {/* Rules or base price */}
                <div className="flex-1 min-w-0">
                  {day.rules.length > 0 ? (
                    <div className="space-y-1.5">
                      {day.rules.map((rule, idx) => (
                        <div key={rule.id || idx} className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 min-w-[160px]">
                            <Clock size={11} className="text-slate-300 shrink-0" />
                            <span className="text-xs font-bold text-slate-600">
                              {formatTime12(rule.start_time.slice(0, 5))} – {formatTime12(rule.end_time.slice(0, 5))}
                            </span>
                          </div>
                          <span className={`text-sm font-black ${today ? 'text-blue-700' : 'text-emerald-700'}`}>
                            ₱{rule.price_per_hour.toFixed(2)}
                          </span>
                          {rule.label && (
                            <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline">
                              {rule.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium italic">All Day</span>
                      <span className="text-sm font-black text-slate-500">₱{basePricePerHour.toFixed(2)}</span>
                      <span className="text-[8px] font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-slate-100">Base Rate</span>
                    </div>
                  )}
                </div>

                {/* Today indicator */}
                {today && (
                  <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-full uppercase tracking-widest shrink-0">
                    Today
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
        <Info size={12} className="text-slate-300 shrink-0" />
        <p className="text-[10px] text-slate-400 font-medium">
          Prices may vary by day and time slot. Base rate of <span className="font-bold text-slate-500">₱{basePricePerHour.toFixed(2)}/hr</span> applies when no custom pricing is set.
        </p>
      </div>
    </div>
  );
};

export default WeeklyPricingSchedule;
