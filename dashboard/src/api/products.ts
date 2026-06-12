import apiClient from '@/lib/api';
import type { Product } from '@/types';

export const getProducts = () => apiClient.get<Product[]>('/products');

export const getProductById = (id: number) =>
  apiClient.get<Product>(`/products/${id}`);

export const createProduct = (data: FormData) =>
  apiClient.post<Product>('/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateProduct = (id: number, data: FormData) =>
  apiClient.put<Product>(`/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteProduct = (id: number) =>
  apiClient.delete(`/products/${id}`);
