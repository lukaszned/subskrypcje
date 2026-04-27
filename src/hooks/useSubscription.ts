// =============================================================
// src/hooks/useSubscription.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getSubscriptionById } from '../api/subscriptions';
import { Subscription } from '../types/api';

export const SUBSCRIPTION_DETAIL_KEY = (id: string) => ['subscriptions', id] as const;

/**
 * Hook do pobierania szczegółów konkretnej subskrypcji.
 */
export function useSubscription(id: string) {
  return useQuery<Subscription, Error>({
    queryKey: SUBSCRIPTION_DETAIL_KEY(id),
    queryFn: () => getSubscriptionById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
