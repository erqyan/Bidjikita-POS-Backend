import apiClient from '@/lib/api';
import type { Shift } from '@/types';

export interface CreateShiftPayload {
  shift_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status?: 'open' | 'closed';
}

export const getShifts = () => apiClient.get<Shift[]>('/shifts');

export const getShiftById = (id: number) =>
  apiClient.get<Shift>(`/shifts/${id}`);

export const createShift = (data: CreateShiftPayload) =>
  apiClient.post<Shift>('/shifts', data);

export const updateShift = (id: number, data: Partial<CreateShiftPayload>) =>
  apiClient.put<Shift>(`/shifts/${id}`, data);

export const deleteShift = (id: number) =>
  apiClient.delete(`/shifts/${id}`);
