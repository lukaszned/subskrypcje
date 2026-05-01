import { useQuery } from '@tanstack/react-query';
import { getSubscriptionCancelGuide } from '../api/subscriptions';
import { CancelGuide } from '../types/api';

export const CANCEL_GUIDE_KEY = (subscriptionId: string) => ['cancelGuide', subscriptionId];

export function useCancelGuide(subscriptionId: string | undefined) {
  return useQuery<CancelGuide | null, Error>({
    queryKey: CANCEL_GUIDE_KEY(subscriptionId!),
    queryFn: () => getSubscriptionCancelGuide(subscriptionId!),
    enabled: !!subscriptionId,
    staleTime: 1000 * 60 * 60 * 24, // cache for 24h as guides rarely change
  });
}
