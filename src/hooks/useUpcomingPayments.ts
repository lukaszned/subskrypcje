// =============================================================
// src/hooks/useUpcomingPayments.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getUpcomingPayments } from '../api/dashboard';
import { UpcomingPaymentsResponse } from '../types/api';

export const UPCOMING_PAYMENTS_KEY = (days: number) =>
  ['dashboard', 'upcoming', days] as const;

/**
 * @param days - liczba dni do przodu (domyślnie 7)
 */
export function useUpcomingPayments(days: number = 7) {
  return useQuery<UpcomingPaymentsResponse, Error>({
    queryKey: UPCOMING_PAYMENTS_KEY(days),
    queryFn: () => getUpcomingPayments(days),
    staleTime: 30000,
  });
}
