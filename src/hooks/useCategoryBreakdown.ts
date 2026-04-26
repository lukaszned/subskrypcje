// =============================================================
// src/hooks/useCategoryBreakdown.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/apiClient';

export const CATEGORY_BREAKDOWN_KEY = ['dashboard', 'category-breakdown'];

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
  currency: string;
}

/**
 * Pobiera rozbicie wydatków na kategorie dla dashboardu.
 */
export function useCategoryBreakdown() {
  return useQuery<CategoryBreakdownItem[]>({
    queryKey: CATEGORY_BREAKDOWN_KEY,
    queryFn: () => apiGet<CategoryBreakdownItem[]>('/dashboard/category-breakdown'),
  });
}
