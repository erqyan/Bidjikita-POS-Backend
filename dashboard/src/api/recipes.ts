import apiClient from '@/lib/api';
import type { Recipe } from '@/types';

export interface RecipeMaterialPayload {
  raw_material_id: number;
  quantity: number;
}

export interface CreateRecipePayload {
  recipe_name: string;
  product_id: number;
  variant_id?: number | null;
  materials: RecipeMaterialPayload[];
}

export const getRecipes = () => apiClient.get<Recipe[]>('/recipes');

export const getRecipeById = (id: number) =>
  apiClient.get<Recipe>(`/recipes/${id}`);

export const createRecipe = (data: CreateRecipePayload) =>
  apiClient.post<Recipe>('/recipes', data);

export const updateRecipe = (id: number, data: CreateRecipePayload) =>
  apiClient.put<{ message: string; data: Recipe }>(`/recipes/${id}`, data);

export const deleteRecipe = (id: number) =>
  apiClient.delete(`/recipes/${id}`);
