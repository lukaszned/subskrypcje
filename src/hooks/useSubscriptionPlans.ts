import { useQuery } from '@tanstack/react-query';
import { getSubscriptionPlans } from '../api/subscriptionPlans';
import {
  LOCAL_SUBSCRIPTION_PLANS,
  PopularSubscription,
} from '../data/subscriptionPlans';

export const SUBSCRIPTION_PLANS_KEY = ['subscription-plans'] as const;

export function useSubscriptionPlans() {
  return useQuery<PopularSubscription[]>({
    queryKey: SUBSCRIPTION_PLANS_KEY,
    queryFn: async () => {
      try {
        return await getSubscriptionPlans();
      } catch (error) {
        console.warn('[subscription-plans] Falling back to local catalog.', error);
        return LOCAL_SUBSCRIPTION_PLANS;
      }
    },
    initialData: LOCAL_SUBSCRIPTION_PLANS,
    retry: false,
    staleTime: 1000 * 60 * 60,
  });
}
