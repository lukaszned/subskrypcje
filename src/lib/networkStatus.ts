export type NetworkStatusKind = 'unknown' | 'online' | 'slow' | 'offline';

export interface NetworkStatusSnapshot {
  status: NetworkStatusKind;
  activeRequests: number;
  lastLatencyMs: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  message: string | null;
}

const listeners = new Set<() => void>();

let snapshot: NetworkStatusSnapshot = {
  status: 'unknown',
  activeRequests: 0,
  lastLatencyMs: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  message: null,
};

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Partial<NetworkStatusSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

export function subscribeNetworkStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNetworkStatusSnapshot() {
  return snapshot;
}

export function reportRequestStart() {
  setSnapshot({ activeRequests: snapshot.activeRequests + 1 });
}

export function reportRequestSuccess(latencyMs: number) {
  const isSlow = latencyMs >= 8000;

  setSnapshot({
    status: isSlow ? 'slow' : 'online',
    activeRequests: Math.max(0, snapshot.activeRequests - 1),
    lastLatencyMs: latencyMs,
    lastSuccessAt: Date.now(),
    message: isSlow
      ? 'Odpowiedź trwa dłużej niż zwykle. Aktualizacja zakończy się w tle.'
      : null,
  });
}

export function reportRequestFailure(error: unknown, latencyMs?: number) {
  const message = error instanceof Error ? error.message : String(error || '');
  const isTimeout = /timeout|abort/i.test(message);
  const isNetwork = /network request failed|failed to fetch|internet|offline|load failed|brak polaczenia|brak połączenia|nie mozna polaczyc|nie można połączyć|nie udalo sie polaczyc|nie udało się połączyć/i.test(message);

  setSnapshot({
    status: isTimeout ? 'slow' : isNetwork ? 'offline' : snapshot.status,
    activeRequests: Math.max(0, snapshot.activeRequests - 1),
    lastLatencyMs: latencyMs ?? snapshot.lastLatencyMs,
    lastFailureAt: Date.now(),
    message: isTimeout
      ? 'Serwer nie odpowiedział na czas. Pokazujemy ostatnio zapisane dane.'
      : isNetwork
        ? 'Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.'
        : message || 'Nie udało się pobrać danych.',
  });
}
