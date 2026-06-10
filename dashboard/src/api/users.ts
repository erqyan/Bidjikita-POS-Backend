import apiClient from '@/lib/api';
import type { User } from '@/types';

export interface CreateUserPayload {
  full_name: string;
  username: string;
  password: string;
  phone_number?: string;
  role_id?: number;
}

export const getUsers = () => apiClient.get<User[]>('/users');

export const getUserById = (id: number) =>
  apiClient.get<User>(`/users/${id}`);

export const createUser = (data: CreateUserPayload) =>
  apiClient.post<User>('/users', data);

export const updateUser = (
  id: number,
  data: { full_name?: string; phone_number?: string }
) => apiClient.put<User>(`/users/${id}`, data);

export const toggleUserActive = (id: number) =>
  apiClient.put<{ message: string; is_active: boolean }>(`/users/${id}/toggle-active`);

export const changePassword = (id: number, new_password: string) =>
  apiClient.put(`/users/${id}/password`, { new_password });

export const deleteUser = (id: number) =>
  apiClient.delete(`/users/${id}`);
