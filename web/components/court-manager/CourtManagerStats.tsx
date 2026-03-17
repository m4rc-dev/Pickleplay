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
    {items.map((item) => (
      <div
        key={item.label}
        className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
          {item.label}
        </p>
        <p className="mt-3 text-4xl font-black tracking-tighter text-slate-900">
          {isLoading ? '--' : item.value}
        </p>
      </div>
    ))}
  </div>
);

export default CourtManagerStats;
