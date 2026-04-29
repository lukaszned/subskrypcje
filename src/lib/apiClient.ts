// =============================================================
// src/lib/apiClient.ts
//
// Centralny klient HTTP do backendu.
// =============================================================

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    '[apiClient] Brak zmiennej środowiskowej EXPO_PUBLIC_API_BASE_URL.\n' +
    'Uzupełnij plik .env.'
  );
}

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

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new ApiError(401, 'Brak aktywnej sesji. Zaloguj się ponownie.');
  }
  return session.access_token;
}

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

  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = `${baseUrl}${path}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  console.log(`[API Request] ${method} ${url} (Timeout: 15s)`);
  try {
    const config: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }

      const message = errorBody?.message || `Błąd HTTP ${response.status}`;
      throw new ApiError(response.status, message, errorBody);
    }

    if (response.status === 204) {
      return undefined as any;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Connection timeout - serwer nie odpowiedział w ciągu 15s.');
    }
    throw error;
  }
}

export const apiGet = <T>(path: string): Promise<T> => request<T>('GET', path);
export const apiPost = <T>(path: string, body: unknown): Promise<T> => request<T>('POST', path, body);
export const apiPatch = <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body);
export const apiDelete = <T = void>(path: string): Promise<T> => request<T>('DELETE', path);
