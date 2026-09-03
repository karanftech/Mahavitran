'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import OfflineSyncBanner from '@/components/offline/OfflineSyncBanner';
import { useAuth } from '@/hooks/useAuth';
import MahavitaranPageLoader from '@/components/ui/MahavitaranPageLoader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isMapPage = pathname === '/map' || pathname.startsWith('/map');

  // Full-Screen Mahavitaran Page Loader while initial session is verifying
  if (isLoading) {
    return <MahavitaranPageLoader message="Initializing Mahavitaran Field Portal..." fullScreen={true} />;
  }

  // Auth pages (Login / Register) without sidebar
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {!isMapPage && <Navbar />}
      <OfflineSyncBanner />
      <div className="flex flex-1 relative overflow-hidden pb-16 md:pb-0">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto ${isMapPage ? 'h-screen' : 'min-h-[calc(100vh-4rem)]'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
