import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Info } from 'lucide-react';
import { fetchCourtPricingRules, type PricingRule } from '../../services/courtPricingService';

interface CourtPricingInfo {
  id: string;
  name: string;
  basePricePerHour: number;
}

interface WeeklyPricingMultiCourtTableProps {
  courts: CourtPricingInfo[];
  className?: string;
}

interface DayCell {
  date: Date;
  dateStr: string;
  dayShort: string;
  entries: Array<{ courtId: string; rules: PricingRule[]; basePricePerHour: number }>;
}

const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getNowPH(): Date {
  const phStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  return new Date(phStr);
}

function getWeekRange(referenceDate: Date = getNowPH()): { dates: Date[] } {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }

  return { dates };
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${(m || 0).toString().padStart(2, '0')} ${period}`;
}

function getDayRules(rules: PricingRule[], date: Date): PricingRule[] {
  const dateStr = toDateStr(date);
  const dow = date.getDay();
  const specific = rules.filter(r => r.specific_date === dateStr);
  if (specific.length > 0) return specific.sort((a, b) => a.start_time.localeCompare(b.start_time));
  const recurring = rules.filter(r => r.day_of_week === dow && r.specific_date === null);
  return recurring.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

const WeeklyPricingMultiCourtTable: React.FC<WeeklyPricingMultiCourtTableProps> = ({ courts, className = '' }) => {
  const [rulesByCourt, setRulesByCourt] = useState<Record<string, PricingRule[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      const entries = await Promise.all(
        courts.map(async court => {
          const rules = await fetchCourtPricingRules(court.id);
          return [court.id, rules] as const;
        })
      );
      if (!isMounted) return;
      const next: Record<string, PricingRule[]> = {};
      entries.forEach(([id, rules]) => { next[id] = rules; });
      setRulesByCourt(next);
      setIsLoading(false);
    };
    load();
    return () => { isMounted = false; };
  }, [courts]);

  const week = useMemo(() => getWeekRange(getNowPH()), []);

  const dayCells: DayCell[] = useMemo(() => {
    return week.dates.map(date => ({
      date,
      dateStr: toDateStr(date),
      dayShort: DAY_SHORT[date.getDay()],
      entries: courts.map(court => ({
        courtId: court.id,
        rules: getDayRules(rulesByCourt[court.id] || [], date),
        basePricePerHour: court.basePricePerHour || 0,
      })),
    }));
  }, [courts, rulesByCourt, week.dates]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200/60">
            <CalendarDays size={16} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Multi-court view</p>
            <p className="text-sm font-black text-slate-900">This Week's Pricing</p>
          </div>
        </div>
        {isLoading && (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">Loading…</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="text-left text-xs font-black uppercase tracking-[0.14em] px-4 py-3">Day</th>
              {courts.map(court => (
                <th
                  key={court.id}
                  className="text-left text-xs font-black uppercase tracking-[0.12em] px-4 py-3 border-l border-white/10"
                >
                  <div className="flex items-center gap-1">
                    <span>{court.name}</span>
                    <span className="text-[9px] text-blue-100 font-bold bg-white/10 rounded-full px-2 py-0.5">
                      Base ₱{court.basePricePerHour || 0}/hr
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayCells.map(day => {
              const isToday = day.date.toDateString() === getNowPH().toDateString();
              return (
                <tr key={day.dateStr} className={isToday ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}>
                  <td className="align-top px-4 py-3 border-t border-slate-100">
                    <div className={`inline-flex flex-col items-center rounded-lg px-2 py-1.5 ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{day.dayShort}</span>
                      <span className="text-base font-black leading-none mt-0.5">{day.date.getDate()}</span>
                    </div>
                  </td>
                  {day.entries.map(entry => {
                    const rules = entry.rules;
                    return (
                      <td key={entry.courtId} className="align-top px-4 py-3 border-t border-slate-100">
                        {rules.length > 0 ? (
                          <div className="space-y-1.5">
                            {rules.map((rule, idx) => (
                              <div key={rule.id || idx} className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                  <Clock size={11} className="text-slate-300" />
                                  <span>{formatTime12(rule.start_time.slice(0, 5))} – {formatTime12(rule.end_time.slice(0, 5))}</span>
                                </div>
                                <span className="text-sm font-black text-blue-700">₱{rule.price_per_hour.toFixed(2)}</span>
                                {rule.label && (
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-[0.12em]">
                                    {rule.label}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="text-xs font-medium italic">All Day</span>
                            <span className="text-sm font-black">₱{entry.basePricePerHour.toFixed(2)}</span>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-[0.12em]">Base Rate</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <Info size={12} className="text-slate-300" />
        <span>Shows all courts at this location for the current week. Prices fall back to the base rate when no rule exists.</span>
      </div>
    </div>
  );
};

export default WeeklyPricingMultiCourtTable;
