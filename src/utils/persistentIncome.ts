import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERSISTENT_INCOME_KEY = 'sub-sentry.monthly-income.v1';

export type PersistentIncome = {
  monthlyIncome: number | null;
  incomeCurrency: string;
  updatedAt: string | null;
};

const DEFAULT_INCOME: PersistentIncome = {
  monthlyIncome: null,
  incomeCurrency: 'PLN',
  updatedAt: null,
};

export function normalizeIncomeValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export async function getPersistentIncome(): Promise<PersistentIncome> {
  try {
    const raw = await AsyncStorage.getItem(PERSISTENT_INCOME_KEY);
    if (!raw) return DEFAULT_INCOME;

    const parsed = JSON.parse(raw);
    return {
      monthlyIncome: normalizeIncomeValue(parsed?.monthlyIncome),
      incomeCurrency: typeof parsed?.incomeCurrency === 'string' && parsed.incomeCurrency
        ? parsed.incomeCurrency
        : 'PLN',
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return DEFAULT_INCOME;
  }
}

export async function savePersistentIncome(input: Pick<PersistentIncome, 'monthlyIncome' | 'incomeCurrency'>) {
  const payload: PersistentIncome = {
    monthlyIncome: normalizeIncomeValue(input.monthlyIncome),
    incomeCurrency: input.incomeCurrency || 'PLN',
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(PERSISTENT_INCOME_KEY, JSON.stringify(payload));
  return payload;
}
