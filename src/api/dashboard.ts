// =============================================================
// src/api/dashboard.ts
//
// Funkcje wywołujące endpointy /dashboard/*.
// CZYSTE funkcje — zero hooków, zero stanu React.
// Wywoływane przez hooki w src/hooks/.
// =============================================================

import { apiGet, apiGetWithTimeout, apiPatch } from '../lib/apiClient';
import {
  DashboardSummary,
  UpcomingPaymentsResponse,
  TrialsResponse,
  DashboardTrendsResponse,
  UserSettings,
  BudgetImpactResponse,
  NotificationPreviewResponse,
  RemindersResponse,
  DashboardActivityResponse,
  HealthScoreResponse,
  SavingsResponse,
  Subscription,
  SubscriptionCategory,
  CategoryBreakdownResponse,
} from '../types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysUntilDate, parseAppDate, startOfLocalDay } from '../utils/date';

const DASHBOARD_SUMMARY_CACHE_KEY = 'sub-sentry.dashboard-summary.v1';

function normalizeItemsResponse<T>(
  raw: any,
  fallbackDays: number,
  mapItem: (item: any) => T
): { days: number; count: number; items: T[] } {
  const items = Array.isArray(raw?.items) ? raw.items.map(mapItem) : [];

  return {
    days: Number(raw?.days ?? fallbackDays),
    count: Number(raw?.count ?? items.length),
    items,
  };
}

function normalizeTrendItem(item: any) {
  const amount = item?.amount ?? item?.total ?? 0;
  return {
    ...item,
    month: item?.label ?? item?.month ?? '',
    label: item?.label,
    amount: Number(amount || 0),
  };
}

async function cacheDashboardSummary(summary: DashboardSummary) {
  try {
    await AsyncStorage.setItem(DASHBOARD_SUMMARY_CACHE_KEY, JSON.stringify(summary));
  } catch (error) {
    console.log('[dashboard] Could not cache summary.', error);
  }
}

async function getCachedDashboardSummary(): Promise<DashboardSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(DASHBOARD_SUMMARY_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      monthlyTotal: Number(parsed.monthlyTotal || 0),
      yearlyTotal: Number(parsed.yearlyTotal || 0),
      activeSubscriptionsCount: Number(parsed.activeSubscriptionsCount || 0),
      trialsCount: Number(parsed.trialsCount || 0),
      upcomingPaymentsCount: Number(parsed.upcomingPaymentsCount || 0),
      overdueCount: Number(parsed.overdueCount || 0),
      baseCurrency: parsed.baseCurrency || 'PLN',
    };
  } catch (error) {
    console.log('[dashboard] Could not read cached summary.', error);
    return null;
  }
}

function toMonthlyAmount(subscription: Pick<Subscription, 'amount' | 'billingCycle'>): number {
  const amount = Number(subscription.amount || 0);

  switch (subscription.billingCycle) {
    case 'yearly':
      return amount / 12;
    case 'weekly':
      return amount * 4.345;
    case 'one_time':
      return 0;
    default:
      return amount;
  }
}

function buildSummaryFromSubscriptions(rawSubscriptions: any[]): DashboardSummary {
  const subscriptions = rawSubscriptions.map((subscription) => ({
    ...subscription,
    amount: Number(subscription?.amount || 0),
  })) as Subscription[];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingLimit = new Date(today);
  upcomingLimit.setDate(upcomingLimit.getDate() + 30);

  const countedSubscriptions = subscriptions.filter((subscription) => {
    if (subscription.status === 'canceled') return false;
    return subscription.includeInStats !== false;
  });

  const monthlyTotal = countedSubscriptions.reduce(
    (sum, subscription) => sum + toMonthlyAmount(subscription),
    0
  );

  const upcomingPaymentsCount = countedSubscriptions.filter((subscription) => {
    if (!subscription.nextPaymentDate) return false;
    const paymentDate = parseAppDate(subscription.nextPaymentDate);
    if (!paymentDate) return false;
    return paymentDate >= today && paymentDate <= upcomingLimit;
  }).length;

  const overdueCount = countedSubscriptions.filter((subscription) => {
    if (subscription.status === 'overdue') return true;
    if (!subscription.nextPaymentDate) return false;
    const paymentDate = parseAppDate(subscription.nextPaymentDate);
    return paymentDate ? paymentDate < today : false;
  }).length;

  return {
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    activeSubscriptionsCount: countedSubscriptions.length,
    trialsCount: countedSubscriptions.filter((subscription) => subscription.isTrial).length,
    upcomingPaymentsCount,
    overdueCount,
    baseCurrency: countedSubscriptions[0]?.currency || 'PLN',
  };
}

function normalizeSubscriptions(rawSubscriptions: any[]): Subscription[] {
  return rawSubscriptions.map((subscription) => ({
    ...subscription,
    amount: Number(subscription?.amount || 0),
  })) as Subscription[];
}

async function getSubscriptionsFallback(): Promise<Subscription[]> {
  const subscriptions = await apiGetWithTimeout<any[]>('/subscriptions', 12000);
  return normalizeSubscriptions(Array.isArray(subscriptions) ? subscriptions : []);
}

function getDateOnly(date: Date) {
  return startOfLocalDay(date);
}

function buildUpcomingFromSubscriptions(subscriptions: Subscription[], days: number): UpcomingPaymentsResponse {
  const today = getDateOnly(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  const items = subscriptions
    .filter((subscription) => {
      if (subscription.status === 'canceled' || !subscription.nextPaymentDate) return false;
      const paymentDate = parseAppDate(subscription.nextPaymentDate);
      if (!paymentDate) return false;
      return paymentDate >= today && paymentDate <= limit;
    })
    .sort((a, b) => {
      const first = parseAppDate(a.nextPaymentDate)?.getTime() ?? 0;
      const second = parseAppDate(b.nextPaymentDate)?.getTime() ?? 0;
      return first - second;
    })
    .map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      provider: subscription.provider,
      planName: subscription.planName,
      amount: Number(subscription.amount || 0),
      currency: subscription.currency,
      nextPaymentDate: subscription.nextPaymentDate || '',
      status: subscription.status,
      isTrial: subscription.isTrial,
      reminderDaysBefore: subscription.reminderDaysBefore,
    }));

  return {
    days,
    count: items.length,
    items,
  };
}

function buildTrialsFromSubscriptions(subscriptions: Subscription[], days: number): TrialsResponse {
  const today = getDateOnly(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  const items = subscriptions
    .filter((subscription) => {
      if (subscription.status === 'canceled' || !subscription.isTrial || !subscription.trialEndDate) {
        return false;
      }
      const trialEndDate = parseAppDate(subscription.trialEndDate);
      if (!trialEndDate) return false;
      return trialEndDate >= today && trialEndDate <= limit;
    })
    .sort((a, b) => {
      const first = parseAppDate(a.trialEndDate)?.getTime() ?? 0;
      const second = parseAppDate(b.trialEndDate)?.getTime() ?? 0;
      return first - second;
    })
    .map((subscription) => {
      const daysLeft = daysUntilDate(subscription.trialEndDate) ?? 0;

      return {
        id: subscription.id,
        name: subscription.name,
        provider: subscription.provider,
        planName: subscription.planName,
        amount: Number(subscription.amount || 0),
        currency: subscription.currency,
        trialEndDate: subscription.trialEndDate || '',
        nextPaymentDate: subscription.nextPaymentDate,
        status: subscription.status,
        cancelUrl: subscription.cancelUrl,
        reminderDaysBefore: subscription.reminderDaysBefore,
        daysLeft: Math.max(0, daysLeft),
      };
    });

  return {
    days,
    count: items.length,
    items,
  };
}

function buildCategoryBreakdownFromSubscriptions(subscriptions: Subscription[]): CategoryBreakdownResponse {
  const countedSubscriptions = subscriptions.filter((subscription) => {
    if (subscription.status === 'canceled') return false;
    return subscription.includeInStats !== false;
  });

  const totals = countedSubscriptions.reduce(
    (acc, subscription) => {
      const category = subscription.category || 'other';
      acc[category] = (acc[category] || 0) + toMonthlyAmount(subscription);
      return acc;
    },
    {} as Record<SubscriptionCategory, number>
  );

  const totalMonthly = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const items = Object.entries(totals).map(([category, monthlyAmount]) => ({
    category: category as SubscriptionCategory,
    monthlyAmount,
    subscriptionCount: countedSubscriptions.filter((subscription) => subscription.category === category).length,
    percentage: totalMonthly > 0 ? Math.round((monthlyAmount / totalMonthly) * 100) : 0,
  }));

  return {
    totalMonthly,
    baseCurrency: countedSubscriptions[0]?.currency || 'PLN',
    items,
  };
}

/**
 * Removed dashboard overview compatibility helper.
 */
export async function getDashboardOverview(): Promise<never> {
  throw new Error('Dashboard overview endpoint was removed. Use modular dashboard endpoints instead.');
  /*
    const data = undefined as any;
    
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
        items: (data.trends?.items || []).map(normalizeTrendItem)
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
  */
}

/**
 * GET /dashboard/trends
 */
export async function getDashboardTrends(
  months: number = 6, 
  type: 'planned' | 'real' = 'planned'
): Promise<DashboardTrendsResponse> {
  const data = await apiGet<any>(`/dashboard/trends?months=${months}&type=${type}`);
  const responseType = data?.type === 'planned' || data?.type === 'real' ? data.type : type;

  return {
    ...data,
    type: responseType,
    months: Number(data?.months ?? months),
    items: Array.isArray(data?.items) ? data.items.map(normalizeTrendItem) : [],
  };
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
  try {
    const data = await apiGetWithTimeout<any>('/dashboard/summary', 12000);
    const summary = {
      ...data,
      monthlyTotal: typeof data.monthlyTotal === 'string' ? parseFloat(data.monthlyTotal) : data.monthlyTotal,
      yearlyTotal: typeof data.yearlyTotal === 'string' ? parseFloat(data.yearlyTotal) : data.yearlyTotal,
    };

    await cacheDashboardSummary(summary);
    return summary;
  } catch (summaryError) {
    console.log('[dashboard] Summary endpoint failed, falling back to /subscriptions.', summaryError);

    try {
      const subscriptions = await getSubscriptionsFallback();
      const fallbackSummary = buildSummaryFromSubscriptions(subscriptions);
      await cacheDashboardSummary(fallbackSummary);
      return fallbackSummary;
    } catch (fallbackError) {
      console.log('[dashboard] Subscriptions fallback failed, trying cached summary.', fallbackError);
      const cachedSummary = await getCachedDashboardSummary();
      if (cachedSummary) return cachedSummary;
      throw fallbackError;
    }
  }
}

/**
 * GET /dashboard/upcoming?days=N
 */
export async function getUpcomingPayments(
  days: number = 7
): Promise<UpcomingPaymentsResponse> {
  try {
    const data = await apiGetWithTimeout<any>(`/dashboard/upcoming?days=${days}`, 12000);
    return normalizeItemsResponse(data, days, (item) => ({
        ...item,
        amount: Number(item.amount || 0),
    }));
  } catch (error) {
    console.log('[dashboard] Upcoming endpoint failed, falling back to /subscriptions.', error);
    return buildUpcomingFromSubscriptions(await getSubscriptionsFallback(), days);
  }
}

/**
 * GET /dashboard/trials?days=N
 */
export async function getTrials(
  days: number = 30
): Promise<TrialsResponse> {
  try {
    const data = await apiGetWithTimeout<any>(`/dashboard/trials?days=${days}`, 12000);
    return normalizeItemsResponse(data, days, (item) => ({
        ...item,
        amount: Number(item.amount || 0),
    }));
  } catch (error) {
    console.log('[dashboard] Trials endpoint failed, falling back to /subscriptions.', error);
    return buildTrialsFromSubscriptions(await getSubscriptionsFallback(), days);
  }
}

/**
 * GET /dashboard/category-breakdown
 */
export async function getCategoryBreakdown(): Promise<CategoryBreakdownResponse> {
  try {
    const data = await apiGetWithTimeout<any>('/dashboard/category-breakdown', 12000);
    return data;
  } catch (error) {
    console.log('[dashboard] Category breakdown endpoint failed, falling back to /subscriptions.', error);
    return buildCategoryBreakdownFromSubscriptions(await getSubscriptionsFallback());
  }
}

/**
 * GET /dashboard/savings
 */
export async function getDashboardSavings(): Promise<SavingsResponse> {
  const data = await apiGet<SavingsResponse>('/dashboard/savings');
  return {
    ...data,
    monthlySavings: Number(data.monthlySavings || 0),
    yearlySavings: Number(data.yearlySavings || 0),
  };
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
    monthlyIncome: data.monthlyIncome === null ? null : Number(data.monthlyIncome || 0),
    monthlySubscriptionsTotal: Number(data.monthlySubscriptionsTotal || 0),
    freeAfterSubscriptions: data.freeAfterSubscriptions === null ? null : Number(data.freeAfterSubscriptions || 0),
    subscriptionsIncomePercentage: data.subscriptionsIncomePercentage === null
      ? null
      : Number(data.subscriptionsIncomePercentage || 0),
  };
}

/**
 * GET /dashboard/notification-preview
 */
export async function getNotificationPreview(): Promise<NotificationPreviewResponse> {
  return apiGet<NotificationPreviewResponse>('/dashboard/notification-preview');
}

/**
 * GET /dashboard/activity
 */
export async function getDashboardActivity(limit: number = 10): Promise<DashboardActivityResponse> {
  return apiGet<DashboardActivityResponse>(`/dashboard/activity?limit=${limit}`);
}

/**
 * GET /dashboard/health-score
 */
export async function getHealthScore(): Promise<HealthScoreResponse> {
  return apiGet<HealthScoreResponse>('/dashboard/health-score');
}
