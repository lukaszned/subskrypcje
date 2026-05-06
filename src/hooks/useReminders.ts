// =============================================================
// src/hooks/useReminders.ts
// =============================================================

import { useQuery } from '@tanstack/react-query';
import { getReminders } from '../api/dashboard';
import { RemindersResponse } from '../types/api';

export const REMINDERS_KEY = ['dashboard', 'reminders'];

/**
 * Pobiera listę przypomnień do synchronizacji z systemem powiadomień.
 */
export function useReminders(enabled: boolean = true) {
  return useQuery<RemindersResponse>({
    queryKey: REMINDERS_KEY,
    queryFn: getReminders,
    enabled,
  });
}
