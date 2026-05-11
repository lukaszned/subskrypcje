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

type DetectionSignals = {
    provider?: string;
    providerFromPaymentProcessor?: string;
    planName?: string;
    billingCycle?: BillingCycleDetection;
    trialEndDateText?: string;
    amountText?: string;
    hasReceiptEvidence: boolean;
    hasInvoiceEvidence: boolean;
    hasPaymentEvidence: boolean;
    hasChargedEvidence: boolean;
    hasRecurringEvidence: boolean;
    hasSubscriptionEvidence: boolean;
    hasTrialEvidence: boolean;
    hasPaidTierEvidence: boolean;
    hasBillingCycleEvidence: boolean;
    hasPaymentFailedEvidence: boolean;
    hasAccountSecurityEvidence: boolean;
    hasVerificationEvidence: boolean;
    hasPasswordResetEvidence: boolean;
    hasCancellationEvidence: boolean;
    hasRefundEvidence: boolean;
    hasFreePlanEvidence: boolean;
    hasMarketingEvidence: boolean;
    hasNegatedSubscriptionEvidence: boolean;
    hasActiveRenewalPaymentEvidence: boolean;
    hasPaymentReceiptTrialChargeEvidence: boolean;
};

const PROVIDER_CATALOG = [
    { name: "Google Play", patterns: ["google play", "play.google.com"] },
    { name: "Google One", patterns: ["google one", "one.google.com"] },
    { name: "YouTube", patterns: ["youtube", "youtube.com"] },
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

function hasStrongSubscriptionSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(receipt|order receipt|invoice|payment|billing|charged|automatically charged|renewal|renews|subscription|membership|trial|free trial|trial will end|faktura|rachunek|subskrypcja|abonament|okres pr[o\u00f3]bny|wersja pr[o\u00f3]bna)\b/i,
        /\b(subskrypcji|subskrypcj[e\u0119]|subskrypcj[a\u0105]|abonamentu|abonamentem)\b/i,
        /\b(p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc)\b/i,
        /\b(forma|form[e\u0119]|forme)\s+(p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
        /\b(b[e\u0119]dziemy\s+obci[a\u0105][z\u017c]a[c\u0107]|bedziemy\s+obciazac|obci[a\u0105][z\u017c]a[c\u0107]|obciazac|obci[a\u0105][z\u017c]ymy|obciazymy|obci[a\u0105][z\u017c]enie|obciazenie)\b/i,
        /\b(co\s+miesi[a\u0105]c|miesi[e\u0119]cznie|miesiecznie)\b/i,
        /\banulowa[c\u0107]\s+(swoj[a\u0105]\s+)?subskrypcj[e\u0119]/i,
        /\banulowac\s+(swoja\s+)?subskrypcje/i,
    ]);
}

function hasPaymentReceiptTrialChargeSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(receipt|order receipt|invoice|payment|billing|charged|automatically charged|trial|free trial|trial will end|faktura|rachunek|p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc)\b/i,
        /\b(b[e\u0119]dziemy\s+obci[a\u0105][z\u017c]a[c\u0107]|bedziemy\s+obciazac|obci[a\u0105][z\u017c]a[c\u0107]|obciazac|obci[a\u0105][z\u017c]ymy|obciazymy|obci[a\u0105][z\u017c]enie|obciazenie)\b/i,
    ]);
}

function hasNegatedSubscriptionSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bdoes not confirm any subscription\b/i,
        /\bdoes not confirm a subscription\b/i,
        /\bno subscription\b/i,
        /\bnot a subscription\b/i,
        /\bnot confirm any subscription\b/i,
        /\bthis is not a receipt\b/i,
        /\bthis email does not confirm\b/i,
        /nie potwierdza subskrypcji/i,
        /to nie jest subskrypcja/i,
        /brak subskrypcji/i,
    ]);
}

function hasActiveRenewalPaymentSignal(subjectAndSnippet: string) {
    if (/\b(will not be charged|not be charged)\b/i.test(subjectAndSnippet)) {
        return false;
    }

    return includesAny(subjectAndSnippet, [
        /\b(renewed successfully|has renewed|payment received|you have been charged|charged for)\b/i,
        /\bpobral[iı]smy\s+p[\u0142l]atno[s\u015b][c\u0107]\b/i,
        /\bpobralismy\s+platnosc\b/i,
        /\bobci[a\u0105][z\u017c]ymy\b/i,
        /\bobciazymy\b/i,
    ]);
}

function hasCancellationSignal(subjectAndSnippet: string) {
    if (/\b(unless|until)\s+cancell?ed\b/i.test(subjectAndSnippet)) {
        return false;
    }

    return includesAny(subjectAndSnippet, [
        /\b(subscription was canceled|subscription has been canceled|was cancelled|has been cancelled|canceled|cancelled)\b/i,
        /\b(will not be charged again|you will not be charged again)\b/i,
        /anulowano subskrypcj[e\u0119]/i,
        /subskrypcja zosta[l\u0142]a anulowana/i,
        /anulowana subskrypcja/i,
        /nie zostanie naliczona op[l\u0142]ata/i,
    ]);
}

function hasRefundSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(refund|refunded|refund issued|refund was issued)\b/i,
        /zwrot/i,
        /zwr[o\u00f3]cono/i,
        /zwrot [s\u015b]rodk[o\u00f3]w/i,
        /zwrot p[\u0142l]atno[s\u015b]ci/i,
        /zwrot platnosci/i,
    ]);
}

function hasFreePlanSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(free plan|free account|free workspace)\b/i,
        /plan darmowy/i,
        /darmowy plan/i,
        /bezp[l\u0142]atny plan/i,
    ]);
}

function hasAccountSecurityLoginSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(verify your email|confirm your email|confirm email|email verification|login code|sign-in code|new sign in|new login|password reset|security alert|create account|account creation)\b/i,
        /potwierd[z\u017a]\s+sw[o\u00f3]j\s+adres\s+e-mail/i,
        /potwierd[z\u017a]\s+adres\s+e-mail/i,
        /potwierdzenia\s+adresu\s+e-mail/i,
        /kod\s+logowania/i,
        /jednorazowy\s+kod/i,
        /nowe\s+logowanie/i,
        /utworzy[c\u0107]\s+konto/i,
        /naci[s\u015b]nij\s+link,\s+aby\s+utworzy[c\u0107]\s+konto/i,
        /zalogowa[c\u0107]/i,
        /logowania/i,
    ]);
}

export function detectProvider(text: string) {
    const normalizedText = text.toLowerCase();

    return PROVIDER_CATALOG.find((provider) =>
        provider.patterns.some((pattern) => normalizedText.includes(pattern))
    )?.name;
}

function isPaymentProcessorText(text: string) {
    return /\b(paypal|stripe|google payments|payments-noreply|receipts\+acct)\b/i.test(
        text
    );
}

function detectPlanName(text: string) {
    const provider = detectProvider(text);

    if (
        provider === "Spotify" &&
        /\b(spotify\s+premium|premium\s+individual|premium\s+duo|premium\s+family|premium\s+student)\b/i.test(
            text
        )
    ) {
        return "Spotify Premium";
    }

    const planPatterns = [
        {
            name: "YouTube Premium Lite",
            pattern:
                /\byoutube\b[\s\S]{0,120}\bpremium\s+lite\b|\bpremium\s+lite\b[\s\S]{0,120}\byoutube\b/i,
        },
        {
            name: "YouTube Music Premium",
            pattern: /\byoutube\s+music\s+premium\b/i,
        },
        {
            name: "YouTube Premium",
            pattern: /\byoutube\s+premium\b/i,
        },
        {
            name: "YouTube Premium Lite",
            pattern: /\bpremium\s+lite\b/i,
        },
        {
            name: "Spotify Premium",
            pattern:
                /\b(spotify\s+premium|premium\s+individual|premium\s+duo|premium\s+family|premium\s+student)\b/i,
        },
        {
            name: "Canva Pro",
            pattern: /\bcanva\s+pro\b/i,
        },
        {
            name: "Dropbox Plus",
            pattern: /\bdropbox\s+plus\b/i,
        },
        {
            name: "Google One",
            pattern: /\bgoogle\s+one\b/i,
        },
        {
            name: "ChatGPT Plus",
            pattern: /\bchatgpt\s+plus\b/i,
        },
        {
            name: "OpenAI Plus",
            pattern: /\bopenai\s+plus\b/i,
        },
        {
            name: "Microsoft 365",
            pattern: /\bmicrosoft\s+365\b/i,
        },
        {
            name: "Adobe Creative Cloud",
            pattern: /\badobe\s+creative\s+cloud\b/i,
        },
        {
            name: "Netflix Premium",
            pattern: /\bnetflix\s+premium\b/i,
        },
        {
            name: "Netflix Standard",
            pattern: /\bnetflix\s+standard\b/i,
        },
        {
            name: "Disney+ Premium",
            pattern: /\bdisney\+?\s+premium\b/i,
        },
        {
            name: "Disney Premium",
            pattern: /\bdisney\s+premium\b/i,
        },
    ];

    return planPatterns.find(({ pattern }) => pattern.test(text))?.name;
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
    if (
        includesAny(text, [
            /\b(monthly|per month|month-to-month|co miesi[a\u0105]c|co miesiac|ka[z\u017c]dego miesi[a\u0105]ca|kazdego miesiaca|miesi[e\u0119]cznie|miesiecznie)\b/i,
            /\b(miesi[e\u0119]czna|miesi[e\u0119]czny|miesi[e\u0119]czne|miesi[e\u0119]cznej|miesi[e\u0119]czn[a\u0105])\b/i,
            /\b(miesieczna|miesieczny|miesieczne|miesiecznej)\b/i,
            /\b(miesi[e\u0119]cznej|miesiecznej)\s+(subskrypcji|p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
        ])
    ) {
        return "monthly";
    }

    if (
        includesAny(text, [
            /\b(yearly|annual|annually|per year|rocznie)\b/i,
            /\b(roczna|roczny|roczne|rocznej|roczn[a\u0105])\b/i,
            /\b(za plan roczny|za roczny plan|plan roczny|roczny plan)\b/i,
            /\brocznej\s+(subskrypcji|p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
        ])
    ) {
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

function collectDetectionSignals(params: {
    from: string;
    subjectAndSnippet: string;
    combinedText: string;
}): DetectionSignals {
    const provider = detectProvider(params.combinedText);
    const planName = detectPlanName(params.combinedText);
    const billingCycle = detectBillingCycle(params.subjectAndSnippet);
    const trialEndDateText = detectTrialEndDateText(params.subjectAndSnippet);
    const amountText = detectAmountText(params.subjectAndSnippet);
    const hasNegatedSubscriptionEvidence = hasNegatedSubscriptionSignal(
        params.subjectAndSnippet
    );
    const hasTrialEvidence = includesAny(params.subjectAndSnippet, [
        /\b(trial|free trial|trial started|start your trial|your trial|trial will end|okres pr[o\u00f3]bny|wersja pr[o\u00f3]bna)\b/i,
    ]);
    const hasReceiptEvidence = includesAny(params.subjectAndSnippet, [
        /\b(receipt|order receipt|order confirmation|purchase confirmation|potwierdzenie zakupu|potwierdzenie p[\u0142l]atno[s\u015b]ci|potwierdzenie platnosci)\b/i,
    ]);
    const hasInvoiceEvidence = includesAny(params.subjectAndSnippet, [
        /\b(invoice|faktura|numer faktury|rachunek)\b/i,
    ]);
    const hasPaymentEvidence = includesAny(params.subjectAndSnippet, [
        /\b(payment|paid|purchase|purchased|billed|p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc|zakup)\b/i,
        /\bpobralismy\s+platnosc\b/i,
        /\bpobral[i\u015b]my\s+p[\u0142l]atno[s\u015b][c\u0107]\b/i,
    ]);
    const hasChargedEvidence = includesAny(params.subjectAndSnippet, [
        /\b(charged|automatically charged|charged for)\b/i,
        /\b(b[e\u0119]dziemy\s+obci[a\u0105][z\u017c]a[c\u0107]|bedziemy\s+obciazac|obci[a\u0105][z\u017c]a[c\u0107]|obciazac|obci[a\u0105][z\u017c]ymy|obciazymy|obci[a\u0105][z\u017c]enie|obciazenie)\b/i,
    ]);
    const hasRecurringEvidence = includesAny(params.subjectAndSnippet, [
        /\b(renewal|renews|renewed|will renew|renew automatically|automatically|automatic payment|recurring)\b/i,
        /\b(odnowienie|odnawia si[e\u0119]|odnowiona|odnowiony|odnowiony|odnowi)\b/i,
        /\b(co\s+miesi[a\u0105]c|co miesiac|rocznie|monthly|yearly|annual|annually)\b/i,
    ]);
    const hasSubscriptionEvidence =
        !hasNegatedSubscriptionEvidence &&
        includesAny(params.subjectAndSnippet, [
            /\b(subscription|membership|subskrypcja|subskrypcji|subskrypcj[e\u0119]|subskrypcj[a\u0105]|abonament|abonamentu|abonamentem)\b/i,
        ]);
    const hasPaidTierEvidence = includesAny(params.subjectAndSnippet, [
        /\b(premium lite|premium|pro|plus|standard|individual|family|team|business)\b/i,
    ]);
    const hasPaymentFailedEvidence = includesAny(params.subjectAndSnippet, [
        /\b(payment failed|problem with your .*payment|could not process your payment|update your payment method)\b/i,
    ]);
    const hasVerificationEvidence = includesAny(params.subjectAndSnippet, [
        /\b(verify your email|confirm your email|confirm email|email verification)\b/i,
        /potwierd[z\u017a]\s+sw[o\u00f3]j\s+adres\s+e-mail/i,
        /potwierd[z\u017a]\s+adres\s+e-mail/i,
        /potwierdzenia\s+adresu\s+e-mail/i,
    ]);
    const hasPasswordResetEvidence = /\b(password reset|reset your .*password)\b/i.test(
        params.subjectAndSnippet
    );
    const hasAccountSecurityEvidence =
        hasAccountSecurityLoginSignal(params.subjectAndSnippet) ||
        includesAny(params.subjectAndSnippet, [
            /\b(login code|sign-in code|new sign in|new sign-in|new login|security alert|account security)\b/i,
            /kod\s+logowania/i,
            /jednorazowy\s+kod/i,
            /nowe\s+logowanie/i,
        ]);
    const hasMarketingEvidence = includesAny(params.subjectAndSnippet, [
        /\b(newsletter|sale|promo|offer|deal|limited time offer)\b/i,
    ]);
    const hasCancellationEvidence = hasCancellationSignal(params.subjectAndSnippet);
    const hasRefundEvidence = hasRefundSignal(params.subjectAndSnippet);
    const hasFreePlanEvidence = hasFreePlanSignal(params.subjectAndSnippet);
    const hasActiveRenewalPaymentEvidence = hasActiveRenewalPaymentSignal(
        params.subjectAndSnippet
    );
    const hasPaymentReceiptTrialChargeEvidence =
        hasPaymentReceiptTrialChargeSignal(params.subjectAndSnippet) ||
        hasReceiptEvidence ||
        hasInvoiceEvidence ||
        hasPaymentEvidence ||
        hasChargedEvidence ||
        hasTrialEvidence;

    return {
        provider,
        providerFromPaymentProcessor:
            isPaymentProcessorText(params.from) && provider ? provider : undefined,
        planName,
        billingCycle,
        trialEndDateText,
        amountText,
        hasReceiptEvidence,
        hasInvoiceEvidence,
        hasPaymentEvidence,
        hasChargedEvidence,
        hasRecurringEvidence,
        hasSubscriptionEvidence,
        hasTrialEvidence,
        hasPaidTierEvidence: hasPaidTierEvidence || Boolean(planName),
        hasBillingCycleEvidence: Boolean(billingCycle),
        hasPaymentFailedEvidence,
        hasAccountSecurityEvidence,
        hasVerificationEvidence,
        hasPasswordResetEvidence,
        hasCancellationEvidence,
        hasRefundEvidence,
        hasFreePlanEvidence,
        hasMarketingEvidence,
        hasNegatedSubscriptionEvidence,
        hasActiveRenewalPaymentEvidence,
        hasPaymentReceiptTrialChargeEvidence,
    };
}

function hasStrongSubscriptionOrPaymentEvidence(signals: DetectionSignals) {
    return (
        signals.hasReceiptEvidence ||
        signals.hasInvoiceEvidence ||
        signals.hasPaymentEvidence ||
        signals.hasChargedEvidence ||
        signals.hasTrialEvidence ||
        (signals.hasSubscriptionEvidence &&
            (signals.hasRecurringEvidence || signals.hasBillingCycleEvidence))
    );
}

function isCandidateFromPositiveEvidence(signals: DetectionSignals) {
    const hasProviderOrPlan = Boolean(signals.provider || signals.planName);
    const hasReceiptInvoiceOrPayment =
        signals.hasReceiptEvidence ||
        signals.hasInvoiceEvidence ||
        signals.hasPaymentEvidence ||
        signals.hasChargedEvidence;

    return (
        (hasReceiptInvoiceOrPayment &&
            (hasProviderOrPlan || signals.hasSubscriptionEvidence)) ||
        (signals.hasSubscriptionEvidence &&
            (signals.hasRecurringEvidence ||
                signals.hasPaymentEvidence ||
                signals.hasChargedEvidence ||
                signals.hasBillingCycleEvidence)) ||
        (signals.hasTrialEvidence && hasProviderOrPlan) ||
        (signals.hasPaymentFailedEvidence &&
            (Boolean(signals.provider) || signals.hasSubscriptionEvidence)) ||
        (signals.hasPaidTierEvidence &&
            Boolean(signals.provider) &&
            (hasReceiptInvoiceOrPayment ||
                signals.hasSubscriptionEvidence ||
                signals.hasRecurringEvidence))
    );
}

export function analyzeMessageForSubscription(
    input: EmailDetectionInput
): EmailDetectionResult {
    const from = cleanText(input.from);
    const subject = cleanText(input.subject);
    const snippet = cleanText(input.snippet);
    const combinedText = `${from} ${subject} ${snippet}`;
    const subjectAndSnippet = `${subject} ${snippet}`;
    const detected: EmailDetectionResult["detected"] = {};
    const reasons: string[] = [];
    const signals = collectDetectionSignals({
        from,
        subjectAndSnippet,
        combinedText,
    });
    let confidence = 0;

    if (signals.provider) {
        confidence += 0.25;
        reasons.push(`+0.25 known provider: ${signals.provider}`);
        detected.provider = signals.provider;
        detected.name = signals.provider;
    }

    if (signals.providerFromPaymentProcessor) {
        reasons.push(
            `+provider from payment processor: ${signals.providerFromPaymentProcessor}`
        );
    }

    if (signals.planName) {
        detected.name = signals.planName;
    }

    if (signals.hasReceiptEvidence || signals.hasInvoiceEvidence) {
        confidence += 0.25;
        reasons.push("+0.25 receipt/invoice evidence");
    }

    if (signals.hasPaymentEvidence || signals.hasChargedEvidence) {
        confidence += 0.25;
        reasons.push("+0.25 payment/charged evidence");
    }

    if (signals.hasSubscriptionEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 subscription evidence");
    }

    if (signals.hasTrialEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 trial evidence");
        detected.isTrial = true;
    }

    if (signals.hasPaidTierEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 paid plan tier evidence");
    }

    if (signals.hasRecurringEvidence) {
        confidence += 0.15;
        reasons.push("+0.15 recurring/renewal evidence");
    }

    if (signals.hasBillingCycleEvidence) {
        confidence += 0.1;
        reasons.push("+0.10 billing cycle signal");
        detected.billingCycle = signals.billingCycle;
    }

    if (signals.hasPaymentFailedEvidence) {
        confidence += 0.15;
        reasons.push("+0.15 payment failed evidence");
    }

    if (signals.trialEndDateText) {
        confidence += 0.15;
        reasons.push("+0.15 trial end date detected");
        detected.trialEndDateText = signals.trialEndDateText;
        detected.isTrial = true;
    }

    if (signals.amountText) {
        confidence += 0.15;
        reasons.push("+0.15 amount/currency detected");
        detected.amountText = signals.amountText;
        detected.currency = detectCurrency(signals.amountText);
    }

    if (
        includesAny(subjectAndSnippet, [
            /\b(welcome to|thanks for joining|your account is ready|start using|you're all set|you\u2019re all set|witamy|konto gotowe|rozpocznij korzystanie)\b/i,
        ]) &&
        signals.provider
    ) {
        confidence += 0.15;
        reasons.push("+0.15 known provider onboarding signal");
    }

    if (
        includesAny(combinedText, [
            /\baction required\b.*\bgoogle cloud\b/i,
            /\bgoogle cloud\b.*\b(action required|quota|security)\b/i,
            /\bquota\b/i,
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

    if (signals.hasNegatedSubscriptionEvidence) {
        confidence -= 0.35;
        reasons.push("-0.35 negated subscription signal");
    }

    if (
        signals.hasAccountSecurityEvidence ||
        signals.hasVerificationEvidence ||
        signals.hasPasswordResetEvidence
    ) {
        const penalty = hasStrongSubscriptionOrPaymentEvidence(signals) ? 0.25 : 0.6;
        confidence -= penalty;
        reasons.push(`-${penalty.toFixed(2)} account/security signal`);
    }

    if (signals.hasCancellationEvidence && !signals.hasActiveRenewalPaymentEvidence) {
        confidence -= 0.6;
        reasons.push("-0.60 cancellation signal");
    }

    if (signals.hasRefundEvidence && !signals.hasActiveRenewalPaymentEvidence) {
        confidence -= 0.6;
        reasons.push("-0.60 refund signal");
    }

    if (
        signals.hasFreePlanEvidence &&
        !signals.hasPaymentReceiptTrialChargeEvidence
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 free plan signal");
    }

    if (
        /\bwelcome to google payments\b/i.test(subjectAndSnippet) &&
        !hasStrongSubscriptionOrPaymentEvidence(signals)
    ) {
        confidence -= 0.3;
        reasons.push("-0.30 Google Payments welcome without subscription signal");
    }

    if (
        signals.hasMarketingEvidence &&
        !hasStrongSubscriptionOrPaymentEvidence(signals)
    ) {
        confidence -= 0.2;
        reasons.push("-0.20 promotional signal without subscription-like signal");
    }

    const normalizedConfidence = Math.max(0, Math.min(1, confidence));
    const isBlockedAccountMessage =
        (signals.hasAccountSecurityEvidence ||
            signals.hasVerificationEvidence ||
            signals.hasPasswordResetEvidence) &&
        !hasStrongSubscriptionOrPaymentEvidence(signals);
    const isBlockedNegatedSubscriptionMessage =
        signals.hasNegatedSubscriptionEvidence &&
        !signals.hasPaymentReceiptTrialChargeEvidence;
    const isBlockedCanceledSubscriptionMessage =
        signals.hasCancellationEvidence && !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedRefundMessage =
        signals.hasRefundEvidence && !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedFreePlanMessage =
        signals.hasFreePlanEvidence && !signals.hasPaymentReceiptTrialChargeEvidence;
    const isBlockedMarketingMessage =
        signals.hasMarketingEvidence && !hasStrongSubscriptionOrPaymentEvidence(signals);

    if (isBlockedAccountMessage) {
        reasons.push("-blocked: account/security/login message without subscription signal");
    }

    if (isBlockedNegatedSubscriptionMessage) {
        reasons.push("-blocked: negated subscription message without payment signal");
    }

    if (isBlockedCanceledSubscriptionMessage) {
        reasons.push("-blocked: canceled subscription message");
    }

    if (isBlockedRefundMessage) {
        reasons.push("-blocked: refund message");
    }

    if (isBlockedFreePlanMessage) {
        reasons.push("-blocked: free plan without payment signal");
    }

    if (isBlockedMarketingMessage) {
        reasons.push("-blocked: marketing message without subscription signal");
    }

    const candidateFromPositiveEvidence = isCandidateFromPositiveEvidence(signals);

    return {
        isCandidate:
            !isBlockedAccountMessage &&
            !isBlockedNegatedSubscriptionMessage &&
            !isBlockedCanceledSubscriptionMessage &&
            !isBlockedRefundMessage &&
            !isBlockedFreePlanMessage &&
            !isBlockedMarketingMessage &&
            candidateFromPositiveEvidence &&
            normalizedConfidence >= 0.45,
        confidence: normalizedConfidence,
        reasons,
        detected,
    };
}
