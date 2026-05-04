// =============================================================
// src/hooks/useUpdateSubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSubscription } from '../api/subscriptions';
import { Subscription, UpdateSubscriptionPayload } from '../types/api';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';
import { SUBSCRIPTION_DETAIL_KEY } from './useSubscription';

// Notifications
import { scheduleSubscriptionReminder } from '../utils/notifications';

/**
 * Mutation do aktualizacji istniejącej subskrypcji.
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, { id: string; payload: UpdateSubscriptionPayload }>({
    mutationFn: ({ id, payload }) => updateSubscription(id, payload),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_DETAIL_KEY(data.id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'category-breakdown'] });

      if (data.nextPaymentDate) {
        scheduleSubscriptionReminder(
          data.id,
          data.name,
          data.amount,
          data.currency,
          data.nextPaymentDate,
          data.reminderDaysBefore
        );
      }
    },
  });
}
