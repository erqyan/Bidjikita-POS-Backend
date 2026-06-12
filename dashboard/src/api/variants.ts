import apiClient from '@/lib/api';
import type { ProductVariant } from '@/types';

export interface VariantIngredientPayload {
  ingredient_id: number;
  qty: number;
}

export interface CreateVariantPayload {
  product_id: number;
  variant_name: string;
  price?: number;
  overhead_cost?: number;
  ingredients?: VariantIngredientPayload[];
}

export const getVariants = () => apiClient.get<ProductVariant[]>('/variants');

export const createVariant = (data: CreateVariantPayload) =>
  apiClient.post<ProductVariant>('/variants', data);

export const updateVariant = (id: number, data: Partial<CreateVariantPayload>) =>
  apiClient.put<ProductVariant>(`/variants/${id}`, data);

export const deleteVariant = (id: number) => apiClient.delete(`/variants/${id}`);
