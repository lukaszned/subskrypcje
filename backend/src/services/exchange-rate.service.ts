import {
    setExchangeRatesToPLN,
    SupportedCurrency,
} from "../config/currency";

type NbpRate = {
    currency: string;
    code: string;
    mid: number;
};

type NbpTableResponse = {
    table: string;
    no: string;
    effectiveDate: string;
    rates: NbpRate[];
};

const NBP_TABLE_A_URL =
    "https://api.nbp.pl/api/exchangerates/tables/a/?format=json";

const SUPPORTED_NBP_CODES: SupportedCurrency[] = ["EUR", "USD"];

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 12; // 12h

let refreshInterval: NodeJS.Timeout | null = null;

function pickSupportedRatesFromNBP(
    rates: NbpRate[]
): Partial<Record<SupportedCurrency, number>> {
    const result: Partial<Record<SupportedCurrency, number>> = {
        PLN: 1,
    };

    for (const code of SUPPORTED_NBP_CODES) {
        const rate = rates.find((item) => item.code === code);

        if (rate && typeof rate.mid === "number" && rate.mid > 0) {
            result[code] = rate.mid;
        }
    }

    return result;
}

export async function refreshExchangeRatesFromNBP() {
    try {
        const response = await fetch(NBP_TABLE_A_URL, {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(
                `NBP API responded with ${response.status} ${response.statusText}`
            );
        }

        const data = (await response.json()) as NbpTableResponse[];

        const latestTable = data[0];

        if (!latestTable || !Array.isArray(latestTable.rates)) {
            throw new Error("Invalid NBP API response shape");
        }

        const supportedRates = pickSupportedRatesFromNBP(latestTable.rates);

        setExchangeRatesToPLN(
            supportedRates,
            `nbp-table-a-${latestTable.effectiveDate}`
        );

        console.log("[exchange-rates] Refreshed from NBP:", {
            effectiveDate: latestTable.effectiveDate,
            rates: supportedRates,
        });

        return {
            ok: true,
            source: "NBP",
            effectiveDate: latestTable.effectiveDate,
            rates: supportedRates,
        };
    } catch (error) {
        console.error("[exchange-rates] Failed to refresh from NBP:", error);

        return {
            ok: false,
            source: "static-fallback",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

export function startExchangeRateRefreshJob() {
    if (refreshInterval) {
        return;
    }

    void refreshExchangeRatesFromNBP();

    refreshInterval = setInterval(() => {
        void refreshExchangeRatesFromNBP();
    }, REFRESH_INTERVAL_MS);

    console.log("[exchange-rates] Refresh job started");
}

export function stopExchangeRateRefreshJob() {
    if (!refreshInterval) {
        return;
    }

    clearInterval(refreshInterval);
    refreshInterval = null;

    console.log("[exchange-rates] Refresh job stopped");
}