// =============================================================
// src/hooks/usePaySubscription.ts
// =============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paySubscription, updateSubscription } from '../api/subscriptions';
import { clearCachedDashboardSummary, getCachedUserSettings } from '../api/dashboard';
import { Subscription } from '../types/api';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';
import { UPCOMING_PAYMENTS_KEY } from './useUpcomingPayments';
import { SUBSCRIPTION_DETAIL_KEY } from './useSubscription';
import { formatInputDate, parseAppDate } from '../utils/date';
import {
  getEffectiveNextPaymentDateString,
  getNextPaymentDateAfterPayment,
} from '../utils/subscriptionSchedule';

/**
 * Mutation do oznaczenia subskrypcji jako opłaconej (status: paid).
 *
 * Po sukcesie invaliduje:
 *   - listę subskrypcji
 *   - summary dashboardu
 *   - nadchodzące płatności (paid nie powinno być na liście upcoming)
 */
// Notifications
import { cancelSubscriptionReminder, scheduleSubscriptionReminder } from '../utils/notifications';

type PayMutationContext = {
  expectedNextPaymentDate: string | null;
};

function findCachedSubscription(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  const detail = queryClient.getQueryData<Subscription>(SUBSCRIPTION_DETAIL_KEY(id));
  if (detail) return detail;

  const baseList = queryClient.getQueryData<Subscription[]>(SUBSCRIPTIONS_KEY());
  return baseList?.find((subscription) => subscription.id === id) || null;
}

function shouldCorrectNextPaymentDate(subscription: Subscription, expectedNextPaymentDate: string | null) {
  if (!expectedNextPaymentDate) return false;

  const expectedDate = parseAppDate(expectedNextPaymentDate);
  const returnedEffectiveDate = parseAppDate(getEffectiveNextPaymentDateString(subscription));
  if (!expectedDate) return false;
  if (!returnedEffectiveDate) return true;

  return returnedEffectiveDate < expectedDate;
}

function updateSubscriptionCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  subscription: Subscription
) {
  queryClient.setQueryData(SUBSCRIPTION_DETAIL_KEY(subscription.id), subscription);
  queryClient.setQueriesData({ queryKey: ['subscriptions'] }, (current: unknown) => {
    if (!Array.isArray(current)) return current;
    return current.map((item) => (
      item?.id === subscription.id ? { ...item, ...subscription } : item
    ));
  });
}

export function usePaySubscription() {
  const queryClient = useQueryClient();

  return useMutation<Subscription, Error, string, PayMutationContext>({
    mutationFn: (id: string) => paySubscription(id),
    onMutate: (id) => {
      const cachedSubscription = findCachedSubscription(queryClient, id);
      const expectedNextPaymentDate = cachedSubscription
        ? getNextPaymentDateAfterPayment(cachedSubscription)
        : null;

      return {
        expectedNextPaymentDate: expectedNextPaymentDate
          ? formatInputDate(expectedNextPaymentDate)
          : null,
      };
    },
    onSuccess: async (data, _id, context) => {
      let paidSubscription = data;

      if (shouldCorrectNextPaymentDate(data, context?.expectedNextPaymentDate ?? null)) {
        try {
          paidSubscription = await updateSubscription(data.id, {
            nextPaymentDate: context!.expectedNextPaymentDate!,
          });
        } catch (error) {
          console.log('[usePaySubscription] Could not align next payment date after payment.', error);
        }
      }

      updateSubscriptionCaches(queryClient, paidSubscription);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: UPCOMING_PAYMENTS_KEY(30) });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', paidSubscription.id, 'payments'] });
      clearCachedDashboardSummary();

      const reminderDate = getEffectiveNextPaymentDateString(paidSubscription);
      
      if (reminderDate) {
        getCachedUserSettings()
          .then(async (settings) => {
            if (settings?.notificationsEnabled === false) {
              await cancelSubscriptionReminder(paidSubscription.id);
              return null;
            }

            return scheduleSubscriptionReminder(
              paidSubscription.id,
              paidSubscription.name,
              paidSubscription.amount,
              paidSubscription.currency,
              reminderDate,
              paidSubscription.reminderDaysBefore
            );
          })
          .catch(() => undefined);
      } else {
        cancelSubscriptionReminder(paidSubscription.id);
      }
    },
  });
}
