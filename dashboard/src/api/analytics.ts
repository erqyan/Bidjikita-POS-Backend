import apiClient from '@/lib/api';
import type {
  AnalyticsSummary,
  RevenueTrendItem,
  TopProduct,
  PaymentMethodStat,
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

export interface ProfitTrendItem {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export const getProfitTrend = (period: '7d' | '30d' | '90d' = '7d') =>
  apiClient.get<ProfitTrendItem[]>(`/analytics/profit?period=${period}`);

export interface FinancialReport {
  period: { from: string; to: string };
  summary: { revenue: number; cost: number; profit: number; profitPct: number; txCount: number; avgTx: number };
  daily: { date: string; orders: number; revenue: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  cashiers: { name: string; txCount: number; revenue: number }[];
  transactions: { id: number; invoice: string; date: string; amount: number; method: string; cashier: string }[];
}

export const getFinancialReport = (from: string, to: string) =>
  apiClient.get<FinancialReport>(`/analytics/financial-report?from=${from}&to=${to}`);
