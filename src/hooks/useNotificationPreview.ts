import { useQuery } from '@tanstack/react-query';
import { getNotificationPreview } from '../api/dashboard';

export const useNotificationPreview = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard', 'notification-preview'],
    queryFn: getNotificationPreview,
    staleTime: 60000,
    enabled,
  });
};
