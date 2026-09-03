'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  ArrowUp,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { NavigationState, Customer } from '@/types';
import { speakInstruction, stopSpeech } from '@/utils/speech';

interface NavigationPanelProps {
  navState: NavigationState;
  onExitNavigation: () => void;
  onCollectPayment?: (customer?: Customer) => void;
  onRecalculateRoute?: () => void;
}

// Pure helper — determines direction arrow icon from instruction text
function getDirectionIcon(instruction: string) {
  const lower = instruction.toLowerCase();
  if (lower.includes('right')) return <ArrowRight className="w-7 h-7 text-white" />;
  if (lower.includes('left')) return <ArrowRight className="w-7 h-7 text-white transform scale-x-[-1]" />;
  if (lower.includes('u-turn')) return <ArrowLeft className="w-7 h-7 text-white" />;
  return <ArrowUp className="w-7 h-7 text-white" />;
}

export default function NavigationPanel({
  navState,
  onExitNavigation,
  onCollectPayment,
  onRecalculateRoute,
}: NavigationPanelProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const prevInstructionRef = useRef<string>('');

  const target = navState.targetCustomer;
  const currentInstruction = target
    ? navState.currentStepInstruction || `Drive to consumer meter at ${target.address || target.name}`
    : '';

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        stopSpeech();
      } else if (target?.name) {
        speakInstruction(target.name, false);
      }
      return next;
    });
  };

  // ── ALL HOOKS BEFORE ANY CONDITIONAL RETURN ──────────────────────────────

  // Audio: speak ONLY customer name when navigation starts
  const prevCustomerNameRef = useRef<string>('');
  useEffect(() => {
    if (!navState.active || !target?.name) return;
    if (target.name !== prevCustomerNameRef.current) {
      prevCustomerNameRef.current = target.name;
      speakInstruction(target.name, isMuted);
    }
  }, [target?.name, navState.active, isMuted]);

  // Audio: announce off-route alert
  useEffect(() => {
    if (navState.isOffRoute && navState.active) {
      speakInstruction('You are off route. Recalculating path.', isMuted);
    }
  }, [navState.isOffRoute, navState.active, isMuted]);

  // ── CONDITIONAL RETURNS AFTER ALL HOOKS ──────────────────────────────────

  if (!navState.active || !target) return null;

  // Minimized pill view
  if (isMinimized) {
    return (
      <div className="absolute top-4 left-4 z-40 animate-fade-in">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-3 text-white">
          <button
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-xs hover:bg-sky-500 transition-colors"
            title="Expand Navigation Panel"
          >
            <Navigation className="w-4 h-4 fill-white stroke-none transform rotate-45" />
          </button>

          <div onClick={() => setIsMinimized(false)} className="cursor-pointer flex items-center gap-2">
            <span className="text-sm font-black text-sky-400">
              {navState.durationText || 'Calculating...'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              ({navState.distanceText})
            </span>
          </div>

          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                : 'bg-blue-600/30 text-sky-300 border-blue-500/40 hover:bg-blue-600/50'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Full Google Maps-like Navigation View
  return (
    <>
      {/* ── TOP NAVIGATION HEADER ──────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-40">
        {/* Off-Route Alert */}
        {navState.isOffRoute && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between gap-2 text-sm font-bold shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
              <span>Off route — Recalculating...</span>
            </div>
            {onRecalculateRoute && (
              <button
                onClick={onRecalculateRoute}
                className="px-3 py-1 bg-slate-950 text-amber-400 text-xs font-black rounded-lg"
              >
                Reroute Now
              </button>
            )}
          </div>
        )}

        {/* Main Top Bar */}
        <div className="bg-slate-900 px-4 pt-3 pb-3 flex items-center gap-3 shadow-2xl border-b border-slate-800">
          {/* Exit Button */}
          <button
            onClick={onExitNavigation}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* ETA + Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white leading-none">
                {navState.durationText || '—'}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                ({navState.distanceText || 'Calculating...'})
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
              <MapPin className="w-3 h-3 inline-block mr-0.5 -mt-0.5 text-sky-500" />
              {target.name} • Meter: {target.meter_number}
            </p>
          </div>

          {/* Audio + Minimize */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-slate-800 text-rose-400 border-slate-700'
                  : 'bg-blue-600/30 text-sky-300 border-blue-500/40'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM TURN-BY-TURN CARD ────────────────────────── */}
      <div className="absolute bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-4 md:w-96 z-40 animate-slide-up">
        <div className="bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
          {/* Direction Strip */}
          <div className="flex items-stretch">
            {/* Direction Arrow Block */}
            <div className="bg-sky-600 flex items-center justify-center px-5 shrink-0">
              {getDirectionIcon(currentInstruction)}
            </div>

            {/* Instruction Text */}
            <div className="flex-1 min-w-0 px-4 py-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-sky-500">
                  Next Turn
                </span>
                {!isMuted && (
                  <span className="text-[10px] text-sky-400 font-bold flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5" /> Live Audio
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white leading-snug line-clamp-2">
                {currentInstruction}
              </p>
            </div>
          </div>

          {/* Destination Details */}
          <div className="px-4 py-2.5 bg-slate-800/60 border-t border-slate-700/60 flex items-center justify-between gap-3">
            <div className="shrink-0">
              <p className="text-[11px] font-semibold text-slate-400">Destination</p>
              <p className="text-xs font-bold text-amber-400 mt-0.5">
                ₹{target.pending_amount.toLocaleString('en-IN')} pending
              </p>
            </div>
            <p className="text-[11px] text-slate-400 font-medium text-right line-clamp-2 flex-1 min-w-0">
              {target.address}
            </p>
          </div>

          {/* Collect Payment Button */}
          {onCollectPayment && (
            <div className="px-4 py-3 border-t border-slate-700/60">
              <button
                onClick={() => onCollectPayment()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Arrived — Collect ₹{target.pending_amount.toLocaleString('en-IN')}</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
