'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  ArrowUp,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { NavigationState, Customer, MultiRouteCalculationResult } from '@/types';
import { speakInstruction, stopSpeech } from '@/utils/speech';

interface NavigationPanelProps {
  navState: NavigationState;
  onExitNavigation: () => void;
  onCollectPayment?: (customer?: Customer) => void;
  onRecalculateRoute?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  multiRoute?: MultiRouteCalculationResult | null;
  currentStopIndex?: number;
  onSelectStopIndex?: (index: number) => void;
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
  isMuted: isMutedProp,
  onToggleMute,
  multiRoute,
  currentStopIndex = 0,
  onSelectStopIndex,
}: NavigationPanelProps) {
  // Use external mute state if provided, otherwise manage internally
  const [isMutedInternal, setIsMutedInternal] = useState<boolean>(false);
  const isMuted = isMutedProp !== undefined ? isMutedProp : isMutedInternal;
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const prevInstructionRef = useRef<string>('');

  const target = navState.targetCustomer;
  const currentInstruction = target
    ? navState.currentStepInstruction || `Proceed along main road towards consumer meter`
    : '';

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onToggleMute) {
      // Controlled from outside (MapControls)
      onToggleMute();
    } else {
      setIsMutedInternal((prev) => {
        const next = !prev;
        if (next) {
          stopSpeech();
        } else if (target?.name) {
          speakInstruction(target.name, false);
        }
        return next;
      });
    }
  };

  // ── ALL HOOKS BEFORE ANY CONDITIONAL RETURN ──────────────────────────────

  // Audio: speak live navigation instructions including customer name
  const prevAudioTextRef = useRef<string>('');
  useEffect(() => {
    if (!navState.active || !target?.name || !currentInstruction) return;
    const fullAudioText = `Navigating to ${target.name}. ${currentInstruction}`;
    if (fullAudioText !== prevAudioTextRef.current) {
      prevAudioTextRef.current = fullAudioText;
      speakInstruction(fullAudioText, isMuted);
    }
  }, [target?.name, currentInstruction, navState.active, isMuted]);

  // Audio: announce off-route alert
  useEffect(() => {
    if (navState.isOffRoute && navState.active && target?.name) {
      speakInstruction(`You are off route navigating to ${target.name}. Recalculating path.`, isMuted);
    }
  }, [navState.isOffRoute, navState.active, target?.name, isMuted]);

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
      {/* ── TOP NAVIGATION HEADER (Matching Photo 2) ──────────────────────────── */}
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

        {/* Main Top Header Bar */}
        <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-3 shadow-2xl border-b border-slate-800">
          {/* Back Exit Button */}
          <button
            onClick={onExitNavigation}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Exit Navigation"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Title & Customer Subtitle */}
          <div className="flex-1 min-w-0">
            {multiRoute ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-white leading-none">
                    Stop {currentStopIndex + 1} of {multiRoute.stops.length}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold truncate">
                    ({multiRoute.total_distance_text} • {multiRoute.total_duration_text})
                  </span>
                </div>
                <p className="text-[11px] font-bold text-sky-400 mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{target.name}</span>
                  <span className="text-slate-400">• Meter: {target.meter_number}</span>
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-white leading-none">
                    {navState.durationText || 'Calculating...'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    ({navState.distanceText || 'Nearby'})
                  </span>
                </div>
                <p className="text-[11px] font-bold text-sky-400 mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{target.name}</span>
                  <span className="text-slate-400">• Meter: {target.meter_number}</span>
                </p>
              </div>
            )}
          </div>

          {/* Right Action Icons Group */}
          <div className="flex items-center gap-2 shrink-0">
            {multiRoute && onSelectStopIndex && (
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  disabled={currentStopIndex <= 0}
                  onClick={() => onSelectStopIndex(currentStopIndex - 1)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Stop"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-slate-400 px-1">
                  {currentStopIndex + 1}/{multiRoute.stops.length}
                </span>
                <button
                  disabled={currentStopIndex >= multiRoute.stops.length - 1}
                  onClick={() => onSelectStopIndex(currentStopIndex + 1)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Stop"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mute Audio Button */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-blue-600/30 text-sky-300 border-blue-500/40 hover:bg-blue-600/50'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Minimize / Expand Button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Minimize"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM TURN-BY-TURN CARD (Matching Photo 2) ────────────────────────── */}
      <div className="absolute bottom-[72px] md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-40 animate-slide-up">
        <div className="bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
          {/* Direction Strip */}
          <div className="flex items-stretch">
            {/* Direction Arrow Block */}
            <div className="bg-sky-600 flex items-center justify-center px-5 shrink-0 min-w-[56px]">
              {getDirectionIcon(currentInstruction)}
            </div>

            {/* Instruction Text */}
            <div className="flex-1 min-w-0 px-4 py-3 bg-slate-900/90">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-400">
                  Next Turn
                </span>
                <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  Live Audio
                </span>
              </div>
              <p className="text-sm font-extrabold text-white leading-snug line-clamp-2">
                {currentInstruction}
              </p>
            </div>
          </div>

          {/* Destination Details */}
          <div className="px-4 py-2.5 bg-slate-800/60 border-t border-slate-700/60 flex items-center justify-between gap-3">
            <div className="shrink-0">
              <p className="text-[11px] font-semibold text-slate-400">Destination</p>
              <p className="text-xs font-black text-amber-400 mt-0.5">
                ₹{target.pending_amount.toLocaleString('en-IN')} pending
              </p>
            </div>
            <p className="text-[11px] text-slate-300 font-medium text-right line-clamp-2 flex-1 min-w-0">
              {target.address}
            </p>
          </div>

          {/* Collect Payment Button */}
          {onCollectPayment && (
            <div className="px-3 py-2.5 border-t border-slate-700/60">
              <button
                onClick={() => onCollectPayment()}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Arrived — Collect ₹{target.pending_amount.toLocaleString('en-IN')}</span>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
