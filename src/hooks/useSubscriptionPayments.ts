import { useQuery } from '@tanstack/react-query';
import { getSubscriptionPayments } from '../api/subscriptions';

export const useSubscriptionPayments = (subscriptionId: string) => {
  return useQuery({
    queryKey: ['subscriptions', subscriptionId, 'payments'],
    queryFn: () => getSubscriptionPayments(subscriptionId),
    enabled: !!subscriptionId,
    staleTime: 60000,
  });
};
