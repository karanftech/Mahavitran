'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Navigation, Loader2, Square, Check, X, Calendar, DollarSign, Users } from 'lucide-react';
import { MapFilterState } from '@/types';

interface MapFiltersProps {
  filters: MapFilterState;
  onFilterChange: (newFilters: MapFilterState) => void;
  customerCounts?: { all: number; pending: number; overdue: number; paid: number };
  onNavigateAll?: () => void;
  onStopNavigation?: () => void;
  isNavigating?: boolean;
  isCalculatingMultiRoute?: boolean;
  filteredCount?: number;
}

export default function MapFilters({
  filters,
  onFilterChange,
  customerCounts,
  onNavigateAll,
  onStopNavigation,
  isNavigating = false,
  isCalculatingMultiRoute = false,
  filteredCount,
}: MapFiltersProps) {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions: { key: MapFilterState['status']; label: string; icon: React.ElementType; count?: number; subtitle: string }[] = [
    {
      key: 'all',
      label: 'All Customers',
      icon: Users,
      count: customerCounts?.all,
      subtitle: 'Show all assigned consumer accounts',
    },
    {
      key: 'pending',
      label: 'Pending Amt',
      icon: DollarSign,
      count: customerCounts?.pending,
      subtitle: 'Filter consumers with unpaid bill amounts',
    },
    {
      key: 'overdue',
      label: 'No. of Days',
      icon: Calendar,
      count: customerCounts?.overdue,
      subtitle: 'Filter overdue accounts & high priority dues',
    },
  ];

  const currentFilterObj = filterOptions.find((f) => f.key === filters.status) || filterOptions[0];

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Google Maps Style Single Floating Search Pill Bar */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-2 shadow-lg flex items-center gap-3 transition-all hover:shadow-xl focus-within:ring-2 focus-within:ring-blue-500/30">
        
        {/* Search Icon */}
        <Search className="w-4 h-4 text-slate-400 shrink-0" />

        {/* Input Field */}
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Search customer, ID, meter #, address..."
          className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
        />

        {/* Right Action Icons Group */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-200">
          
          {/* 1. Filter Icon Button */}
          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
              isFilterDropdownOpen || filters.status !== 'all'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Filter Customers (All, Pending Amt, No. of Days)"
          >
            <Filter className="w-4 h-4" />
            {filters.status !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1 right-1 ring-2 ring-white"></span>
            )}
          </button>

          {/* 2. Start / Stop Route Icon Button */}
          {isNavigating ? (
            /* Circular Red STOP Icon Button when navigation is active */
            <button
              onClick={onStopNavigation}
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
              title="Stop Route Navigation"
            >
              <Square className="w-3.5 h-3.5 fill-white stroke-none" />
            </button>
          ) : (
            /* Circular Blue Start Navigation Icon Button when idle */
            onNavigateAll && (
              <button
                onClick={onNavigateAll}
                disabled={isCalculatingMultiRoute || filteredCount === 0}
                className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Start Route Navigation"
              >
                {isCalculatingMultiRoute ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Navigation className="w-4 h-4 fill-white stroke-none" />
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Animated Filter Dropdown Menu */}
      {isFilterDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2.5 shadow-xl space-y-1 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Filter Customers</span>
            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
              Active: {currentFilterObj.label}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            {filterOptions.map((opt) => {
              const IconComp = opt.icon;
              const isSelected = filters.status === opt.key;

              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    onFilterChange({ ...filters, status: opt.key });
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{opt.label}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {opt.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {opt.count !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
