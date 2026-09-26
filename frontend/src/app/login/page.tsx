'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Lock, Mail, UserPlus, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.login(email, password);
      // Ensure cookies and localstorage are fully evaluated by doing top-level navigation
      window.location.href = '/dashboard';
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 401) {
        setError('Invalid credentials. Please check your official email and password.');
      } else if (!err.response) {
        setError('Unable to connect to backend server. Please verify backend service is running on port 8000.');
      } else {
        setError('Login failed. Please check credentials or database server.');
      }
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('officer123');
    setError(null);
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900">Login</h2>
          <p className="text-xs text-slate-500 font-medium">Enter your credentials to access the Field Officer portal</p>
        </div>

        {/* Quick Demo Access Card */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900">Demo Accounts (Click to Fill):</span>
            <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-mono">pwd: officer123</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('officer1@electricity.gov.in')}
              className="text-left font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline bg-white px-2.5 py-1.5 rounded border border-blue-200 flex items-center justify-between"
            >
              <span>officer1@electricity.gov.in</span>
              <span className="text-[10px] text-slate-500 font-sans">Officer 1</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('officer.nagpur@maharashtra.gov.in')}
              className="text-left font-mono text-xs text-blue-700 hover:text-blue-900 hover:underline bg-white px-2.5 py-1.5 rounded border border-blue-200 flex items-center justify-between"
            >
              <span>officer.nagpur@maharashtra.gov.in</span>
              <span className="text-[10px] text-emerald-600 font-sans font-semibold">89 Customers</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg text-xs text-red-700 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Official Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer1@electricity.gov.in"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Register Navigation Link */}
        <div className="text-center pt-1">
          <p className="text-xs text-slate-600">
            New Field Officer?{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Self Register Here
            </Link>
          </p>
        </div>
      </div>
  );
}
