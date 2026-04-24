// =============================================================
// src/api/dashboard.ts
//
// Funkcje wywołujące endpointy /dashboard/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import { apiGet } from '../lib/apiClient';
import {
  DashboardSummary,
  UpcomingPaymentsResponse,
  TrialsResponse,
} from '../types/api';

/**
 * GET /dashboard/summary
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data = await apiGet<any>('/dashboard/summary');
  return {
    ...data,
    monthlyTotal: typeof data.monthlyTotal === 'string' ? parseFloat(data.monthlyTotal) : data.monthlyTotal,
    yearlyTotal: typeof data.yearlyTotal === 'string' ? parseFloat(data.yearlyTotal) : data.yearlyTotal,
  };
}

/**
 * GET /dashboard/upcoming?days=N
 */
export async function getUpcomingPayments(
  days: number = 7
): Promise<UpcomingPaymentsResponse> {
  const data = await apiGet<any>(`/dashboard/upcoming?days=${days}`);
  return {
    ...data,
    items: data.items.map((item: any) => ({
      ...item,
      amount: typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount,
    })),
  };
}

/**
 * GET /dashboard/trials?days=N
 */
export async function getTrials(
  days: number = 30
): Promise<TrialsResponse> {
  const data = await apiGet<any>(`/dashboard/trials?days=${days}`);
  return {
    ...data,
    items: data.items.map((item: any) => ({
      ...item,
      amount: typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount,
    })),
  };
}
