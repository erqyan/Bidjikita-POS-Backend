import apiClient from '@/lib/api';
import type { Category } from '@/types';

export const getCategories = () => apiClient.get<Category[]>('/categories');

export const createCategory = (data: { category_name: string }) =>
  apiClient.post<Category>('/categories', data);

export const updateCategory = (id: number, data: { category_name: string }) =>
  apiClient.put<Category>(`/categories/${id}`, data);

export const deleteCategory = (id: number) =>
  apiClient.delete(`/categories/${id}`);
