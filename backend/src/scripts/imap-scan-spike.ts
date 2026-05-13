import "dotenv/config";
import { ImapFlow, MessageAddressObject } from "imapflow";
import { simpleParser } from "mailparser";
import {
    analyzeMessageForSubscription,
    cleanText,
    debugAnalyzeMessageForSubscription,
    EmailDetectionDebugDetails,
    truncateEvidenceSnippet,
} from "../services/email-detection.service";

type ImapSpikeConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    mailbox: string;
    limit: number;
    verbose: boolean;
    outputJson: boolean;
    targetedSearch: boolean;
    targetedSearchLimit: number;
    showReviewCandidates: boolean;
    reviewLimit: number;
};

type ImapDebugMessage = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    isCandidate: boolean;
    confidence: number;
    reasons: string[];
    detected: ReturnType<typeof analyzeMessageForSubscription>["detected"];
    source: "latest_scan" | "targeted_search";
    debug?: EmailDetectionDebugDetails;
};

type ImapRecurringGroup = {
    groupKey: string;
    suggestedName: string;
    confidence: number;
    cadence: "monthly" | "weekly" | "unknown";
    count: number;
    firstDate: string;
    lastDate: string;
    amounts: string[];
    provider?: string;
    domain: string;
    fromSample: string;
    sampleSubjects: string[];
    sampleSnippets: string[];
    messageIds: string[];
    candidateMessages: number;
    evidenceMessages: number;
    reasons: string[];
    isRecurringCandidate: boolean;
};

type AmountSemantics = {
    raw: string;
    normalized?: string;
    kind:
        | "charged"
        | "due"
        | "current_price"
        | "future_price"
        | "new_price"
        | "old_price"
        | "promo_price"
        | "regular_price"
        | "trial_then_price"
        | "savings"
        | "credit_amount"
        | "one_time_purchase"
        | "unknown";
    confidence: number;
    context: string;
};

type DateSemantics = {
    raw: string;
    kind:
        | "charged_date"
        | "due_date"
        | "next_renewal_date"
        | "trial_end_date"
        | "effective_date"
        | "invoice_date"
        | "unknown";
    confidence: number;
    context: string;
};

type ImapCanonicalSubscription = {
    subscriptionKey: string;
    displayName: string;
    provider?: string;
    billingChannel?: string;
    category?: string;
    confidence: number;
    status: "active" | "trial" | "price_change" | "cancelled" | "expired" | "invoice" | "unknown";
    billingCycle?: string;
    amount?: string;
    displayAmount?: string;
    chargedAmount?: string;
    dueAmount?: string;
    currentAmount?: string;
    latestAmount?: string;
    futureAmount?: string;
    promoAmount?: string;
    regularAmount?: string;
    trialThenAmount?: string;
    ignoredAmounts?: string[];
    amountKind?: AmountSemantics["kind"];
    billingDateText?: string;
    dueDateText?: string;
    nextBillingDateText?: string;
    nextRenewalDateText?: string;
    trialEndDateText?: string;
    effectiveDateText?: string;
    amountSemantics?: AmountSemantics[];
    dateSemantics?: DateSemantics[];
    sourceTypes: string[];
    statusReason?: string;
    amounts: string[];
    firstSeen: string;
    lastSeen: string;
    messageCount: number;
    sourceMessageIds: string[];
    sourceSubjects: string[];
    sourceSenders: string[];
    evidenceTypes: string[];
    reasons: string[];
};

type ImapReviewCandidate = {
    id: string;
    reviewKey: string;
    reviewScore: number;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    detectedProvider?: string;
    detectedName?: string;
    blockedReason?: string;
    isCandidate: boolean;
    confidence: number;
    reasons: string[];
    reviewSignals: string[];
    riskSignals: string[];
};

type ImapScanSpikeResult = {
    mailbox: string;
    scannedMessages: number;
    candidatesFound: number;
    rejectedMessages: number;
    canonicalSubscriptions: ImapCanonicalSubscription[];
    reviewCandidates: ImapReviewCandidate[];
    recurringGroups: ImapRecurringGroup[];
    debugMessages: ImapDebugMessage[];
};

function parseBoolean(value: string | undefined, defaultValue: boolean) {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function parsePositiveInteger(
    value: string | undefined,
    defaultValue: number,
    label: string
) {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${label} must be a positive integer.`);
    }

    return parsed;
}

function getConfig(): ImapSpikeConfig {
    const host = process.env.IMAP_HOST?.trim();
    const user = process.env.IMAP_USER?.trim();
    const password = process.env.IMAP_PASSWORD;

    if (!host) {
        throw new Error("Missing IMAP_HOST.");
    }

    if (!user) {
        throw new Error("Missing IMAP_USER.");
    }

    if (!password) {
        throw new Error("Missing IMAP_PASSWORD.");
    }

    return {
        host,
        user,
        password,
        port: parsePositiveInteger(process.env.IMAP_PORT, 993, "IMAP_PORT"),
        secure: parseBoolean(process.env.IMAP_SECURE, true),
        mailbox: process.env.IMAP_MAILBOX?.trim() || "INBOX",
        limit: parsePositiveInteger(
            process.env.IMAP_SCAN_LIMIT,
            50,
            "IMAP_SCAN_LIMIT"
        ),
        verbose: parseBoolean(process.env.IMAP_VERBOSE, false),
        outputJson: parseBoolean(process.env.IMAP_OUTPUT_JSON, false),
        targetedSearch: parseBoolean(process.env.IMAP_TARGETED_SEARCH, false),
        targetedSearchLimit: parsePositiveInteger(
            process.env.IMAP_TARGETED_SEARCH_LIMIT,
            250,
            "IMAP_TARGETED_SEARCH_LIMIT"
        ),
        showReviewCandidates: parseBoolean(
            process.env.IMAP_SHOW_REVIEW_CANDIDATES,
            true
        ),
        reviewLimit: parsePositiveInteger(
            process.env.IMAP_REVIEW_LIMIT,
            30,
            "IMAP_REVIEW_LIMIT"
        ),
    };
}

function formatAddress(address: MessageAddressObject | undefined) {
    if (!address) {
        return "";
    }

    if (address.name && address.address) {
        return `${address.name} <${address.address}>`;
    }

    return address.address ?? address.name ?? "";
}

function stripHtml(value: string) {
    return value
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ");
}

function sourceToSnippet(source: Buffer | undefined) {
    if (!source) {
        return "";
    }

    const raw = source.toString("utf8");
    const bodyStart = raw.search(/\r?\n\r?\n/);
    const body = bodyStart >= 0 ? raw.slice(bodyStart) : raw;

    return truncateEvidenceSnippet(cleanText(stripHtml(body)));
}

async function messageSourceToSnippet(source: Buffer | undefined) {
    if (!source) {
        return "";
    }

    try {
        const parsed = await simpleParser(source);
        const parsedBody = parsed.text || (parsed.html ? stripHtml(parsed.html) : "");

        if (parsedBody) {
            return truncateEvidenceSnippet(cleanText(parsedBody));
        }
    } catch {
        return sourceToSnippet(source);
    }

    return sourceToSnippet(source);
}

const TARGETED_SEARCH_TERMS = [
    "subscription",
    "subskrypcja",
    "abonament",
    "renewal",
    "odnowienie",
    "trial",
    "okres próbny",
    "faktura",
    "efaktura",
    "rachunek",
    "kwota do zapłaty",
    "termin płatności",
    "invoice",
    "receipt",
    "Google Play",
    "App Store",
    "Prime Video",
    "Amazon Prime",
    "PayPal",
    "Stripe",
    "Netflix",
    "Spotify",
    "YouTube",
    "Google One",
    "iCloud",
    "Disney",
    "Max",
    "SkyShowtime",
    "Adobe",
    "Canva",
    "Microsoft 365",
    "Dropbox",
    "AllTrails",
    "Play",
    "Orange",
    "T-Mobile",
    "Plus",
    "Netia",
    "Vectra",
    "TOYA",
    "Tauron",
    "PGE",
    "E.ON",
    "Energa",
];

async function appendDebugMessageFromFetchMessage(
    debugMessages: ImapDebugMessage[],
    seenIds: Set<string>,
    message: {
        uid?: number | string;
        seq?: number | string;
        envelope?: {
            from?: MessageAddressObject[];
            subject?: string;
            date?: Date | string;
        };
        internalDate?: Date | string;
        source?: Buffer;
    },
    source: "latest_scan" | "targeted_search"
) {
    const id = String(message.uid ?? message.seq);

    if (!id || seenIds.has(id)) {
        return;
    }

    seenIds.add(id);

    const from = cleanText(formatAddress(message.envelope?.from?.[0]));
    const subject = cleanText(message.envelope?.subject ?? "");
    const dateValue = message.envelope?.date ?? message.internalDate ?? undefined;
    const date =
        dateValue instanceof Date
            ? dateValue.toISOString()
            : cleanText(String(dateValue ?? ""));
    const snippet = await messageSourceToSnippet(message.source);
    const input = {
        id,
        from,
        subject,
        date,
        snippet,
    };
    const analysis = analyzeMessageForSubscription(input);
    const debug = debugAnalyzeMessageForSubscription(input);

    debugMessages.push({
        id,
        from,
        subject,
        date,
        snippet,
        isCandidate: analysis.isCandidate,
        confidence: analysis.confidence,
        reasons: analysis.reasons,
        detected: analysis.detected,
        source,
        debug,
    });
}

async function collectTargetedSearchUids(
    client: ImapFlow,
    limit: number,
    verbose: boolean
) {
    const uids = new Set<number>();

    for (const term of TARGETED_SEARCH_TERMS) {
        if (uids.size >= limit) {
            break;
        }

        try {
            const matches = (await (client as any).search(
                { body: term },
                { uid: true }
            )) as number[];

            for (const uid of matches.reverse()) {
                uids.add(uid);

                if (uids.size >= limit) {
                    break;
                }
            }
        } catch (error) {
            if (verbose) {
                const message =
                    error instanceof Error ? error.message : "targeted search failed";
                console.error(`Targeted IMAP search skipped for "${term}": ${message}`);
            }
        }
    }

    return [...uids].slice(0, limit);
}

function optionalLine(label: string, value: string | number | boolean | undefined) {
    if (value === undefined || value === "") {
        return;
    }

    console.log(`   ${label}: ${value}`);
}

function extractEmailAddress(from: string) {
    return cleanText(from.match(/<([^>]+)>/)?.[1] ?? from).toLowerCase();
}

function extractSenderDomain(from: string) {
    const email = extractEmailAddress(from);
    return email.includes("@") ? email.split("@").pop() ?? email : email;
}

function normalizeSubjectFamily(subject: string) {
    const cleanedSubject = cleanText(subject);
    const efakturaMatch = cleanedSubject.match(
        /\b(eko\s?faktura|e-faktura|efaktura)\s+([^|:\n\r]+)/i
    );

    if (efakturaMatch?.[1] && efakturaMatch?.[2]) {
        return cleanText(`${efakturaMatch[1]} ${efakturaMatch[2]}`)
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    return cleanedSubject
        .toLowerCase()
        .replace(/\b(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[sś]nia|pa[zź]dziernika|listopada|grudnia)\b/gi, " ")
        .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, " ")
        .replace(/\b\d{1,4}(?:[./-]\d{1,4})+\b/g, " ")
        .replace(/\b\d+(?:[,.]\d{2})?\s?(?:pln|usd|eur|gbp|z[lł])\b/gi, " ")
        .replace(/\b\d+\b/g, " ")
        .replace(/[|:_#()[\]{}.,;!?/\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractAmounts(text: string) {
    const matches =
        text.match(/(?:[$€£]\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP|z[lł]))/gi) ??
        [];
    return [...new Set(matches.map((match) => cleanText(match)))];
}

function sanitizeSampleSnippet(snippet: string) {
    return truncateEvidenceSnippet(
        snippet.replace(/https?:\/\/\S+/gi, (url) => url.split("?")[0])
    );
}

function hasRecurringGroupEvidence(message: ImapDebugMessage) {
    const text = `${message.subject} ${message.snippet}`;

    return (
        Boolean(message.detected.amountText) ||
        extractAmounts(text).length > 0 ||
        message.reasons.some((reason) =>
            /receipt|invoice|payment|recurring bill|amount|billing date|payment\/charged/i.test(
                reason
            )
        ) ||
        /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek|payment due|invoice due|kwota do zap[lł]aty|op[lł]a[cć] faktur[eę]|op[lł]acenie do|termin p[lł]atno[sś]ci|abonenta|panel klienta|eboa|ebok|e-bok)\b/i.test(
            text
        )
    );
}

function hasOnetMarketingIntermediaryGroupSignal(text: string) {
    return /mailing_reklamowy@(grupa)?onet\.pl|\s-\s*onet\b/i.test(text);
}

function hasRecurringGroupInvoiceDueSignal(text: string) {
    return /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek|payment due|invoice due|termin p[\u0142l]atno[s\u015b]ci|kwota do zap[\u0142l]aty|op[\u0142l]a[c\u0107] faktur[e\u0119]|oplac fakture|numer faktury|eboa|ebok|e-bok)\b/i.test(
        text
    );
}

function hasRecurringGroupCreditLoanMarketingSignal(text: string) {
    return /\b(rrso|po[z\u017c]yczka|pozyczka|kredyt|oprocentowanie|prowizja|raty|leasing|kredyt 50\/50|rzeczywista roczna stopa oprocentowania)\b/i.test(
        text
    );
}

function isInvoiceLikeFamily(subjectFamily: string, messages: ImapDebugMessage[]) {
    const text = `${subjectFamily} ${messages
        .map((message) => `${message.subject} ${message.snippet}`)
        .join(" ")}`;

    if (/do[lĹ‚]adowanie|doladowanie|top-up|phone top-up|mailing@interia\.pl|dostarczone przez interi/i.test(text)) {
        return false;
    }

    return /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek|payment due|invoice due|termin p[lł]atno[sś]ci|op[lł]a[cć] faktur[eę]|eboa|ebok|e-bok)\b/i.test(
        text
    );
}

function isStrongEfakturaFamily(subjectFamily: string) {
    return /\b(ekofaktura|e-faktura|efaktura)\b/i.test(subjectFamily);
}

function isOneTimeOrNoiseGroup(messages: ImapDebugMessage[], subjectFamily: string) {
    const text = `${subjectFamily} ${messages
        .map((message) => `${message.from} ${message.subject} ${message.snippet}`)
        .join(" ")}`;

    const isStrongInvoiceGroup =
        isStrongEfakturaFamily(subjectFamily) ||
        isInvoiceLikeFamily(subjectFamily, messages);

    if (
        (hasOnetMarketingIntermediaryGroupSignal(text) ||
            hasRecurringGroupCreditLoanMarketingSignal(text)) &&
        !hasRecurringGroupInvoiceDueSignal(text)
    ) {
        return true;
    }

    if (/do[\u0142l]adowanie|top-up|phone top-up|mailing@interia\.pl|dostarczone przez interi/i.test(text)) {
        return true;
    }

    const hasHardOneTimeNoise =
        /\b(uber|uber eats|bolt|booking|media expert|allegro|olx|wizz air|koleo|restaurant|restauracji|przejazd|zam[oó]wienie|bilety kolejowe|progress report|weekly progress|security|login|logowanie)\b/i.test(
            text
        );

    if (hasHardOneTimeNoise) {
        return true;
    }

    const hasSoftMarketingNoise =
        /\b(newsletter|marketing|promocj|oferta)\b/i.test(text);

    return hasSoftMarketingNoise && !isStrongInvoiceGroup;
}

function detectCadence(messages: ImapDebugMessage[]) {
    const dates = messages
        .map((message) => Date.parse(message.date))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b);

    if (dates.length < 2) {
        return "unknown" as const;
    }

    const gaps = dates
        .slice(1)
        .map((date, index) => (date - dates[index]) / (1000 * 60 * 60 * 24))
        .filter((gap) => gap > 0);

    if (gaps.length === 0) {
        return "unknown" as const;
    }

    const monthlyGaps = gaps.filter((gap) => gap >= 20 && gap <= 45).length;
    const weeklyGaps = gaps.filter((gap) => gap >= 5 && gap <= 10).length;

    if (monthlyGaps >= Math.ceil(gaps.length * 0.6)) {
        return "monthly" as const;
    }

    if (weeklyGaps >= Math.ceil(gaps.length * 0.6)) {
        return "weekly" as const;
    }

    return "unknown" as const;
}

function cleanGroupName(value: string | undefined) {
    const cleaned = cleanText(value)
        .replace(/\b\d+(?:[./-]\d+)*\b/g, " ")
        .replace(/[|:,_#()[\]{}.!?/\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) {
        return undefined;
    }

    return cleaned
        .split(" ")
        .slice(0, 3)
        .map((part) =>
            part.length <= 4
                ? part.toUpperCase()
                : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" ");
}

function inferProviderFromGroup(messages: ImapDebugMessage[], subjectFamily: string) {
    const subjectText = messages.map((message) => message.subject).join(" ");
    const efakturaName = subjectText.match(
        /\b(?:eko\s?faktura|e-faktura|efaktura)\s+([^|:\n\r]+)/i
    )?.[1];

    const serviceName = messages
        .map((message) => message.subject)
        .map(
            (subject) =>
                subject.match(/do us[\u0142l]ugodawcy\s*-\s*([^\n\r|:;.,]+)/i)?.[1]
        )
        .find(Boolean);

    const explicitName = cleanGroupName(efakturaName ?? serviceName);

    if (explicitName) {
        return explicitName;
    }

    const domain = extractSenderDomain(messages[0].from);
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

    if (
        /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek)\b/i.test(subjectFamily) &&
        !blockedDomains.some((blocked) => domain.endsWith(blocked))
    ) {
        return cleanGroupName(domain.split(".")[0]);
    }

    return undefined;
}

function titleFromSubjectFamily(subjectFamily: string) {
    return subjectFamily
        .split(" ")
        .filter(Boolean)
        .slice(0, 5)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function normalizeSubscriptionKeyPart(value: string | undefined) {
    return cleanText(value)
        .toLowerCase()
        .replace(/\bon prime video\b/g, " ")
        .replace(/\bvia\b/g, " ")
        .replace(/[^a-z0-9ąćęłńóśźż]+/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractBillingChannel(message: ImapDebugMessage) {
    if (message.debug?.billingChannel) {
        return message.debug.billingChannel;
    }

    const channelReason = message.reasons.find((reason) =>
        /\+ marketplace billing channel:/i.test(reason)
    );
    const channel = channelReason?.split(":").slice(1).join(":").trim();

    if (channel) {
        return channel;
    }

    const text = `${message.from} ${message.subject} ${message.snippet}`;

    if (/paypal/i.test(text)) return "PayPal";
    if (/stripe/i.test(text)) return "Stripe";
    if (/autopay/i.test(text)) return "Autopay";
    if (/tpay/i.test(text)) return "Tpay";
    if (/payu/i.test(text)) return "PayU";
    if (/przelewy24/i.test(text)) return "Przelewy24";

    return undefined;
}

function isMarketplaceChannel(channel: string | undefined) {
    return Boolean(channel && /prime video|google play|apple/i.test(channel));
}

function canonicalKeyForMessage(message: ImapDebugMessage) {
    const provider = message.detected.provider ?? message.debug?.provider;
    const displayName =
        message.detected.name && message.detected.name !== provider
            ? message.detected.name
            : provider;
    const billingChannel = extractBillingChannel(message);
    const providerKey = normalizeSubscriptionKeyPart(provider ?? displayName);

    if (providerKey) {
        const channelKey = isMarketplaceChannel(billingChannel)
            ? normalizeSubscriptionKeyPart(billingChannel)
            : "";
        return [providerKey, channelKey].filter(Boolean).join("|");
    }

    const domain = extractSenderDomain(message.from);
    const subjectFamily = normalizeSubjectFamily(message.subject);

    return [domain, subjectFamily].filter(Boolean).join("|");
}

function canonicalKeyForGroup(group: ImapRecurringGroup) {
    const providerKey = normalizeSubscriptionKeyPart(group.provider ?? group.suggestedName);

    if (providerKey) {
        return providerKey;
    }

    return normalizeSubscriptionKeyPart(group.groupKey);
}

function statusRank(status: ImapCanonicalSubscription["status"]) {
    return {
        unknown: 0,
        expired: 0,
        cancelled: 0,
        invoice: 1,
        price_change: 2,
        trial: 3,
        active: 4,
    }[status];
}

function statusForMessage(message: ImapDebugMessage): ImapCanonicalSubscription["status"] {
    const reasons = message.reasons.join(" ");
    const debugType = message.debug?.messageType ?? "";

    if (/cancellation|cancelled|canceled|-blocked: cancellation/i.test(debugType + reasons)) {
        return "cancelled";
    }

    if (/expired|reactivation/i.test(debugType + reasons)) {
        return "expired";
    }

    if (
        message.detected.isTrial &&
        !/subscription_continuation|payment_confirmation|charged|future charge|payment\/charged/i.test(
            debugType + reasons
        )
    ) {
        return "trial";
    }

    if (
        /subscription_continuation|payment_confirmation|subscription_active|renewal_notice/i.test(
            debugType
        ) ||
        /Tier A active|payment confirmation|future charge|subscription continuation|charged|payment\/charged|recurring\/renewal/i.test(
            reasons
        )
    ) {
        return "active";
    }

    if (message.detected.isTrial || /trial started|trial evidence/i.test(reasons)) {
        return "trial";
    }

    if (/active_price_change|price_change_active|price change/i.test(debugType + reasons)) {
        return "price_change";
    }

    if (/invoice|payment_due|recurring bill|eFaktura/i.test(debugType + reasons)) {
        return "invoice";
    }

    return "unknown";
}

function statusForGroup(group: ImapRecurringGroup): ImapCanonicalSubscription["status"] {
    if (/invoice|faktura|payment due|recurring/i.test(group.reasons.join(" "))) {
        return "invoice";
    }

    return "unknown";
}

function isZeroAmount(amount: string | undefined) {
    return Boolean(amount && /\b0+[,.]00\s?(?:pln|usd|eur|gbp|z[lł])?\b/i.test(amount));
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string) {
    const seen = new Set<string>();
    const result: T[] = [];

    for (const item of items) {
        const key = keyFor(item);

        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }

    return result;
}

function classifyAmountKind(context: string): Pick<AmountSemantics, "kind" | "confidence"> {
    const tests: Array<[AmountSemantics["kind"], number, RegExp]> = [
        ["credit_amount", 0.95, /\b(rrso|loan|credit|po[zż]yczka|pozyczka|kredyt|rata|raty|leasing|oprocentowanie)\b/i],
        ["savings", 0.95, /\b(save|savings|zaoszcz[eę]dzisz|zaoszczedzisz|oszcz[eę]dno[sś][cć]|oszczednosc|pozwoli[lł]aby ci zaoszcz[eę]dzi[cć])\b/i],
        ["one_time_purchase", 0.9, /\b(order|zam[oó]wienie|zamowienie|purchase|rental|wypo[zż]yczenie|wypozyczenie|jednorazowo|app purchase)\b/i],
        ["trial_then_price", 0.9, /\b(after trial|after your trial|po okresie pr[oó]bnym|po zak[oó]czeniu.*okresu pr[oó]bnego|trial ends.*then|zostanie naliczona op[lł]ata)\b/i],
        ["promo_price", 0.88, /\b(promo|promotional|special offer|oferta specjalna|promocj|cena promocyjna|pierwszy miesi[aą]c|pierwszy miesiac|przez kolejny okres|przez \d+ miesi)\b/i],
        ["regular_price", 0.86, /\b(regular price|standard price|cena regularna|po okresie promocji|po up[lł]ywie okresu promocji|after promotional period|after the promotional period|nast[eę]pnie|nastepnie|potem)\b/i],
        ["old_price", 0.86, /\b(old price|dotychczasowa cena|obecna cena|aktualna cena)\b/i],
        ["current_price", 0.84, /\b(current price|current plan price|aktualna cena|obecna cena)\b/i],
        ["new_price", 0.9, /\b(new price|nowa cena|zaktualizowana cena|updated price|cena zmieni si[eę] na|price will change to)\b/i],
        ["future_price", 0.88, /\b(future price|odnowiona w cenie|will renew at|b[eę]dzie obci[aą][zż]ana kwot[aą]|bedzie obciazana kwota|payment method will be charged|next renewal price)\b/i],
        ["due", 0.9, /\b(amount due|kwota do zap[lł]aty|do zap[lł]aty|invoice total|termin p[lł]atno[sś]ci|faktura na kwot[eę]|na kwot[eę].{0,80}dost[eę]pna)\b/i],
        ["charged", 0.88, /\b(charged|paid|payment processed|payment confirmation|pobrano|zap[lł]acono|p[lł]atno[sś][cć] zosta[lł]a zrealizowana|obci[aą][zż]yli[sś]my|zosta[lł]a naliczona op[lł]ata|payment method was charged)\b/i],
    ];

    for (const [kind, confidence, pattern] of tests) {
        if (pattern.test(context)) {
            return { kind, confidence };
        }
    }

    return { kind: "unknown", confidence: 0.3 };
}

function classifyAmountByImmediateContext(before: string, after: string): Pick<AmountSemantics, "kind" | "confidence"> | undefined {
    const left = cleanText(before);
    const right = cleanText(after);
    const both = `${left} ${right}`;
    const asciiLeft = left.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const asciiBoth = both.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (
        /(po zakonczeniu .{0,80}okresu probnego|after trial|after your trial|trial ends)/i.test(asciiBoth) &&
        /(zostanie naliczona oplata|will be charged|automatically renew|automatycznie odnawiane)/i.test(asciiBoth)
    ) {
        return { kind: "trial_then_price", confidence: 0.96 };
    }

    if (/(promo|promotional|special offer|oferta specjalna|promocj|promocyjna|rabat|discount|cena promocyjna)/i.test(asciiBoth)) {
        return { kind: "promo_price", confidence: 0.94 };
    }

    if (/(przez pierwszy miesiac|przez kolejny okres|przez \d+ miesi)/i.test(asciiBoth)) {
        return { kind: "promo_price", confidence: 0.92 };
    }

    if (/(po uplywie okresu promocji|po okresie promocji|after promotional period|after the promotional period)/i.test(asciiBoth)) {
        return { kind: "regular_price", confidence: 0.93 };
    }

    if (/(nowa cena(?: planu)?|new price|zaktualizowana cena|updated price|cena zmieni sie na|price will change to)\s*:?\s*$/i.test(asciiLeft)) {
        return { kind: "new_price", confidence: 0.97 };
    }

    if (/(aktualna cena(?: planu)?|obecna cena(?: planu)?|dotychczasowa cena|current price|current plan price|old price)\s*:?\s*$/i.test(asciiLeft)) {
        return { kind: "current_price", confidence: 0.95 };
    }

    if (/(cena pakietu|package price|plan price|monthly price)\s*:?\s*$/i.test(asciiLeft)) {
        return { kind: "regular_price", confidence: 0.9 };
    }

    if (/(zostala naliczona oplata w wysokosci|naliczona oplata w wysokosci|charged|payment method was charged|pobrano|zaplacono)\s*:?\s*$/i.test(asciiLeft)) {
        return { kind: "charged", confidence: 0.94 };
    }

    if (/(bedzie obciazana kwota|will be charged|will renew at|odnowiona w cenie)\s*:?\s*$/i.test(asciiLeft)) {
        return { kind: "future_price", confidence: 0.94 };
    }

    if (/(kwota do zaplaty|amount due|do zaplaty|invoice total)\s*:?\s*$/i.test(asciiLeft)) {
        return { kind: "due", confidence: 0.95 };
    }

    if (/(nowa cena|new price|zaktualizowana cena|updated price|cena zmieni si[eÄ™] na|price will change to)\s*:?\s*$/i.test(left)) {
        return { kind: "new_price", confidence: 0.96 };
    }

    if (/(aktualna cena|obecna cena|dotychczasowa cena|current price|current plan price|old price)\s*:?\s*$/i.test(left)) {
        return { kind: "current_price", confidence: 0.94 };
    }

    if (/(cena pakietu|package price|plan price|monthly price)\s*:?\s*$/i.test(left)) {
        return { kind: "regular_price", confidence: 0.88 };
    }

    if (/(zosta[lĹ‚]a naliczona op[lĹ‚]ata w wysoko[sĹ›]ci|charged|payment method was charged|pobrano|zap[lĹ‚]acono)\s*:?\s*$/i.test(left)) {
        return { kind: "charged", confidence: 0.92 };
    }

    if (/(b[eÄ™]dzie obci[aÄ…][zĹĽ]ana kwot[aÄ…]|bedzie obciazana kwota|will be charged|will renew at|odnowiona w cenie)\s*:?\s*$/i.test(left)) {
        return { kind: "future_price", confidence: 0.93 };
    }

    if (/(kwota do zap[lĹ‚]aty|amount due|do zap[lĹ‚]aty|invoice total)\s*:?\s*$/i.test(left)) {
        return { kind: "due", confidence: 0.94 };
    }

    if (/(promo|promotional|special offer|oferta specjalna|promocj|promocyjna|rabat|discount|cena promocyjna)/i.test(both)) {
        return { kind: "promo_price", confidence: 0.9 };
    }

    return undefined;
}

function normalizeAmount(raw: string) {
    return cleanText(raw).replace(/\s+/g, " ").trim();
}

function extractAmountSemantics(text: string) {
    const amountPattern = /(?:[$€£]\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP|z[lł]|\(?\s?brutto\s?\)?))/gi;
    const results: AmountSemantics[] = [];

    for (const match of text.matchAll(amountPattern)) {
        const raw = match[0];
        const index = match.index ?? 0;
        const before = text.slice(Math.max(0, index - 90), index);
        const after = text.slice(index + raw.length, Math.min(text.length, index + raw.length + 110));
        const context = cleanText(text.slice(Math.max(0, index - 140), Math.min(text.length, index + raw.length + 160)));
        const classification = classifyAmountByImmediateContext(before, after) ?? classifyAmountKind(context);

        results.push({
            raw: cleanText(raw),
            normalized: normalizeAmount(raw),
            kind: classification.kind,
            confidence: classification.confidence,
            context,
        });
    }

    return uniqueBy(results, (item) => `${item.raw}|${item.kind}|${item.context.slice(0, 40)}`);
}

function classifyDateKind(context: string): Pick<DateSemantics, "kind" | "confidence"> {
    const tests: Array<[DateSemantics["kind"], number, RegExp]> = [
        ["due_date", 0.9, /\b(termin p[lł]atno[sś]ci|due date|pay by|op[lł]acenie do|op[lł]aci[cć] do)\b/i],
        ["next_renewal_date", 0.9, /\b(next renewal|next billing date|nast[eę]pna data przed[lł]u[zż]enia|dzie[nń] rozliczeniowy|renewal date)\b/i],
        ["trial_end_date", 0.88, /\b(trial ends|koniec okresu pr[oó]bnego|po zako[nń]czeniu okresu pr[oó]bnego|trial end)\b/i],
        ["effective_date", 0.82, /\b(effective from|od dnia|wejdzie w [zż]ycie|wejdzie w zycie)\b/i],
        ["charged_date", 0.78, /\b(payment date|data p[lł]atno[sś]ci|charged on)\b/i],
        ["invoice_date", 0.72, /\b(invoice date|data faktury|wystawiono|wystawili[sś]my)\b/i],
    ];

    for (const [kind, confidence, pattern] of tests) {
        if (pattern.test(context)) {
            return { kind, confidence };
        }
    }

    return { kind: "unknown", confidence: 0.25 };
}

function extractDateSemantics(text: string) {
    const datePattern = /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})\b/g;
    const results: DateSemantics[] = [];

    for (const match of text.matchAll(datePattern)) {
        const raw = match[0];
        const index = match.index ?? 0;
        const context = cleanText(text.slice(Math.max(0, index - 120), Math.min(text.length, index + raw.length + 140)));
        const classification = classifyDateKind(context);

        results.push({
            raw: cleanText(raw),
            kind: classification.kind,
            confidence: classification.confidence,
            context,
        });
    }

    return uniqueBy(results, (item) => `${item.raw}|${item.kind}|${item.context.slice(0, 40)}`);
}

function firstAmountOfKind(semantics: AmountSemantics[], kinds: AmountSemantics["kind"][]) {
    return semantics
        .filter((item) => kinds.includes(item.kind) && !isZeroAmount(item.raw))
        .sort((a, b) => b.confidence - a.confidence)[0]?.raw;
}

function hasExplicitPromoContext(item: AmountSemantics) {
    const context = item.context.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return /\b(promo|promotional|special offer|oferta specjalna|promocj|promocyjna|rabat|discount|cena promocyjna|przez pierwszy miesiac|przez kolejny okres|przez \d+ miesi|po okresie promocji|po uplywie okresu promocji)\b/i.test(context);
}

function amountKindPriority(item: AmountSemantics) {
    const priority: Record<AmountSemantics["kind"], number> = {
        charged: 90,
        due: 80,
        new_price: 70,
        old_price: 63,
        current_price: 60,
        regular_price: 55,
        trial_then_price: 50,
        promo_price: hasExplicitPromoContext(item) ? 58 : 45,
        future_price: 40,
        unknown: 0,
        one_time_purchase: -10,
        savings: -20,
        credit_amount: -30,
    };

    return priority[item.kind] ?? 0;
}

function resolveAmountSemantics(semantics: AmountSemantics[]) {
    const byAmount = new Map<string, AmountSemantics>();

    for (const item of semantics) {
        const key = item.normalized ?? normalizeAmount(item.raw);
        const current = byAmount.get(key);

        if (
            !current ||
            amountKindPriority(item) > amountKindPriority(current) ||
            (amountKindPriority(item) === amountKindPriority(current) && item.confidence > current.confidence)
        ) {
            byAmount.set(key, item);
        }
    }

    return [...byAmount.values()];
}

function firstDateOfKind(semantics: DateSemantics[], kinds: DateSemantics["kind"][]) {
    return semantics
        .filter((item) => kinds.includes(item.kind))
        .sort((a, b) => b.confidence - a.confidence)[0]?.raw;
}

function chooseDisplayAmount(args: {
    status: ImapCanonicalSubscription["status"];
    amountSemantics: AmountSemantics[];
    latestAmount?: string;
    fallbackAmounts: string[];
}) {
    const { status, amountSemantics, latestAmount, fallbackAmounts } = args;
    const ignoredAmounts = amountSemantics
        .filter((item) => ["savings", "credit_amount", "one_time_purchase"].includes(item.kind))
        .map((item) => item.raw);

    if (status === "price_change") {
        const future = firstAmountOfKind(amountSemantics, ["new_price", "future_price"]);
        if (future) return { displayAmount: future, amountKind: "new_price" as const, ignoredAmounts };

        const current = firstAmountOfKind(amountSemantics, ["current_price", "old_price"]);

        if (latestAmount && !isZeroAmount(latestAmount) && latestAmount !== current) {
            return { displayAmount: latestAmount, amountKind: "new_price" as const, ignoredAmounts };
        }

        const fallbackFuture = fallbackAmounts.find((item) => !isZeroAmount(item) && item !== current);

        if (fallbackFuture) {
            return { displayAmount: fallbackFuture, amountKind: "new_price" as const, ignoredAmounts };
        }
    }

    const promo = firstAmountOfKind(amountSemantics, ["promo_price"]);
    if (promo) return { displayAmount: promo, amountKind: "promo_price" as const, ignoredAmounts };

    if (status === "trial") {
        const trialThen = firstAmountOfKind(amountSemantics, ["trial_then_price", "future_price"]);
        if (trialThen) return { displayAmount: trialThen, amountKind: "trial_then_price" as const, ignoredAmounts };
    }

    const due = firstAmountOfKind(amountSemantics, ["due"]);
    if (due) return { displayAmount: due, amountKind: "due" as const, ignoredAmounts };

    const charged = firstAmountOfKind(amountSemantics, ["charged"]);
    if (charged) return { displayAmount: charged, amountKind: "charged" as const, ignoredAmounts };

    const regular = firstAmountOfKind(amountSemantics, ["regular_price"]);
    if (regular) return { displayAmount: regular, amountKind: "regular_price" as const, ignoredAmounts };

    if (latestAmount && !isZeroAmount(latestAmount)) {
        return { displayAmount: latestAmount, amountKind: "unknown" as const, ignoredAmounts };
    }

    const fallback = fallbackAmounts.find((item) => !isZeroAmount(item));
    return { displayAmount: fallback, amountKind: fallback ? "unknown" as const : undefined, ignoredAmounts };
}

type AmountContext = {
    currentAmount?: string;
    latestAmount?: string;
    futureAmount?: string;
    promoAmount?: string;
    regularAmount?: string;
    invoiceDueAmount?: string;
    billingDateText?: string;
    nextBillingDateText?: string;
    trialEndDateText?: string;
};

function amountPatternSource() {
    return String.raw`(?:[$€£]\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP|z[lł]))`;
}

function firstCleanMatch(text: string, pattern: RegExp) {
    return cleanText(text.match(pattern)?.[1] ?? "");
}

function extractDateLikeText(text: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
        const value = firstCleanMatch(text, pattern);

        if (value) {
            return value;
        }
    }

    return undefined;
}

function extractAmountContextFromText(text: string): AmountContext {
    const amount = amountPatternSource();
    const currentAmount =
        firstCleanMatch(text, new RegExp(`(?:aktualna cena planu|current price)\\s*:?\\s*(${amount})`, "i")) ||
        undefined;
    const futureAmount =
        firstCleanMatch(text, new RegExp(`(?:nowa cena planu|new price|updated price)\\s*:?\\s*(${amount})`, "i")) ||
        firstCleanMatch(text, new RegExp(`(?:zostanie automatycznie odnowiona w cenie|regular price|after the promotional period|po up[lł]ywie okresu promocji)[\\s\\S]{0,80}?(${amount})`, "i")) ||
        undefined;
    const promoAmount =
        firstCleanMatch(text, new RegExp(`(?:oferta specjalna|special offer|promo|promocj|promocyjn|kwot[aą])?[\\s\\S]{0,80}?(${amount})[\\s\\S]{0,80}?(?:przez kolejny okres|1 miesi[aą]c|one month|special offer|promo|promocj)`, "i")) ||
        undefined;
    const regularAmount =
        firstCleanMatch(text, new RegExp(`(?:regular price|regularna cena|po up[lł]ywie okresu promocji|after the promotional period|zostanie automatycznie odnowiona w cenie)[\\s\\S]{0,100}?(${amount})`, "i")) ||
        undefined;
    const invoiceDueAmount =
        firstCleanMatch(text, new RegExp(`(?:kwota do zap[lł]aty|amount due)\\s*:?\\s*(${amount})`, "i")) ||
        firstCleanMatch(text, new RegExp(`na kwot[eę]\\s*(${amount})`, "i")) ||
        undefined;
    const nextBillingDateText = extractDateLikeText(text, [
        /(?:nast[eę]pna data przed[lł]u[zż]enia|next billing date|next renewal date)\s*:?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4}|[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\s+\d{1,2},?\s+\d{4})/i,
        /w dniu rozliczeniowym\s*:?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i,
    ]);
    const billingDateText = extractDateLikeText(text, [
        /(?:termin p[lł]atno[sś]ci|due date)\s*:?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i,
        /(?:dzie[nń] rozliczeniowy|billing date)\s*:?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i,
    ]);

    return {
        currentAmount,
        futureAmount,
        promoAmount,
        regularAmount,
        invoiceDueAmount,
        billingDateText,
        nextBillingDateText,
    };
}

function mergeAmountContexts(contexts: AmountContext[]) {
    return contexts.reduce<AmountContext>((merged, context) => ({
        currentAmount: context.currentAmount ?? merged.currentAmount,
        latestAmount: context.latestAmount ?? merged.latestAmount,
        futureAmount: context.futureAmount ?? merged.futureAmount,
        promoAmount: context.promoAmount ?? merged.promoAmount,
        regularAmount: context.regularAmount ?? merged.regularAmount,
        invoiceDueAmount: context.invoiceDueAmount ?? merged.invoiceDueAmount,
        billingDateText: context.billingDateText ?? merged.billingDateText,
        nextBillingDateText: context.nextBillingDateText ?? merged.nextBillingDateText,
        trialEndDateText: context.trialEndDateText ?? merged.trialEndDateText,
    }), {});
}

function selectCanonicalAmount(
    status: ImapCanonicalSubscription["status"],
    messages: ImapDebugMessage[],
    amounts: string[],
    context: AmountContext
) {
    if (status === "price_change" && context.futureAmount) {
        return {
            amount: context.futureAmount,
            amountKind: "future" as const,
        };
    }

    if (context.promoAmount) {
        return {
            amount: context.promoAmount,
            amountKind: "promo" as const,
        };
    }

    if (context.invoiceDueAmount) {
        return {
            amount: context.invoiceDueAmount,
            amountKind: "invoice_due" as const,
        };
    }

    const datedAmounts = messages
        .filter((message) => message.detected.amountText && !isZeroAmount(message.detected.amountText))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .map((message) => message.detected.amountText)
        .filter((amount): amount is string => Boolean(amount));

    if (datedAmounts[0]) {
        return {
            amount: datedAmounts[0],
            amountKind: status === "invoice" ? "invoice_due" as const : "latest" as const,
        };
    }

    if (context.futureAmount) {
        return {
            amount: context.futureAmount,
            amountKind: "future" as const,
        };
    }

    if (context.regularAmount) {
        return {
            amount: context.regularAmount,
            amountKind: "regular" as const,
        };
    }

    const fallback = amounts.find((value) => !isZeroAmount(value));

    return {
        amount: fallback,
        amountKind: fallback ? "unknown" as const : undefined,
    };
}

function evidenceTypesForMessage(message: ImapDebugMessage) {
    const evidence = new Set<string>();
    const reasons = message.reasons.join(" ");
    const debugType = message.debug?.messageType;

    if (debugType) {
        evidence.add(debugType.replace(/_/g, " "));
    }

    if (message.detected.isTrial || /trial/i.test(reasons)) {
        evidence.add("trial started");
    }

    if (/subscription continuation|future charge|will be charged|payment method will be charged/i.test(reasons)) {
        evidence.add("subscription continuation/future charge");
    }

    if (/marketplace billing channel/i.test(reasons)) {
        const channel = extractBillingChannel(message);
        evidence.add(`marketplace billing channel: ${channel ?? "unknown"}`);
    }

    if (/invoice|recurring bill/i.test(reasons)) {
        evidence.add("invoice/recurring bill");
    }

    if (/price change/i.test(reasons)) {
        evidence.add("active price change");
    }

    return [...evidence];
}

function buildCanonicalSubscriptions(
    debugMessages: ImapDebugMessage[],
    recurringGroups: ImapRecurringGroup[]
) {
    type Draft = {
        key: string;
        provider?: string;
        displayName?: string;
        billingChannel?: string;
        category?: string;
        confidence: number;
        statuses: ImapCanonicalSubscription["status"][];
        billingCycles: Array<{ value: string; date: string }>;
        amountMessages: ImapDebugMessage[];
        amounts: string[];
        dates: string[];
        messageIds: string[];
        subjects: string[];
        senders: string[];
        evidence: string[];
        reasons: string[];
        groupCadences: ImapRecurringGroup["cadence"][];
        sourceMessages: ImapDebugMessage[];
        sourceTypes: string[];
        amountSemantics: AmountSemantics[];
        dateSemantics: DateSemantics[];
    };
    const drafts = new Map<string, Draft>();

    const getDraft = (key: string): Draft => {
        const existing = drafts.get(key);

        if (existing) {
            return existing;
        }

        const created: Draft = {
            key,
            confidence: 0,
            statuses: [],
            billingCycles: [],
            amountMessages: [],
            amounts: [],
            dates: [],
            messageIds: [],
            subjects: [],
            senders: [],
            evidence: [],
            reasons: [],
            groupCadences: [],
            sourceMessages: [],
            sourceTypes: [],
            amountSemantics: [],
            dateSemantics: [],
        };
        drafts.set(key, created);
        return created;
    };

    for (const message of debugMessages.filter((item) => item.isCandidate)) {
        if (/onboarding_only|marketing_offer|one_time_purchase|recommendation/i.test(message.debug?.messageType ?? "")) {
            continue;
        }

        const key = canonicalKeyForMessage(message);
        const draft = getDraft(key);
        const billingChannel = extractBillingChannel(message);

        draft.provider ??= message.detected.provider ?? message.debug?.provider;
        draft.displayName ??=
            message.detected.name ??
            message.detected.provider ??
            message.debug?.name ??
            message.debug?.provider;
        draft.billingChannel ??= isMarketplaceChannel(billingChannel) ? billingChannel : undefined;
        draft.category ??= message.debug?.category;
        draft.confidence = Math.max(draft.confidence, message.confidence);
        draft.statuses.push(statusForMessage(message));
        draft.dates.push(message.date);
        draft.messageIds.push(message.id);
        draft.subjects.push(message.subject);
        draft.senders.push(message.from);
        draft.sourceMessages.push(message);
        draft.sourceTypes.push(message.source, message.debug?.messageType ?? "message");
        draft.reasons.push(...message.reasons);
        draft.evidence.push(...evidenceTypesForMessage(message));
        draft.amountSemantics.push(
            ...extractAmountSemantics(`${message.subject} ${message.snippet} ${message.reasons.join(" ")}`)
        );
        draft.dateSemantics.push(
            ...extractDateSemantics(`${message.subject} ${message.snippet}`)
        );

        if (message.detected.billingCycle) {
            draft.billingCycles.push({
                value: message.detected.billingCycle,
                date: message.date,
            });
        }

        if (message.detected.amountText) {
            draft.amounts.push(message.detected.amountText);
            draft.amountMessages.push(message);
        }
    }

    for (const group of recurringGroups.filter(
        (item) => item.isRecurringCandidate && item.confidence >= 0.75
    )) {
        const key = canonicalKeyForGroup(group);
        const draft = getDraft(key);

        draft.provider ??= group.provider;
        draft.displayName ??= group.suggestedName;
        draft.confidence = Math.max(draft.confidence, group.confidence);
        draft.statuses.push(statusForGroup(group));
        draft.dates.push(group.firstDate, group.lastDate);
        draft.messageIds.push(...group.messageIds);
        draft.subjects.push(...group.sampleSubjects);
        draft.senders.push(group.fromSample);
        draft.amounts.push(...group.amounts);
        draft.reasons.push(...group.reasons, "representative of recurring group");
        draft.evidence.push(...group.reasons);
        draft.groupCadences.push(group.cadence);
        draft.sourceTypes.push("recurring_group");
        draft.amountSemantics.push(
            ...extractAmountSemantics(
                `${group.sampleSubjects.join(" ")} ${group.sampleSnippets.join(" ")} ${group.amounts.join(" ")}`
            )
        );
        draft.dateSemantics.push(
            ...extractDateSemantics(`${group.sampleSubjects.join(" ")} ${group.sampleSnippets.join(" ")}`)
        );

        if (group.cadence === "monthly") {
            draft.billingCycles.push({
                value: "monthly",
                date: group.lastDate,
            });
        }

        const matchingMessages = debugMessages.filter((message) =>
            group.messageIds.includes(message.id)
        );
        draft.sourceMessages.push(...matchingMessages);
        draft.amountMessages.push(...matchingMessages.filter((message) => message.detected.amountText));
    }

    return [...drafts.values()]
        .filter((draft) => draft.messageIds.length > 0)
        .map((draft): ImapCanonicalSubscription => {
            const uniqueMessageIds = [...new Set(draft.messageIds)];
            const uniqueAmounts = [...new Set(draft.amounts)].slice(0, 10);
            const sortedDates = draft.dates
                .filter(Boolean)
                .sort((a, b) => Date.parse(a) - Date.parse(b));
            const sortedCycles = draft.billingCycles.sort(
                (a, b) => Date.parse(b.date) - Date.parse(a.date)
            );
            const status = draft.statuses.reduce(
                (best, current) =>
                    statusRank(current) > statusRank(best) ? current : best,
                "unknown" as ImapCanonicalSubscription["status"]
            );
            const confidence = Math.min(
                1,
                draft.confidence + Math.min(uniqueMessageIds.length - 1, 3) * 0.05
            );
            const uniqueAmountSemantics = resolveAmountSemantics(
                uniqueBy(
                    draft.amountSemantics,
                    (item) => `${item.raw}|${item.kind}|${item.context.slice(0, 60)}`
                )
            ).slice(0, 20);
            const uniqueDateSemantics = uniqueBy(
                draft.dateSemantics,
                (item) => `${item.raw}|${item.kind}|${item.context.slice(0, 60)}`
            ).slice(0, 20);
            const latestAmount = draft.amountMessages
                .filter((message) => message.detected.amountText && !isZeroAmount(message.detected.amountText))
                .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]
                ?.detected.amountText;
            const amountChoice = chooseDisplayAmount({
                status,
                amountSemantics: uniqueAmountSemantics,
                latestAmount,
                fallbackAmounts: uniqueAmounts,
            });
            const chargedAmount = firstAmountOfKind(uniqueAmountSemantics, ["charged"]);
            const dueAmount = firstAmountOfKind(uniqueAmountSemantics, ["due"]);
            const currentAmount = firstAmountOfKind(uniqueAmountSemantics, ["current_price", "old_price"]);
            const futureAmount = firstAmountOfKind(uniqueAmountSemantics, ["new_price", "future_price", "trial_then_price"]);
            const promoAmount = firstAmountOfKind(uniqueAmountSemantics, ["promo_price"]);
            const regularAmount = firstAmountOfKind(uniqueAmountSemantics, ["regular_price"]);
            const trialThenAmount = firstAmountOfKind(uniqueAmountSemantics, ["trial_then_price"]);
            const statusReason =
                status === "active"
                    ? "active payment, continuation, renewal, or invoice evidence"
                    : status === "trial"
                    ? "trial evidence without later active payment/continuation"
                    : status === "price_change"
                    ? "active price-change evidence"
                    : status === "invoice"
                    ? "invoice or recurring bill evidence"
                    : undefined;

            return {
                subscriptionKey: draft.key,
                displayName:
                    draft.displayName ??
                    draft.provider ??
                    titleFromSubjectFamily(draft.key) ??
                    draft.key,
                provider: draft.provider,
                billingChannel: draft.billingChannel,
                category: draft.category,
                confidence,
                status,
                billingCycle: sortedCycles[0]?.value,
                amount: amountChoice.displayAmount,
                displayAmount: amountChoice.displayAmount,
                chargedAmount,
                dueAmount,
                currentAmount,
                latestAmount,
                futureAmount,
                promoAmount,
                regularAmount,
                trialThenAmount,
                ignoredAmounts: [...new Set(amountChoice.ignoredAmounts)].slice(0, 10),
                amountKind: amountChoice.amountKind,
                dueDateText: firstDateOfKind(uniqueDateSemantics, ["due_date"]),
                billingDateText: firstDateOfKind(uniqueDateSemantics, ["charged_date", "invoice_date"]),
                nextBillingDateText: firstDateOfKind(uniqueDateSemantics, ["next_renewal_date"]),
                nextRenewalDateText: firstDateOfKind(uniqueDateSemantics, ["next_renewal_date"]),
                trialEndDateText:
                    draft.sourceMessages
                        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                        .find((message) => message.detected.trialEndDateText)?.detected.trialEndDateText ??
                    firstDateOfKind(uniqueDateSemantics, ["trial_end_date"]),
                effectiveDateText: firstDateOfKind(uniqueDateSemantics, ["effective_date"]),
                amountSemantics: uniqueAmountSemantics,
                dateSemantics: uniqueDateSemantics,
                sourceTypes: [...new Set(draft.sourceTypes)].slice(0, 10),
                statusReason,
                amounts: uniqueAmounts,
                firstSeen: sortedDates[0] ?? "",
                lastSeen: sortedDates[sortedDates.length - 1] ?? "",
                messageCount: uniqueMessageIds.length,
                sourceMessageIds: uniqueMessageIds,
                sourceSubjects: [...new Set(draft.subjects)].slice(0, 6),
                sourceSenders: [...new Set(draft.senders)].slice(0, 6),
                evidenceTypes: [...new Set(draft.evidence)].slice(0, 12),
                reasons: [...new Set(draft.reasons)].slice(0, 14),
            };
        })
        .sort(
            (a, b) =>
                b.confidence - a.confidence ||
                Date.parse(b.lastSeen) - Date.parse(a.lastSeen)
        );
}

function buildRecurringGroups(debugMessages: ImapDebugMessage[]) {
    const grouped = new Map<string, ImapDebugMessage[]>();

    for (const message of debugMessages) {
        const subjectFamily = normalizeSubjectFamily(message.subject);

        if (!subjectFamily) {
            continue;
        }

        const domain = extractSenderDomain(message.from);
        const key = `${domain}|${subjectFamily}`;
        grouped.set(key, [...(grouped.get(key) ?? []), message]);
    }

    const groups: ImapRecurringGroup[] = [];

    for (const [groupKey, messages] of grouped.entries()) {
        if (messages.length < 2) {
            continue;
        }

        const [domain, subjectFamily] = groupKey.split("|");
        const sortedMessages = [...messages].sort(
            (a, b) => Date.parse(a.date) - Date.parse(b.date)
        );
        const cadence = detectCadence(sortedMessages);
        const evidenceMessages = sortedMessages.filter(hasRecurringGroupEvidence)
            .length;
        const candidateMessages = sortedMessages.filter((message) => message.isCandidate)
            .length;
        const invoiceLike = isInvoiceLikeFamily(subjectFamily, sortedMessages);
        const strongEfakturaFamily = isStrongEfakturaFamily(subjectFamily);
        const blockedNoise = isOneTimeOrNoiseGroup(sortedMessages, subjectFamily);
        const hasEnoughEvidenceForSmallGroup =
            sortedMessages.length > 2 || invoiceLike || candidateMessages >= 1;
        const isRecurringCandidate =
            !blockedNoise &&
            hasEnoughEvidenceForSmallGroup &&
            evidenceMessages >= 2 &&
            (cadence !== "unknown" ||
                invoiceLike ||
                (strongEfakturaFamily && sortedMessages.length >= 3));
        const reasons: string[] = [];

        if (evidenceMessages >= 2) {
            reasons.push("repeated similar invoice/payment-like emails");
        }

        if (cadence !== "unknown") {
            reasons.push(`${cadence} cadence`);
        }

        if (invoiceLike) {
            reasons.push("invoice/payment due subject or body evidence");
        }

        if (strongEfakturaFamily) {
            reasons.push("strong eFaktura subject family");
        }

        if (candidateMessages > 0) {
            reasons.push(`${candidateMessages} message-level candidates in group`);
        }

        if (blockedNoise) {
            reasons.push("excluded ecommerce/transport/newsletter/security-like group");
        }

        const amounts = [
            ...new Set(
                sortedMessages.flatMap((message) => [
                    ...(message.detected.amountText ? [message.detected.amountText] : []),
                    ...extractAmounts(`${message.subject} ${message.snippet}`),
                ])
            ),
        ].slice(0, 12);
        const provider =
            sortedMessages.find((message) => message.detected.provider)?.detected
                .provider ?? inferProviderFromGroup(sortedMessages, subjectFamily);
        const suggestedName =
            provider ??
            titleFromSubjectFamily(subjectFamily) ??
            extractEmailAddress(sortedMessages[0].from);
        const confidence = Math.max(
            0,
            Math.min(
                1,
                0.35 +
                Math.min(sortedMessages.length, 5) * 0.08 +
                evidenceMessages * 0.1 +
                (cadence === "monthly" ? 0.2 : cadence === "weekly" ? 0.1 : 0) +
                (invoiceLike ? 0.15 : 0) +
                (strongEfakturaFamily ? 0.1 : 0) -
                (blockedNoise ? 0.7 : 0)
            )
        );
        const firstDate = sortedMessages[0].date;
        const lastDate = sortedMessages[sortedMessages.length - 1].date;

        groups.push({
            groupKey,
            suggestedName,
            confidence,
            cadence,
            count: sortedMessages.length,
            firstDate,
            lastDate,
            amounts,
            provider,
            domain,
            fromSample: sortedMessages[0].from,
            sampleSubjects: [
                ...new Set(sortedMessages.map((message) => message.subject)),
            ].slice(0, 3),
            sampleSnippets: sortedMessages
                .slice(-2)
                .map((message) => sanitizeSampleSnippet(message.snippet)),
            messageIds: sortedMessages.map((message) => message.id),
            candidateMessages,
            evidenceMessages,
            reasons,
            isRecurringCandidate,
        });
    }

    return groups.sort(
        (a, b) => b.confidence - a.confidence || b.count - a.count
    );
}

function addReviewSignal(
    signals: string[],
    text: string,
    pattern: RegExp,
    label: string
) {
    if (pattern.test(text) && !signals.includes(label)) {
        signals.push(label);
    }
}

function blockedReasonForMessage(message: ImapDebugMessage) {
    return message.reasons.find((reason) => /^-blocked:/i.test(reason));
}

function reviewKeyForMessage(message: ImapDebugMessage) {
    const providerOrName = cleanText(
        message.detected.provider ??
        message.detected.name ??
        ""
    ).toLowerCase();
    const domain = extractSenderDomain(message.from);
    const subjectFamily = normalizeSubjectFamily(message.subject);

    return `${providerOrName || domain}|${domain}|${subjectFamily}`;
}

function scoreReviewCandidate(message: ImapDebugMessage) {
    const text = cleanText(
        [
            message.from,
            message.subject,
            message.snippet,
            message.reasons.join(" "),
            message.detected.provider,
            message.detected.name,
        ]
            .filter(Boolean)
            .join(" ")
    ).toLowerCase();
    const asciiText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const reviewSignals: string[] = [];
    const riskSignals: string[] = [];
    const hasStrongActiveBillingEvidence =
        !/\b(will not be charged|not be charged|no further charges|subscription has been canceled|subscription has been cancelled|bez subskrypcji|no subscription renewal|does not renew|not a subscription)\b/i.test(asciiText) &&
        /\b(payment method will be charged|your payment method will be charged|will automatically renew|automatically renews|subscription will renew|next billing|next renewal|charged|payment confirmation|invoice|amount due|kwota do zaplaty|termin platnosci|metoda platnosci .*bedzie obciazana|zostanie naliczona oplata|automatycznie odnawiane|automatycznie przedluzana|kontynuujac subskrypcje)\b/i.test(asciiText);

    addReviewSignal(
        reviewSignals,
        text,
        /\b(primevideo\.com|amazon\.(pl|com|de|co\.uk)|googleplay-noreply@google\.com|payments-noreply@google\.com|email\.apple\.com|paypal\.com|stripe\.com|autopay\.pl|tpay\.com|payu\.com|przelewy24\.pl)\b/i,
        "trusted marketplace or billing domain"
    );
    addReviewSignal(
        reviewSignals,
        text,
        /\b(subscription|subskrypcja|abonament|membership|plan|premium|plus|pro|renewal|odnawianie|przed[lł]u[zż]enie|przedluzenie)\b/i,
        "subscription/service keyword"
    );
    addReviewSignal(
        reviewSignals,
        text,
        /\b(your subscription|twoja subskrypcja|current subscriber|active subscriber|aktualny klient|kontynuuj[aą]c subskrypcj[eę]|kontynuujac subskrypcje)\b/i,
        "active customer/subscriber hint"
    );
    addReviewSignal(
        reviewSignals,
        text,
        /\b(charged|obci[aą][zż]ona|obciazona|payment method|metoda p[lł]atno[sś]ci|next billing|nast[eę]pne rozliczenie|renewal date|data odnowienia|nast[eę]pna data przed[lł]u[zż]enia|platnosc zostala zrealizowana|p[lł]atno[sś][cć] zosta[lł]a zrealizowana)\b/i,
        "billing/renewal hint"
    );
    addReviewSignal(
        reviewSignals,
        text,
        /\b(faktura|rachunek|kwota do zap[lł]aty|kwota do zaplaty|termin p[lł]atno[sś]ci|termin platnosci|ebok|eboa|e-bok|panel klienta)\b/i,
        "invoice/utility hint"
    );
    addReviewSignal(
        reviewSignals,
        text,
        /\b(prime video|google play|app store|apple|paypal automatic payment|stripe invoice|przelewy24|payu|autopay|tpay|merchant|odbiorca|us[lł]ugodawca|uslugodawca)\b/i,
        "marketplace or processor hint"
    );

    if (message.detected.provider || message.detected.name) {
        reviewSignals.push("detected provider/name present");
    }

    addReviewSignal(
        riskSignals,
        text,
        /\b(security|login|password|verification code|kod|has[lł]o|reset has[lł]a|sign in|nowe logowanie)\b/i,
        "security/login/code"
    );
    addReviewSignal(
        riskSignals,
        text,
        /\b(newsletter|recommendation|recommended|polecamy|polecane|watch now|obejrzyj teraz|specjalnie dla ciebie|na podstawie ogl[aą]danych)\b/i,
        "newsletter/recommendation"
    );
    addReviewSignal(
        riskSignals,
        text,
        /\b(order|zam[oó]wienie|zamowienie|purchase|rental|wypo[zż]yczenie|wypozyczenie|one-time|jednorazowo|receipt for ride|uber eats order|bilet|ticket)\b/i,
        "one-time purchase/order/rental"
    );
    addReviewSignal(
        riskSignals,
        text,
        /\b(marketing|upsell|oferta|promocja|sprawd[zź] ofert[eę]|wypr[oó]buj|try free|korzystaj taniej|zaoszcz[eę]dzisz|benefit|unlock benefits)\b/i,
        "marketing/upsell without active billing"
    );
    addReviewSignal(
        riskSignals,
        text,
        /\b(rrso|po[zż]yczka|pozyczka|kredyt|leasing|rata|raty|oprocentowanie|ca[lł]kowita kwota kredytu|calkowita kwota kredytu)\b/i,
        "loan/credit/leasing"
    );
    addReviewSignal(
        riskSignals,
        text,
        /\b(expired|cancelled|canceled|anulowano|wygas[lł]a|wygasla|reactivation|reaktywuj|zwrot|refund|no further charges)\b/i,
        "expired/cancelled/reactivation/refund"
    );
    addReviewSignal(
        riskSignals,
        text,
        /suspicious sender|suspicious domain|spoof/i,
        "suspicious sender domain"
    );
    addReviewSignal(
        riskSignals,
        text,
        /^received:|received-spf|authentication-results|dkim-signature/i,
        "raw-header-only body"
    );
    addReviewSignal(
        riskSignals,
        asciiText,
        /\b(work profile|business profile|profil sluzbowy|profil biznesowy|credits|kredyty)\b/i,
        "work/business profile or credits marketing"
    );
    addReviewSignal(
        riskSignals,
        asciiText,
        /\b(dlc|game|add-on|addon|playstation store|xbox store|nintendo|steam|epic games|movie rental|prime video zamowienie)\b/i,
        "game/DLC/store purchase or rental"
    );

    const positiveWeight = reviewSignals.reduce((score, signal) => {
        if (/billing|invoice|active customer|marketplace|trusted/i.test(signal)) {
            return score + 0.18;
        }

        if (/subscription|detected provider/i.test(signal)) {
            return score + 0.12;
        }

        return score + 0.08;
    }, 0);
    const riskWeight = riskSignals.reduce((score, signal) => {
        if (/security|loan|one-time|suspicious|raw-header/i.test(signal)) {
            return score + 0.18;
        }

        return score + 0.1;
    }, 0);
    const blockedReason = blockedReasonForMessage(message);
    const blockedAuditBonus =
        blockedReason && reviewSignals.some((signal) => /billing|invoice|active customer|marketplace/i.test(signal))
            ? 0.12
            : 0;
    let score = Math.max(
        0,
        Math.min(1, message.confidence * 0.45 + positiveWeight + blockedAuditBonus - riskWeight)
    );

    if (riskSignals.some((signal) => /raw-header-only body/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /expired|cancelled|reactivation|refund/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /one-time purchase|order|rental/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /security|login|work\/business profile|credits marketing|game\/dlc|store purchase/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /marketing\/upsell/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    return {
        score,
        blockedReason,
        reviewSignals,
        riskSignals,
        positiveWeight,
        riskWeight,
        hasStrongActiveBillingEvidence,
    };
}

function buildReviewCandidates(
    debugMessages: ImapDebugMessage[],
    canonicalSubscriptions: ImapCanonicalSubscription[] = []
) {
    const deduped = new Map<string, ImapReviewCandidate>();
    const canonicalProviderKeys = new Set(
        canonicalSubscriptions
            .flatMap((subscription) => [
                subscription.provider?.toLowerCase(),
                subscription.displayName?.toLowerCase(),
            ])
            .filter((item): item is string => Boolean(item))
    );

    for (const message of debugMessages.filter((item) => !item.isCandidate)) {
        const scored = scoreReviewCandidate(message);

        if (scored.reviewSignals.length === 0) {
            continue;
        }

        if (scored.positiveWeight < 0.25 && scored.riskWeight > 0) {
            continue;
        }

        if (scored.score < 0.45) {
            continue;
        }

        const messageProviderKeys = [
            message.detected.provider?.toLowerCase(),
            message.detected.name?.toLowerCase(),
        ].filter((item): item is string => Boolean(item));

        if (
            messageProviderKeys.some((key) => canonicalProviderKeys.has(key)) &&
            scored.score < 0.75 &&
            !scored.hasStrongActiveBillingEvidence
        ) {
            continue;
        }

        const reviewKey = reviewKeyForMessage(message);
        const candidate: ImapReviewCandidate = {
            id: message.id,
            reviewKey,
            reviewScore: Number(scored.score.toFixed(2)),
            from: message.from,
            subject: message.subject,
            date: message.date,
            snippet: sanitizeSampleSnippet(message.snippet),
            detectedProvider: message.detected.provider,
            detectedName: message.detected.name,
            blockedReason: scored.blockedReason,
            isCandidate: message.isCandidate,
            confidence: message.confidence,
            reasons: message.reasons,
            reviewSignals: scored.reviewSignals,
            riskSignals: scored.riskSignals,
        };
        const previous = deduped.get(reviewKey);

        if (
            !previous ||
            candidate.reviewScore > previous.reviewScore ||
            (candidate.reviewScore === previous.reviewScore &&
                Date.parse(candidate.date) > Date.parse(previous.date))
        ) {
            deduped.set(reviewKey, candidate);
        }
    }

    return [...deduped.values()].sort(
        (a, b) => b.reviewScore - a.reviewScore || Date.parse(b.date) - Date.parse(a.date)
    );
}

function printHumanSummary(result: ImapScanSpikeResult, config: ImapSpikeConfig) {
    console.log("IMAP scan summary:");
    console.log(`mailbox: ${result.mailbox}`);
    console.log(`scannedMessages: ${result.scannedMessages}`);
    console.log(`candidatesFound: ${result.candidatesFound}`);
    console.log(`rejectedMessages: ${result.rejectedMessages}`);
    console.log("");

    console.log("Canonical subscriptions:");

    if (result.canonicalSubscriptions.length === 0) {
        console.log("none");
    }

    result.canonicalSubscriptions.slice(0, 30).forEach((subscription, index) => {
        console.log("");
        console.log(`${index + 1}. ${subscription.displayName}`);
        console.log(`   confidence: ${subscription.confidence.toFixed(2)}`);
        console.log(`   status: ${subscription.status}`);
        optionalLine("provider", subscription.provider);
        optionalLine("billingChannel", subscription.billingChannel);
        optionalLine("category", subscription.category);
        optionalLine("billingCycle", subscription.billingCycle);
        optionalLine("amount", subscription.amount);
        optionalLine("amountKind", subscription.amountKind);
        optionalLine("chargedAmount", subscription.chargedAmount);
        optionalLine("dueAmount", subscription.dueAmount);
        optionalLine("currentAmount", subscription.currentAmount);
        optionalLine("futureAmount", subscription.futureAmount);
        optionalLine("promoAmount", subscription.promoAmount);
        optionalLine("regularAmount", subscription.regularAmount);
        optionalLine("trialThenAmount", subscription.trialThenAmount);
        optionalLine("latestAmount", subscription.latestAmount);
        optionalLine("amounts", subscription.amounts.join(", "));
        optionalLine("dueDateText", subscription.dueDateText);
        optionalLine("nextRenewalDateText", subscription.nextRenewalDateText);
        optionalLine("trialEndDateText", subscription.trialEndDateText);
        optionalLine("effectiveDateText", subscription.effectiveDateText);
        optionalLine("statusReason", subscription.statusReason);
        console.log(`   messages: ${subscription.messageCount}`);
        optionalLine("firstSeen", subscription.firstSeen.slice(0, 10));
        optionalLine("lastSeen", subscription.lastSeen.slice(0, 10));

        if (subscription.sourceSubjects.length > 0) {
            console.log("   source subjects:");

            for (const subject of subscription.sourceSubjects.slice(0, 4)) {
                console.log(`   - ${subject}`);
            }
        }

        if (subscription.evidenceTypes.length > 0) {
            console.log("   evidence:");

            for (const evidence of subscription.evidenceTypes.slice(0, 6)) {
                console.log(`   - ${evidence}`);
            }
        }
    });

    console.log("");

    if (config.showReviewCandidates) {
        const reviewCandidates = result.reviewCandidates.slice(0, config.reviewLimit);

        console.log("Review candidates / possible missed subscriptions:");

        if (reviewCandidates.length === 0) {
            console.log("none");
        }

        reviewCandidates.forEach((candidate, index) => {
            console.log("");
            console.log(`${index + 1}. ${candidate.detectedName ?? candidate.detectedProvider ?? candidate.subject}`);
            console.log(`   reviewScore: ${candidate.reviewScore.toFixed(2)}`);
            console.log(`   detectionConfidence: ${candidate.confidence.toFixed(2)}`);
            optionalLine("provider", candidate.detectedProvider);
            optionalLine("name", candidate.detectedName);
            optionalLine("blockedReason", candidate.blockedReason);
            optionalLine("from", candidate.from);
            optionalLine("subject", candidate.subject);
            optionalLine("date", candidate.date);
            optionalLine("snippet", candidate.snippet);
            console.log("   reviewSignals:");

            for (const signal of candidate.reviewSignals.slice(0, 8)) {
                console.log(`   - ${signal}`);
            }

            if (candidate.riskSignals.length > 0) {
                console.log("   riskSignals:");

                for (const signal of candidate.riskSignals.slice(0, 6)) {
                    console.log(`   - ${signal}`);
                }
            }
        });

        console.log("");
    }

    const strongRecurringGroups = result.recurringGroups.filter(
        (group) =>
            group.isRecurringCandidate &&
            group.confidence >= 0.75 &&
            group.count >= 3 &&
            (group.cadence !== "unknown" ||
                isStrongEfakturaFamily(group.groupKey.split("|")[1] ?? ""))
    );
    const recurringMessageIds = new Set(
        strongRecurringGroups.flatMap((group) => group.messageIds)
    );
    const representativeMessageIds = new Set(
        strongRecurringGroups
            .map((group) =>
                result.debugMessages
                    .filter(
                        (message) =>
                            group.messageIds.includes(message.id) &&
                            message.isCandidate
                    )
                    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]
            )
            .filter((message): message is ImapDebugMessage => Boolean(message))
            .map((message) => message.id)
    );
    const visibleCandidates = result.debugMessages
        .filter(
            (message) =>
                message.isCandidate &&
                (!recurringMessageIds.has(message.id) ||
                    representativeMessageIds.has(message.id))
        );
    const dedupedCandidates = new Map<string, ImapDebugMessage>();

    for (const message of visibleCandidates) {
        const providerOrName = message.detected.provider ?? message.detected.name;

        if (!providerOrName) {
            dedupedCandidates.set(message.id, message);
            continue;
        }

        const subjectFamily = normalizeSubjectFamily(message.subject);
        const key = `${providerOrName}|${message.detected.name ?? ""}|${subjectFamily}`;
        const previous = dedupedCandidates.get(key);

        if (!previous || Date.parse(message.date) > Date.parse(previous.date)) {
            dedupedCandidates.set(key, message);
        }
    }

    const candidates = [...dedupedCandidates.values()]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 20);

    console.log("Raw candidate messages:");

    if (candidates.length === 0) {
        console.log("none");
    }

    candidates.forEach((message, index) => {
        const title =
            message.detected.name ??
            message.detected.provider ??
            "Unknown subscription";

        console.log("");
        console.log(`${index + 1}. ${title}`);
        console.log(`   confidence: ${message.confidence.toFixed(2)}`);
        optionalLine("provider", message.detected.provider);
        optionalLine("billingCycle", message.detected.billingCycle);
        optionalLine("amount", message.detected.amountText);
        console.log(`   trial: ${message.detected.isTrial ? "yes" : "no"}`);
        optionalLine("trialEndDate", message.detected.trialEndDateText);
        optionalLine("from", message.from);
        optionalLine("subject", message.subject);
        optionalLine("date", message.date);
        optionalLine("snippet", message.snippet);
        console.log("   reasons:");

        for (const reason of message.reasons) {
            console.log(`   - ${reason}`);
        }
    });

    const recurringCandidates = result.recurringGroups
        .filter((group) => group.isRecurringCandidate)
        .sort((a, b) => b.confidence - a.confidence || b.count - a.count)
        .slice(0, 20);

    console.log("");
    console.log("Recurring groups:");

    if (recurringCandidates.length === 0) {
        console.log("none");
        return;
    }

    recurringCandidates.forEach((group, index) => {
        console.log("");
        const groupTitle =
            group.suggestedName && group.fromSample.includes(group.suggestedName)
                ? group.fromSample
                : `${group.suggestedName} / ${group.fromSample}`;

        console.log(`${index + 1}. ${groupTitle}`);
        console.log(`   confidence: ${group.confidence.toFixed(2)}`);
        console.log(`   cadence: ${group.cadence}`);
        console.log(`   messages: ${group.count}`);
        optionalLine("amounts", group.amounts.join(", "));
        optionalLine("first", group.firstDate.slice(0, 10));
        optionalLine("last", group.lastDate.slice(0, 10));
        optionalLine("sample subject", group.sampleSubjects[0]);
        console.log("   reasons:");

        for (const reason of group.reasons) {
            console.log(`   - ${reason}`);
        }
    });
}

async function main() {
    const config = getConfig();

    if (config.verbose) {
        console.error(
            `Connecting to IMAP ${config.host}:${config.port}, mailbox ${config.mailbox}, limit ${config.limit}`
        );
    }

    const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.password,
        },
        logger: false,
    });

    try {
        await client.connect();
        const mailbox = await client.mailboxOpen(config.mailbox);
        const totalMessages = mailbox.exists ?? 0;

        if (config.verbose) {
            console.error(`Opened mailbox ${config.mailbox}; messages: ${totalMessages}`);
        }

        const debugMessages: ImapDebugMessage[] = [];
        const seenMessageIds = new Set<string>();

        if (totalMessages > 0) {
            const startSeq = Math.max(1, totalMessages - config.limit + 1);
            const range = `${startSeq}:*`;

            for await (const message of client.fetch(range, {
                envelope: true,
                internalDate: true,
                source: {
                    maxLength: 20_000,
                },
            })) {
                await appendDebugMessageFromFetchMessage(
                    debugMessages,
                    seenMessageIds,
                    message,
                    "latest_scan"
                );
            }

            if (config.targetedSearch) {
                if (config.verbose) {
                    console.error(
                        `Running targeted IMAP search, limit ${config.targetedSearchLimit}`
                    );
                }

                const targetedUids = await collectTargetedSearchUids(
                    client,
                    config.targetedSearchLimit,
                    config.verbose
                );

                if (targetedUids.length > 0) {
                    for await (const message of client.fetch(
                        targetedUids,
                        {
                            envelope: true,
                            internalDate: true,
                            source: {
                                maxLength: 20_000,
                            },
                        },
                        { uid: true }
                    )) {
                        await appendDebugMessageFromFetchMessage(
                            debugMessages,
                            seenMessageIds,
                            message,
                            "targeted_search"
                        );
                    }
                }
            }
        }

        const candidatesFound = debugMessages.filter(
            (message) => message.isCandidate
        ).length;
        const recurringGroups = buildRecurringGroups(debugMessages);
        const canonicalSubscriptions = buildCanonicalSubscriptions(
            debugMessages,
            recurringGroups
        );
        const reviewCandidates = buildReviewCandidates(debugMessages, canonicalSubscriptions);
        const result: ImapScanSpikeResult = {
            mailbox: config.mailbox,
            scannedMessages: debugMessages.length,
            candidatesFound,
            rejectedMessages: debugMessages.length - candidatesFound,
            canonicalSubscriptions,
            reviewCandidates,
            recurringGroups,
            debugMessages,
        };

        if (config.outputJson) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            printHumanSummary(result, config);
        }
    } finally {
        await client.logout().catch(() => undefined);
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : "IMAP scan failed.";
    console.error(`IMAP scan spike error: ${message}`);
    process.exitCode = 1;
});
