import { useQuery } from '@tanstack/react-query';
import { getDashboardActivity } from '../api/dashboard';

export const useDashboardActivity = (limit: number = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => getDashboardActivity(limit),
    retry: false,
    staleTime: 60000,
  });
};
