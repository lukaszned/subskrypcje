// =============================================================
// src/hooks/usePaySubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paySubscription } from '../api/subscriptions';
import { Subscription } from '../types/api';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';
import { UPCOMING_PAYMENTS_KEY } from './useUpcomingPayments';

/**
 * Mutation do oznaczenia subskrypcji jako opłaconej (status: paid).
 *
 * Po sukcesie invaliduje:
 *   - listę subskrypcji
 *   - summary dashboardu
 *   - nadchodzące płatności (paid nie powinno być na liście upcoming)
 */
// Notifications
import { scheduleSubscriptionReminder } from '../utils/notifications';

export function usePaySubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, string>({
    mutationFn: (id: string) => paySubscription(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
      // Invaliduj upcoming dla wszystkich wartości 'days'
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming'] });
      
      // Reschedule notification
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
