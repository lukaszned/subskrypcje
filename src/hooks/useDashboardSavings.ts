import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { SavingsResponse } from '../types/api';

export const useDashboardSavings = () => {
  return useQuery({
    queryKey: ['dashboard', 'savings'],
    queryFn: async () => {
      const { data } = await apiClient.get<SavingsResponse>('/dashboard/savings');
      return data;
    },
    staleTime: 30000,
  });
};
