'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getCurrentUser();
      setUser(storedUser);
      setIsLoading(false);
    };

    initAuth();

    const handleStorageChange = () => {
      setUser(authService.getCurrentUser());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isOfficer: user?.role === 'field_officer',
    isLoading,
  };
}
