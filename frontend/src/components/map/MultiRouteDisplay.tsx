'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MultiRouteCalculationResult, MultiRouteStop, Customer } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import {
  Route,
  StopCircle,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  List,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { speakInstruction } from '@/utils/speech';

interface MultiRouteDisplayProps {
  multiRoute: MultiRouteCalculationResult;
  currentStopIndex: number;
  allCustomers: Customer[];
  onSelectStopIndex: (index: number) => void;
  onStopNavigation: () => void;
  onCollectPaymentForStop: (customer: Customer) => void;
}

export default function MultiRouteDisplay({
  multiRoute,
  currentStopIndex,
  allCustomers,
  onSelectStopIndex,
  onStopNavigation,
  onCollectPaymentForStop,
}: MultiRouteDisplayProps) {
  const [showStopsList, setShowStopsList] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const prevStopRef = useRef<number>(-1);

  if (!multiRoute || !multiRoute.stops || multiRoute.stops.length === 0) return null;

  const totalStops = multiRoute.stops.length;
  const currentStop: MultiRouteStop = multiRoute.stops[currentStopIndex] || multiRoute.stops[0];

  const activeCustomer =
    allCustomers.find((c) => c.customer_id === currentStop.customer_id) || {
      id: currentStop.customer_id,
      customer_id: currentStop.customer_id,
      name: currentStop.name,
      meter_number: currentStop.meter_number,
      phone: '',
      address: currentStop.address,
      area: '',
      latitude: currentStop.latitude,
      longitude: currentStop.longitude,
      pending_amount: currentStop.pending_amount,
      status: 'pending' as const,
      meters: [],
    };

  const remainingPendingTotal = multiRoute.stops
    .slice(currentStopIndex)
    .reduce((sum, s) => sum + s.pending_amount, 0);

  // Audio voice navigation when changing stops
  useEffect(() => {
    if (prevStopRef.current !== currentStopIndex && currentStop) {
      prevStopRef.current = currentStopIndex;
      const announcement = `Navigating to stop ${currentStopIndex + 1} of ${totalStops}: Consumer ${currentStop.name}, meter number ${currentStop.meter_number}.`;
      speakInstruction(announcement, isMuted);
    }
  }, [currentStopIndex, currentStop, totalStops, isMuted]);

  const handleNext = () => {
    if (currentStopIndex < totalStops - 1) {
      onSelectStopIndex(currentStopIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStopIndex > 0) {
      onSelectStopIndex(currentStopIndex - 1);
    }
  };

  // Minimized Small Icon View
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-4 z-40 animate-fade-in">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-3 text-white">
          <button
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs hover:bg-blue-500 transition-colors"
            title="Expand Multi-Route Bar"
          >
            <Route className="w-4 h-4" />
          </button>

          <div
            onClick={() => setIsMinimized(false)}
            className="cursor-pointer flex items-center gap-2"
          >
            <span className="font-extrabold text-sm text-blue-400">
              Stop {currentStopIndex + 1}/{totalStops}
            </span>
            <span className="text-xs text-slate-300 font-semibold line-clamp-1 max-w-[120px]">
              ({currentStop.name})
            </span>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-full border transition-colors ${
              isMuted
                ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                : 'bg-blue-600/30 text-blue-300 border-blue-500/40 hover:bg-blue-600/50'
            }`}
            title={isMuted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Expand Navigation Control"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Minimal Top Bar View
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xl z-40 space-y-2">
      {/* Sleek Minimal Floating Navigation Top Bar */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Route Summary & Active Stop */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                Shortest Route
              </span>
              <span className="text-[11px] text-slate-300 font-semibold">
                {multiRoute.total_distance_text} • {multiRoute.total_duration_text}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-extrabold text-sm text-white">
                Stop {currentStopIndex + 1} of {totalStops}
              </span>
              <span className="text-slate-400 font-medium text-xs line-clamp-1 max-w-[180px]">
                ({currentStop.name})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Audio Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                : 'bg-blue-600/30 text-blue-300 border-blue-500/40 hover:bg-blue-600/50'
            }`}
            title={isMuted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Prev / Next Stop */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={handlePrev}
              disabled={currentStopIndex === 0}
              className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 transition-colors"
              title="Previous Stop"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentStopIndex === totalStops - 1}
              className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 transition-colors"
              title="Next Stop"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Collect Button */}
          <button
            onClick={() => onCollectPaymentForStop(activeCustomer)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            title="Collect Payment"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Collect</span> {formatCurrency(currentStop.pending_amount)}
          </button>

          {/* Toggle Stops Drawer */}
          <button
            onClick={() => setShowStopsList(!showStopsList)}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showStopsList
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="All Stops List"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Minimize into small icon"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Exit Button */}
          <button
            onClick={onStopNavigation}
            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
            title="Exit Route"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Optional Collapsible Stops Drawer */}
      {showStopsList && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5 text-white shadow-2xl animate-slide-down">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200">Optimized Tour Stops Sequence</span>
            <span className="text-[11px] text-amber-400 font-bold">
              Remaining: {formatCurrency(remainingPendingTotal)}
            </span>
          </div>

          {multiRoute.stops.map((stop, idx) => {
            const isCurrent = idx === currentStopIndex;
            const isPassed = idx < currentStopIndex;

            return (
              <div
                key={stop.customer_id}
                onClick={() => onSelectStopIndex(idx)}
                className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between border ${
                  isCurrent
                    ? 'bg-blue-600/30 border-blue-500 text-white font-bold'
                    : isPassed
                    ? 'bg-slate-800/40 border-slate-800 opacity-50 text-slate-400'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-blue-500 text-white'
                        : isPassed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-3 h-3" /> : stop.sequence}
                  </div>
                  <div>
                    <p className="text-xs font-bold line-clamp-1">{stop.name}</p>
                    <p className="text-[10px] text-slate-400">Meter #{stop.meter_number}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-amber-400">{formatCurrency(stop.pending_amount)}</p>
                  <p className="text-[10px] text-slate-400">{stop.distance_from_prev_text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
