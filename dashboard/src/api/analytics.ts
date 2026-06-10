import apiClient from '@/lib/api';
import type {
  AnalyticsSummary,
  RevenueTrendItem,
  TopProduct,
  PaymentMethodStat,
  ShiftPerformance,
  RawMaterial,
} from '@/types';

export const getAnalyticsSummary = () =>
  apiClient.get<AnalyticsSummary>('/analytics/summary');

export const getRevenueTrend = (period: '7d' | '30d' | '90d' = '7d') =>
  apiClient.get<RevenueTrendItem[]>(`/analytics/revenue?period=${period}`);

export const getTopProducts = (limit = 10) =>
  apiClient.get<TopProduct[]>(`/analytics/top-products?limit=${limit}`);

export const getPaymentMethodStats = (period = '30d') =>
  apiClient.get<PaymentMethodStat[]>(`/analytics/payment-methods?period=${period}`);

export const getLowStockMaterials = () =>
  apiClient.get<RawMaterial[]>('/analytics/low-stock');

export const getShiftPerformance = (period = '30d') =>
  apiClient.get<ShiftPerformance[]>(`/analytics/shifts?period=${period}`);
