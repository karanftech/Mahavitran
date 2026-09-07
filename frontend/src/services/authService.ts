import api from './api';
import { User } from '@/types';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async register(data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    assigned_area?: string;
  }): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/register', data);
    if (response.data.access_token) {
      sessionStorage.setItem('token', response.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/login', { email, password });
    if (response.data.access_token) {
      sessionStorage.setItem('token', response.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore network failures on logout
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/api/auth/me');
    sessionStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    // Purge old persistent localStorage auth data to require login on direct URL visits
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');
    if (!token || !userStr) return null;

    try {
      // Check client-side JWT token expiration
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token is expired - clear session immediately
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          return null;
        }
      }
      return JSON.parse(userStr);
    } catch {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      return null;
    }
  },
};
