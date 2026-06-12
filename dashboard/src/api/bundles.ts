import apiClient from '@/lib/api';
import type { Bundle } from '@/types';

export interface BundleItemPayload {
  product_id: number;
  quantity: number;
}

export interface CreateBundlePayload {
  bundle_name: string;
  description?: string;
  bundle_price: number;
  items: BundleItemPayload[];
}

export const getBundles = () => apiClient.get<Bundle[]>('/bundles');

export const getAllBundles = () =>
  apiClient.get<Bundle[]>('/bundles/all/admin');

export const getBundleById = (id: number) =>
  apiClient.get<Bundle>(`/bundles/${id}`);

export const createBundle = (data: FormData) =>
  apiClient.post<Bundle>('/bundles', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateBundle = (id: number, data: FormData) =>
  apiClient.put<Bundle>(`/bundles/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteBundle = (id: number) =>
  apiClient.delete(`/bundles/${id}`);
