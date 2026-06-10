import apiClient from '@/lib/api';
import type { Product } from '@/types';

export const getProducts = () => apiClient.get<Product[]>('/products');

export const getProductById = (id: number) =>
  apiClient.get<Product>(`/products/${id}`);

export const createProduct = (data: {
  category_id: number;
  product_name: string;
  description?: string;
  base_price?: number;
  base_cost?: number;
  profit_margin?: number;
  image_url?: string;
  status?: string;
}) => apiClient.post<Product>('/products', data);

export const updateProduct = (id: number, data: Partial<{
  category_id: number;
  product_name: string;
  description: string;
  base_price: number;
  image_url: string;
  status: string;
}>) => apiClient.put<Product>(`/products/${id}`, data);

export const updateProductPricing = (
  id: number,
  data: { base_cost?: number; profit_margin?: number }
) => apiClient.put<Product>(`/products/${id}/pricing`, data);

export const deleteProduct = (id: number) =>
  apiClient.delete(`/products/${id}`);
