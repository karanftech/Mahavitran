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
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/api/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};
