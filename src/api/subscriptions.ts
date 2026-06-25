// =============================================================
// src/api/subscriptions.ts
//
// Funkcje wywołujące endpointy /subscriptions/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import {
  apiGetWithTimeout,
  apiPostWithTimeout,
  apiPatchWithTimeout,
  apiDeleteWithTimeout,
} from '../lib/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Subscription,
  SubscriptionCategory,
  SubscriptionStatus,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  SubscriptionHistoryResponse,
  SubscriptionPaymentsResponse,
} from '../types/api';
import { daysUntilDate } from '../utils/date';
import { parseSubscriptionNotes } from '../utils/subscriptionNotes';
import { getEffectiveNextPaymentDate } from '../utils/subscriptionSchedule';

const SUBSCRIPTIONS_CACHE_KEY = 'sub-sentry.subscriptions.v1';
const SUBSCRIPTION_WRITE_TIMEOUT_MS = 45000;
const SUBSCRIPTION_ACTION_TIMEOUT_MS = 30000;

// ─────────────────────────────────────────────────────────────
// Helper do normalizacji danych (string amount -> number)
// ─────────────────────────────────────────────────────────────

function normalizeSubscription(sub: any): Subscription {
  const amount = typeof sub?.amount === 'string' ? parseFloat(sub.amount) : Number(sub?.amount ?? 0);
  const parsedNotes = parseSubscriptionNotes(sub?.notes);

  return {
    ...sub,
    id: String(sub?.id ?? ''),
    name: String(sub?.name || sub?.provider || 'Subskrypcja'),
    provider: sub?.provider ?? null,
    planName: sub?.planName ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: sub?.currency || 'PLN',
    category: sub?.category || 'other',
    billingCycle: sub?.billingCycle || 'monthly',
    status: sub?.status || 'pending',
    isTrial: Boolean(sub?.isTrial),
    isRecurringBill: sub?.isRecurringBill ?? true,
    isShared: sub?.isShared ?? parsedNotes.isShared,
    peopleCount: sub?.peopleCount ?? parsedNotes.peopleCount,
    includeInStats: sub?.includeInStats ?? parsedNotes.includeInStats ?? true,
    reminderDaysBefore: Number(sub?.reminderDaysBefore ?? 2),
  };
}

function normalizeSubscriptionsResponse(data: any): Subscription[] {
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.subscriptions)
        ? data.subscriptions
        : [];

  return rawItems
    .map(normalizeSubscription)
    .filter((subscription: Subscription) => subscription.id.length > 0);
}

async function cacheSubscriptions(subscriptions: Subscription[]) {
  try {
    await AsyncStorage.setItem(SUBSCRIPTIONS_CACHE_KEY, JSON.stringify(subscriptions));
  } catch (error) {
    console.log('[subscriptions] Could not cache subscriptions.', error);
  }
}

export async function mergeSubscriptionsIntoCache(subscriptions: Subscription[]) {
  if (!subscriptions.length) return;

  const cached = await getCachedSubscriptions();
  const existing = Array.isArray(cached) ? cached : [];
  const incomingIds = new Set(subscriptions.map((subscription) => subscription.id));

  await cacheSubscriptions([
    ...subscriptions,
    ...existing.filter((subscription) => !incomingIds.has(subscription.id)),
  ]);
}

export async function getCachedSubscriptions(): Promise<Subscription[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
    if (!raw) return null;
    return normalizeSubscriptionsResponse(JSON.parse(raw));
  } catch (error) {
    console.log('[subscriptions] Could not read cached subscriptions.', error);
    return null;
  }
}

async function getCachedSubscriptionById(id: string): Promise<Subscription | null> {
  const cached = await getCachedSubscriptions();
  return cached?.find((subscription) => subscription.id === id) || null;
}

export function filterAndSortSubscriptions(
  subscriptions: Subscription[],
  params?: GetSubscriptionsParams
): Subscription[] {
  const search = params?.search?.trim().toLowerCase();

  const filtered = subscriptions.filter((subscription) => {
    if (params?.category && subscription.category !== params.category) return false;
    if (params?.status) {
      if (params.status === 'overdue') {
        const daysLeft = daysUntilDate(getEffectiveNextPaymentDate(subscription));
        if (subscription.status !== 'overdue' && !(daysLeft !== null && daysLeft < 0)) return false;
      } else if (subscription.status !== params.status) {
        return false;
      }
    }

    if (search) {
      const haystack = [
        subscription.name,
        subscription.provider,
        subscription.planName,
        subscription.category,
      ].filter(Boolean).join(' ').toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  const sortBy = params?.sortBy;
  const sortOrder = params?.sortOrder === 'desc' ? -1 : 1;

  return [...filtered].sort((a, b) => {
    if (sortBy === 'amount') {
      return (Number(a.amount || 0) - Number(b.amount || 0)) * sortOrder;
    }

    if (sortBy === 'name') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'pl') * sortOrder;
    }

    if (sortBy === 'nextPaymentDate') {
      const first = getEffectiveNextPaymentDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const second = getEffectiveNextPaymentDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return (first - second) * sortOrder;
    }

    return 0;
  });
}

// ─────────────────────────────────────────────────────────────
// QUERY (odczyt)
// ─────────────────────────────────────────────────────────────

export interface GetSubscriptionsParams {
  category?: SubscriptionCategory | string;
  status?: SubscriptionStatus | string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getSubscriptions(
  params?: GetSubscriptionsParams
): Promise<Subscription[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.search) query.append('search', params.search);
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const qs = query.toString();
  const path = qs ? `/subscriptions?${qs}` : '/subscriptions';

  try {
    const data = await apiGetWithTimeout<any[]>(path, 8000);
    const subscriptions = normalizeSubscriptionsResponse(data);

    if (__DEV__) {
      const statusCounts = subscriptions.reduce<Record<string, number>>((acc, subscription) => {
        const status = subscription.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      console.log('[subscriptions] response snapshot', {
        path,
        count: subscriptions.length,
        statusCounts,
        customRecurringCount: subscriptions.filter(
          (subscription) => subscription.billingCycle === 'custom' && subscription.isRecurringBill
        ).length,
        recurringBillCount: subscriptions.filter((subscription) => subscription.isRecurringBill).length,
        trackedItems: subscriptions
          .filter((subscription) => (
            subscription.status === 'pending' ||
            subscription.billingCycle === 'custom' ||
            subscription.isRecurringBill
          ))
          .slice(0, 12)
          .map((subscription) => ({
            id: subscription.id,
            name: subscription.name,
            amount: subscription.amount,
            currency: subscription.currency,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            isRecurringBill: subscription.isRecurringBill,
            category: subscription.category,
          })),
      });
    }

    if (!params?.category && !params?.status && !params?.search) {
      await cacheSubscriptions(subscriptions);
    }

    return subscriptions;
  } catch (error) {
    const cached = await getCachedSubscriptions();
    if (cached) return filterAndSortSubscriptions(cached, params);
    throw error;
  }
}

export async function getSubscriptionById(id: string): Promise<Subscription> {
  try {
    const data = await apiGetWithTimeout<any>(`/subscriptions/${id}`, 8000);
    return normalizeSubscription(data);
  } catch (error) {
    const cached = await getCachedSubscriptionById(id);
    if (cached) return cached;
    throw error;
  }
}

export async function getSubscriptionHistory(id: string): Promise<SubscriptionHistoryResponse> {
  try {
    return await apiGetWithTimeout<SubscriptionHistoryResponse>(`/subscriptions/${id}/history`, 6000);
  } catch (error) {
    console.log('[subscriptions] History endpoint slow/unavailable, showing empty history.', error);
    return { count: 0, items: [] };
  }
}

export async function getSubscriptionPayments(id: string): Promise<SubscriptionPaymentsResponse> {
  let data: SubscriptionPaymentsResponse;
  try {
    data = await apiGetWithTimeout<SubscriptionPaymentsResponse>(`/subscriptions/${id}/payments`, 6000);
  } catch (error) {
    console.log('[subscriptions] Payments endpoint slow/unavailable, showing empty payments.', error);
    return { count: 0, items: [] };
  }

  return {
    ...data,
    items: data.items.map(p => ({
      ...p,
      amount: Number(p.amount)
    }))
  };
}

// ─────────────────────────────────────────────────────────────
// MUTATIONS (zapis)
// ─────────────────────────────────────────────────────────────

export async function createSubscription(
  payload: CreateSubscriptionPayload
): Promise<Subscription> {
  const data = await apiPostWithTimeout<any>('/subscriptions', payload, SUBSCRIPTION_WRITE_TIMEOUT_MS);
  return normalizeSubscription(data);
}

export async function updateSubscription(
  id: string,
  payload: UpdateSubscriptionPayload
): Promise<Subscription> {
  const data = await apiPatchWithTimeout<any>(`/subscriptions/${id}`, payload, SUBSCRIPTION_WRITE_TIMEOUT_MS);
  return normalizeSubscription(data);
}

export async function paySubscription(id: string): Promise<Subscription> {
  const data = await apiPatchWithTimeout<any>(`/subscriptions/${id}/pay`, undefined, SUBSCRIPTION_ACTION_TIMEOUT_MS);
  return normalizeSubscription(data);
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  const data = await apiPatchWithTimeout<any>(`/subscriptions/${id}/cancel`, undefined, SUBSCRIPTION_ACTION_TIMEOUT_MS);
  return normalizeSubscription(data);
}

export async function deleteSubscription(id: string): Promise<void> {
  return apiDeleteWithTimeout(`/subscriptions/${id}`, SUBSCRIPTION_ACTION_TIMEOUT_MS);
}
