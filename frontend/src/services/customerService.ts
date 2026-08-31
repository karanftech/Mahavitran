import api from './api';
import { Customer, NearbyCustomer } from '@/types';

// In-Memory & Session Storage Cache Memory System
let memoryCustomerCache: Customer[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export const customerService = {
  clearCache() {
    memoryCustomerCache = null;
    lastCacheTime = 0;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('powercollect_customers_cache');
      } catch (e) {}
    }
  },

  async getCustomers(params?: {
    area?: string;
    status?: string;
    min_amount?: number;
    max_amount?: number;
    assigned_officer_id?: string;
    all_officers?: boolean;
    search?: string;
    limit?: number;
  }): Promise<Customer[]> {
    const isDefaultFetch =
      !params ||
      Object.keys(params).length === 0 ||
      (Object.keys(params).length === 1 && params.all_officers);

    // 1. Return In-Memory Cache Instantly if valid
    if (isDefaultFetch && memoryCustomerCache && Date.now() - lastCacheTime < CACHE_TTL_MS) {
      return memoryCustomerCache;
    }

    // 2. Return SessionStorage Cache Instantly if available
    if (isDefaultFetch && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('powercollect_customers_cache');
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          if (data && Array.isArray(data) && Date.now() - timestamp < CACHE_TTL_MS) {
            memoryCustomerCache = data;
            lastCacheTime = timestamp;
            return data;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // 3. Perform Network API Request
    const response = await api.get<Customer[]>('/api/customers', {
      params: { limit: 1000, ...params },
    });

    const data = response.data;

    // Cache the default response in Memory & SessionStorage
    if (isDefaultFetch && Array.isArray(data)) {
      memoryCustomerCache = data;
      lastCacheTime = Date.now();
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'powercollect_customers_cache',
            JSON.stringify({ data, timestamp: lastCacheTime })
          );
        } catch (e) {}
      }
    }

    return data;
  },

  async getNearbyCustomers(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    status?: string
  ): Promise<NearbyCustomer[]> {
    const response = await api.get<NearbyCustomer[]>('/api/customers/nearby', {
      params: { latitude, longitude, radius, status },
    });
    return response.data;
  },

  async getCustomerById(id: string): Promise<Customer> {
    const response = await api.get<Customer>(`/api/customers/${id}`);
    return response.data;
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await api.post<Customer>('/api/customers', data);
    this.clearCache();
    return response.data;
  },

  async uploadCustomers(file: File): Promise<{
    success: boolean;
    filename: string;
    total_processed: number;
    inserted_count: number;
    updated_count: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/customers/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    this.clearCache();
    return response.data;
  },
};
