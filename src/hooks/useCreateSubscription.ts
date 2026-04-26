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
// Notifications
import { scheduleSubscriptionReminder } from '../utils/notifications';

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, CreateSubscriptionPayload>({
    mutationFn: createSubscription,
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
      
      // Schedule notification
      scheduleSubscriptionReminder(
        data.id,
        data.name,
        data.amount,
        data.currency,
        data.nextPaymentDate,
        data.reminderDaysBefore
      );
    },
  });
}
