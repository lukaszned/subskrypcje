import type { BillingCycle, Subscription } from '../types/api';
import { formatInputDate, parseAppDate, startOfLocalDay } from './date';

type SchedulableSubscription = Pick<
  Subscription,
  'nextPaymentDate' | 'billingCycle' | 'status' | 'isRecurringBill'
>;

const AUTO_ADVANCE_CYCLES: BillingCycle[] = ['monthly', 'yearly', 'weekly'];

function addMonthsClamped(date: Date, months: number, preferredDay = date.getDate()) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(preferredDay, lastDay));
  return startOfLocalDay(target);
}

function addCycle(date: Date, cycle: BillingCycle, preferredDay: number) {
  if (cycle === 'weekly') {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    return startOfLocalDay(next);
  }

  if (cycle === 'yearly') {
    return addMonthsClamped(date, 12, preferredDay);
  }

  return addMonthsClamped(date, 1, preferredDay);
}

export function shouldAutoAdvancePaymentDate(subscription: SchedulableSubscription) {
  if (!subscription.nextPaymentDate) return false;
  if (subscription.status === 'canceled' || subscription.status === 'overdue') return false;
  if (subscription.isRecurringBill === false) return false;
  return AUTO_ADVANCE_CYCLES.includes(subscription.billingCycle);
}

export function getEffectiveNextPaymentDate(
  subscription: SchedulableSubscription,
  now = new Date()
) {
  const originalDate = parseAppDate(subscription.nextPaymentDate);
  if (!originalDate) return null;

  const today = startOfLocalDay(now);
  if (originalDate >= today || !shouldAutoAdvancePaymentDate(subscription)) {
    return originalDate;
  }

  const preferredDay = originalDate.getDate();
  let nextDate = originalDate;

  for (let i = 0; i < 240 && nextDate < today; i += 1) {
    nextDate = addCycle(nextDate, subscription.billingCycle, preferredDay);
  }

  return nextDate;
}

export function getEffectiveNextPaymentDateString(
  subscription: SchedulableSubscription,
  now = new Date()
) {
  const effectiveDate = getEffectiveNextPaymentDate(subscription, now);
  return effectiveDate ? formatInputDate(effectiveDate) : null;
}
