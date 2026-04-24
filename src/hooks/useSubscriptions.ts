// =============================================================
// src/hooks/useSubscriptions.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getSubscriptions, GetSubscriptionsParams } from '../api/subscriptions';
import { Subscription } from '../types/api';

export const SUBSCRIPTIONS_KEY = (params?: GetSubscriptionsParams) =>
  ['subscriptions', params ?? {}] as const;

/**
 * Hook do pobierania listy subskrypcji z opcjonalnym filtrowaniem.
 */
export function useSubscriptions(params?: GetSubscriptionsParams) {
  return useQuery<Subscription[], Error>({
    queryKey: SUBSCRIPTIONS_KEY(params),
    queryFn: () => getSubscriptions(params),
    staleTime: 60 * 1000,
  });
}
