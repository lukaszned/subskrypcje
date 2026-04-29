import { useQuery } from '@tanstack/react-query';
import { getBudgetImpact } from '../api/dashboard';

export const useBudgetImpact = () => {
  return useQuery({
    queryKey: ['dashboard', 'budget-impact'],
    queryFn: getBudgetImpact,
    staleTime: 60000,
  });
};
