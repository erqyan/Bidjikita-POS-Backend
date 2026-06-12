import apiClient from "@/lib/api";
import type { RawMaterial } from "@/types";

export const getIngredients = () =>
  apiClient.get<RawMaterial[]>("/raw-materials");

export const getIngredientById = (id: number) =>
  apiClient.get<{
    id: number;
    material_name: string;
    unit: string;
    stock: number;
    minimum_stock: number;
  }>(`/raw-materials/${id}`);

export const createIngredient = (data: {
  material_name: string;
  unit: string;
  stock: number;
  minimum_stock: number;
  cost_per_unit: number;
}) =>
  apiClient.post<{ message: string; data: RawMaterial }>(
    "/raw-materials",
    data,
  );

export const updateIngredient = (
  id: number,
  data: Partial<{
    material_name: string;
    unit: string;
    stock: number;
    minimum_stock: number;
    cost_per_unit: number;
  }>,
) =>
  apiClient.put<{ message: string; data: RawMaterial }>(
    `/raw-materials/${id}`,
    data,
  );

export const deleteIngredient = (id: number) =>
  apiClient.delete(`/raw-materials/${id}`);

export interface IngredientLogEntry {
  id: number;
  raw_material_id: number;
  material_name: string;
  previous_stock: number;
  new_stock: number;
  quantity_change: number;
  change_type: 'manual_adjustment' | 'order_deduction';
  user_id: number | null;
  user_name: string | null;
  notes: string | null;
  createdAt: string;
}

export const getIngredientLogs = (id: number) =>
  apiClient.get<IngredientLogEntry[]>(`/raw-materials/${id}/logs`);
