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
          speakInstruction(target.name, isMuted);
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
      <div className="absolute bottom-6 left-4 z-40 animate-fade-in">
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
              {navState.durationText || '< 1 min'}
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

  // Full Active Turn-By-Turn Navigation Card
  return (
    <div className="absolute bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-40 animate-slide-up">
      <div className="bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Top Header / Direction Strip */}
        <div className="flex items-stretch border-b border-slate-800">
          {/* Direction Arrow Block */}
          <div className="bg-sky-600 flex items-center justify-center px-4 shrink-0 min-w-[54px]">
            {getDirectionIcon(currentInstruction)}
          </div>

          {/* Instruction & Duration Text */}
          <div className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-900/95">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-400 truncate">
                {multiRoute ? `Stop ${currentStopIndex + 1} of ${multiRoute.stops.length}` : 'Navigating'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black text-white">
                  {navState.durationText || '< 1 min'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  ({navState.distanceText})
                </span>
              </div>
            </div>
            <p className="text-xs font-extrabold text-white leading-snug line-clamp-2">
              {currentInstruction}
            </p>
          </div>

          {/* Action icons (Mute, Minimize, Exit) */}
          <div className="flex items-center gap-1 px-2.5 bg-slate-900/95 border-l border-slate-800 shrink-0">
            <button
              onClick={handleToggleMute}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-blue-600/30 text-sky-300 border-blue-500/40 hover:bg-blue-600/50'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExitNavigation}
              className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
              title="Exit Navigation"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Stop Sequence Stepper (If Multi-Route) */}
        {multiRoute && onSelectStopIndex && multiRoute.stops.length > 1 && (
          <div className="px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs">
            <button
              disabled={currentStopIndex <= 0}
              onClick={() => onSelectStopIndex(currentStopIndex - 1)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Stop</span>
            </button>
            <span className="text-[11px] font-extrabold text-sky-400">
              Account {currentStopIndex + 1} of {multiRoute.stops.length}
            </span>
            <button
              disabled={currentStopIndex >= multiRoute.stops.length - 1}
              onClick={() => onSelectStopIndex(currentStopIndex + 1)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next Stop</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Consumer Destination Information */}
        <div className="px-4 py-2.5 bg-slate-800/50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-white truncate flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{target.name}</span>
            </p>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              Meter: <span className="font-bold text-sky-300">{target.meter_number}</span> • {target.address}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Pending</p>
            <p className="text-xs font-black text-amber-400">
              ₹{target.pending_amount?.toLocaleString('en-IN') || 0}
            </p>
          </div>
        </div>

        {/* Action Buttons: Collect Payment */}
        {onCollectPayment && (
          <div className="p-2.5 bg-slate-900 border-t border-slate-800">
            <button
              onClick={() => onCollectPayment(target)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Arrived — Collect ₹{target.pending_amount?.toLocaleString('en-IN') || 0}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

