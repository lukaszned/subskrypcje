import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

export interface SubscriptionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  nextPaymentDate: string; // ISO
  cycle: string;
  status: 'active' | 'cancelled';
  sharedWith: number; // 1 = you pay everything, 2 = split with 1 person, etc.
}

export interface SubscriptionState {
  subscriptions: SubscriptionItem[];
  addSubscription: (sub: Omit<SubscriptionItem, 'id'>) => void;
  removeSubscription: (id: string) => void;
  togglePauseSubscription: (id: string) => void;
}

// Na webie używamy localStorage, na natywnych AsyncStorage
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(window.localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(window.localStorage.removeItem(key)),
    };
  }
  return require('@react-native-async-storage/async-storage').default;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set: any) => ({
      subscriptions: [],
      addSubscription: (sub: any) =>
        set((state: any) => ({
          subscriptions: [
            ...state.subscriptions,
            { ...sub, id: Date.now().toString() },
          ],
        })),
      removeSubscription: (id: any) =>
        set((state: any) => ({
          subscriptions: state.subscriptions.filter((sub: any) => sub.id !== id),
        })),
      togglePauseSubscription: (id: any) =>
        set((state: any) => ({
          subscriptions: state.subscriptions.map((sub: any) =>
            sub.id === id
              ? { ...sub, status: sub.status === 'active' ? 'cancelled' : 'active' }
              : sub
          ),
        })),
    }),
    {
      name: 'sub-sentry-storage',
      storage: createJSONStorage(getStorage) as any,
    } as any
  ) as any
);
