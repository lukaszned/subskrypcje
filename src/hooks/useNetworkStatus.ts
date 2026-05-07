import { useSyncExternalStore } from 'react';
import {
  getNetworkStatusSnapshot,
  subscribeNetworkStatus,
} from '../lib/networkStatus';

export function useNetworkStatus() {
  return useSyncExternalStore(
    subscribeNetworkStatus,
    getNetworkStatusSnapshot,
    getNetworkStatusSnapshot
  );
}
