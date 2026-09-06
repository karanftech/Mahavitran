'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Navigation, Loader2, Square, RotateCcw } from 'lucide-react';
import { MapFilterState, Customer, OverduePeriodFilter, OutstandingAmountFilter } from '@/types';

interface MapFiltersProps {
  filters: MapFilterState;
  onFilterChange: (newFilters: MapFilterState) => void;
  customerCounts?: { all: number; pending: number; overdue: number; paid: number };
  onNavigateAll?: () => void;
  onNavigateSelected?: () => void;
  onStopNavigation?: () => void;
  isNavigating?: boolean;
  isCalculatingMultiRoute?: boolean;
  filteredCount?: number;
  selectedCustomer?: Customer | null;
}

export default function MapFilters({
  filters,
  onFilterChange,
  customerCounts,
  onNavigateAll,
  onNavigateSelected,
  onStopNavigation,
  isNavigating = false,
  isCalculatingMultiRoute = false,
  filteredCount = 0,
  selectedCustomer,
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

  const overduePeriodOptions: { key: OverduePeriodFilter; label: string }[] = [
    { key: 'all', label: 'All Days (Show All)' },
    { key: 'less_15', label: '< 15 Days' },
    { key: '15_30', label: '15 – 30 Days' },
    { key: 'over_30', label: '> 30 Days Overdue' },
    { key: 'over_60', label: '> 60 Days (Critical)' },
    { key: 'over_120', label: '> 120 Days (Severe)' },
  ];

  const outstandingAmountOptions: { key: OutstandingAmountFilter; label: string }[] = [
    { key: 'all', label: 'All Amounts' },
    { key: 'less_500', label: '< ₹500' },
    { key: 'over_500', label: '> ₹500' },
    { key: 'over_5000', label: '> ₹5,000' },
    { key: 'over_10000', label: '> ₹10,000 (High Value)' },
  ];

  const isFilterActive =
    (filters.overduePeriod && filters.overduePeriod !== 'all') ||
    (filters.outstandingAmount && filters.outstandingAmount !== 'all') ||
    (filters.status && filters.status !== 'all');

  const handleResetFilters = () => {
    onFilterChange({
      ...filters,
      overduePeriod: 'all',
      outstandingAmount: 'all',
      status: 'all',
    });
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Floating Search & Filter Pill Bar */}
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
        <div className="flex items-center gap-2 shrink-0 pl-1 border-l border-slate-200">

          {/* Filter Icon & Label */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
                isFilterDropdownOpen || isFilterActive
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Filter Options"
            >
              <Filter className="w-4 h-4" />
              {isFilterActive && (
                <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-0.5 right-0.5 ring-2 ring-white"></span>
              )}
            </button>
            <span className="text-[9px] font-bold text-slate-500 leading-none">filter</span>
          </div>

          {/* Navigation Action Button */}
          {isNavigating ? (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={onStopNavigation}
                className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Stop Navigation"
              >
                <Square className="w-3 h-3 fill-white stroke-none" />
              </button>
              <span className="text-[9px] font-bold text-red-600 leading-none">stop</span>
            </div>
          ) : onNavigateAll ? (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={onNavigateAll}
                disabled={isCalculatingMultiRoute || filteredCount === 0}
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title={`Start Multi-Stop Route Navigation for all ${filteredCount} filtered accounts`}
              >
                {isCalculatingMultiRoute ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 fill-white stroke-none" />
                )}
              </button>
              <span className="text-[9px] font-bold text-blue-600 leading-none">start</span>
            </div>
          ) : selectedCustomer && onNavigateSelected ? (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={onNavigateSelected}
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title={`Start Navigation to ${selectedCustomer.name}`}
              >
                <Navigation className="w-3.5 h-3.5 fill-white stroke-none" />
              </button>
              <span className="text-[9px] font-bold text-blue-600 leading-none">start</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filter Options Dropdown Popup (Matching Photos 1 & 2) */}
      {isFilterDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          
          {/* Header & Reset */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Filter Options
            </span>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Section 1: FILTER BY OVERDUE PERIOD (Photo 1) */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              FILTER BY OVERDUE PERIOD
            </h4>
            <div className="flex flex-wrap gap-2">
              {overduePeriodOptions.map((opt) => {
                const isSelected = (filters.overduePeriod || 'all') === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      onFilterChange({ ...filters, overduePeriod: opt.key });
                    }}
                    className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-blue-600 bg-blue-50/80 text-blue-700 font-bold shadow-xs'
                        : 'border border-slate-200/80 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: FILTER BY OUTSTANDING AMOUNT (₹) (Photo 2) */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              FILTER BY OUTSTANDING AMOUNT (₹)
            </h4>
            <div className="flex flex-wrap gap-2">
              {outstandingAmountOptions.map((opt) => {
                const isSelected = (filters.outstandingAmount || 'all') === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      onFilterChange({ ...filters, outstandingAmount: opt.key });
                    }}
                    className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-emerald-600 bg-emerald-50/80 text-emerald-700 font-bold shadow-xs'
                        : 'border border-slate-200/80 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Button to Start Navigation to ALL Filtered Customers */}
          {onNavigateAll && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setIsFilterDropdownOpen(false);
                  onNavigateAll();
                }}
                disabled={isCalculatingMultiRoute || filteredCount === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculatingMultiRoute ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Navigation className="w-4 h-4 fill-white stroke-none" />
                )}
                <span>Navigate All {filteredCount} Filtered Customers</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 font-medium">
                Calculates optimized multi-stop route connecting all matching consumer accounts
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
