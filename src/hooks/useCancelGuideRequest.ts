import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestCancelGuide } from '../api/subscriptions';
import { CANCEL_GUIDE_KEY } from './useCancelGuide';

export const useCancelGuideRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestCancelGuide(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', id, 'cancel-guide'] });
      queryClient.invalidateQueries({ queryKey: CANCEL_GUIDE_KEY(id) });
    },
  });
};
