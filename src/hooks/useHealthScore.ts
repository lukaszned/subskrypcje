import { useQuery } from '@tanstack/react-query';
import { getHealthScore } from '../api/dashboard';

export const useHealthScore = () => {
  return useQuery({
    queryKey: ['dashboard', 'health-score'],
    queryFn: getHealthScore,
    retry: false,
    staleTime: 300000,
  });
};
