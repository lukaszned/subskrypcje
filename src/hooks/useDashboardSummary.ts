// =============================================================
// src/hooks/useDashboardSummary.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api/dashboard';
import { DashboardSummary } from '../types/api';

export const DASHBOARD_SUMMARY_KEY = ['dashboard', 'summary'] as const;

export function useDashboardSummary() {
  return useQuery<DashboardSummary, Error>({
    queryKey: DASHBOARD_SUMMARY_KEY,
    queryFn: getDashboardSummary,
    // Odświeżaj co 2 minuty — dane finansowe nie muszą być real-time
    staleTime: 2 * 60 * 1000,
  });
}
