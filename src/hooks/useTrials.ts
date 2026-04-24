// =============================================================
// src/hooks/useTrials.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getTrials } from '../api/dashboard';
import { TrialsResponse } from '../types/api';

export const TRIALS_KEY = (days: number) =>
  ['dashboard', 'trials', days] as const;

/**
 * @param days - liczba dni do przodu (domyślnie 30)
 */
export function useTrials(days: number = 30) {
  return useQuery<TrialsResponse, Error>({
    queryKey: TRIALS_KEY(days),
    queryFn: () => getTrials(days),
    staleTime: 5 * 60 * 1000,
  });
}
