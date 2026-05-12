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
    hasPaymentDueEvidence: boolean;
    hasChargedEvidence: boolean;
    hasRecurringEvidence: boolean;
    hasSubscriptionEvidence: boolean;
    hasTrialEvidence: boolean;
    hasPaidTierEvidence: boolean;
    hasBillingCycleEvidence: boolean;
    hasPaymentFailedEvidence: boolean;
    hasPriceChangeEvidence: boolean;
    hasActiveSubscriberEvidence: boolean;
    hasBillingDateEvidence: boolean;
    hasTransportTicketEvidence: boolean;
    hasPhoneTopUpEvidence: boolean;
    hasAccountSecurityEvidence: boolean;
    hasAccountSecurityCodeEvidence: boolean;
    hasVerificationEvidence: boolean;
    hasPasswordResetEvidence: boolean;
    hasCancellationEvidence: boolean;
    hasRefundEvidence: boolean;
    hasFreePlanEvidence: boolean;
    hasMarketingEvidence: boolean;
    hasProgressReportEvidence: boolean;
    hasNegatedSubscriptionEvidence: boolean;
    hasNegatedBillingEvidence: boolean;
    hasPromotionalTrialEvidence: boolean;
    hasActiveTrialSubscriptionEvidence: boolean;
    hasPaymentSetupEvidence: boolean;
    hasRecurringBillEvidence: boolean;
    hasActiveRenewalPaymentEvidence: boolean;
    hasPaymentReceiptTrialChargeEvidence: boolean;
    hasUnreadableEncodedEvidence: boolean;
    hasSuspiciousSenderEvidence: boolean;
    hasHighRiskProviderSuspiciousSenderEvidence: boolean;
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
    { name: "T-Mobile", patterns: ["t-mobile", "tmobile"] },
    { name: "Orange", patterns: ["orange.pl", "orange"] },
    { name: "Play", patterns: ["play.pl", " play "] },
    { name: "Plus", patterns: ["plus.pl", "faktura plus"] },
    { name: "Netia", patterns: ["netia"] },
    { name: "Vectra", patterns: ["vectra"] },
    { name: "UPC", patterns: ["upc"] },
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
        /\bdoes not confirm an active subscription\b/i,
        /\bdoes not confirm active subscription\b/i,
        /\bdoes not confirm any subscription\b/i,
        /\bdoes not confirm a subscription\b/i,
        /\bdoes not confirm subscription\b/i,
        /\bno subscription\b/i,
        /\bnot a subscription\b/i,
        /\bnot confirm any subscription\b/i,
        /\bnot confirm a subscription\b/i,
        /\bthis is not a receipt\b/i,
        /\bthis email does not confirm\b/i,
        /nie potwierdza [\w\s]{0,24}subskrypcji/i,
        /nie potwierdza subskrypcji/i,
        /nie jest potwierdzeniem subskrypcji/i,
        /nie potwierdzenie subskrypcji/i,
        /nie oznacza rozpocz[e\u0119]cia subskrypcji/i,
        /nie oznacza rozpoczecia subskrypcji/i,
        /nie oznacza aktywnej subskrypcji/i,
        /nie rozpocz[e\u0119]to subskrypcji/i,
        /nie rozpoczeto subskrypcji/i,
        /to nie jest subskrypcja/i,
        /brak subskrypcji/i,
        /nie zawiera linku do anulowania subskrypcji/i,
        /wiadomo[s\u015b][c\u0107] nie ma charakteru marketingowego/i,
        /nie ma charakteru marketingowego ani promocyjnego/i,
    ]);
}

function hasNegatedBillingSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /nie faktura/i,
        /nie jest faktur[a\u0105]/i,
        /nie jest rachunkiem/i,
        /nie rachunek/i,
        /nie potwierdzenie p[\u0142l]atno[s\u015b]ci/i,
        /nie potwierdzenie platnosci/i,
        /nie dotyczy subskrypcji/i,
        /nie dotyczy abonamentu/i,
        /nie dotyczy subskrypcji ani abonamentu/i,
        /nie faktura ani potwierdzenie p[\u0142l]atno[s\u015b]ci/i,
        /nie faktura ani potwierdzenie platnosci/i,
        /nie jest faktur[a\u0105] ani rachunkiem/i,
    ]);
}

function hasRecurringBillSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /ekofaktura/i,
        /e-faktura/i,
        /efaktura/i,
        /twoja ekofaktura/i,
        /faktura jest ju[z\u017c] dost[e\u0119]pna/i,
        /faktura dost[e\u0119]pna/i,
        /jest ju[z\u017c] dost[e\u0119]pna w eboa/i,
        /dost[e\u0119]pna w panelu klienta/i,
        /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
        /op[l\u0142]ac fakture/i,
        /op[l\u0142]acenie do/i,
        /op[l\u0142]acenia do/i,
        /masz czas na jej op[l\u0142]acenie do/i,
        /termin op[l\u0142]acenia/i,
        /na kwot[e\u0119]/i,
        /kod abonenta/i,
        /numer klienta/i,
        /numer abonenta/i,
        /\babonent\b/i,
        /panel klienta/i,
        /\b(eBOA|eboa|ebok|e-bok)\b/i,
        /moje konto klienta/i,
        /us[l\u0142]ugi telekomunikacyjne/i,
        /abonament telefoniczny/i,
        /internet domowy/i,
        /faktura za internet/i,
        /faktura za pakiet internetowy/i,
        /rachunek za internet/i,
        /kwota do zap[l\u0142]aty/i,
        /amount due/i,
        /payment due/i,
        /invoice due/i,
        /zbli[z\u017c]a si[e\u0119] termin p[\u0142l]atno[s\u015b]ci/i,
        /termin p[\u0142l]atno[s\u015b]ci za faktur[e\u0119]/i,
        /termin mija/i,
        /termin p[\u0142l]atno[s\u015b]ci/i,
        /okres rozliczeniowy/i,
        /p[\u0142l]atno[s\u015b][c\u0107] cykliczna/i,
        /sta[l\u0142]a p[\u0142l]atno[s\u015b][c\u0107]/i,
        /abonament miesi[e\u0119]czny/i,
        /miesi[e\u0119]czny abonament/i,
        /rozliczana miesi[e\u0119]cznie/i,
        /rozliczane miesi[e\u0119]cznie/i,
        /us[l\u0142]uga rozliczana jest co miesi[a\u0105]c/i,
        /us[l\u0142]ugi s[a\u0105] rozliczane miesi[e\u0119]cznie/i,
    ]);
}

function hasPaymentDueSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /zbli[z\u017c]a si[e\u0119] termin p[\u0142l]atno[s\u015b]ci/i,
        /termin p[\u0142l]atno[s\u015b]ci za faktur[e\u0119]/i,
        /termin mija/i,
        /kwota do zap[l\u0142]aty/i,
        /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
        /op[l\u0142]ac fakture/i,
        /op[l\u0142]acenie do/i,
        /op[l\u0142]acenia do/i,
        /masz czas na jej op[l\u0142]acenie do/i,
        /termin op[l\u0142]acenia/i,
        /\b(amount due|payment due|invoice due)\b/i,
    ]);
}

function hasPriceChangeSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /zmiana ceny/i,
        /zaktualizowan[a\u0105] cen[e\u0119]/i,
        /ceny plan[o\u00f3]w premium rosn[a\u0105]/i,
        /aktualizujemy cen[e\u0119]/i,
        /nowa cena/i,
        /\b(price change|updated price|price increase|your price is changing)\b/i,
    ]);
}

function hasActiveSubscriberSignal(subjectAndSnippet: string) {
    if (includesAny(subjectAndSnippet, [/warunk[o\u00f3]w/i, /regulamin/i])) {
        return false;
    }

    return includesAny(subjectAndSnippet, [
        /jako subskrybenta/i,
        /jako subskrybent/i,
        /nadal b[e\u0119]dziesz korzysta[c\u0107]/i,
        /zachowujesz dost[e\u0119]p/i,
        /aby pozosta[c\u0107] w planie/i,
        /pozostajesz w planie/i,
        /\b(active subscriber|as a subscriber|keep your plan|continue your subscription)\b/i,
    ]);
}

function hasBillingDateSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /dzie[n\u0144] rozliczeniowy/i,
        /dniu rozliczeniowym/i,
        /do dnia rozliczenia/i,
        /pojawi si[e\u0119] w dniu rozliczeniowym/i,
        /\b(billing date|next billing date|renewal date)\b/i,
    ]);
}

function hasProgressReportSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bweekly progress\b/i,
        /\bprogress report\b/i,
        /\btake a look at your stats\b/i,
    ]);
}

function hasTransportTicketSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bbilet\b/i,
        /zakup biletu/i,
        /potwierdzenie zakupu biletu/i,
        /karta miejska/i,
        /krakowska karta miejska/i,
        /elektroniczne konto pasa[z\u017c]era/i,
        /wazny od/i,
        /wa[z\u017c]ny od/i,
        /wazny do/i,
        /wa[z\u017c]ny do/i,
        /sieciowy/i,
        /komunikacja miejska/i,
        /\bmpk\b/i,
    ]);
}

function hasPhoneTopUpSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /do[l\u0142]adowanie telefonu/i,
        /realizacja do[l\u0142]adowania/i,
        /kwota do[l\u0142]adowania/i,
        /do[l\u0142]adowanie numeru/i,
        /\btop-up\b/i,
        /\bphone top-up\b/i,
    ]);
}

function hasPromotionalTrialSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bstart a free trial today\b/i,
        /\btry .{0,80} for free\b/i,
        /\btry .{0,80} free\b/i,
        /\bstart your free trial\b/i,
        /\bdiscover .{0,80} tools\b/i,
        /\b(this promotional email|promotional email)\b/i,
    ]);
}

function hasActiveTrialSubscriptionSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(active subscription|your subscription is active)\b/i,
        /\b(trial has started|your free trial has started)\b/i,
        /\b(trial ends in|trial ends soon|trial will end|trial ends on|trial will end on)\b/i,
        /\b(subscription will renew|will renew monthly|will renew automatically)\b/i,
        /\bsubskrypcja .{0,40}jest aktywna\b/i,
        /\bokres pr[o\u00f3]bny .{0,60}ko[n\u0144]czy/i,
        /\bbedziemy obciazac\b/i,
        /\bb[e\u0119]dziemy obci[a\u0105][z\u017c]a[c\u0107]\b/i,
    ]);
}

function hasPaymentSetupSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(payment profile|payment method added)\b/i,
        /profil p[\u0142l]atno[s\u015b]ci/i,
        /profil platnosci/i,
        /dodano form[e\u0119] p[\u0142l]atno[s\u015b]ci/i,
        /dodano forme platnosci/i,
        /utworzono profil p[\u0142l]atno[s\u015b]ci/i,
        /utworzono profil platnosci/i,
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

function hasUnreadableEncodedEvidenceSignal(subjectAndSnippet: string) {
    const quotedPrintableMatches =
        subjectAndSnippet.match(/=(?:C3|C5|3D)/gi)?.length ?? 0;

    return (
        includesAny(subjectAndSnippet, [
            /\bContent-Transfer-Encoding\b/i,
            /\bContent-Type:/i,
            /\bMime-Version\b/i,
            /\b[A-Za-z0-9+/=]{80,}\b/,
            /\b(?:PFRB|PCFE|PERJ)[A-Za-z0-9+/=]{20,}\b/,
        ]) || quotedPrintableMatches >= 4
    );
}

function isTrustedPaymentProcessorText(text: string) {
    return /\b(paypal|stripe|google|payu|przelewy24|autopay|tpay)\b/i.test(text);
}

function isSuspiciousSenderForProvider(from: string, provider: string | undefined) {
    const emailAddress = from.match(/<([^>]+)>/)?.[1] ?? from;

    if (!provider || isTrustedPaymentProcessorText(emailAddress)) {
        return false;
    }

    const trustedProviderKeywords: Record<string, string[]> = {
        Spotify: ["spotify"],
        OpenAI: ["openai", "tm.openai", "chatgpt"],
        YouTube: ["youtube", "google"],
        "Google Play": ["google"],
        "Google One": ["google"],
        Apple: ["apple"],
        Netflix: ["netflix"],
        Disney: ["disney"],
        Max: ["max", "hbo", "warnermedia", "wbd"],
        HBO: ["hbo", "max", "warnermedia", "wbd"],
        Amazon: ["amazon"],
        Canva: ["canva"],
        Adobe: ["adobe"],
        Microsoft: ["microsoft"],
        Dropbox: ["dropbox"],
        Play: ["play.pl", "mojefinanseplay"],
        Orange: ["orange"],
        "T-Mobile": ["t-mobile", "tmobile"],
        Plus: ["plus.pl"],
        Netia: ["netia"],
        Vectra: ["vectra"],
        UPC: ["upc"],
    };
    const trustedKeywords = trustedProviderKeywords[provider];

    if (!trustedKeywords) {
        return false;
    }

    const normalizedFrom = emailAddress.toLowerCase();
    return !trustedKeywords.some((keyword) =>
        normalizedFrom.includes(keyword.toLowerCase())
    );
}

function isHighRiskProviderForSuspiciousSender(provider: string | undefined) {
    return Boolean(
        provider &&
            [
                "Amazon",
                "Max",
                "HBO",
                "Disney",
                "Netflix",
                "Spotify",
                "OpenAI",
                "YouTube",
                "Google Play",
                "Google One",
                "Apple",
                "Microsoft",
                "Adobe",
                "Canva",
                "Dropbox",
            ].includes(provider)
    );
}

function hasSuspiciousRedirectLinkSignal(subjectAndSnippet: string) {
    return /\b(?:sendgrid|ct\.sendgrid)\b/i.test(subjectAndSnippet);
}

function hasRealExternalDomainMismatchEvidence(
    from: string,
    provider: string | undefined
) {
    return isSuspiciousSenderForProvider(from, provider);
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

function hasAccountSecurityCodeSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /wprowad[z\u017a] poni[z\u017c]szy kod/i,
        /wpisz poni[z\u017c]szy kod/i,
        /tw[o\u00f3]j kod to/i,
        /\bkod to:/i,
        /zmiany na swoim koncie/i,
        /aktualizacja danych na twoim koncie/i,
        /aktualizacja danych na koncie/i,
        /pro[s\u015b]b[e\u0119] o aktualizacj[e\u0119] danych/i,
        /prosbe o aktualizacje danych/i,
        /kod w ci[a\u0105]gu/i,
        /kod w ciagu/i,
    ]);
}

export function detectProvider(text: string) {
    const normalizedText = text.toLowerCase();

    return PROVIDER_CATALOG.find((provider) =>
        provider.patterns.some((pattern) => normalizedText.includes(pattern))
    )?.name;
}

function cleanInferredProviderName(value: string | undefined) {
    const cleaned = cleanText(value)
        .replace(/\b\d+(?:[./|-]\d+)*\b/g, " ")
        .replace(/\b(?:pln|usd|eur|gbp|zl|z\u0142)\b/gi, " ")
        .replace(/[|:,_#()[\]{}.!?/\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned || cleaned.length < 2) {
        return undefined;
    }

    return cleaned
        .split(" ")
        .filter(Boolean)
        .slice(0, 3)
        .map((part) =>
            part.length <= 4
                ? part.toUpperCase()
                : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" ");
}

function hasInvoiceLikeProviderInferenceContext(text: string) {
    return includesAny(text, [
        /ekofaktura/i,
        /e-faktura/i,
        /efaktura/i,
        /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
        /op[l\u0142]ac fakture/i,
        /termin p[l\u0142]atno[s\u015b]ci/i,
        /kwota do zap[l\u0142]aty/i,
        /panel klienta/i,
        /\b(eBOA|eboa|ebok|e-bok)\b/i,
    ]);
}

function inferProviderFromInvoiceContext(from: string, subjectAndSnippet: string) {
    const subjectProvider = subjectAndSnippet.match(
        /\b(?:eko\s?faktura|e-faktura|efaktura)\s+([^|:\n\r]+)/i
    )?.[1];
    const cleanedSubjectProvider = cleanInferredProviderName(subjectProvider);

    if (cleanedSubjectProvider) {
        return cleanedSubjectProvider;
    }

    if (!hasInvoiceLikeProviderInferenceContext(subjectAndSnippet)) {
        return undefined;
    }

    const emailAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
    const domain = emailAddress.toLowerCase().split("@").pop() ?? "";
    const blockedDomains = [
        "gmail.com",
        "interia.pl",
        "paypal.com",
        "tpay.com",
        "payu.com",
        "payu.pl",
        "autopay.pl",
        "stripe.com",
    ];

    if (!domain || blockedDomains.some((blocked) => domain.endsWith(blocked))) {
        return undefined;
    }

    return cleanInferredProviderName(domain.split(".")[0]);
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
        /\d+(?:[.,]\d{2})?\s?z[l\u0142]/i,
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
    if (/\bz[l\u0142]\b/i.test(amountText)) return "PLN";

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
        /^(\d+(?:[.,]\d{2})?)\s?(PLN|USD|EUR|GBP|z[l\u0142])$/i
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
            currency: detectCurrency(suffixCurrency[2]),
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
    if (hasProgressReportSignal(text)) {
        return undefined;
    }

    if (
        includesAny(text, [
            /\b(monthly|per month|month-to-month|co miesi[a\u0105]c|co miesiac|ka[z\u017c]dego miesi[a\u0105]ca|kazdego miesiaca|miesi[e\u0119]cznie|miesiecznie)\b/i,
            /\b(miesi[e\u0119]czna|miesi[e\u0119]czny|miesi[e\u0119]czne|miesi[e\u0119]cznej|miesi[e\u0119]czn[a\u0105])\b/i,
            /\b(miesieczna|miesieczny|miesieczne|miesiecznej)\b/i,
            /\b(miesi[e\u0119]cznej|miesiecznej)\s+(subskrypcji|p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
            /rozliczana miesi[e\u0119]cznie/i,
            /rozliczane miesi[e\u0119]cznie/i,
            /us[l\u0142]uga rozliczana jest co miesi[a\u0105]c/i,
            /us[l\u0142]ugi s[a\u0105] rozliczane miesi[e\u0119]cznie/i,
            /kolejny miesi[a\u0105]c/i,
            /obejmuje kolejny miesi[a\u0105]c/i,
            /abonament miesi[e\u0119]czny/i,
            /miesi[e\u0119]czny abonament/i,
            /okres rozliczeniowy[\s\S]{0,120}\b(internet|abonament|us[l\u0142]ug)/i,
            /\b(internet|abonament|us[l\u0142]ug)[\s\S]{0,120}okres rozliczeniowy/i,
            /dniu rozliczeniowym/i,
            /do dnia rozliczenia/i,
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
    const detectedCatalogProvider = detectProvider(params.combinedText);
    const provider =
        detectedCatalogProvider ??
        inferProviderFromInvoiceContext(params.from, params.subjectAndSnippet);
    const planName = detectPlanName(params.combinedText);
    const billingCycle = detectBillingCycle(params.subjectAndSnippet);
    const trialEndDateText = detectTrialEndDateText(params.subjectAndSnippet);
    const amountText = detectAmountText(params.subjectAndSnippet);
    const hasProgressReportEvidence = hasProgressReportSignal(
        params.subjectAndSnippet
    );
    const hasPriceChangeEvidence = hasPriceChangeSignal(params.subjectAndSnippet);
    const hasActiveSubscriberEvidence = hasActiveSubscriberSignal(
        params.subjectAndSnippet
    );
    const hasBillingDateEvidence = hasBillingDateSignal(params.subjectAndSnippet);
    const hasTransportTicketEvidence = hasTransportTicketSignal(
        params.combinedText
    );
    const hasPhoneTopUpEvidence = hasPhoneTopUpSignal(params.combinedText);
    const hasNegatedSubscriptionEvidence = hasNegatedSubscriptionSignal(
        params.subjectAndSnippet
    );
    const hasNegatedBillingEvidence = hasNegatedBillingSignal(
        params.subjectAndSnippet
    );
    const hasPaymentDueEvidence =
        !hasNegatedBillingEvidence && hasPaymentDueSignal(params.subjectAndSnippet);
    const hasMarketingEvidence = includesAny(params.subjectAndSnippet, [
        /\b(newsletter|sale|promo|offer|deal|limited time offer|special offer|discover|promotional email|try it|upgrade to|switch to|activate|send-premium|referral|refer a friend)\b/i,
        /\b(oferta|oferte|oferty|wyj[a\u0105]tkowa oferta|wyjatkowa oferta|sprawd[z\u017a] szczeg[o\u00f3][l\u0142]y oferty|sprawdz szczegoly oferty|oferta specjalna|kup na|przejd[z\u017a] na|przejdz na|aktywuj|wypr[o\u00f3]buj|wyprobuj|wybierz abonament|smartfonem|rabatach|zgody marketingowe|promocyjne|promocje|marketingowe|promocyjna|poznaj)\b/i,
        /kod polecaj[a\u0105]cy/i,
        /pole[c\u0107] plan znajomemu/i,
        /podziel si[e\u0119]/i,
        /3 miesi[a\u0105]ce za darmo/i,
        /za 0 z[l\u0142]/i,
    ]);
    const hasRecurringBillEvidence =
        hasRecurringBillSignal(params.subjectAndSnippet) &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence);
    const hasTrialEvidence = includesAny(params.subjectAndSnippet, [
        /\b(trial|free trial|trial started|start your trial|your trial|trial will end|okres pr[o\u00f3]bny|wersja pr[o\u00f3]bna)\b/i,
    ]);
    const hasReceiptEvidence =
        !hasNegatedBillingEvidence &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence) &&
        includesAny(params.subjectAndSnippet, [
            /\b(receipt|order receipt|order confirmation|purchase confirmation|potwierdzenie zakupu|potwierdzenie p[\u0142l]atno[s\u015b]ci|potwierdzenie platnosci)\b/i,
            /ekofaktura/i,
            /e-faktura/i,
            /efaktura/i,
        ]);
    const hasInvoiceEvidence =
        !hasNegatedBillingEvidence &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence) &&
        includesAny(params.subjectAndSnippet, [
            /\b(invoice|faktura|numer faktury|rachunek)\b/i,
            /ekofaktura/i,
            /e-faktura/i,
            /efaktura/i,
            /faktura jest ju[z\u017c] dost[e\u0119]pna/i,
            /faktura dost[e\u0119]pna/i,
        ]);
    const hasPaymentEvidence =
        !hasNegatedBillingEvidence &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence) &&
        includesAny(params.subjectAndSnippet, [
            /\b(payment|paid|purchase|purchased|billed|p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc|zakup)\b/i,
            /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
            /op[l\u0142]ac fakture/i,
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
        /\bproblem z (?:przetworzeniem )?p[\u0142l]atno[s\u015b]ci\b/i,
        /zaktualizuj metod[e\u0119] p[\u0142l]atno[s\u015b]ci/i,
        /\bnie uda[l\u0142]o si[e\u0119] pobra[c\u0107] p[\u0142l]atno[s\u015b]ci\b/i,
        /\bnie udalo sie pobrac platnosci\b/i,
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
    const hasAccountSecurityCodeEvidence = hasAccountSecurityCodeSignal(
        params.subjectAndSnippet
    );
    const hasAccountSecurityEvidence =
        hasAccountSecurityCodeEvidence ||
        hasAccountSecurityLoginSignal(params.subjectAndSnippet) ||
        includesAny(params.subjectAndSnippet, [
            /\b(login code|sign-in code|new sign in|new sign-in|new login|security alert|account security)\b/i,
            /kod\s+logowania/i,
            /jednorazowy\s+kod/i,
            /nowe\s+logowanie/i,
        ]);
    const hasPromotionalTrialEvidence = hasPromotionalTrialSignal(
        params.subjectAndSnippet
    );
    const hasActiveTrialSubscriptionEvidence = hasActiveTrialSubscriptionSignal(
        params.subjectAndSnippet
    );
    const hasPaymentSetupEvidence = hasPaymentSetupSignal(params.subjectAndSnippet);
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
        hasPaymentDueEvidence ||
        hasChargedEvidence ||
        hasTrialEvidence;
    const hasUnreadableEncodedEvidence = hasUnreadableEncodedEvidenceSignal(
        params.subjectAndSnippet
    );
    const hasSuspiciousSenderEvidence = isSuspiciousSenderForProvider(
        params.from,
        provider
    );
    const hasHighRiskProviderSuspiciousSenderEvidence =
        hasSuspiciousSenderEvidence &&
        isHighRiskProviderForSuspiciousSender(provider) &&
        (hasSuspiciousRedirectLinkSignal(params.subjectAndSnippet) ||
            hasRealExternalDomainMismatchEvidence(params.from, provider));

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
        hasPaymentDueEvidence,
        hasChargedEvidence,
        hasRecurringEvidence,
        hasSubscriptionEvidence,
        hasTrialEvidence,
        hasPaidTierEvidence: hasPaidTierEvidence || Boolean(planName),
        hasBillingCycleEvidence: Boolean(billingCycle),
        hasPaymentFailedEvidence,
        hasPriceChangeEvidence,
        hasActiveSubscriberEvidence,
        hasBillingDateEvidence,
        hasTransportTicketEvidence,
        hasPhoneTopUpEvidence,
        hasAccountSecurityEvidence,
        hasAccountSecurityCodeEvidence,
        hasVerificationEvidence,
        hasPasswordResetEvidence,
        hasCancellationEvidence,
        hasRefundEvidence,
        hasFreePlanEvidence,
        hasMarketingEvidence,
        hasProgressReportEvidence,
        hasNegatedSubscriptionEvidence,
        hasNegatedBillingEvidence,
        hasPromotionalTrialEvidence,
        hasActiveTrialSubscriptionEvidence,
        hasPaymentSetupEvidence,
        hasRecurringBillEvidence,
        hasActiveRenewalPaymentEvidence,
        hasPaymentReceiptTrialChargeEvidence,
        hasUnreadableEncodedEvidence,
        hasSuspiciousSenderEvidence,
        hasHighRiskProviderSuspiciousSenderEvidence,
    };
}

function hasRealActiveBillingEvidence(signals: DetectionSignals) {
    const hasActivePriceChangeEvidence =
        signals.hasPaidTierEvidence &&
        ((signals.hasPriceChangeEvidence && signals.hasActiveSubscriberEvidence) ||
            (signals.hasPriceChangeEvidence &&
                (signals.hasBillingCycleEvidence || Boolean(signals.amountText))) ||
            (signals.hasActiveSubscriberEvidence && signals.hasBillingDateEvidence));

    return (
        signals.hasReceiptEvidence ||
        signals.hasInvoiceEvidence ||
        signals.hasPaymentEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasChargedEvidence ||
        signals.hasPaymentFailedEvidence ||
        signals.hasRecurringBillEvidence ||
        signals.hasActiveTrialSubscriptionEvidence ||
        signals.hasActiveRenewalPaymentEvidence ||
        hasActivePriceChangeEvidence ||
        (signals.hasSubscriptionEvidence &&
            (signals.hasRecurringEvidence || signals.hasBillingCycleEvidence))
    );
}

function hasStrongSubscriptionOrPaymentEvidence(signals: DetectionSignals) {
    return hasRealActiveBillingEvidence(signals) || signals.hasTrialEvidence;
}

function isCandidateFromPositiveEvidence(signals: DetectionSignals) {
    const hasProviderOrPlan = Boolean(signals.provider || signals.planName);
    const hasReceiptInvoiceOrPayment =
        signals.hasReceiptEvidence ||
        signals.hasInvoiceEvidence ||
        signals.hasPaymentEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasChargedEvidence;
    const hasActivePriceChangeEvidence =
        signals.hasPaidTierEvidence &&
        ((signals.hasPriceChangeEvidence && signals.hasActiveSubscriberEvidence) ||
            (signals.hasPriceChangeEvidence &&
                (signals.hasBillingCycleEvidence || Boolean(signals.amountText))) ||
            (signals.hasActiveSubscriberEvidence && signals.hasBillingDateEvidence));

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
        (signals.hasRecurringBillEvidence &&
            (Boolean(signals.provider) ||
                hasReceiptInvoiceOrPayment ||
                Boolean(signals.amountText) ||
                signals.hasBillingCycleEvidence)) ||
        (hasActivePriceChangeEvidence && Boolean(signals.provider)) ||
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

    if (
        signals.hasPaymentEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasChargedEvidence
    ) {
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

    if (signals.hasRecurringBillEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 recurring bill evidence");
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

    if (signals.hasPriceChangeEvidence) {
        confidence += 0.15;
        reasons.push("+0.15 price change evidence");
    }

    if (signals.hasActiveSubscriberEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 active subscriber evidence");
    }

    if (signals.hasBillingDateEvidence) {
        confidence += 0.1;
        reasons.push("+0.10 billing date evidence");
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

    if (signals.hasNegatedBillingEvidence) {
        confidence -= 0.35;
        reasons.push("-0.35 negated billing/payment signal");
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
        signals.hasPromotionalTrialEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasChargedEvidence
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 promotional trial signal");
    }

    if (
        signals.hasPaymentSetupEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasActiveRenewalPaymentEvidence
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 payment setup signal");
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
        !hasRealActiveBillingEvidence(signals)
    ) {
        confidence -= 0.2;
        reasons.push("-0.20 marketing/upsell signal without active billing evidence");
    }

    if (signals.hasUnreadableEncodedEvidence && !hasRealActiveBillingEvidence(signals)) {
        confidence -= 0.35;
        reasons.push("-0.35 unreadable encoded/raw message signal");
    }

    if (signals.hasSuspiciousSenderEvidence) {
        const penalty =
            signals.hasHighRiskProviderSuspiciousSenderEvidence
                ? 1
                : signals.hasUnreadableEncodedEvidence || signals.hasPaymentFailedEvidence
                ? 0.5
                : 0.25;
        confidence -= penalty;
        reasons.push(
            `-${penalty.toFixed(2)} suspicious sender domain for detected provider`
        );
    }

    if (
        signals.hasProgressReportEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasPaymentDueEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasPaymentFailedEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasTrialEvidence &&
        !hasRealActiveBillingEvidence(signals)
    ) {
        confidence -= 0.25;
        reasons.push("-0.25 progress report without billing signal");
    }

    if (
        signals.hasTransportTicketEvidence &&
        !(signals.hasInvoiceEvidence && signals.hasRecurringBillEvidence)
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 transport ticket/pass purchase signal");
    }

    if (signals.hasPhoneTopUpEvidence) {
        confidence -= 0.6;
        reasons.push("-0.60 phone top-up purchase signal");
    }

    const normalizedConfidence = Math.max(0, Math.min(1, confidence));
    const isBlockedAccountMessage =
        (signals.hasAccountSecurityEvidence ||
            signals.hasVerificationEvidence ||
            signals.hasPasswordResetEvidence) &&
        !hasStrongSubscriptionOrPaymentEvidence(signals);
    const isBlockedAccountSecurityCodeMessage =
        signals.hasAccountSecurityCodeEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedNegatedSubscriptionMessage =
        signals.hasNegatedSubscriptionEvidence &&
        !signals.hasPaymentReceiptTrialChargeEvidence;
    const isBlockedNegatedBillingMessage =
        signals.hasNegatedBillingEvidence &&
        !signals.amountText &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveRenewalPaymentEvidence &&
        !signals.hasPaymentFailedEvidence;
    const isBlockedCanceledSubscriptionMessage =
        signals.hasCancellationEvidence && !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedRefundMessage =
        signals.hasRefundEvidence && !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedFreePlanMessage =
        signals.hasFreePlanEvidence && !signals.hasPaymentReceiptTrialChargeEvidence;
    const isBlockedMarketingMessage =
        signals.hasMarketingEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedMarketingNegatedMessage =
        signals.hasMarketingEvidence && signals.hasNegatedSubscriptionEvidence;
    const isBlockedPromotionalTrialMessage =
        signals.hasPromotionalTrialEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasChargedEvidence;
    const isBlockedPaymentSetupMessage =
        signals.hasPaymentSetupEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedUnreadableEncodedMessage =
        signals.hasUnreadableEncodedEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedSuspiciousSenderMessage =
        signals.hasSuspiciousSenderEvidence &&
        (signals.hasHighRiskProviderSuspiciousSenderEvidence ||
            signals.hasUnreadableEncodedEvidence ||
            signals.hasPaymentFailedEvidence ||
            !hasRealActiveBillingEvidence(signals));
    const isBlockedProgressReportMessage =
        signals.hasProgressReportEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasPaymentDueEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasPaymentFailedEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasTrialEvidence &&
        !hasRealActiveBillingEvidence(signals);
    const isBlockedTransportTicketMessage =
        signals.hasTransportTicketEvidence &&
        !(signals.hasInvoiceEvidence && signals.hasRecurringBillEvidence);
    const isBlockedPhoneTopUpMessage = signals.hasPhoneTopUpEvidence;

    if (isBlockedAccountSecurityCodeMessage) {
        reasons.push("-blocked: account/security code message without billing signal");
    }

    if (isBlockedAccountMessage) {
        reasons.push("-blocked: account/security/login message without subscription signal");
    }

    if (isBlockedNegatedSubscriptionMessage) {
        reasons.push("-blocked: negated subscription message without payment signal");
    }

    if (isBlockedNegatedBillingMessage) {
        reasons.push("-blocked: negated billing/payment message");
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
        reasons.push("-blocked: marketing upsell without active billing evidence");
    }

    if (isBlockedMarketingNegatedMessage) {
        reasons.push("-blocked: marketing message with negated subscription signal");
    }

    if (isBlockedPromotionalTrialMessage) {
        reasons.push(
            "-blocked: promotional trial message without active subscription signal"
        );
    }

    if (isBlockedPaymentSetupMessage) {
        reasons.push("-blocked: payment setup message without subscription signal");
    }

    if (isBlockedUnreadableEncodedMessage) {
        reasons.push("-blocked: unreadable encoded message");
    }

    if (isBlockedSuspiciousSenderMessage) {
        reasons.push("-blocked: suspicious sender domain for detected provider");
    }

    if (isBlockedProgressReportMessage) {
        reasons.push("-blocked: progress report without billing signal");
    }

    if (isBlockedTransportTicketMessage) {
        reasons.push("-blocked: transport ticket/pass purchase");
    }

    if (isBlockedPhoneTopUpMessage) {
        reasons.push("-blocked: phone top-up purchase");
    }

    const candidateFromPositiveEvidence = isCandidateFromPositiveEvidence(signals);

    return {
        isCandidate:
            !isBlockedAccountMessage &&
            !isBlockedNegatedSubscriptionMessage &&
            !isBlockedNegatedBillingMessage &&
            !isBlockedCanceledSubscriptionMessage &&
            !isBlockedRefundMessage &&
            !isBlockedFreePlanMessage &&
            !isBlockedMarketingMessage &&
            !isBlockedMarketingNegatedMessage &&
            !isBlockedPromotionalTrialMessage &&
            !isBlockedPaymentSetupMessage &&
            !isBlockedUnreadableEncodedMessage &&
            !isBlockedAccountSecurityCodeMessage &&
            !isBlockedSuspiciousSenderMessage &&
            !isBlockedProgressReportMessage &&
            !isBlockedTransportTicketMessage &&
            !isBlockedPhoneTopUpMessage &&
            candidateFromPositiveEvidence &&
            normalizedConfidence >= 0.45,
        confidence: normalizedConfidence,
        reasons,
        detected,
    };
}
