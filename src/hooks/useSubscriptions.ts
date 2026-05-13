// =============================================================
// src/hooks/useSubscriptions.ts
// =============================================================

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  filterAndSortSubscriptions,
  getCachedSubscriptions,
  getSubscriptions,
  GetSubscriptionsParams,
} from '../api/subscriptions';
import { Subscription } from '../types/api';

export const SUBSCRIPTIONS_KEY = (params?: GetSubscriptionsParams) =>
  ['subscriptions', params ?? {}] as const;

/**
 * Hook do pobierania listy subskrypcji z opcjonalnym filtrowaniem.
 */
export function useSubscriptions(params?: GetSubscriptionsParams) {
  const queryClient = useQueryClient();
  const paramsKey = useMemo(
    () => JSON.stringify(params ?? {}),
    [params?.category, params?.search, params?.sortBy, params?.sortOrder, params?.status]
  );
  const queryKey = useMemo(() => SUBSCRIPTIONS_KEY(params), [paramsKey]);
  const [hydratedData, setHydratedData] = useState<Subscription[] | undefined>(() => {
    const exactCache = queryClient.getQueryData<Subscription[]>(queryKey);
    if (exactCache) return exactCache;

    const baseCache = queryClient.getQueryData<Subscription[]>(SUBSCRIPTIONS_KEY());
    return baseCache ? filterAndSortSubscriptions(baseCache, params) : undefined;
  });

  useEffect(() => {
    let isMounted = true;

    getCachedSubscriptions().then((cached) => {
      if (!isMounted || !cached) return;

      const nextData = filterAndSortSubscriptions(cached, params);
      setHydratedData(nextData);
      queryClient.setQueryData(queryKey, nextData);

      if (!params?.category && !params?.status && !params?.search) {
        queryClient.setQueryData(SUBSCRIPTIONS_KEY(), cached);
      }
    }).catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [paramsKey, params?.category, params?.search, params?.sortBy, params?.sortOrder, params?.status, queryClient, queryKey]);

  const query = useQuery<Subscription[], Error>({
    queryKey: SUBSCRIPTIONS_KEY(params),
    queryFn: () => getSubscriptions(params),
    initialData: hydratedData,
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
  });

  if (hydratedData && !query.data) {
    return {
      ...query,
      data: hydratedData,
      isLoading: false,
      isPending: false,
    };
  }

  return query;
}
