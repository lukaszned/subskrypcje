export const BASE_CURRENCY = "PLN" as const;

export const SUPPORTED_CURRENCIES = ["PLN", "EUR", "USD"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const EXCHANGE_RATES_TO_PLN: Record<CurrencyCode, number> = {
    PLN: 1,
    EUR: 4.3,
    USD: 4.0,
};

export function normalizeCurrency(
    currency: string | null | undefined
): CurrencyCode {
    const normalized = (currency ?? BASE_CURRENCY).toUpperCase();

    if (SUPPORTED_CURRENCIES.includes(normalized as CurrencyCode)) {
        return normalized as CurrencyCode;
    }

    return BASE_CURRENCY;
}

export function getExchangeRateToPLN(
    currency: string | null | undefined
): number {
    const normalized = normalizeCurrency(currency);
    return EXCHANGE_RATES_TO_PLN[normalized];
}

export function convertToPLN(
    amount: number,
    currency: string | null | undefined
): number {
    const rate = getExchangeRateToPLN(currency);
    return amount * rate;
}

export function convertCurrency(
    amount: number,
    fromCurrency: string | null | undefined,
    toCurrency: string | null | undefined
): number {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);

    const amountInPLN = amount * EXCHANGE_RATES_TO_PLN[from];

    return amountInPLN / EXCHANGE_RATES_TO_PLN[to];
}