// =============================================================
// src/api/dashboard.ts
//
// Funkcje wywołujące endpointy /dashboard/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import { apiGet, apiPatch } from '../lib/apiClient';
import {
  DashboardSummary,
  UpcomingPaymentsResponse,
  TrialsResponse,
  DashboardTrendsResponse,
  UserSettings,
  DashboardOverviewResponse,
  BudgetImpactResponse,
  NotificationPreviewResponse,
  RemindersResponse,
} from '../types/api';

/**
 * GET /dashboard/overview
 */
export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  try {
    const data = await apiGet<DashboardOverviewResponse>('/dashboard/overview');
    
    if (!data || !data.summary) {
      throw new Error('Otrzymano niekompletne dane z serwera (brak sekcji summary).');
    }

    return {
      ...data,
      summary: {
        ...data.summary,
        monthlyTotal: Number(data.summary?.monthlyTotal || 0),
        yearlyTotal: Number(data.summary?.yearlyTotal || 0),
      },
      upcoming: {
        ...data.upcoming,
        items: (data.upcoming?.items || []).map(i => ({
          ...i,
          amount: Number(i.amount || 0)
        }))
      },
      savings: {
        ...data.savings,
        monthlySavings: Number(data.savings?.monthlySavings || 0),
        yearlySavings: Number(data.savings?.yearlySavings || 0),
      },
      breakdown: {
        ...data.breakdown,
        items: (data.breakdown?.items || []).map(i => ({
          ...i,
          monthlyAmount: Number(i.monthlyAmount || 0)
        }))
      },
      trends: {
        ...data.trends,
        items: (data.trends?.items || []).map(i => ({
          ...i,
          amount: Number(i.amount || 0)
        }))
      },
      trials: {
        ...data.trials,
        items: (data.trials?.items || []).map(i => ({
          ...i,
          amount: Number(i.amount || 0)
        }))
      }
    };
  } catch (error: any) {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (error.message?.includes('Network request failed')) {
      throw new Error(`Błąd połączenia z serwerem. Upewnij się, że serwer działa pod adresem: ${baseUrl}`);
    }
    throw error;
  }
}

/**
 * GET /dashboard/trends
 */
export async function getDashboardTrends(months: number = 6): Promise<DashboardTrendsResponse> {
  return apiGet<DashboardTrendsResponse>(`/dashboard/trends?months=${months}`);
}

/**
 * GET /users/settings
 */
export async function getUserSettings(): Promise<UserSettings> {
  return apiGet<UserSettings>('/users/settings');
}

/**
 * PATCH /users/settings
 */
export async function updateUserSettings(payload: Partial<UserSettings>): Promise<UserSettings> {
  return apiPatch<UserSettings>('/users/settings', payload);
}

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

/**
 * GET /dashboard/category-breakdown
 */
export async function getCategoryBreakdown() {
  const data = await apiGet<any>('/dashboard/category-breakdown');
  return data;
}

/**
 * GET /dashboard/reminders
 */
export async function getReminders(): Promise<RemindersResponse> {
  return apiGet<RemindersResponse>('/dashboard/reminders');
}

/**
 * GET /dashboard/budget-impact
 */
export async function getBudgetImpact(): Promise<BudgetImpactResponse> {
  const data = await apiGet<BudgetImpactResponse>('/dashboard/budget-impact');
  return {
    ...data,
    monthlyIncome: Number(data.monthlyIncome || 0),
    monthlySubscriptionsTotal: Number(data.monthlySubscriptionsTotal || 0),
    freeAfterSubscriptions: Number(data.freeAfterSubscriptions || 0),
  };
}

/**
 * GET /dashboard/notification-preview
 */
export async function getNotificationPreview(): Promise<NotificationPreviewResponse> {
  return apiGet<NotificationPreviewResponse>('/dashboard/notification-preview');
}
