export const BASE_CURRENCY = "PLN" as const;

export const EXCHANGE_RATES_TO_PLN: Record<string, number> = {
    PLN: 1,
    EUR: 4.3,
    USD: 4.0,
};

export function normalizeCurrency(currency: string | null | undefined): string {
    return (currency ?? BASE_CURRENCY).toUpperCase();
}

export function getExchangeRateToPLN(currency: string | null | undefined): number {
    const normalized = normalizeCurrency(currency);
    return EXCHANGE_RATES_TO_PLN[normalized] ?? 1;
}

export function convertToPLN(
    amount: number,
    currency: string | null | undefined
): number {
    const rate = getExchangeRateToPLN(currency);
    return amount * rate;
}