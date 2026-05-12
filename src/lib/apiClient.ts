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

function isLocalOrLanHost(host: string | null): boolean {
  if (!host) return false;

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function uniqueUrls(urls: Array<string | undefined | null>): string[] {
  return Array.from(new Set(
    urls
      .filter(Boolean)
      .map((url) => String(url).trim())
      .filter(Boolean)
  ));
}

function resolveApiBaseUrls(): string[] {
  const envUrl = ENV_API_BASE_URL?.trim();

  if (!__DEV__) {
    return uniqueUrls([envUrl]);
  }

  const expoHost = getExpoHost();
  const expoUrl = expoHost && !['localhost', '127.0.0.1', '0.0.0.0'].includes(expoHost)
    ? `http://${expoHost}:3000`
    : undefined;
  const androidEmulatorUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : undefined;
  const localUrl = Platform.OS === 'android' ? undefined : 'http://127.0.0.1:3000';
  const envHost = extractHost(envUrl);

  // On a physical phone the LAN IP in .env can get stale. In dev, prefer the
  // current Expo host when .env points to a different local/LAN address.
  if (envUrl && expoUrl && envHost !== expoHost && isLocalOrLanHost(envHost)) {
    return uniqueUrls([expoUrl, envUrl, androidEmulatorUrl, localUrl]);
  }

  return uniqueUrls([envUrl, expoUrl, androidEmulatorUrl, localUrl]);
}

const API_BASE_URLS = resolveApiBaseUrls();

if (API_BASE_URLS.length === 0) {
  throw new Error(
    '[apiClient] Brak zmiennej srodowiskowej EXPO_PUBLIC_API_BASE_URL.\n' +
    'Uzupelnij plik .env.'
  );
}

console.log(`[apiClient] API base URLs: ${API_BASE_URLS.join(', ')}`);

function isRetriableConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /timeout|abort|network request failed|failed to fetch|internet|offline|load failed/i.test(message);
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
    throw new ApiError(401, 'Brak aktywnej sesji. Zaloguj sie ponownie.');
  }
  return session.access_token;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  timeoutMs: number = 15000
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const startedAt = Date.now();
  let lastError: unknown;

  reportRequestStart();

  for (let attempt = 0; attempt < API_BASE_URLS.length; attempt += 1) {
    const baseUrl = API_BASE_URLS[attempt].endsWith('/')
      ? API_BASE_URLS[attempt].slice(0, -1)
      : API_BASE_URLS[attempt];
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[API Request] ${method} ${url} (Timeout: ${Math.round(timeoutMs / 1000)}s)`);

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

        const message = errorBody?.message || `Blad HTTP ${response.status}`;
        const apiError = new ApiError(response.status, message, errorBody);
        reportRequestFailure(apiError, latencyMs);
        throw apiError;
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

      const normalizedError = error?.name === 'AbortError'
        ? new Error(`Connection timeout - backend did not respond within ${Math.round(timeoutMs / 1000)}s.`)
        : error;
      lastError = normalizedError;

      const canTryNextHost =
        attempt < API_BASE_URLS.length - 1 &&
        isRetriableConnectionError(normalizedError);

      if (canTryNextHost) {
        console.warn(`[API Request] ${method} ${url} failed, trying next API host.`, normalizedError);
        continue;
      }

      const latencyMs = Date.now() - startedAt;
      reportRequestFailure(normalizedError, latencyMs);
      throw normalizedError;
    }
  }

  const latencyMs = Date.now() - startedAt;
  reportRequestFailure(lastError, latencyMs);
  throw lastError;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>('GET', path, undefined, 12000);
export const apiGetWithTimeout = <T>(path: string, timeoutMs: number): Promise<T> =>
  request<T>('GET', path, undefined, timeoutMs);
export const apiPost = <T>(path: string, body: unknown): Promise<T> => request<T>('POST', path, body);
export const apiPostWithTimeout = <T>(path: string, body: unknown, timeoutMs: number): Promise<T> =>
  request<T>('POST', path, body, timeoutMs);
export const apiPatch = <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body);
export const apiDelete = <T = void>(path: string): Promise<T> => request<T>('DELETE', path);
