// =============================================================
// src/hooks/useCancelSubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelSubscription } from '../api/subscriptions';
import { Subscription } from '../types/api';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';

/**
 * Mutation do soft-cancel subskrypcji (status: canceled).
 * Preferowane nad DELETE — zachowuje historię.
 *
 * Po sukcesie invaliduje listę i summary dashboardu.
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, string>({
    mutationFn: (id: string) => cancelSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
    },
  });
}
