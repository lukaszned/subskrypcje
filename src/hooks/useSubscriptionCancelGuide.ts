import { useQuery } from '@tanstack/react-query';
import { getSubscriptionCancelGuideLookup } from '../api/subscriptions';

export const useSubscriptionCancelGuide = (id: string) => {
  return useQuery({
    queryKey: ['subscriptions', id, 'cancel-guide'],
    queryFn: () => getSubscriptionCancelGuideLookup(id),
    staleTime: 600000,
  });
};
