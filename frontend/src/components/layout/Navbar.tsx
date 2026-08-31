'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, LogOut, User as UserIcon } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';

import MahavitaranLogo from '@/components/ui/MahavitaranLogo';

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await authService.logout();
    router.push('/login');
  };

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
          <MahavitaranLogo size="md" showSubtitle={true} />
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5 bg-slate-100 border border-slate-200 rounded-md py-1.5 px-3">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-slate-500 capitalize font-medium">
                  Field Officer
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium border border-slate-300 shadow-xs"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
