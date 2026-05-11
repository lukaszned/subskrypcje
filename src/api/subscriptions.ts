// =============================================================
// src/api/subscriptions.ts
//
// Funkcje wywołujące endpointy /subscriptions/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
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

async function getCachedSubscriptions(): Promise<Subscription[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTIONS_CACHE_KEY);
    if (!raw) return null;
    return normalizeSubscriptionsResponse(JSON.parse(raw));
  } catch (error) {
    console.log('[subscriptions] Could not read cached subscriptions.', error);
    return null;
  }
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
    const data = await apiGet<any[]>(path);
    const subscriptions = normalizeSubscriptionsResponse(data);

    if (!params?.category && !params?.status && !params?.search) {
      await cacheSubscriptions(subscriptions);
    }

    return subscriptions;
  } catch (error) {
    const cached = await getCachedSubscriptions();
    if (cached) return cached;
    throw error;
  }
}

export async function getSubscriptionById(id: string): Promise<Subscription> {
  const data = await apiGet<any>(`/subscriptions/${id}`);
  return normalizeSubscription(data);
}

export async function getSubscriptionHistory(id: string): Promise<SubscriptionHistoryResponse> {
  return apiGet<SubscriptionHistoryResponse>(`/subscriptions/${id}/history`);
}

export async function getSubscriptionPayments(id: string): Promise<SubscriptionPaymentsResponse> {
  const data = await apiGet<SubscriptionPaymentsResponse>(`/subscriptions/${id}/payments`);
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
