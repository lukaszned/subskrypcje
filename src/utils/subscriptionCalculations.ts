import type { BillingCycle, SavingsItem, Subscription, UpcomingPaymentItem } from '../types/api';
import { startOfLocalDay } from './date';
import { getEffectiveNextPaymentDate, getEffectiveNextPaymentDateString } from './subscriptionSchedule';

const WEEKS_PER_MONTH = 52 / 12;

export function toMonthlySubscriptionAmount(
  subscription: Pick<Subscription, 'amount' | 'billingCycle' | 'isRecurringBill'>
) {
  const amount = Number(subscription.amount || 0);
  const cycle = subscription.billingCycle as BillingCycle;

  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cycle === 'yearly') return amount / 12;
  if (cycle === 'weekly') return amount * WEEKS_PER_MONTH;
  if (cycle === 'one_time') return 0;
  if (cycle === 'custom') return subscription.isRecurringBill ? amount : 0;
  return amount;
}

export function getCountedMonthlyTotal(subscriptions: Subscription[]) {
  return subscriptions
    .filter((subscription) => subscription.status !== 'canceled' && subscription.includeInStats !== false)
    .reduce((sum, subscription) => sum + toMonthlySubscriptionAmount(subscription), 0);
}

export type LocalSavingsSummary = {
  baseCurrency: string;
  canceledSubscriptionsCount: number;
  monthlySavings: number;
  yearlySavings: number;
  items: SavingsItem[];
};

export function buildSavingsFromSubscriptions(
  subscriptions: Subscription[],
  preferredCurrency = 'PLN'
): LocalSavingsSummary {
  const items = subscriptions
    .filter((subscription) => subscription.status === 'canceled')
    .map((subscription) => {
      const currency = subscription.currency || preferredCurrency || 'PLN';
      // Shared subscriptions already store the user's divided share in amount.
      const monthlyAmount = toMonthlySubscriptionAmount(subscription);

      return {
        id: subscription.id,
        name: subscription.name,
        provider: subscription.provider,
        originalAmount: Number(subscription.amount || 0),
        originalCurrency: currency,
        monthlyAmount,
        yearlyAmount: monthlyAmount * 12,
        canceledAt: subscription.updatedAt || subscription.createdAt,
      };
    })
    .sort((a, b) => new Date(b.canceledAt).getTime() - new Date(a.canceledAt).getTime());

  const currencies = Array.from(new Set(items.map((item) => item.originalCurrency)));
  const baseCurrency = currencies.length === 1
    ? currencies[0]
    : currencies.includes(preferredCurrency)
      ? preferredCurrency
      : currencies.includes('PLN')
        ? 'PLN'
        : currencies[0] || preferredCurrency || 'PLN';
  const countedItems = items.filter((item) => item.originalCurrency === baseCurrency);
  const monthlySavings = countedItems.reduce((sum, item) => sum + item.monthlyAmount, 0);

  return {
    baseCurrency,
    canceledSubscriptionsCount: countedItems.length,
    monthlySavings,
    yearlySavings: monthlySavings * 12,
    items,
  };
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
      const paymentDate = getEffectiveNextPaymentDate(subscription, now);
      if (!paymentDate || paymentDate < today || paymentDate > limit) return null;

      return {
        id: subscription.id,
        name: subscription.name,
        provider: subscription.provider,
        planName: subscription.planName,
        amount: Number(subscription.amount || 0),
        currency: subscription.currency || 'PLN',
        nextPaymentDate: getEffectiveNextPaymentDateString(subscription, now) || '',
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
