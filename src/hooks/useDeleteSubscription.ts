// =============================================================
// src/hooks/useDeleteSubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSubscription } from '../api/subscriptions';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';

// Notifications
import { cancelSubscriptionReminder } from '../utils/notifications';

/**
 * Mutation do całkowitego usunięcia subskrypcji z bazy.
 * UWAGA: To jest operacja nieodwracalna.
 */
export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: (_, id) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'category-breakdown'] });

      // Anuluj powiadomienie
      cancelSubscriptionReminder(id);
    },
  });
}
