// =============================================================
// src/lib/apiClient.ts
//
// Centralny klient HTTP do backendu.
// =============================================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { reportRequestFailure, reportRequestStart, reportRequestSuccess } from './networkStatus';
import { supabase } from './supabase';

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

function extractHost(value: unknown): string | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  return value.replace(/^[a-z]+:\/\//i, '').split('/')[0].split(':')[0] || null;
}

function getExpoHost(): string | null {
  const constants = Constants as any;

  return extractHost(
    constants.expoConfig?.hostUri ||
    constants.expoGoConfig?.debuggerHost ||
    constants.manifest2?.extra?.expoClient?.hostUri ||
    constants.manifest?.debuggerHost ||
    constants.linkingUri
  );
}

function resolveApiBaseUrl(): string | undefined {
  if (ENV_API_BASE_URL) {
    return ENV_API_BASE_URL.trim();
  }

  if (__DEV__) {
    const expoHost = getExpoHost();

    if (expoHost && !['localhost', '127.0.0.1', '0.0.0.0'].includes(expoHost)) {
      return `http://${expoHost}:3000`;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }

    return 'http://127.0.0.1:3000';
  }

  return ENV_API_BASE_URL;
}

const resolvedApiBaseUrl = resolveApiBaseUrl();

if (!resolvedApiBaseUrl) {
  throw new Error(
    '[apiClient] Brak zmiennej środowiskowej EXPO_PUBLIC_API_BASE_URL.\n' +
    'Uzupełnij plik .env.'
  );
}

const API_BASE_URL = resolvedApiBaseUrl;

console.log(`[apiClient] API base URL: ${API_BASE_URL}`);

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
  body?: unknown,
  timeoutMs: number = 30000
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const url = `${baseUrl}${path}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  console.log(`[API Request] ${method} ${url} (Timeout: ${Math.round(timeoutMs / 1000)}s)`);
  reportRequestStart();
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
    const latencyMs = Date.now() - startedAt;

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
      reportRequestSuccess(latencyMs);
      return undefined as any;
    }

    const responseBody = await response.json();
    reportRequestSuccess(latencyMs);
    return responseBody;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startedAt;
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Connection timeout - backend did not respond within ${Math.round(timeoutMs / 1000)}s.`);
      reportRequestFailure(timeoutError, latencyMs);
      throw timeoutError;
    }
    reportRequestFailure(error, latencyMs);
    throw error;
  }
}

export const apiGet = <T>(path: string): Promise<T> => request<T>('GET', path);
export const apiGetWithTimeout = <T>(path: string, timeoutMs: number): Promise<T> =>
  request<T>('GET', path, undefined, timeoutMs);
export const apiPost = <T>(path: string, body: unknown): Promise<T> => request<T>('POST', path, body);
export const apiPostWithTimeout = <T>(path: string, body: unknown, timeoutMs: number): Promise<T> =>
  request<T>('POST', path, body, timeoutMs);
export const apiPatch = <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body);
export const apiDelete = <T = void>(path: string): Promise<T> => request<T>('DELETE', path);
