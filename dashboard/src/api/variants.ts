import apiClient from '@/lib/api';
import type { ProductVariant } from '@/types';

export const getVariants = () => apiClient.get<ProductVariant[]>('/variants');

export const createVariant = (data: {
  product_id: number;
  variant_name: string;
  additional_price: number;
}) => apiClient.post<ProductVariant>('/variants', data);

export const updateVariant = (
  id: number,
  data: { variant_name?: string; additional_price?: number; product_id?: number }
) => apiClient.put<ProductVariant>(`/variants/${id}`, data);

export const deleteVariant = (id: number) =>
  apiClient.delete(`/variants/${id}`);
