import { useQuery } from '@tanstack/react-query';
import { getDashboardTrends } from '../api/dashboard';

export const useDashboardTrends = (months: number = 6, type: 'planned' | 'real' = 'planned') => {
  return useQuery({
    queryKey: ['dashboard', 'trends', months, type],
    queryFn: () => getDashboardTrends(months, type),
    staleTime: 300000,
  });
};
