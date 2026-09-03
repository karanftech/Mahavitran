'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isOfficer: user?.role === 'field_officer',
    isLoading,
  };
}
