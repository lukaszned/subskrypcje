import { useQuery } from '@tanstack/react-query';
import { getDashboardSavings } from '../api/dashboard';

export const useDashboardSavings = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard', 'savings'],
    queryFn: getDashboardSavings,
    staleTime: 300000,
    enabled,
  });
};
