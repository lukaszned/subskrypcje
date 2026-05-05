export type BillingCycleDetection = "monthly" | "yearly" | "weekly" | "custom";

export type EmailDetectionInput = {
    id: string;
    from: string;
    subject: string;
    date?: string;
    snippet: string;
};

export type EmailDetectionResult = {
    isCandidate: boolean;
    confidence: number;
    reasons: string[];
    detected: {
        provider?: string;
        name?: string;
        isTrial?: boolean;
        trialEndDateText?: string;
        amountText?: string;
        currency?: string;
        billingCycle?: BillingCycleDetection;
    };
};

export type ParsedDetectedAmount = {
    amount: number;
    currency?: string;
};

const PROVIDER_CATALOG = [
    { name: "Google Play", patterns: ["google play", "play.google.com"] },
    { name: "Google One", patterns: ["google one", "one.google.com"] },
    { name: "Netflix", patterns: ["netflix"] },
    { name: "Spotify", patterns: ["spotify"] },
    { name: "Apple", patterns: ["apple"] },
    { name: "OpenAI", patterns: ["openai", "chatgpt", "chat gpt"] },
    { name: "Canva", patterns: ["canva"] },
    { name: "Adobe", patterns: ["adobe"] },
    { name: "Microsoft", patterns: ["microsoft"] },
    { name: "Amazon", patterns: ["amazon"] },
    { name: "Disney", patterns: ["disney"] },
    { name: "HBO", patterns: ["hbo"] },
    { name: "Max", patterns: ["max"] },
    { name: "Dropbox", patterns: ["dropbox"] },
    { name: "Notion", patterns: ["notion"] },
    { name: "Figma", patterns: ["figma"] },
    { name: "GitHub", patterns: ["github"] },
    { name: "Slack", patterns: ["slack"] },
    { name: "Duolingo", patterns: ["duolingo"] },
    { name: "NordVPN", patterns: ["nordvpn", "nord vpn"] },
];

export function cleanText(value: string | null | undefined) {
    return (value ?? "")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#\d+;|&#x[\da-f]+;|&[a-z]+;/gi, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function includesAny(text: string, patterns: RegExp[]) {
    return patterns.some((pattern) => pattern.test(text));
}

export function detectProvider(text: string) {
    const normalizedText = text.toLowerCase();

    return PROVIDER_CATALOG.find((provider) =>
        provider.patterns.some((pattern) => normalizedText.includes(pattern))
    )?.name;
}

export function detectTrialEndDateText(text: string) {
    const englishDate = "[A-Za-z]+\\s+\\d{1,2},\\s+\\d{4}";
    const englishShortDate = "[A-Za-z]+\\s+\\d{1,2}";
    const polishDate =
        "\\d{1,2}\\s+[A-Za-z\\u0105\\u0107\\u0119\\u0142\\u0144\\u00f3\\u015b\\u017a\\u017c]+(?:\\s+\\d{4})?";
    const patterns = [
        new RegExp(`trial will end on\\s+(${englishDate})`, "i"),
        new RegExp(`trial ends on\\s+(${englishDate})`, "i"),
        new RegExp(`your trial will end on\\s+(${englishDate})`, "i"),
        new RegExp(`trial will end on\\s+(${englishShortDate})`, "i"),
        new RegExp(`trial ends on\\s+(${englishShortDate})`, "i"),
        new RegExp(
            `okres pr[o\\u00f3]bny ko[n\\u0144]czy si[e\\u0119]\\s+(${polishDate})`,
            "i"
        ),
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match?.[1]) {
            return cleanText(match[1]);
        }
    }

    return undefined;
}

export function detectAmountText(text: string) {
    const patterns = [
        /[$\u20ac\u00a3]\s?\d+(?:[.,]\d{2})?/,
        /\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP)/i,
        /(?:PLN|USD|EUR|GBP)\s?\d+(?:[.,]\d{2})?/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match?.[0]) {
            return cleanText(match[0]);
        }
    }

    return undefined;
}

export function detectCurrency(amountText: string | undefined) {
    if (!amountText) return undefined;

    if (amountText.includes("$")) return "USD";
    if (amountText.includes("\u20ac")) return "EUR";
    if (amountText.includes("\u00a3")) return "GBP";

    const currencyMatch = amountText.match(/\b(PLN|USD|EUR|GBP)\b/i);
    return currencyMatch?.[1]?.toUpperCase();
}

export function parseAmountText(
    amountText: string | undefined
): ParsedDetectedAmount | null {
    if (!amountText) {
        return null;
    }

    const cleanedAmountText = cleanText(amountText);
    const symbolCurrency = cleanedAmountText.match(
        /^([$\u20ac\u00a3])\s?(\d+(?:[.,]\d{2})?)$/
    );
    const suffixCurrency = cleanedAmountText.match(
        /^(\d+(?:[.,]\d{2})?)\s?(PLN|USD|EUR|GBP)$/i
    );
    const prefixCurrency = cleanedAmountText.match(
        /^(PLN|USD|EUR|GBP)\s?(\d+(?:[.,]\d{2})?)$/i
    );

    if (symbolCurrency) {
        return {
            amount: Number(symbolCurrency[2].replace(",", ".")),
            currency: detectCurrency(symbolCurrency[1]),
        };
    }

    if (suffixCurrency) {
        return {
            amount: Number(suffixCurrency[1].replace(",", ".")),
            currency: suffixCurrency[2].toUpperCase(),
        };
    }

    if (prefixCurrency) {
        return {
            amount: Number(prefixCurrency[2].replace(",", ".")),
            currency: prefixCurrency[1].toUpperCase(),
        };
    }

    return null;
}

export function parseTrialEndDateText(trialEndDateText: string | undefined) {
    if (!trialEndDateText) {
        return null;
    }

    const parsed = Date.parse(cleanText(trialEndDateText));

    if (Number.isNaN(parsed)) {
        return null;
    }

    return new Date(parsed);
}

export function truncateEvidenceSnippet(snippet: string) {
    return cleanText(snippet).slice(0, 500);
}

export function detectBillingCycle(
    text: string
): BillingCycleDetection | undefined {
    if (/\b(monthly|per month|month-to-month|co miesi[a\u0105]c)\b/i.test(text)) {
        return "monthly";
    }

    if (/\b(yearly|annual|annually|per year|rocznie)\b/i.test(text)) {
        return "yearly";
    }

    if (/\b(weekly|per week|co tydzie[n\u0144])\b/i.test(text)) {
        return "weekly";
    }

    if (/\b(billing cycle|okres rozliczeniowy)\b/i.test(text)) {
        return "custom";
    }

    return undefined;
}

export function analyzeMessageForSubscription(
    input: EmailDetectionInput
): EmailDetectionResult {
    const from = cleanText(input.from);
    const subject = cleanText(input.subject);
    const snippet = cleanText(input.snippet);
    const combinedText = `${from} ${subject} ${snippet}`;
    const subjectAndSnippet = `${subject} ${snippet}`;
    const reasons: string[] = [];
    let confidence = 0;

    const detected: EmailDetectionResult["detected"] = {};

    if (
        includesAny(subjectAndSnippet, [
            /\b(receipt|order receipt|invoice|faktura|paragon|rachunek)\b/i,
        ])
    ) {
        confidence += 0.25;
        reasons.push("+0.25 receipt/invoice signal");
    }

    if (
        includesAny(subjectAndSnippet, [
            /\b(subscription|subskrypcja|plan|membership)\b/i,
        ])
    ) {
        confidence += 0.25;
        reasons.push("+0.25 subscription/plan signal");
    }

    if (includesAny(subjectAndSnippet, [/\b(trial|okres pr[o\u00f3]bny)\b/i])) {
        confidence += 0.2;
        reasons.push("+0.20 trial signal");
        detected.isTrial = true;
    }

    if (
        includesAny(subjectAndSnippet, [
            /\b(automatically charged|renewal|renews|odnowienie|nast[e\u0119]pna p[\u0142l]atno[s\u015b][c\u0107])\b/i,
        ])
    ) {
        confidence += 0.2;
        reasons.push("+0.20 renewal/automatic charge signal");
    }

    const provider = detectProvider(combinedText);

    if (provider) {
        confidence += 0.2;
        reasons.push(`+0.20 known provider: ${provider}`);
        detected.provider = provider;
        detected.name = provider;
    }

    const trialEndDateText = detectTrialEndDateText(subjectAndSnippet);

    if (trialEndDateText) {
        confidence += 0.15;
        reasons.push("+0.15 trial end date detected");
        detected.trialEndDateText = trialEndDateText;
        detected.isTrial = true;
    }

    const amountText = detectAmountText(subjectAndSnippet);

    if (amountText) {
        confidence += 0.15;
        reasons.push("+0.15 amount/currency detected");
        detected.amountText = amountText;
        detected.currency = detectCurrency(amountText);
    }

    const billingCycle = detectBillingCycle(subjectAndSnippet);

    if (billingCycle) {
        detected.billingCycle = billingCycle;
    }

    if (includesAny(subjectAndSnippet, [/\bverify your email\b/i])) {
        confidence -= 0.4;
        reasons.push("-0.40 verify your email signal");
    }

    if (
        includesAny(combinedText, [
            /\bgoogle cloud\b/i,
            /\bquota\b/i,
            /\bsecurity\b/i,
            /\baction required\b/i,
            /\bcompute\b/i,
            /\bsecurity best practices\b/i,
        ])
    ) {
        confidence -= 0.5;
        reasons.push("-0.50 Google Cloud quota/security signal");
    }

    if (includesAny(subjectAndSnippet, [/\bterms of service updated\b/i])) {
        confidence -= 0.35;
        reasons.push("-0.35 terms of service update signal");
    }

    if (
        /\bwelcome to google payments\b/i.test(subjectAndSnippet) &&
        !/\b(subscription|receipt|trial)\b/i.test(subjectAndSnippet)
    ) {
        confidence -= 0.3;
        reasons.push("-0.30 Google Payments welcome without subscription signal");
    }

    if (
        includesAny(subjectAndSnippet, [/\b(sale|promo|offer|deal)\b/i]) &&
        !/\b(receipt|order receipt|invoice|subscription|subskrypcja)\b/i.test(
            subjectAndSnippet
        )
    ) {
        confidence -= 0.2;
        reasons.push("-0.20 promotional signal without receipt/subscription");
    }

    const normalizedConfidence = Math.max(0, Math.min(1, confidence));

    return {
        isCandidate: normalizedConfidence >= 0.55,
        confidence: normalizedConfidence,
        reasons,
        detected,
    };
}
