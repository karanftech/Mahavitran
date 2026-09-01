'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, User, AlertCircle, ArrowRight, Lock, Mail, UserPlus } from 'lucide-react';
import { authService } from '@/services/authService';
import MahavitaranLogo from '@/components/ui/MahavitaranLogo';
import MahavitaranPageLoader from '@/components/ui/MahavitaranPageLoader';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.login(email, password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 401) {
        setError('Invalid credentials. Please check your official email and password.');
      } else if (!err.response) {
        setError('Unable to connect to backend server. Please verify backend service is running.');
      } else {
        setError('Login failed. Please check credentials or database server.');
      }
    }
  };

  if (isLoading) {
    return <MahavitaranPageLoader message="Signing in & initializing portal..." fullScreen={true} />;
  }




  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Official Mahavitaran Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <MahavitaranLogo size="lg" showSubtitle={true} />
          </div>
          <div className="pt-2">
            <h2 className="text-xl font-extrabold text-slate-900">Field Officer Login</h2>
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
                placeholder="officer@electricity.gov.in"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to Mahavitaran Portal</span>
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
    </div>
  );
}
