import { useQuery } from '@tanstack/react-query';
import { getBudgetImpact } from '../api/dashboard';

export const useBudgetImpact = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard', 'budget-impact'],
    queryFn: getBudgetImpact,
    staleTime: 60000,
    enabled,
  });
};
