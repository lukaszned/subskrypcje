// =============================================================
// src/lib/apiClient.ts
//
// Centralny klient HTTP do backendu.
//
// ODPOWIEDZIALNOŚCI:
//   - pobiera aktualny access_token z sesji Supabase
//   - wstrzykuje nagłówek Authorization: Bearer <token>
//   - obsługuje błędy HTTP w jednym miejscu
//   - eksponuje typowane apiGet / apiPost / apiPatch / apiDelete
//
// CZEGO TU NIE ROBIMY:
//   - żadnego bezpośredniego renderowania (zero React)
//   - żadnego globalnego stanu UI (to robią hooki/context)
// =============================================================

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    '[apiClient] Brak zmiennej środowiskowej EXPO_PUBLIC_API_BASE_URL.\n' +
    'Uzupełnij plik .env.'
  );
}

// ─────────────────────────────────────────────────────────────
// Typy błędów
// ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─────────────────────────────────────────────────────────────
// Pobieranie tokena
// ─────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new ApiError(401, 'Brak aktywnej sesji. Zaloguj się ponownie.');
  }

  return session.access_token;
}

// ─────────────────────────────────────────────────────────────
// Główna funkcja request
// ─────────────────────────────────────────────────────────────

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, config);

  // ── Obsługa błędów HTTP ─────────────────────────────────────

  if (!response.ok) {
    let errorBody: unknown;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    const message =
      typeof errorBody === 'object' &&
      errorBody !== null &&
      'message' in errorBody
        ? String((errorBody as { message: string }).message)
        : `Błąd HTTP ${response.status}`;

    throw new ApiError(response.status, message, errorBody);
  }

  // ── Sukces ──────────────────────────────────────────────────

  // DELETE może zwrócić 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────
// Publiczne metody
// ─────────────────────────────────────────────────────────────

export const apiGet = <T>(path: string): Promise<T> =>
  request<T>('GET', path);

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>('POST', path, body);

export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>('PATCH', path, body);

export const apiDelete = <T = void>(path: string): Promise<T> =>
  request<T>('DELETE', path);
