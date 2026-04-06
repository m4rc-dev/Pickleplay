import React from 'react';

interface CourtManagerStatItem {
  label: string;
  value: number | string;
}

interface CourtManagerStatsProps {
  items: CourtManagerStatItem[];
  isLoading?: boolean;
}

const CourtManagerStats: React.FC<CourtManagerStatsProps> = ({
  items,
  isLoading = false,
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {items.map((item, index) => (
      <div
        key={item.label}
        data-stat-card="true"
        className="rounded-[30px] border border-slate-100 bg-gradient-to-br from-white via-white to-blue-50/70 p-5 shadow-sm md:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-4xl font-black tracking-tighter text-slate-900">
              {isLoading ? '--' : item.value}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
              index === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : index === 1
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {index === 0 ? 'Today' : index === 1 ? 'Review' : 'Schedule'}
          </span>
        </div>
      </div>
    ))}
  </div>
);

export default CourtManagerStats;
