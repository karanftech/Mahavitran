'use client';

import React, { useEffect, useRef } from 'react';
import { X, EyeOff, AlertCircle } from 'lucide-react';
import { StreetViewState } from '@/types';

interface StreetViewModalProps {
  streetView: StreetViewState;
  onClose: () => void;
}

export default function StreetViewModal({ streetView, onClose }: StreetViewModalProps) {
  const panoRef = useRef<HTMLDivElement>(null);
  const googlePanoObjRef = useRef<any>(null);

  useEffect(() => {
    if (!streetView.isOpen || !streetView.isAvailable || !panoRef.current) return;
    if (!(window as any).google || !(window as any).google.maps) return;

    try {
      const fenway = new (window as any).google.maps.LatLng(streetView.lat, streetView.lng);
      googlePanoObjRef.current = new (window as any).google.maps.StreetViewPanorama(panoRef.current, {
        position: fenway,
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
        addressControl: true,
        showRoadLabels: true,
        motionTracking: true,
        motionTrackingControl: true,
      });
    } catch (err) {
      console.warn('Failed to render Street View Panorama:', err);
    }

    return () => {
      if (googlePanoObjRef.current) {
        googlePanoObjRef.current = null;
      }
      if (panoRef.current) {
        panoRef.current.innerHTML = '';
      }
    };
  }, [streetView]);

  if (!streetView.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              360° Street View Panorama
            </h3>
            {streetView.customerName && (
              <p className="text-xs text-slate-400 mt-0.5">
                Consumer: <span className="text-slate-200 font-bold">{streetView.customerName}</span> ({streetView.address})
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative bg-slate-950">
          {streetView.isChecking ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold">Verifying 360° Street View imagery...</p>
            </div>
          ) : !streetView.isAvailable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 mb-3">
                <EyeOff className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-200">360° Street View Not Available</h4>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Google Street View camera imagery is not currently available for this specific meter coordinate. You can still use road navigation to reach the address.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                Return to Map
              </button>
            </div>
          ) : (
            <div ref={panoRef} className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
}
