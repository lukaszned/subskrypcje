import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  cycle: string;
  status: 'active' | 'cancelled';
  splitWith: number; // np. 1 (tylko ja), 2, 3, 4
}

interface SubscriptionState {
  subscriptions: SubscriptionItem[];
  addSubscription: (sub: Omit<SubscriptionItem, 'id'>) => void;
  removeSubscription: (id: string) => void;
  togglePauseStatus: (id: string) => void;
  clearAll: () => void;
}

const INITIAL_DATA: SubscriptionItem[] = [
  { id: '1', name: 'Netflix', category: 'Rozrywka', amount: 43.00, currency: 'PLN', nextPaymentDate: '12 Maj 2026', cycle: 'Miesięcznie', status: 'active', splitWith: 2 },
  { id: '2', name: 'Spotify', category: 'Muzyka', amount: 19.99, currency: 'PLN', nextPaymentDate: '24 Kwi 2026', cycle: 'Miesięcznie', status: 'active', splitWith: 1 },
  { id: '3', name: 'Adobe CC', category: 'Narzędzia', amount: 249.00, currency: 'PLN', nextPaymentDate: '1 Maj 2026', cycle: 'Miesięcznie', status: 'active', splitWith: 1 },
  { id: '4', name: 'Gym', category: 'Zdrowie', amount: 120.00, currency: 'PLN', nextPaymentDate: '29 Kwi 2026', cycle: 'Miesięcznie', status: 'active', splitWith: 1 },
];

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: INITIAL_DATA,
      
      addSubscription: (sub) => set((state) => ({
        subscriptions: [
          ...state.subscriptions, 
          { ...sub, id: Date.now().toString() }
        ]
      })),
      
      removeSubscription: (id) => set((state) => ({
        subscriptions: state.subscriptions.filter(s => s.id !== id)
      })),
      
      togglePauseStatus: (id) => set((state) => ({
        subscriptions: state.subscriptions.map(s => 
          s.id === id 
            ? { ...s, status: s.status === 'active' ? 'cancelled' : 'active' } 
            : s
        )
      })),

      clearAll: () => set({ subscriptions: [] }),
    }),
    {
      name: 'sub-sentry-storage', // nazwa klucza w AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
