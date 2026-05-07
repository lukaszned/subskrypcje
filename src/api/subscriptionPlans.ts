import { apiGet } from '../lib/apiClient';
import {
  LOCAL_SUBSCRIPTION_PLANS,
  PopularSubscription,
  SubscriptionPlanVariant,
} from '../data/subscriptionPlans';
import type { BillingCycle, SubscriptionCategory } from '../types/api';

function normalizePlan(plan: any): SubscriptionPlanVariant | null {
  const name = String(plan?.name ?? plan?.planName ?? '').trim();
  const price = Number(plan?.price ?? plan?.amount);

  if (!name || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  const billingCycle = plan?.billingCycle as BillingCycle | undefined;

  return {
    name,
    price,
    billingCycle,
  };
}

function normalizeSubscriptionPlan(item: any): PopularSubscription | null {
  const name = String(item?.name ?? '').trim();
  const provider = String(item?.provider ?? name).trim();
  const defaultPrice = String(item?.defaultPrice ?? item?.amount ?? '').trim();
  const category = item?.category as SubscriptionCategory | undefined;
  const color = String(item?.color ?? '#0B6B3A');
  const rawPlans = Array.isArray(item?.availablePlans) ? item.availablePlans : item?.plans;
  const availablePlans = Array.isArray(rawPlans)
    ? rawPlans.map(normalizePlan).filter(Boolean) as SubscriptionPlanVariant[]
    : undefined;

  if (!name || !provider || !defaultPrice || !category) {
    return null;
  }

  return {
    name,
    provider,
    defaultPrice,
    category,
    color,
    availablePlans: availablePlans && availablePlans.length > 0 ? availablePlans : undefined,
  };
}

export async function getSubscriptionPlans(): Promise<PopularSubscription[]> {
  const data = await apiGet<any>('/subscription-plans');
  const items = Array.isArray(data) ? data : data?.items;
  const normalized = Array.isArray(items)
    ? items.map(normalizeSubscriptionPlan).filter(Boolean) as PopularSubscription[]
    : [];

  return normalized.length > 0 ? normalized : LOCAL_SUBSCRIPTION_PLANS;
}
