import { useQuery } from '@tanstack/react-query';
import { getDashboardTrends } from '../api/dashboard';

export const useDashboardTrends = (months: number = 6) => {
  return useQuery({
    queryKey: ['dashboard', 'trends', months],
    queryFn: () => getDashboardTrends(months),
    staleTime: 60000, // Trendy nie zmieniają się tak często, 1 minuta jest OK
  });
};
