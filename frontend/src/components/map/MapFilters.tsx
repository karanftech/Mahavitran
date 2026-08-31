'use client';

import React from 'react';
import { Search, Filter, Route, Loader2, Navigation } from 'lucide-react';
import { MapFilterState } from '@/types';

interface MapFiltersProps {
  filters: MapFilterState;
  onFilterChange: (newFilters: MapFilterState) => void;
  customerCounts?: { all: number; pending: number; overdue: number; paid: number };
  onNavigateAll?: () => void;
  isCalculatingMultiRoute?: boolean;
  filteredCount?: number;
}

export default function MapFilters({
  filters,
  onFilterChange,
  customerCounts,
  onNavigateAll,
  isCalculatingMultiRoute,
  filteredCount,
}: MapFiltersProps) {
  const statusOptions: { key: MapFilterState['status']; label: string; count?: number }[] = [
    { key: 'all', label: 'All Customers', count: customerCounts?.all },
    { key: 'pending', label: 'Pending', count: customerCounts?.pending },
    { key: 'overdue', label: 'Overdue (High Priority)', count: customerCounts?.overdue },
    { key: 'collected', label: 'Collected', count: customerCounts?.paid },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2.5 shadow-md space-y-2">
      {/* Search Bar & Navigate All Shortest Path Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search customer, ID, meter #, address..."
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {onNavigateAll && (
          <button
            onClick={onNavigateAll}
            disabled={isCalculatingMultiRoute || filteredCount === 0}
            className="px-3.5 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs shadow-md hover:shadow-lg flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Start optimized multi-stop route"
          >
            {isCalculatingMultiRoute ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Navigation className="w-3.5 h-3.5 fill-white stroke-none" />
            )}
            <span className="hidden sm:inline">Start Route</span>
            <span className="sm:hidden">Start</span>
            {filteredCount !== undefined && (
              <span className="bg-blue-900/60 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {filteredCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Status Badges Toolbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        {statusOptions.map((opt) => {
          const isActive = filters.status === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onFilterChange({ ...filters, status: opt.key })}
              className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors text-[11px] flex items-center gap-1 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

