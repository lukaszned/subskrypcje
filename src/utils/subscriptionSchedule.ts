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

function isPaidWithoutFutureSchedule(subscription: SchedulableSubscription) {
  if (subscription.status !== 'paid') return false;
  if (subscription.billingCycle === 'one_time') return true;
  if (subscription.billingCycle === 'custom') return true;
  return subscription.isRecurringBill === false;
}

export function shouldAutoAdvancePaymentDate(subscription: SchedulableSubscription) {
  if (!subscription.nextPaymentDate) return false;
  if (subscription.status === 'canceled') return false;
  if (isPaidWithoutFutureSchedule(subscription)) return false;
  if (subscription.isRecurringBill === false) return false;
  return AUTO_ADVANCE_CYCLES.includes(subscription.billingCycle);
}

export function getEffectiveNextPaymentDate(
  subscription: SchedulableSubscription,
  now = new Date()
) {
  if (isPaidWithoutFutureSchedule(subscription)) return null;

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

export function getNextPaymentDateAfterPayment(
  subscription: SchedulableSubscription,
  now = new Date()
) {
  if (!shouldAutoAdvancePaymentDate(subscription)) return null;

  const effectiveDate = getEffectiveNextPaymentDate(subscription, now);
  if (!effectiveDate) return null;

  const originalDate = parseAppDate(subscription.nextPaymentDate);
  const preferredDay = originalDate?.getDate() ?? effectiveDate.getDate();
  return addCycle(effectiveDate, subscription.billingCycle, preferredDay);
}

export function getEffectiveNextPaymentDateString(
  subscription: SchedulableSubscription,
  now = new Date()
) {
  const effectiveDate = getEffectiveNextPaymentDate(subscription, now);
  return effectiveDate ? formatInputDate(effectiveDate) : null;
}

export function getPaymentOccurrencesBetween(
  subscription: SchedulableSubscription,
  rangeStart: Date,
  rangeEnd: Date,
  now = new Date()
) {
  const start = startOfLocalDay(rangeStart);
  const end = startOfLocalDay(rangeEnd);
  if (end < start) return [];

  const firstPaymentDate = getEffectiveNextPaymentDate(subscription, now);
  if (!firstPaymentDate || firstPaymentDate > end) return [];

  if (!shouldAutoAdvancePaymentDate(subscription)) {
    return firstPaymentDate >= start && firstPaymentDate <= end ? [firstPaymentDate] : [];
  }

  const originalDate = parseAppDate(subscription.nextPaymentDate);
  const preferredDay = originalDate?.getDate() ?? firstPaymentDate.getDate();
  const occurrences: Date[] = [];
  let cursor = firstPaymentDate;

  for (let i = 0; i < 2000 && cursor < start; i += 1) {
    cursor = addCycle(cursor, subscription.billingCycle, preferredDay);
  }

  for (let i = 0; i < 500 && cursor <= end; i += 1) {
    occurrences.push(cursor);
    cursor = addCycle(cursor, subscription.billingCycle, preferredDay);
  }

  return occurrences;
}
