import React from 'react';
import { ArrowDownWideNarrow, Filter, Search, X } from 'lucide-react';
import { SORT_OPTIONS } from './findPartners.constants';
import type { MatchHeroStat, SortOption } from './findPartners.types';

interface MatchmakingHeroProps {
  searchQuery: string;
  sortBy: SortOption;
  heroStats: MatchHeroStat[];
  activeFilterCount: number;
  showFilters: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSortChange: (value: SortOption) => void;
  onToggleFilters: () => void;
}

export const MatchmakingHero: React.FC<MatchmakingHeroProps> = ({
  searchQuery,
  sortBy,
  heroStats,
  activeFilterCount,
  showFilters,
  onSearchChange,
  onClearSearch,
  onSortChange,
  onToggleFilters,
}) => {
  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">
          PicklePlay / Find Partners
        </p>
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 md:text-5xl">
            Find your partner.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
            Discover players who fit your level, location, and playing style without turning the page into a directory.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
          <span>Matches consider skill, common courts, availability, and recent activity.</span>
          {heroStats.map((stat) => (
            <span key={stat.label} className="text-slate-400">
              {stat.value} {stat.label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search by player, location, court, style, or availability..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <ArrowDownWideNarrow size={15} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as SortOption)}
              className="h-11 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onToggleFilters}
            className={`relative inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
              showFilters || activeFilterCount > 0
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <Filter size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                showFilters || activeFilterCount > 0 ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
