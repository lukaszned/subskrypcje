// =============================================================
// src/hooks/useCancelSubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearCachedDashboardSummary } from '../api/dashboard';
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
// Notifications
import { cancelSubscriptionReminder } from '../utils/notifications';

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, string>({
    mutationFn: (id: string) => cancelSubscription(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      clearCachedDashboardSummary();
      
      // Cancel notification (używamy id z zmiennych wejściowych)
      cancelSubscriptionReminder(variables);
    },
  });
}
