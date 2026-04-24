// =============================================================
// src/hooks/useCreateSubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubscription } from '../api/subscriptions';
import { CreateSubscriptionPayload, Subscription } from '../types/api';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';

/**
 * Mutation do tworzenia subskrypcji.
 *
 * Po sukcesie invaliduje:
 *   - ['subscriptions'] — lista subskrypcji odświeżona
 *   - ['dashboard', 'summary'] — sumy zaktualizowane
 *
 * Obsługa błędów (409 duplicate, 400 validation) po stronie komponentu
 * przez onError callback lub przez sprawdzenie error.status w ApiError.
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, CreateSubscriptionPayload>({
    mutationFn: createSubscription,
    onSuccess: () => {
      // Invalidate subscriptions list — wymusi refetch przy następnym renderze
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      // Invalidate dashboard summary — monthlyTotal, activeCount itd. się zmienią
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
    },
  });
}
