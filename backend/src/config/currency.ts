export const BASE_CURRENCY = "PLN" as const;

export const SUPPORTED_CURRENCIES = ["PLN", "EUR", "USD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const DEFAULT_EXCHANGE_RATES_TO_PLN: Record<SupportedCurrency, number> = {
    PLN: 1,
    EUR: 4.3,
    USD: 4.0,
};

let exchangeRatesToPLN: Record<SupportedCurrency, number> = {
    ...DEFAULT_EXCHANGE_RATES_TO_PLN,
};

let exchangeRatesUpdatedAt: Date | null = null;
let exchangeRatesSource = "static-fallback";

export function normalizeCurrency(
    currency: string | null | undefined
): SupportedCurrency {
    const normalized = (currency ?? BASE_CURRENCY).toUpperCase();

    if (SUPPORTED_CURRENCIES.includes(normalized as SupportedCurrency)) {
        return normalized as SupportedCurrency;
    }

    return BASE_CURRENCY;
}

export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
    return SUPPORTED_CURRENCIES.includes(currency.toUpperCase() as SupportedCurrency);
}

export function getExchangeRatesToPLN() {
    return {
        rates: { ...exchangeRatesToPLN },
        updatedAt: exchangeRatesUpdatedAt,
        source: exchangeRatesSource,
    };
}

export function setExchangeRatesToPLN(
    rates: Partial<Record<SupportedCurrency, number>>,
    source: string
) {
    exchangeRatesToPLN = {
        ...exchangeRatesToPLN,
        ...rates,
        PLN: 1,
    };

    exchangeRatesUpdatedAt = new Date();
    exchangeRatesSource = source;
}

export function resetExchangeRatesToFallback() {
    exchangeRatesToPLN = {
        ...DEFAULT_EXCHANGE_RATES_TO_PLN,
    };

    exchangeRatesUpdatedAt = null;
    exchangeRatesSource = "static-fallback";
}

export function getExchangeRateToPLN(
    currency: string | null | undefined
): number {
    const normalized = normalizeCurrency(currency);
    return exchangeRatesToPLN[normalized] ?? 1;
}

export function convertToPLN(
    amount: number,
    currency: string | null | undefined
): number {
    const normalized = normalizeCurrency(currency);
    const rate = getExchangeRateToPLN(normalized);

    return amount * rate;
}

export function convertFromPLN(
    amountInPLN: number,
    targetCurrency: string | null | undefined
): number {
    const normalizedTargetCurrency = normalizeCurrency(targetCurrency);
    const targetRateToPLN = getExchangeRateToPLN(normalizedTargetCurrency);

    return amountInPLN / targetRateToPLN;
}

export function convertCurrency(
    amount: number,
    fromCurrency: string | null | undefined,
    toCurrency: string | null | undefined
): number {
    const normalizedFromCurrency = normalizeCurrency(fromCurrency);
    const normalizedToCurrency = normalizeCurrency(toCurrency);

    if (normalizedFromCurrency === normalizedToCurrency) {
        return amount;
    }

    const amountInPLN = convertToPLN(amount, normalizedFromCurrency);
    return convertFromPLN(amountInPLN, normalizedToCurrency);
}

export function convertToBaseCurrency(
    amount: number,
    fromCurrency: string | null | undefined,
    baseCurrency: string | null | undefined
): number {
    return convertCurrency(amount, fromCurrency, baseCurrency);
}