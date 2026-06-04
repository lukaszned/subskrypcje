import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPersistentIncome,
  PersistentIncome,
  savePersistentIncome,
} from '../utils/persistentIncome';

export const PERSISTENT_INCOME_QUERY_KEY = ['local', 'persistent-income'] as const;

export function usePersistentIncome(enabled: boolean = true) {
  return useQuery({
    queryKey: PERSISTENT_INCOME_QUERY_KEY,
    queryFn: getPersistentIncome,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
}

export function useSavePersistentIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Pick<PersistentIncome, 'monthlyIncome' | 'incomeCurrency'>) =>
      savePersistentIncome(payload),
    onSuccess: (income) => {
      queryClient.setQueryData(PERSISTENT_INCOME_QUERY_KEY, income);
    },
  });
}
