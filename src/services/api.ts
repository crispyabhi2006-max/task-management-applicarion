import axios from 'axios';
import { ApiResponse } from '../types.ts';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tm_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If token expired or invalid, clear stored auth
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_user');
      }
    }
    return Promise.reject(error);
  }
);

// API Service functions
export const authService = {
  async register(name: string, email: string, password: string): Promise<ApiResponse> {
    const res = await api.post<ApiResponse>('/auth/register', { name, email, password });
    return res.data;
  },

  async login(email: string, password: string): Promise<ApiResponse> {
    const res = await api.post<ApiResponse>('/auth/login', { email, password });
    return res.data;
  },

  async getMe(): Promise<ApiResponse> {
    const res = await api.get<ApiResponse>('/auth/me');
    return res.data;
  },

  async logout(): Promise<ApiResponse> {
    const res = await api.post<ApiResponse>('/auth/logout');
    return res.data;
  },
};

export const taskService = {
  async getTasks(params?: Record<string, any>): Promise<ApiResponse<{ tasks: any[]; pagination: any }>> {
    const res = await api.get('/tasks', { params });
    return res.data;
  },

  async getStats(): Promise<ApiResponse<any>> {
    const res = await api.get('/tasks/stats');
    return res.data;
  },

  async getCategories(): Promise<ApiResponse<string[]>> {
    const res = await api.get('/tasks/categories');
    return res.data;
  },

  async getTask(id: number): Promise<ApiResponse> {
    const res = await api.get(`/tasks/${id}`);
    return res.data;
  },

  async createTask(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    category?: string | null;
  }): Promise<ApiResponse> {
    const res = await api.post('/tasks', data);
    return res.data;
  },

  async updateTask(
    id: number,
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      category?: string | null;
    }
  ): Promise<ApiResponse> {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data;
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse> {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data;
  },

  async deleteTask(id: number): Promise<ApiResponse> {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  },

  async checkHealth(): Promise<ApiResponse> {
    const res = await api.get('/health');
    return res.data;
  },
};

export default api;
