// =============================================================
// src/lib/apiClient.ts
//
// Centralny klient HTTP do backendu.
// =============================================================

import Constants from 'expo-constants';
import * as Device from 'expo-device';
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
  const isAndroidEmulator = Platform.OS === 'android' && !Device.isDevice;

  if (isAndroidEmulator) {
    return uniqueUrls([androidEmulatorUrl, expoUrl, envUrl]);
  }

  return uniqueUrls([envUrl, expoUrl, androidEmulatorUrl, localUrl]);
}

const API_BASE_URLS = resolveApiBaseUrls();
const READ_TIMEOUT_MS = 12000;
const WRITE_TIMEOUT_MS = 45000;
const AUTH_FAILURE_COOLDOWN_MS = 10000;
const HOST_PROBE_TIMEOUT_MS = 2500;

let accessTokenPromise: Promise<string> | null = null;
let authFailureUntil = 0;
let lastAuthFailure: ApiError | null = null;
let preferredApiBaseUrl: string | null = null;

if (API_BASE_URLS.length === 0) {
  throw new Error(
    '[apiClient] Brak zmiennej srodowiskowej EXPO_PUBLIC_API_BASE_URL.\n' +
    'Uzupelnij plik .env.'
  );
}

if (__DEV__) {
  console.log(`[apiClient] API base URLs: ${API_BASE_URLS.join(', ')}`);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || '');
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getOrderedApiBaseUrls(): string[] {
  const normalizedUrls = API_BASE_URLS.map(normalizeBaseUrl);

  if (preferredApiBaseUrl && normalizedUrls.includes(preferredApiBaseUrl)) {
    return [
      preferredApiBaseUrl,
      ...normalizedUrls.filter((url) => url !== preferredApiBaseUrl),
    ];
  }

  return normalizedUrls;
}

async function probeApiBaseUrl(baseUrl: string, headers: Record<string, string>): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HOST_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/subscriptions`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (response.status === 404 || response.status >= 500) {
      return false;
    }

    preferredApiBaseUrl = baseUrl;
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getWritableBaseUrls(headers: Record<string, string>): Promise<string[]> {
  const orderedUrls = getOrderedApiBaseUrls();
  if (preferredApiBaseUrl) return orderedUrls;

  const probeResults = await Promise.all(
    orderedUrls.map(async (baseUrl) => ({
      baseUrl,
      isReachable: await probeApiBaseUrl(baseUrl, headers),
    }))
  );
  const reachableBaseUrl = probeResults.find((result) => result.isReachable)?.baseUrl;

  if (reachableBaseUrl) {
    return [
      reachableBaseUrl,
      ...orderedUrls.filter((url) => url !== reachableBaseUrl),
    ];
  }

  throw new ApiError(
    0,
    'Nie można połączyć się z backendem. Sprawdź, czy backend działa na porcie 3000 oraz czy EXPO_PUBLIC_API_BASE_URL wskazuje aktualny adres komputera.',
    { attemptedBaseUrls: orderedUrls }
  );
}

function isRetriableConnectionError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /timeout|abort|network request failed|failed to fetch|internet|offline|load failed/i.test(message);
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /timeout|abort/i.test(message);
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

function createAuthNetworkError(error: unknown) {
  return new ApiError(
    0,
    'Nie mozna polaczyc z Supabase Auth. Sprawdz EXPO_PUBLIC_SUPABASE_URL oraz internet telefonu.',
    { originalMessage: getErrorMessage(error) }
  );
}

async function readAccessToken(): Promise<string> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      if (isRetriableConnectionError(error)) {
        const authError = createAuthNetworkError(error);
        reportRequestFailure(authError);
        throw authError;
      }

      throw new ApiError(401, 'Brak aktywnej sesji. Zaloguj sie ponownie.', {
        originalMessage: getErrorMessage(error),
      });
    }

    if (!session?.access_token) {
      throw new ApiError(401, 'Brak aktywnej sesji. Zaloguj sie ponownie.');
    }

    return session.access_token;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isRetriableConnectionError(error)) {
      const authError = createAuthNetworkError(error);
      reportRequestFailure(authError);
      throw authError;
    }

    throw error;
  }
}

async function getAccessToken(): Promise<string> {
  if (lastAuthFailure && Date.now() < authFailureUntil) {
    throw lastAuthFailure;
  }

  if (!accessTokenPromise) {
    accessTokenPromise = readAccessToken()
      .then((token) => {
        lastAuthFailure = null;
        authFailureUntil = 0;
        return token;
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 0) {
          lastAuthFailure = error;
          authFailureUntil = Date.now() + AUTH_FAILURE_COOLDOWN_MS;
        }

        throw error;
      })
      .finally(() => {
        accessTokenPromise = null;
      });
  }

  return accessTokenPromise;
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
  let baseUrls: string[];
  try {
    baseUrls = method === 'GET'
      ? getOrderedApiBaseUrls()
      : await getWritableBaseUrls(headers);
  } catch (error) {
    reportRequestFailure(error, Date.now() - startedAt);
    throw error;
  }

  for (let attempt = 0; attempt < baseUrls.length; attempt += 1) {
    const baseUrl = baseUrls[attempt];
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (__DEV__) {
      console.log(`[API Request] ${method} ${url} (Timeout: ${Math.round(timeoutMs / 1000)}s)`);
    }

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
        preferredApiBaseUrl = baseUrl;
        return undefined as any;
      }

      const responseBody = await response.json();
      reportRequestSuccess(latencyMs);
      preferredApiBaseUrl = baseUrl;
      return responseBody;
    } catch (error: any) {
      clearTimeout(timeoutId);

      const normalizedError = error?.name === 'AbortError'
        ? new Error(`Connection timeout - backend did not respond within ${Math.round(timeoutMs / 1000)}s.`)
        : error;
      lastError = normalizedError;

      const canTryNextHost =
        attempt < baseUrls.length - 1 &&
        isRetriableConnectionError(normalizedError) &&
        method === 'GET';

      if (canTryNextHost) {
        if (__DEV__) {
          console.warn(
            `[API Request] ${method} ${url} failed, trying next API host: ${getErrorMessage(normalizedError)}`
          );
        }
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

export const apiGet = <T>(path: string): Promise<T> => request<T>('GET', path, undefined, READ_TIMEOUT_MS);
export const apiGetWithTimeout = <T>(path: string, timeoutMs: number): Promise<T> =>
  request<T>('GET', path, undefined, timeoutMs);
export const apiPost = <T>(path: string, body: unknown): Promise<T> => request<T>('POST', path, body, WRITE_TIMEOUT_MS);
export const apiPostWithTimeout = <T>(path: string, body: unknown, timeoutMs: number): Promise<T> =>
  request<T>('POST', path, body, timeoutMs);
export const apiPatch = <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body, WRITE_TIMEOUT_MS);
export const apiPatchWithTimeout = <T>(path: string, body: unknown | undefined, timeoutMs: number): Promise<T> =>
  request<T>('PATCH', path, body, timeoutMs);
export const apiDelete = <T = void>(path: string): Promise<T> => request<T>('DELETE', path, undefined, WRITE_TIMEOUT_MS);
export const apiDeleteWithTimeout = <T = void>(path: string, timeoutMs: number): Promise<T> =>
  request<T>('DELETE', path, undefined, timeoutMs);
