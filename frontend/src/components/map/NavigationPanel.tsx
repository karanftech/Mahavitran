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
  Maximize2
} from 'lucide-react';
import { NavigationState } from '@/types';
import { speakInstruction } from '@/utils/speech';

interface NavigationPanelProps {
  navState: NavigationState;
  onExitNavigation: () => void;
  onCollectPayment?: () => void;
  onRecalculateRoute?: () => void;
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

  if (!navState.active || !navState.targetCustomer) return null;

  const target = navState.targetCustomer;
  const currentInstruction =
    navState.currentStepInstruction || `Drive to consumer meter at ${target.address || target.name}`;

  // Audio Navigation voice announcement trigger
  useEffect(() => {
    if (!navState.active) return;

    if (currentInstruction && currentInstruction !== prevInstructionRef.current) {
      prevInstructionRef.current = currentInstruction;
      speakInstruction(currentInstruction, isMuted);
    }
  }, [currentInstruction, navState.active, isMuted]);

  // Audio alert on off-route
  useEffect(() => {
    if (navState.isOffRoute) {
      speakInstruction("You are off route. Recalculating path.", isMuted);
    }
  }, [navState.isOffRoute, isMuted]);

  // Minimized Small Icon View
  if (isMinimized) {
    return (
      <div className="absolute top-4 left-4 z-40 animate-fade-in">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-3 text-white">
          {/* Small Navigation Icon Button (Clicking expands) */}
          <button
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-xs hover:bg-sky-500 transition-colors"
            title="Expand Navigation Panel"
          >
            <Navigation className="w-4 h-4 fill-white stroke-none transform rotate-45" />
          </button>

          {/* Quick Distance & Time Info */}
          <div
            onClick={() => setIsMinimized(false)}
            className="cursor-pointer flex items-center gap-2"
          >
            <span className="text-sm font-black text-sky-400">
              {navState.durationText || 'Calculating...'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              ({navState.distanceText})
            </span>
          </div>

          {/* Audio Mute/Unmute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className={`p-1.5 rounded-full border transition-colors ${
              isMuted
                ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                : 'bg-blue-600/30 text-sky-300 border-blue-500/40 hover:bg-blue-600/50'
            }`}
            title={isMuted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Expand Icon Button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Expand Panel"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Full Expanded Navigation View
  return (
    <>
      {/* Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onExitNavigation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit</span>
            </button>

            {/* Audio Mute/Unmute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold ${
                isMuted
                  ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-blue-600/30 text-sky-300 border-blue-500/40 hover:bg-blue-600/50'
              }`}
              title={isMuted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-black text-sky-400 leading-none">
                {navState.durationText || 'Calculating...'}
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                {navState.distanceText} • Target: <span className="text-white">{target.meter_number}</span>
              </p>
            </div>

            {/* Minimize Button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Minimize into small icon"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Off-Route Alert Bar */}
        {navState.isOffRoute && (
          <div className="mt-3 p-2.5 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between gap-2 text-amber-300 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span>You're off route. Recalculating...</span>
            </div>
            {onRecalculateRoute && (
              <button
                onClick={onRecalculateRoute}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase rounded-md transition-colors"
              >
                Reroute
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Turn-by-Turn Instruction Banner */}
      <div className="absolute bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-600 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30">
            <Navigation className="w-6 h-6 fill-white stroke-none transform rotate-45" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-400">
                Next Instruction
              </span>
              {!isMuted && (
                <span className="text-[10px] text-sky-300 font-bold flex items-center gap-1 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  <Volume2 className="w-3 h-3" /> Voice On
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-100 line-clamp-2 mt-0.5 leading-snug">
              {currentInstruction}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Destination: <span className="text-amber-400 font-bold">₹{target.pending_amount.toLocaleString('en-IN')}</span> ({target.name})
            </p>
          </div>
        </div>

        {onCollectPayment && (
          <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Arrived at consumer?</span>
            <button
              onClick={onCollectPayment}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Collect ₹{target.pending_amount.toLocaleString('en-IN')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
