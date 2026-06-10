import apiClient from '@/lib/api';
import type { Order } from '@/types';

export const getOrders = () => apiClient.get<Order[]>('/orders');

export const getOrderById = (id: number) =>
  apiClient.get<Order>(`/orders/${id}`);
