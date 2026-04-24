// =============================================================
// src/api/subscriptions.ts
//
// Funkcje wywołujące endpointy /subscriptions/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
import {
  Subscription,
  SubscriptionCategory,
  SubscriptionStatus,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from '../types/api';

// ─────────────────────────────────────────────────────────────
// Helper do normalizacji danych (string amount -> number)
// ─────────────────────────────────────────────────────────────

function normalizeSubscription(sub: any): Subscription {
  return {
    ...sub,
    amount: typeof sub.amount === 'string' ? parseFloat(sub.amount) : sub.amount,
  };
}

// ─────────────────────────────────────────────────────────────
// QUERY (odczyt)
// ─────────────────────────────────────────────────────────────

export interface GetSubscriptionsParams {
  category?: SubscriptionCategory;
  status?: SubscriptionStatus;
}

export async function getSubscriptions(
  params?: GetSubscriptionsParams
): Promise<Subscription[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);

  const qs = query.toString();
  const path = qs ? `/subscriptions?${qs}` : '/subscriptions';

  const data = await apiGet<any[]>(path);
  return data.map(normalizeSubscription);
}

export async function getSubscriptionById(id: string): Promise<Subscription> {
  const data = await apiGet<any>(`/subscriptions/${id}`);
  return normalizeSubscription(data);
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
