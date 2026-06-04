import type { BillingCycle, Subscription, UpcomingPaymentItem } from '../types/api';
import { parseAppDate, startOfLocalDay } from './date';

const WEEKS_PER_MONTH = 52 / 12;

export function toMonthlySubscriptionAmount(
  subscription: Pick<Subscription, 'amount' | 'billingCycle'>
) {
  const amount = Number(subscription.amount || 0);
  const cycle = subscription.billingCycle as BillingCycle;

  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cycle === 'yearly') return amount / 12;
  if (cycle === 'weekly') return amount * WEEKS_PER_MONTH;
  if (cycle === 'one_time') return 0;
  if (cycle === 'custom') return 0;
  return amount;
}

export function getCountedMonthlyTotal(subscriptions: Subscription[]) {
  return subscriptions
    .filter((subscription) => subscription.status !== 'canceled' && subscription.includeInStats !== false)
    .reduce((sum, subscription) => sum + toMonthlySubscriptionAmount(subscription), 0);
}

export function buildUpcomingPaymentsFromSubscriptions(
  subscriptions: Subscription[],
  days: number,
  now = new Date()
): UpcomingPaymentItem[] {
  const today = startOfLocalDay(now);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + Math.max(0, days));

  return subscriptions
    .filter((subscription) => subscription.status !== 'canceled' && Boolean(subscription.nextPaymentDate))
    .map((subscription) => {
      const paymentDate = parseAppDate(subscription.nextPaymentDate);
      if (!paymentDate || paymentDate < today || paymentDate > limit) return null;

      return {
        id: subscription.id,
        name: subscription.name,
        provider: subscription.provider,
        planName: subscription.planName,
        amount: Number(subscription.amount || 0),
        currency: subscription.currency || 'PLN',
        nextPaymentDate: subscription.nextPaymentDate || '',
        status: subscription.status,
        isTrial: Boolean(subscription.isTrial),
        reminderDaysBefore: Number(subscription.reminderDaysBefore ?? 2),
        paymentTime: paymentDate.getTime(),
      };
    })
    .filter((item): item is UpcomingPaymentItem & { paymentTime: number } => Boolean(item))
    .sort((a, b) => {
      if (a.paymentTime !== b.paymentTime) return a.paymentTime - b.paymentTime;
      return a.name.localeCompare(b.name, 'pl');
    })
    .map(({ paymentTime, ...item }) => item);
}
