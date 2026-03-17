import React from 'react';
import { RotateCcw, SearchX, X } from 'lucide-react';
import type { ActiveFilterChip } from './findPartners.types';

interface MatchmakingEmptyStateProps {
  title: string;
  description: string;
  searchQuery: string;
  activeFilterChips: ActiveFilterChip[];
  onClearSearch: () => void;
  onResetFilters: () => void;
}

export const MatchmakingEmptyState: React.FC<MatchmakingEmptyStateProps> = ({
  title,
  description,
  searchQuery,
  activeFilterChips,
  onClearSearch,
  onResetFilters,
}) => {
  return (
    <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <SearchX className="mx-auto mb-4 text-slate-200" size={48} />
      <h3 className="text-3xl font-black uppercase tracking-tight text-slate-400">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">{description}</p>

      {activeFilterChips.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {activeFilterChips.map((chip) => (
            <span
              key={`${chip.key}-${chip.label}`}
              className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700"
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
          >
            <X size={12} />
            Clear search
          </button>
        )}

        {activeFilterChips.length > 0 && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-700"
          >
            <RotateCcw size={12} />
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
};
