import { useQuery } from '@tanstack/react-query';
import { getDashboardOverview } from '../api/dashboard';

export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardOverview,
    staleTime: 60000, // 1 minute
  });
};
