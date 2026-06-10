import apiClient from '@/lib/api';
import type { Transaction } from '@/types';

export const getTransactions = () =>
  apiClient.get<Transaction[]>('/transactions');

export const getTransactionById = (id: number) =>
  apiClient.get<Transaction>(`/transactions/${id}`);
