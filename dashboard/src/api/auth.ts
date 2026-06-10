import apiClient from '@/lib/api';
import type { User } from '@/types';

export interface LoginResponse {
  token: string;
  user: User;
  message?: string;
}

export const loginApi = (username: string, password: string) =>
  apiClient.post<LoginResponse>('/auth/login', { username, password });
