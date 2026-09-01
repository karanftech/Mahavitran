'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Navigation, CreditCard, Clock, Phone, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Customer } from '@/types';
import { formatCurrency, formatDate, formatDistance, formatDuration } from '@/utils/formatters';
import { getMarkerStatusColor } from '@/utils/geo';

interface CustomerBottomSheetProps {
  customer: Customer | null;
  officerCoords?: { latitude: number; longitude: number } | null;
  distanceMeters?: number;
  durationSeconds?: number;
  onClose: () => void;
  onNavigate: (customer: Customer) => void;
  onCollectPayment: (customer: Customer) => void;
  onViewStreetView?: (customer: Customer) => void;
}

export default function CustomerBottomSheet({
  customer,
  distanceMeters,
  durationSeconds,
  onClose,
  onNavigate,
  onCollectPayment,
  onViewStreetView,
}: CustomerBottomSheetProps) {
  if (!customer) return null;

  const { badgeClass } = getMarkerStatusColor(customer.status, customer.priority, true);

  return (
    <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 animate-slide-up max-h-[52vh] md:max-h-none overflow-y-auto">
      <div className="p-4">
      {/* Top Header & Drag Handle */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}>
            {customer.status}
          </span>
          {customer.priority === 'high' || customer.priority === 'critical' ? (
            <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-bold border border-red-200">
              <AlertCircle className="w-3 h-3 text-red-600" /> High Priority
            </span>
          ) : null}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Customer Info */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-black text-slate-900 leading-snug">{customer.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              ID: <span className="text-slate-800 font-bold">{customer.customer_id}</span> • Meter: <span className="text-slate-800 font-bold">{customer.meter_number}</span>
            </p>
          </div>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Call Customer"
            >
              <Phone className="w-4 h-4 text-blue-600" />
            </a>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{customer.address}</span>
        </div>

        {/* Distance & Travel Time indicator */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-600" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Distance</p>
              <p className="text-xs font-black text-slate-800">
                {distanceMeters !== undefined ? formatDistance(distanceMeters) : 'Nearby'}
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Est. Travel</p>
              <p className="text-xs font-black text-slate-800">
                {durationSeconds !== undefined ? formatDuration(durationSeconds) : '~5 mins'}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Amount & Due Date */}
        <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-300/40 flex justify-between items-center mt-2">
          <div>
            <p className="text-[10px] text-amber-800 uppercase font-black tracking-wider">Pending Amount</p>
            <p className="text-lg font-black text-amber-700">{formatCurrency(customer.pending_amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Due Date</p>
            <p className="text-xs font-bold text-slate-800">{formatDate(customer.due_date)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={() => onNavigate(customer)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md transition-all active:scale-95 text-center cursor-pointer"
        >
          <Navigation className="w-4 h-4 fill-white stroke-none" />
          <span>START NAVIGATION</span>
        </button>

        <button
          onClick={() => onCollectPayment(customer)}
          disabled={customer.status === 'paid'}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
            customer.status === 'paid'
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>COLLECT PAYMENT</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {onViewStreetView && (
          <button
            onClick={() => onViewStreetView(customer)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors text-center cursor-pointer"
          >
            <span>VIEW 360°</span>
          </button>
        )}

        <Link
          href={`/customers/${customer.customer_id}`}
          className="flex items-center justify-center py-2 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-colors text-center"
        >
          <span>VIEW DETAILS</span>
        </Link>
      </div>
      </div>
    </div>
  );
}
