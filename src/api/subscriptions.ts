// =============================================================
// src/api/subscriptions.ts
//
// Funkcje wywołujące endpointy /subscriptions/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import { apiGet, apiGetWithTimeout, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Subscription,
  SubscriptionCategory,
  SubscriptionStatus,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  SubscriptionHistoryResponse,
  SubscriptionPaymentsResponse,
  CancelGuide,
  CancelGuideLookupResponse,
  CancelGuideRequestResponse,
} from '../types/api';

const SUBSCRIPTIONS_CACHE_KEY = 'sub-sentry.subscriptions.v1';

// ─────────────────────────────────────────────────────────────
// Helper do normalizacji danych (string amount -> number)
// ─────────────────────────────────────────────────────────────

function normalizeSubscription(sub: any): Subscription {
  const amount = typeof sub?.amount === 'string' ? parseFloat(sub.amount) : Number(sub?.amount ?? 0);

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
    if (params?.status && subscription.status !== params.status) return false;

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
      const first = a.nextPaymentDate ? new Date(a.nextPaymentDate).getTime() : Number.MAX_SAFE_INTEGER;
      const second = b.nextPaymentDate ? new Date(b.nextPaymentDate).getTime() : Number.MAX_SAFE_INTEGER;
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
  const data = await apiPost<any>('/subscriptions', payload);
  return normalizeSubscription(data);
}

export async function updateSubscription(
  id: string,
  payload: UpdateSubscriptionPayload
): Promise<Subscription> {
  const data = await apiPatch<any>(`/subscriptions/${id}`, payload);
  return normalizeSubscription(data);
}

export async function paySubscription(id: string): Promise<Subscription> {
  const data = await apiPatch<any>(`/subscriptions/${id}/pay`);
  return normalizeSubscription(data);
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  const data = await apiPatch<any>(`/subscriptions/${id}/cancel`);
  return normalizeSubscription(data);
}

export async function deleteSubscription(id: string): Promise<void> {
  return apiDelete(`/subscriptions/${id}`);
}

export async function getSubscriptionCancelGuideLookup(id: string): Promise<CancelGuideLookupResponse> {
  return apiGet<CancelGuideLookupResponse>(`/subscriptions/${id}/cancel-guide`);
}

export async function getSubscriptionCancelGuide(id: string): Promise<CancelGuide | null> {
  const data = await getSubscriptionCancelGuideLookup(id);

  return data.hasGuide ? data.guide : null;
}

/**
 * POST /subscriptions/:id/cancel-guide-request
 */
export async function requestCancelGuide(id: string): Promise<CancelGuideRequestResponse> {
  return apiPost<CancelGuideRequestResponse>(`/subscriptions/${id}/cancel-guide-request`, {});
}
