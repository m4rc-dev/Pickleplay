import React from 'react';
import { X } from 'lucide-react';
import {
  AVAILABILITY_FILTER_OPTIONS,
  DEFAULT_FILTERS,
  GAME_FILTER_OPTIONS,
  SESSION_FILTER_OPTIONS,
  SKILL_FILTER_OPTIONS,
  STYLE_FILTER_OPTIONS,
} from './findPartners.constants';
import type {
  ActiveFilterChip,
  FilterOption,
  FilterState,
} from './findPartners.types';

interface MatchFiltersPanelProps {
  filters: FilterState;
  locationOptions: Array<FilterOption<string>>;
  activeFilterCount: number;
  activeFilterChips: ActiveFilterChip[];
  onFiltersChange: React.Dispatch<React.SetStateAction<FilterState>>;
  onResetFilters: () => void;
}

interface FilterChipGroupProps {
  label: string;
  options: Array<FilterOption<string>>;
  selectedValue: string;
  onSelect: (value: string) => void;
}

const FilterChipGroup: React.FC<FilterChipGroupProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={`${label}-${option.value}`}
            onClick={() => onSelect(option.value)}
            className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
              selectedValue === option.value
                ? 'border border-slate-900 bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const MatchFiltersPanel: React.FC<MatchFiltersPanelProps> = ({
  filters,
  locationOptions,
  activeFilterCount,
  activeFilterChips,
  onFiltersChange,
  onResetFilters,
}) => {
  const clearSingleFilter = (key: keyof FilterState) => {
    onFiltersChange((current) => ({ ...current, [key]: DEFAULT_FILTERS[key] }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Discovery filters</p>
          <p className="text-sm text-slate-500">
            Narrow the pool by location, level, style, availability, and play format.
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            Reset {activeFilterCount}
          </button>
        )}
      </div>

      {activeFilterChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <button
              key={`${chip.key}-${chip.label}`}
              onClick={() => clearSingleFilter(chip.key)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
            >
              {chip.label}
              <X size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <FilterChipGroup
          label="Location"
          options={locationOptions}
          selectedValue={filters.location}
          onSelect={(value) => onFiltersChange((current) => ({ ...current, location: value }))}
        />

        <FilterChipGroup
          label="Skill level"
          options={SKILL_FILTER_OPTIONS}
          selectedValue={filters.skill}
          onSelect={(value) => onFiltersChange((current) => ({ ...current, skill: value as FilterState['skill'] }))}
        />

        <FilterChipGroup
          label="Play style"
          options={STYLE_FILTER_OPTIONS}
          selectedValue={filters.playStyle}
          onSelect={(value) => onFiltersChange((current) => ({ ...current, playStyle: value as FilterState['playStyle'] }))}
        />

        <FilterChipGroup
          label="Availability"
          options={AVAILABILITY_FILTER_OPTIONS}
          selectedValue={filters.availability}
          onSelect={(value) => onFiltersChange((current) => ({ ...current, availability: value as FilterState['availability'] }))}
        />

        <FilterChipGroup
          label="Preferred format"
          options={GAME_FILTER_OPTIONS}
          selectedValue={filters.gameType}
          onSelect={(value) => onFiltersChange((current) => ({ ...current, gameType: value as FilterState['gameType'] }))}
        />

        <FilterChipGroup
          label="Play vibe"
          options={SESSION_FILTER_OPTIONS}
          selectedValue={filters.session}
          onSelect={(value) => onFiltersChange((current) => ({ ...current, session: value as FilterState['session'] }))}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => onFiltersChange((current) => ({ ...current, verifiedOnly: !current.verifiedOnly }))}
          className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
            filters.verifiedOnly
              ? 'border border-slate-900 bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Verified only
        </button>
        <button
          onClick={() => onFiltersChange((current) => ({ ...current, activeRecently: !current.activeRecently }))}
          className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
            filters.activeRecently
              ? 'border border-slate-900 bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          Active recently
        </button>
      </div>
    </section>
  );
};
