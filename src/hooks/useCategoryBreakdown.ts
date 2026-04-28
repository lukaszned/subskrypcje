// =============================================================
// src/hooks/useCategoryBreakdown.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getCategoryBreakdown } from '../api/dashboard';
import { CategoryBreakdownResponse } from '../types/api';

export const CATEGORY_BREAKDOWN_KEY = ['dashboard', 'category-breakdown'];

/**
 * Pobiera rozbicie wydatków na kategorie dla dashboardu.
 */
export function useCategoryBreakdown() {
  return useQuery<CategoryBreakdownResponse>({
    queryKey: CATEGORY_BREAKDOWN_KEY,
    queryFn: getCategoryBreakdown,
    staleTime: 30000,
  });
}
