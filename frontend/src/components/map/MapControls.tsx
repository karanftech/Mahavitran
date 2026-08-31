'use client';

import React, { useState } from 'react';
import { Crosshair, Layers, Maximize2, Compass, Eye, Plus, Minus, Check } from 'lucide-react';
import { MapLayerType } from '@/types';

interface MapControlsProps {
  currentLayer: MapLayerType;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onSelectLayer: (layer: MapLayerType) => void;
  onFitBounds: () => void;
  onOpenStreetView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export default function MapControls({
  currentLayer,
  isFollowing,
  onToggleFollow,
  onSelectLayer,
  onFitBounds,
  onOpenStreetView,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) {
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const layerOptions: { type: MapLayerType; label: string }[] = [
    { type: 'roadmap', label: 'Default Map' },
    { type: 'satellite', label: 'Satellite' },
    { type: 'hybrid', label: 'Hybrid' },
    { type: 'terrain', label: 'Terrain' },
  ];

  return (
    <div className="absolute bottom-24 right-4 md:bottom-6 md:right-6 flex flex-col gap-2 z-30 select-none">
      {/* Map Layers Switcher Button & Popup */}
      <div className="relative">
        <button
          onClick={() => setIsLayerMenuOpen((prev) => !prev)}
          className={`w-10 h-10 rounded-xl font-semibold border shadow-lg flex items-center justify-center transition-all ${
            isLayerMenuOpen
              ? 'bg-slate-900 text-sky-400 border-slate-700 ring-2 ring-sky-500'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Switch Map Layer"
        >
          <Layers className="w-5 h-5" />
        </button>

        {isLayerMenuOpen && (
          <div className="absolute right-12 bottom-0 w-44 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3 py-1">
              Map Style
            </p>
            <div className="space-y-1">
              {layerOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => {
                    onSelectLayer(opt.type);
                    setIsLayerMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    currentLayer === opt.type
                      ? 'bg-sky-600 text-white'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentLayer === opt.type && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 360° Street View Toggle */}
      {onOpenStreetView && (
        <button
          onClick={onOpenStreetView}
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-indigo-600 font-semibold border border-slate-200 shadow-lg flex items-center justify-center transition-transform active:scale-95"
          title="View 360° Street View"
        >
          <Eye className="w-5 h-5" />
        </button>
      )}

      {/* Recenter & Follow-Me Toggle */}
      <button
        onClick={onToggleFollow}
        className={`w-10 h-10 rounded-xl font-semibold border shadow-lg flex items-center justify-center transition-all ${
          isFollowing
            ? 'bg-sky-600 text-white border-sky-500 ring-2 ring-sky-400 animate-pulse'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
        title={isFollowing ? 'Follow-Me Camera ON (Click to unlock)' : 'Recenter & Lock Camera on Officer'}
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* Fit All Assigned Meters Bounds */}
      <button
        onClick={onFitBounds}
        className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-lg flex items-center justify-center transition-transform active:scale-95"
        title="Fit All Assigned Meters"
      >
        <Maximize2 className="w-5 h-5" />
      </button>

      {/* Zoom In & Zoom Out Controls */}
      {onZoomIn && (
        <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={onZoomIn}
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 border-b border-slate-200 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onZoomOut && (
            <button
              onClick={onZoomOut}
              className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
