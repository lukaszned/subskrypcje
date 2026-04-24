// =============================================================
// src/api/users.ts
//
// Funkcje wywołujące endpointy /users/*.
// =============================================================

import { apiGet } from '../lib/apiClient';
import { MeResponse } from '../types/api';

/**
 * GET /users/me
 * Zwraca aktualnego użytkownika (authUser z Supabase + appUser z własnej bazy).
 */
export async function getMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('/users/me');
}
