// =============================================================
// src/hooks/useDashboardSummary.ts
// =============================================================

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCachedDashboardSummary, getDashboardSummary } from '../api/dashboard';
import { DashboardSummary } from '../types/api';

export const DASHBOARD_SUMMARY_KEY = ['dashboard', 'summary'] as const;

export function useDashboardSummary() {
  const queryClient = useQueryClient();
  const [cachedSummary, setCachedSummary] = useState<DashboardSummary | undefined>(() =>
    queryClient.getQueryData<DashboardSummary>(DASHBOARD_SUMMARY_KEY)
  );

  useEffect(() => {
    let isMounted = true;

    getCachedDashboardSummary().then((summary) => {
      if (!isMounted || !summary) return;

      setCachedSummary(summary);
      queryClient.setQueryData(DASHBOARD_SUMMARY_KEY, summary);
    }).catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  return useQuery<DashboardSummary, Error>({
    queryKey: DASHBOARD_SUMMARY_KEY,
    queryFn: getDashboardSummary,
    initialData: cachedSummary,
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
  });
}
