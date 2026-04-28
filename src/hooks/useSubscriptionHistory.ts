import { useQuery } from '@tanstack/react-query';
import { getSubscriptionHistory } from '../api/subscriptions';
import { SubscriptionHistoryResponse } from '../types/api';

export const SUBSCRIPTION_HISTORY_KEY = (id: string) => ['subscription-history', id] as const;

export function useSubscriptionHistory(id: string) {
  return useQuery<SubscriptionHistoryResponse, Error>({
    queryKey: SUBSCRIPTION_HISTORY_KEY(id),
    queryFn: () => getSubscriptionHistory(id),
    enabled: !!id,
  });
}
