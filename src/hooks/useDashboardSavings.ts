import { useQuery } from '@tanstack/react-query';
import { getDashboardSavings } from '../api/dashboard';

export const useDashboardSavings = () => {
  return useQuery({
    queryKey: ['dashboard', 'savings'],
    queryFn: getDashboardSavings,
    staleTime: 300000,
  });
};
