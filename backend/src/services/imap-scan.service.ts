import { ImapFlow, MessageAddressObject } from "imapflow";
import { simpleParser } from "mailparser";
import {
    analyzeMessageForSubscription,
    cleanText,
    debugAnalyzeMessageForSubscription,
    EmailDetectionDebugDetails,
    truncateEvidenceSnippet,
} from "./email-detection.service";
import {
    buildScanCapabilityDiagnostics,
    ImapProductScanProfile,
    ImapScanMode,
    planImapScanStrategy,
} from "./imap-scan-planner.service";
import {
    buildProductResult,
    ProductBucketInput,
    ProductResult,
} from "./subscription-product-buckets.service";

export type ProductionImapScanMessage = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    confidence: number;
    reasons: string[];
    detected: {
        provider?: string;
        name?: string;
        isTrial?: boolean;
        trialEndDateText?: string;
        amountText?: string;
        currency?: string;
        billingCycle?: string;
    };
    debug: EmailDetectionDebugDetails;
    sourceTags: string[];
};

export type ImapProductCanonicalItem = ProductBucketInput & {
    id: string;
    displayName: string;
    provider?: string;
    name?: string;
    category?: string;
    status: string;
    confidence: number;
    confidenceLevel: "high" | "medium" | "low";
    source: "message";
    sourceMessagesCount: number;
    firstSeen: string;
    lastSeen: string;
    latestSubject: string;
    sourceSubjects: string[];
    billingCycle?: string;
    amount?: string;
    displayAmount?: string;
    amountKind?: string;
    regularAmount?: string;
    futureAmount?: string;
    promoAmount?: string;
    trialThenAmount?: string;
    currentAmount?: string;
    dueAmount?: string;
    latestAmount?: string;
    amounts?: string[];
    allAmounts: string[];
    nextRenewalDateText?: string;
    dueDateText?: string;
    selectedAmountSourceDate?: string;
    selectedAmountSourceSubject?: string;
    lastEvidenceDate?: string;
    lastBillingEvidenceDate?: string;
    lastActiveEvidenceDate?: string;
    evidenceAgeDays?: number;
    recencyStatus?: string;
    stalenessReason?: string;
    statusReason?: string;
    evidenceSummary: string[];
    riskSummary: string[];
    needsReview: boolean;
    reviewReason?: string;
};

export type ScanImapSubscriptionsInput = {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    mailbox?: string;
    profile?: ImapProductScanProfile;
    includeDebug?: boolean;
    now?: Date;
};

export type ImapScanSummary = {
    scanProfile: ImapProductScanProfile;
    scanMode: ImapScanMode;
    effectiveScanMode: ImapScanMode;
    effectiveWindowDays: number;
    scanWindowDays: number;
    deepWindowDays: number;
    mailbox: string;
    mailboxTotalMessages: number;
    recentMessagesFetched: number;
    targetedQueriesRun: number;
    targetedMessagesMatched: number;
    targetedMessagesUniqueMatched: number;
    targetedMessagesFetched: number;
    headerTargetedQueriesRun: number;
    headerTargetedMessagesMatched: number;
    headerTargetedUniqueMatched: number;
    headerTargetedMessagesFetched: number;
    metadataPrepassEnabled: boolean;
    metadataPrepassWindowDays: number;
    metadataPrepassMessagesScanned: number;
    metadataPrepassMatches: number;
    metadataPrepassFetched: number;
    metadataPrepassSkippedAlreadyFetched: number;
    metadataPrepassFetchLimit: number;
    metadataPrepassTopTerms: string[];
    deepFallbackUsed: boolean;
    deepFallbackReason?: string;
    deepFallbackStrategy: "time_buckets" | "newest_first_fallback" | "none";
    deepFallbackMessagesFetched: number;
    deepFallbackWindowDays: number;
    deepFallbackBatchSize: number;
    deepFallbackBucketDays: number;
    deepFallbackBucketSampleMode: "newest" | "mixed" | "even";
    deepFallbackBucketsTotal: number;
    deepFallbackBucketsQueried: number;
    deepFallbackBucketsWithMatches: number;
    deepFallbackPerBucketLimit: number;
    deepFallbackMessagesMatchedBeforeCap: number;
    deepFallbackUidCandidatesBeforeSampling: number;
    deepFallbackUidCandidatesAfterSampling: number;
    uniqueMessagesAnalyzed: number;
    mayMissYearlySubscriptions: boolean;
    coverageNote: string;
    scannedMessages: number;
    candidatesFound: number;
    rejectedMessages: number;
    scanReliabilityLevel: string;
    scanReliabilityReasons: string[];
    deepScanRecommended: boolean;
    quickScanLikelyIncomplete: boolean;
    userFacingCoverageNote: string;
    recommendedScanModeForProvider: ImapScanMode;
    recommendedFallbackStrategy: string;
    sinceSearchSupported: boolean;
    bodySearchSupported: boolean;
    headerSearchSupported: boolean;
    uidFetchSupported: boolean;
    metadataPrepassSupported: boolean;
    deepFallbackSupported: boolean;
    targetedSearchUseful: boolean;
    headerSearchUseful: boolean;
    metadataPrepassUseful: boolean;
    fallbackUseful: boolean;
    shouldRunTargetedSearch: boolean;
    shouldRunHeaderTargetedSearch: boolean;
    shouldRunMetadataPrepass: boolean;
    shouldRunDeepFallback: boolean;
    deepScanAvailable: boolean;
    deepScanReason?: string;
    canonicalSubscriptions: number;
    reviewCandidates: number;
};

export type ScanImapSubscriptionsResult = {
    productResult: ProductResult<ImapProductCanonicalItem>;
    scanSummary: ImapScanSummary;
    debug?: {
        messages: ProductionImapScanMessage[];
    };
};

export type ImapScanServiceErrorCode =
    | "IMAP_CONNECTION_FAILED"
    | "IMAP_SCAN_FAILED";

export class ImapScanServiceError extends Error {
    constructor(
        public code: ImapScanServiceErrorCode,
        message: string
    ) {
        super(message);
        this.name = "ImapScanServiceError";
    }
}

type ScanProfileDefaults = {
    scanDays: number;
    deepDays: number;
    recentLimit: number;
    scanMode: ImapScanMode;
    targetedEnabled: boolean;
    targetedLimit: number;
    headerTargetedEnabled: boolean;
    headerTargetedLimit: number;
    metadataPrepassEnabled: boolean;
    metadataPrepassLimit: number;
    metadataPrepassMatchLimit: number;
    metadataPrepassBatchSize: number;
    deepFallbackEnabled: boolean;
    deepFallbackMaxFetch: number;
    deepFallbackBatchSize: number;
    deepFallbackBucketDays: number;
    deepFallbackPerBucketLimit: number;
    deepFallbackBucketSampleMode: "newest" | "mixed" | "even";
};

function profileDefaults(profile: ImapProductScanProfile): ScanProfileDefaults {
    switch (profile) {
        case "fast":
            return {
                scanDays: 90,
                deepDays: 730,
                recentLimit: 300,
                scanMode: "recent_window",
                targetedEnabled: false,
                targetedLimit: 0,
                headerTargetedEnabled: false,
                headerTargetedLimit: 0,
                metadataPrepassEnabled: false,
                metadataPrepassLimit: 0,
                metadataPrepassMatchLimit: 0,
                metadataPrepassBatchSize: 200,
                deepFallbackEnabled: false,
                deepFallbackMaxFetch: 0,
                deepFallbackBatchSize: 200,
                deepFallbackBucketDays: 30,
                deepFallbackPerBucketLimit: 80,
                deepFallbackBucketSampleMode: "mixed",
            };
        case "balanced":
            return {
                scanDays: 120,
                deepDays: 365,
                recentLimit: 300,
                scanMode: "hybrid_window",
                targetedEnabled: true,
                targetedLimit: 200,
                headerTargetedEnabled: true,
                headerTargetedLimit: 300,
                metadataPrepassEnabled: true,
                metadataPrepassLimit: 1500,
                metadataPrepassMatchLimit: 300,
                metadataPrepassBatchSize: 200,
                deepFallbackEnabled: true,
                deepFallbackMaxFetch: 400,
                deepFallbackBatchSize: 200,
                deepFallbackBucketDays: 30,
                deepFallbackPerBucketLimit: 50,
                deepFallbackBucketSampleMode: "mixed",
            };
        case "deep":
            return {
                scanDays: 90,
                deepDays: 730,
                recentLimit: 300,
                scanMode: "deep",
                targetedEnabled: true,
                targetedLimit: 500,
                headerTargetedEnabled: true,
                headerTargetedLimit: 500,
                metadataPrepassEnabled: true,
                metadataPrepassLimit: 3000,
                metadataPrepassMatchLimit: 800,
                metadataPrepassBatchSize: 200,
                deepFallbackEnabled: true,
                deepFallbackMaxFetch: 1500,
                deepFallbackBatchSize: 200,
                deepFallbackBucketDays: 30,
                deepFallbackPerBucketLimit: 80,
                deepFallbackBucketSampleMode: "mixed",
            };
        case "adaptive":
        default:
            return {
                scanDays: 90,
                deepDays: 730,
                recentLimit: 300,
                scanMode: "deep",
                targetedEnabled: true,
                targetedLimit: 500,
                headerTargetedEnabled: true,
                headerTargetedLimit: 500,
                metadataPrepassEnabled: true,
                metadataPrepassLimit: 3000,
                metadataPrepassMatchLimit: 800,
                metadataPrepassBatchSize: 200,
                deepFallbackEnabled: true,
                deepFallbackMaxFetch: 1500,
                deepFallbackBatchSize: 200,
                deepFallbackBucketDays: 30,
                deepFallbackPerBucketLimit: 80,
                deepFallbackBucketSampleMode: "mixed",
            };
    }
}

function dateDaysAgo(days: number, now: Date) {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
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

async function sourceToSnippet(source: Buffer | undefined) {
    if (!source) {
        return "";
    }

    try {
        const parsed = await simpleParser(source);
        const body = parsed.text || (parsed.html ? stripHtml(parsed.html) : "");

        if (body) {
            return truncateEvidenceSnippet(cleanText(body));
        }
    } catch {
        // Fall back to a cheap raw body snippet.
    }

    const raw = source.toString("utf8");
    const bodyStart = raw.search(/\r?\n\r?\n/);
    const body = bodyStart >= 0 ? raw.slice(bodyStart) : raw;

    return truncateEvidenceSnippet(cleanText(stripHtml(body)));
}

function normalizeSearchUids(result: unknown): number[] {
    const values: unknown[] = [];

    const addValue = (value: unknown) => {
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value === "number" || typeof value === "string") {
            values.push(value);
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(addValue);
            return;
        }

        if (value instanceof Set) {
            value.forEach(addValue);
            return;
        }

        if (typeof value === "object") {
            const candidate = value as Record<string, unknown>;
            const knownKeys = ["uid", "uids", "results", "matches", "all", "ids"];
            let usedKnownKey = false;

            for (const key of knownKeys) {
                if (key in candidate) {
                    usedKnownKey = true;
                    addValue(candidate[key]);
                }
            }

            if (usedKnownKey) {
                return;
            }

            if (Symbol.iterator in candidate) {
                try {
                    for (const item of value as Iterable<unknown>) {
                        addValue(item);
                    }
                    return;
                } catch {
                    // Continue with object values.
                }
            }

            Object.values(candidate).forEach(addValue);
        }
    };

    addValue(result);

    return [
        ...new Set(
            values
                .map((value) =>
                    typeof value === "number"
                        ? value
                        : typeof value === "string"
                          ? Number(value)
                          : NaN
                )
                .filter((value) => Number.isFinite(value) && value > 0)
                .map((value) => Math.trunc(value))
        ),
    ].sort((a, b) => b - a);
}

const TARGETED_SEARCH_TERMS = [
    "subscription",
    "subskrypcja",
    "abonament",
    "renewal",
    "odnowienie",
    "trial",
    "okres probny",
    "faktura",
    "efaktura",
    "e-faktura",
    "rachunek",
    "kwota do zaplaty",
    "termin platnosci",
    "invoice",
    "receipt",
    "payment",
    "Google Play",
    "App Store",
    "Prime Video",
    "Amazon Prime",
    "PayPal",
    "Stripe",
    "Autopay",
    "PayU",
    "Przelewy24",
    "Tpay",
    "Netflix",
    "Spotify",
    "YouTube",
    "Disney",
    "Max",
    "SkyShowtime",
    "Adobe",
    "Tauron",
    "Uber One",
];

const METADATA_PREPASS_TERMS = [
    ...new Set([
        ...TARGETED_SEARCH_TERMS,
        "czlonkostwo",
        "membership",
        "premium",
        "paid plan",
        "automatic renewal",
        "automatycznie odnaw",
        "zostanie naliczona",
        "Google One",
        "Apple",
        "iCloud",
        "Canva",
        "Microsoft",
        "Dropbox",
        "Wolt",
        "Allegro Smart",
        "Play",
        "Orange",
        "T-Mobile",
        "Plus",
        "Netia",
        "Vectra",
        "TOYA",
        "PGE",
        "Energa",
        "E.ON",
    ]),
];

function normalizeAsciiText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u0142/g, "l")
        .replace(/\u0141/g, "L")
        .toLowerCase();
}

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}

function messageDateFromEnvelope(message: {
    envelope?: {
        date?: Date | string;
    };
    internalDate?: Date | string;
}) {
    const value = message.envelope?.date ?? message.internalDate;

    if (value instanceof Date) {
        return value;
    }

    const parsed = Date.parse(String(value ?? ""));
    return Number.isFinite(parsed) ? new Date(parsed) : undefined;
}

function confidenceLevelFor(confidence: number): "high" | "medium" | "low" {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.65) return "medium";
    return "low";
}

function broadCategoryFor(category: string | undefined) {
    switch (category) {
        case "design_creative":
        case "developer_tools":
        case "productivity_office":
        case "finance_accounting":
        case "hosting_domains":
            return "software_saas";
        case "education_learning":
            return "education";
        case "fitness_health":
            return "health_fitness";
        case "transport_membership":
            return "travel_transport";
        case "unknown_recurring_bill":
            return "other_bill";
        default:
            return category;
    }
}

function statusForMessage(message: ProductionImapScanMessage) {
    const messageType = message.debug.messageType;

    if (
        messageType === "active_price_change" ||
        messageType === "price_change_active"
    ) {
        return "price_change";
    }

    if (
        ["invoice", "payment_due", "recurring_bill"].includes(messageType) ||
        message.debug.evidenceTiers.some((tier) =>
            /invoice|recurring bill/i.test(tier)
        )
    ) {
        return "invoice_due";
    }

    if (
        messageType === "trial_started_future_charge" ||
        message.detected.isTrial
    ) {
        return "trial";
    }

    return "active";
}

function evidenceSummaryFor(message: ProductionImapScanMessage) {
    const evidence = [
        message.debug.messageType !== "unknown"
            ? `message type: ${message.debug.messageType}`
            : undefined,
        ...message.debug.evidenceTiers,
        message.debug.billingChannel
            ? `billing channel: ${message.debug.billingChannel}`
            : undefined,
    ].filter((item): item is string => Boolean(item));

    return [...new Set(evidence)].slice(0, 8);
}

type AmountKind =
    | "charged"
    | "due"
    | "current_price"
    | "new_price"
    | "future_price"
    | "promo_price"
    | "regular_price"
    | "trial_then_price"
    | "unknown";

type AmountSemantic = {
    raw: string;
    kind: AmountKind;
    confidence: number;
};

type AmountSelection = {
    displayAmount?: string;
    amountKind?: AmountKind;
    regularAmount?: string;
    futureAmount?: string;
    promoAmount?: string;
    trialThenAmount?: string;
    currentAmount?: string;
    dueAmount?: string;
    latestAmount?: string;
    amounts: string[];
    selectedAmountSourceDate?: string;
    selectedAmountSourceSubject?: string;
};

function visibleTextForAmountSelection(message: ProductionImapScanMessage) {
    return [message.subject, message.snippet, ...message.reasons].join(" ");
}

function extractAmountSemantics(message: ProductionImapScanMessage): AmountSemantic[] {
    const text = visibleTextForAmountSelection(message);
    const asciiText = normalizeAsciiText(text);
    const results: AmountSemantic[] = [];
    const amountPattern =
        /(?:[$€£]\s*)?\d+(?:[,.]\d{2})(?:\s*\(\s*brutto\s*\)|\s*brutto)?\s*(?:(?:zł|zl|PLN|USD|EUR|\$|€)(?:\s*\/\s*(?:rok|miesiąc|miesiac|month)|\s*(?:miesięcznie|miesiecznie|monthly|rocznie|yearly))?|(?:miesięcznie|miesiecznie|monthly|\/\s*month|\/\s*rok|rocznie|yearly))/gi;
    let match: RegExpExecArray | null;

    while ((match = amountPattern.exec(text)) !== null) {
        const raw = cleanText(match[0]);

        if (!raw) continue;

        const start = Math.max(0, match.index - 90);
        const end = Math.min(text.length, match.index + raw.length + 90);
        const context = normalizeAsciiText(text.slice(start, end));
        const beforeContext = normalizeAsciiText(text.slice(start, match.index));
        const afterContext = normalizeAsciiText(
            text.slice(match.index + raw.length, end)
        );
        const localBeforeContext = beforeContext.slice(-70);
        const fullTrialContext = /\b(trial|okres probny|bezplatny okres probny)\b/.test(
            asciiText
        );
        let kind: AmountKind = "unknown";
        let confidence = 0.4;

        if (
            fullTrialContext &&
            /(po zakonczeniu|after.*trial|zostanie naliczona|will be charged|automatically renew at|odnowi sie w cenie|odnowiona w cenie)/.test(
                context
            )
        ) {
            kind = "trial_then_price";
            confidence = 0.95;
        } else if (/(kwota do zaplaty|do zaplaty|termin platnosci|amount due|invoice total|faktura.*na kwote|na kwote)/.test(context)) {
            kind = "due";
            confidence = 0.9;
        } else if (/(nowa cena|zaktualizowana cena|new price|price will change to|cena zmieni sie na)/.test(localBeforeContext)) {
            kind = "new_price";
            confidence = 0.95;
        } else if (/(aktualna cena|obecna cena|dotychczasowa cena|current price|current plan price|old price)/.test(localBeforeContext)) {
            kind = "current_price";
            confidence = 0.9;
        } else if (/(po uplywie okresu promocji|after promotional period|regular price|standard price|cena regularna|odnowiona w cenie|will renew at|next renewal price|bedzie obciazana kwota)/.test(beforeContext)) {
            kind = /(regular price|standard price|cena regularna|po uplywie okresu promocji|after promotional period)/.test(context)
                ? "regular_price"
                : "future_price";
            confidence = 0.88;
        } else if (
            /(oferta specjalna|special offer|cena promocyjna|promocyjna|promo|discount|rabat)/.test(
                beforeContext
            ) ||
            /(przez pierwszy miesiac|przez kolejny okres|przez\s+\d+\s+miesiac)/.test(
                afterContext
            )
        ) {
            kind = "promo_price";
            confidence = 0.9;
        } else if (/(cena pakietu|monthly price|miesiecznie|\/miesiac|\/month|co miesiac)/.test(context)) {
            kind = "regular_price";
            confidence = 0.75;
        } else if (/(pobrano|zaplacono|platnosc zostala zrealizowana|obciazylismy|zostala naliczona oplata|charged|paid|payment processed|payment confirmation)/.test(context)) {
            kind = "charged";
            confidence = 0.82;
        }

        results.push({ raw, kind, confidence });
    }

    const detectedAmount = message.detected.amountText ?? message.debug.amountText;

    if (detectedAmount && !results.some((result) => result.raw === detectedAmount)) {
        results.push({
            raw: detectedAmount,
            kind: "unknown",
            confidence: 0.35,
        });
    }

    return results;
}

function latestMessageWithAmount(
    messages: ProductionImapScanMessage[],
    predicate: (amount: AmountSemantic) => boolean
) {
    return [...messages]
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .map((message) => ({
            message,
            amount: extractAmountSemantics(message).find(predicate),
        }))
        .find((item) => item.amount);
}

function selectCanonicalAmounts(
    messages: ProductionImapScanMessage[],
    status: string
): AmountSelection {
    const allSemantics = messages.flatMap((message) =>
        extractAmountSemantics(message).map((amount) => ({ message, amount }))
    );
    const amounts = [
        ...new Set(allSemantics.map((item) => item.amount.raw).filter(Boolean)),
    ].slice(0, 10);
    const latestAny = latestMessageWithAmount(messages, () => true);
    const findLatest = (kind: AmountKind) =>
        latestMessageWithAmount(messages, (amount) => amount.kind === kind);
    const due = findLatest("due");
    const charged = findLatest("charged");
    const current = findLatest("current_price");
    const newPrice = findLatest("new_price");
    const future = findLatest("future_price");
    const promo = findLatest("promo_price");
    const regular = findLatest("regular_price");
    const trialThen = findLatest("trial_then_price");
    const selection: AmountSelection = {
        amounts,
        currentAmount: current?.amount?.raw,
        dueAmount: due?.amount?.raw,
        latestAmount: latestAny?.amount?.raw,
        selectedAmountSourceDate: latestAny?.message.date,
        selectedAmountSourceSubject: latestAny?.message.subject,
    };

    selection.futureAmount =
        newPrice?.amount?.raw ?? future?.amount?.raw ?? trialThen?.amount?.raw;
    selection.regularAmount = regular?.amount?.raw;
    selection.promoAmount = promo?.amount?.raw;
    selection.trialThenAmount = trialThen?.amount?.raw;

    if (status === "price_change") {
        const source = newPrice ?? future ?? latestAny;
        selection.displayAmount = source?.amount?.raw;
        selection.amountKind =
            source?.amount?.kind === "future_price" ? "future_price" : "new_price";
        selection.selectedAmountSourceDate = source?.message.date;
        selection.selectedAmountSourceSubject = source?.message.subject;
        return selection;
    }

    if (status === "invoice_due" || status === "stale_needs_review") {
        const hasInvoiceEvidence = messages.some(
            (message) =>
                statusForMessage(message) === "invoice_due" ||
                /invoice|faktura|payment due|recurring bill/i.test(
                    message.debug.evidenceTiers.join(" ")
                )
        );

        if (hasInvoiceEvidence && due) {
            selection.displayAmount = due.amount?.raw;
            selection.amountKind = "due";
            selection.selectedAmountSourceDate = due.message.date;
            selection.selectedAmountSourceSubject = due.message.subject;
            return selection;
        }
    }

    const source =
        trialThen ??
        promo ??
        charged ??
        regular ??
        future ??
        newPrice ??
        due ??
        latestAny;

    selection.displayAmount = source?.amount?.raw;
    selection.amountKind = source?.amount?.kind;
    selection.selectedAmountSourceDate = source?.message.date;
    selection.selectedAmountSourceSubject = source?.message.subject;

    return selection;
}

function extractDateText(messages: ProductionImapScanMessage[], kind: "due" | "renewal") {
    const sorted = [...messages].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const duePattern =
        /(termin platnosci|due date|pay by|oplacenie do)\D{0,40}(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i;
    const renewalPattern =
        /(nastepna data przedluzenia|next renewal|next billing|renewal date|dzien rozliczeniowy)\D{0,60}(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i;
    const pattern = kind === "due" ? duePattern : renewalPattern;

    for (const message of sorted) {
        const match = normalizeAsciiText(`${message.subject} ${message.snippet}`).match(
            pattern
        );

        if (match?.[2]) return match[2];
    }

    return undefined;
}

function canonicalItemsFromCandidates(
    messages: ProductionImapScanMessage[],
    now: Date
): ImapProductCanonicalItem[] {
    const grouped = new Map<string, ProductionImapScanMessage[]>();

    for (const message of messages) {
        const provider = message.detected.provider ?? message.debug.provider;
        const name = message.detected.name ?? message.debug.name ?? provider;
        const billingChannel = message.debug.billingChannel;
        const key = [provider ?? name ?? "unknown", billingChannel ?? ""]
            .join("|")
            .toLowerCase();
        const group = grouped.get(key) ?? [];
        group.push(message);
        grouped.set(key, group);
    }

    return [...grouped.entries()].map(([key, group]) => {
        const sorted = [...group].sort(
            (a, b) => Date.parse(a.date) - Date.parse(b.date)
        );
        const latest = sorted[sorted.length - 1];
        const highestConfidence = Math.max(...group.map((item) => item.confidence));
        const displayName =
            latest.detected.name ??
            latest.debug.name ??
            latest.detected.provider ??
            latest.debug.provider ??
            "Detected subscription";
        const provider = latest.detected.provider ?? latest.debug.provider;
        const amount = latest.detected.amountText ?? latest.debug.amountText;
        const rawStatus = statusForMessage(latest);
        const latestTime = Date.parse(latest.date);
        const ageDays = Number.isFinite(latestTime)
            ? Math.max(0, Math.floor((now.getTime() - latestTime) / (24 * 60 * 60 * 1000)))
            : undefined;
        const staleThreshold =
            rawStatus === "trial" ? 45 : rawStatus === "invoice_due" ? 120 : 120;
        const isStale =
            rawStatus !== "price_change" &&
            ageDays !== undefined &&
            ageDays > staleThreshold;
        const status = isStale ? "stale_needs_review" : rawStatus;
        const activeMessages = group.filter(
            (message) => statusForMessage(message) !== "invoice_due"
        );
        const billingMessages = group.filter((message) =>
            ["invoice_due", "price_change"].includes(statusForMessage(message))
        );
        const latestActive = [...activeMessages].sort(
            (a, b) => Date.parse(b.date) - Date.parse(a.date)
        )[0];
        const latestBilling = [...billingMessages].sort(
            (a, b) => Date.parse(b.date) - Date.parse(a.date)
        )[0];
        const amountSelection = selectCanonicalAmounts(group, rawStatus);
        const dueDateText = extractDateText(group, "due");
        const nextRenewalDateText = extractDateText(group, "renewal");
        const stalenessReason = isStale
            ? `Latest evidence is ${ageDays} days old.`
            : undefined;

        return {
            id: key.replace(/[^a-z0-9|_-]+/gi, "_"),
            displayName,
            provider,
            name: latest.detected.name ?? latest.debug.name,
            billingChannel: latest.debug.billingChannel,
            category: broadCategoryFor(latest.debug.category),
            status,
            recencyStatus: status,
            confidence: Math.min(1, highestConfidence + Math.max(0, group.length - 1) * 0.05),
            confidenceLevel: confidenceLevelFor(highestConfidence),
            source: "message" as const,
            sourceMessagesCount: group.length,
            firstSeen: sorted[0].date,
            lastSeen: latest.date,
            latestSubject: latest.subject,
            sourceSubjects: [...new Set(group.map((item) => item.subject))].slice(0, 10),
            billingCycle: latest.detected.billingCycle ?? latest.debug.billingCycle,
            amount: amountSelection.displayAmount,
            displayAmount: amountSelection.displayAmount,
            amountKind: amountSelection.amountKind ?? (amount ? "unknown" : undefined),
            regularAmount: amountSelection.regularAmount,
            futureAmount: amountSelection.futureAmount,
            promoAmount: amountSelection.promoAmount,
            trialThenAmount: amountSelection.trialThenAmount,
            currentAmount: amountSelection.currentAmount,
            dueAmount: amountSelection.dueAmount,
            latestAmount: amountSelection.latestAmount,
            amounts: amountSelection.amounts,
            allAmounts: amountSelection.amounts,
            nextRenewalDateText,
            dueDateText,
            selectedAmountSourceDate: amountSelection.selectedAmountSourceDate,
            selectedAmountSourceSubject: amountSelection.selectedAmountSourceSubject,
            evidenceTypes: [...new Set(group.flatMap((item) => item.debug.evidenceTiers))],
            evidenceSummary: evidenceSummaryFor(latest),
            riskSummary: [...new Set(group.flatMap((item) => item.debug.riskEvidence))].slice(0, 8),
            lastEvidenceDate: latest.date,
            lastBillingEvidenceDate: latestBilling?.date,
            lastActiveEvidenceDate: latestActive?.date,
            evidenceAgeDays: ageDays,
            stalenessReason,
            statusReason:
                status === "stale_needs_review"
                    ? "Only historical evidence is available in the scan window."
                    : `Classified from latest message type ${latest.debug.messageType}.`,
            needsReview: isStale || confidenceLevelFor(highestConfidence) === "low",
            reviewReason:
                isStale
                    ? `${stalenessReason} Confirm whether it is still active.`
                    : confidenceLevelFor(highestConfidence) === "low"
                    ? "Low confidence IMAP detection should be reviewed before showing as active."
                    : undefined,
        };
    });
}

export function buildProductionImapCanonicalItemsForTest(
    messages: ProductionImapScanMessage[],
    now: Date
) {
    return canonicalItemsFromCandidates(
        messages.filter((message) => message.debug.finalDecision === "candidate"),
        now
    );
}

export function buildProductionImapProductResultForTest(
    messages: ProductionImapScanMessage[],
    now: Date
) {
    return buildProductResult(buildProductionImapCanonicalItemsForTest(messages, now));
}

type ScanCollectionStats = {
    fallbackUsed: boolean;
    fallbackReason?: string;
    recentMessagesFetched: number;
    targetedQueriesRun: number;
    targetedMessagesMatched: number;
    targetedMessagesUniqueMatched: number;
    targetedMessagesFetched: number;
    headerTargetedQueriesRun: number;
    headerTargetedMessagesMatched: number;
    headerTargetedUniqueMatched: number;
    headerTargetedMessagesFetched: number;
    metadataPrepassEnabled: boolean;
    metadataPrepassWindowDays: number;
    metadataPrepassMessagesScanned: number;
    metadataPrepassMatches: number;
    metadataPrepassFetched: number;
    metadataPrepassSkippedAlreadyFetched: number;
    metadataPrepassFetchLimit: number;
    metadataPrepassTopTerms: string[];
    deepFallbackUsed: boolean;
    deepFallbackReason?: string;
    deepFallbackStrategy: "time_buckets" | "newest_first_fallback" | "none";
    deepFallbackMessagesFetched: number;
    deepFallbackWindowDays: number;
    deepFallbackBatchSize: number;
    deepFallbackBucketDays: number;
    deepFallbackBucketSampleMode: "newest" | "mixed" | "even";
    deepFallbackBucketsTotal: number;
    deepFallbackBucketsQueried: number;
    deepFallbackBucketsWithMatches: number;
    deepFallbackPerBucketLimit: number;
    deepFallbackMessagesMatchedBeforeCap: number;
    deepFallbackUidCandidatesBeforeSampling: number;
    deepFallbackUidCandidatesAfterSampling: number;
};

function emptyCollectionStats(defaults: ScanProfileDefaults): ScanCollectionStats {
    return {
        fallbackUsed: false,
        recentMessagesFetched: 0,
        targetedQueriesRun: 0,
        targetedMessagesMatched: 0,
        targetedMessagesUniqueMatched: 0,
        targetedMessagesFetched: 0,
        headerTargetedQueriesRun: 0,
        headerTargetedMessagesMatched: 0,
        headerTargetedUniqueMatched: 0,
        headerTargetedMessagesFetched: 0,
        metadataPrepassEnabled: defaults.metadataPrepassEnabled,
        metadataPrepassWindowDays: defaults.deepDays,
        metadataPrepassMessagesScanned: 0,
        metadataPrepassMatches: 0,
        metadataPrepassFetched: 0,
        metadataPrepassSkippedAlreadyFetched: 0,
        metadataPrepassFetchLimit: defaults.metadataPrepassMatchLimit,
        metadataPrepassTopTerms: [],
        deepFallbackUsed: false,
        deepFallbackStrategy: "none",
        deepFallbackMessagesFetched: 0,
        deepFallbackWindowDays: defaults.deepDays,
        deepFallbackBatchSize: defaults.deepFallbackBatchSize,
        deepFallbackBucketDays: defaults.deepFallbackBucketDays,
        deepFallbackBucketSampleMode: defaults.deepFallbackBucketSampleMode,
        deepFallbackBucketsTotal: 0,
        deepFallbackBucketsQueried: 0,
        deepFallbackBucketsWithMatches: 0,
        deepFallbackPerBucketLimit: defaults.deepFallbackPerBucketLimit,
        deepFallbackMessagesMatchedBeforeCap: 0,
        deepFallbackUidCandidatesBeforeSampling: 0,
        deepFallbackUidCandidatesAfterSampling: 0,
    };
}

async function collectRecentWindowUids(client: ImapFlow, since: Date, limit: number) {
    const result = await (client as any).search({ since }, { uid: true });
    return normalizeSearchUids(result).slice(0, limit);
}

async function collectTargetedSearchUids(params: {
    client: ImapFlow;
    terms: string[];
    since: Date;
    limit: number;
    headerOnly: boolean;
}) {
    const uids = new Set<number>();
    const allMatchedUids = new Set<number>();
    let queriesRun = 0;
    let matched = 0;

    for (const term of params.terms) {
        if (uids.size >= params.limit) break;

        const queries = params.headerOnly
            ? [
                  { header: ["subject", term], since: params.since },
                  { from: term, since: params.since },
              ]
            : [{ body: term, since: params.since }];

        for (const criteria of queries) {
            if (uids.size >= params.limit) break;

            try {
                queriesRun += 1;
                const result = await (params.client as any).search(criteria, {
                    uid: true,
                });
                const matches = normalizeSearchUids(result);
                matched += matches.length;

                for (const uid of matches) {
                    allMatchedUids.add(uid);
                    uids.add(uid);

                    if (uids.size >= params.limit) break;
                }
            } catch {
                // Some providers do not support BODY/HEADER searches consistently.
            }
        }
    }

    return {
        uids: [...uids].slice(0, params.limit),
        queriesRun,
        matched,
        uniqueMatched: allMatchedUids.size,
    };
}

function scoreMetadataMessage(message: {
    uid?: number | string;
    envelope?: {
        from?: MessageAddressObject[];
        subject?: string;
        date?: Date | string;
    };
    internalDate?: Date | string;
}) {
    const uid = Number(message.uid);
    const from = cleanText(formatAddress(message.envelope?.from?.[0]));
    const subject = cleanText(message.envelope?.subject ?? "");
    const asciiText = normalizeAsciiText(`${from} ${subject}`);
    const subjectAscii = normalizeAsciiText(subject);
    const terms: string[] = [];
    let score = 0;

    const add = (amount: number, term: string) => {
        score += amount;
        if (!terms.includes(term)) terms.push(term);
    };

    if (/\b(subscription|subskrypcja|abonament|membership|premium|paid plan)\b/.test(asciiText)) {
        add(0.45, "subscription subject");
    }

    if (/\b(faktura|e-faktura|efaktura|rachunek|invoice|receipt|payment|platnosc)\b/.test(asciiText)) {
        add(0.4, "billing subject");
    }

    if (/\b(renewal|odnowienie|automatycznie odnaw|trial|okres probny|zostanie naliczona)\b/.test(asciiText)) {
        add(0.4, "renewal/trial subject");
    }

    if (/\b(potwierdzenie platnosci|dziekujemy za zakup)\b/.test(asciiText)) {
        add(0.22, "purchase/payment confirmation subject");
    }

    for (const term of METADATA_PREPASS_TERMS) {
        const normalizedTerm = normalizeAsciiText(cleanText(term));

        if (!normalizedTerm || normalizedTerm.length < 3) continue;

        if (subjectAscii.includes(normalizedTerm)) {
            add(0.18, `subject:${term}`);
        } else if (asciiText.includes(normalizedTerm)) {
            add(0.1, `from:${term}`);
        }
    }

    if (/\b(zamowienie|order|rental|wypozyczenie|refund|zwrot|reklamacja|newsletter|regulamin|terms update|security|login|kod|verification code)\b/.test(asciiText)) {
        score -= 0.35;
        terms.push("risk:order/security/newsletter");
    }

    return {
        uid: Number.isFinite(uid) && uid > 0 ? Math.trunc(uid) : undefined,
        score,
        terms,
    };
}

function sampleBucketUids(
    uids: number[],
    limit: number,
    mode: "newest" | "mixed" | "even"
) {
    const sorted = [...new Set(uids)].sort((a, b) => a - b);

    if (sorted.length <= limit) return sorted;
    if (mode === "newest") return sorted.slice(-limit);

    const selected = new Set<number>();
    const addEven = (pool: number[], count: number) => {
        if (count <= 0 || pool.length === 0) return;
        if (pool.length <= count) {
            pool.forEach((uid) => selected.add(uid));
            return;
        }

        const step = (pool.length - 1) / Math.max(1, count - 1);
        for (let index = 0; index < count; index += 1) {
            selected.add(pool[Math.round(index * step)]);
        }
    };

    if (mode === "even") {
        addEven(sorted, limit);
        return [...selected].sort((a, b) => b - a).slice(0, limit);
    }

    const edgeCount = Math.max(1, Math.floor(limit * 0.25));
    sorted.slice(0, edgeCount).forEach((uid) => selected.add(uid));
    sorted.slice(-edgeCount).forEach((uid) => selected.add(uid));
    addEven(
        sorted.slice(edgeCount, Math.max(edgeCount, sorted.length - edgeCount)),
        limit - selected.size
    );

    return [...selected].sort((a, b) => b - a).slice(0, limit);
}

async function collectMetadataPrepassUids(params: {
    client: ImapFlow;
    totalMessages: number;
    since: Date;
    prepassLimit: number;
    matchLimit: number;
    batchSize: number;
    alreadyFetchedIds: Set<string>;
}) {
    let candidateUids: number[] = [];

    try {
        const result = await (params.client as any).search(
            { since: params.since },
            { uid: true }
        );
        candidateUids = normalizeSearchUids(result).slice(0, params.prepassLimit);
    } catch {
        candidateUids = [];
    }

    if (candidateUids.length === 0) {
        candidateUids = await collectNewestUidsByEnvelope({
            client: params.client,
            totalMessages: params.totalMessages,
            since: params.since,
            limit: params.prepassLimit,
            batchSize: params.batchSize,
            excludedIds: new Set(),
        });
    }

    const hits: Array<{ uid: number; score: number; terms: string[] }> = [];
    const termCounts = new Map<string, number>();
    let messagesScanned = 0;

    for (const chunk of chunkArray(candidateUids, params.batchSize)) {
        try {
            for await (const message of params.client.fetch(
                chunk,
                {
                    envelope: true,
                    internalDate: true,
                    flags: true,
                } as any,
                { uid: true }
            )) {
                messagesScanned += 1;
                const scored = scoreMetadataMessage(message);

                if (!scored.uid || scored.score < 0.25) continue;

                hits.push(scored as { uid: number; score: number; terms: string[] });

                for (const term of scored.terms.slice(0, 6)) {
                    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
                }
            }
        } catch {
            // Skip bad metadata batches.
        }
    }

    const sortedHits = hits.sort((a, b) => b.score - a.score);
    const selected: number[] = [];
    let skippedAlreadyFetched = 0;

    for (const hit of sortedHits) {
        if (params.alreadyFetchedIds.has(String(hit.uid))) {
            skippedAlreadyFetched += 1;
            continue;
        }

        selected.push(hit.uid);
        if (selected.length >= params.matchLimit) break;
    }

    return {
        uids: selected,
        messagesScanned,
        matches: sortedHits.length,
        skippedAlreadyFetched,
        topTerms: [...termCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term, count]) => `${term}:${count}`),
    };
}

async function collectNewestUidsByEnvelope(params: {
    client: ImapFlow;
    totalMessages: number;
    since: Date;
    limit: number;
    batchSize: number;
    excludedIds: Set<string>;
}) {
    const selected = new Set<number>();
    let currentEnd = params.totalMessages;

    while (currentEnd > 0 && selected.size < params.limit) {
        const currentStart = Math.max(1, currentEnd - params.batchSize + 1);
        const range = `${currentStart}:${currentEnd}`;
        let sawOldMessage = false;

        for await (const message of params.client.fetch(range, {
            envelope: true,
            internalDate: true,
            uid: true,
        } as any)) {
            const uid = Number(message.uid ?? message.seq);
            const messageDate = messageDateFromEnvelope(message);

            if (messageDate && messageDate < params.since) {
                sawOldMessage = true;
                continue;
            }

            if (
                Number.isFinite(uid) &&
                uid > 0 &&
                !params.excludedIds.has(String(uid))
            ) {
                selected.add(Math.trunc(uid));
                if (selected.size >= params.limit) break;
            }
        }

        if (sawOldMessage && selected.size > 0) break;
        currentEnd = currentStart - 1;
    }

    return [...selected].sort((a, b) => b - a).slice(0, params.limit);
}

async function collectDeepBucketUids(params: {
    client: ImapFlow;
    since: Date;
    now: Date;
    maxFetch: number;
    bucketDays: number;
    perBucketLimit: number;
    sampleMode: "newest" | "mixed" | "even";
    excludedIds: Set<string>;
}) {
    const selected = new Set<number>();
    const bucketMs = params.bucketDays * 24 * 60 * 60 * 1000;
    const bucketsTotal = Math.max(
        1,
        Math.ceil((params.now.getTime() - params.since.getTime()) / bucketMs)
    );
    let bucketsQueried = 0;
    let bucketsWithMatches = 0;
    let messagesMatchedBeforeCap = 0;
    let uidCandidatesBeforeSampling = 0;
    let uidCandidatesAfterSampling = 0;

    for (let index = 0; index < bucketsTotal; index += 1) {
        if (selected.size >= params.maxFetch) break;

        const bucketEnd = new Date(params.now.getTime() - index * bucketMs);
        const bucketStart = new Date(
            Math.max(params.since.getTime(), bucketEnd.getTime() - bucketMs)
        );

        try {
            bucketsQueried += 1;
            const result = await (params.client as any).search(
                {
                    since: bucketStart,
                    before: bucketEnd,
                },
                { uid: true }
            );
            const matches = normalizeSearchUids(result);
            messagesMatchedBeforeCap += matches.length;
            uidCandidatesBeforeSampling += matches.length;

            if (matches.length === 0) continue;

            bucketsWithMatches += 1;
            const sampled = sampleBucketUids(
                matches,
                params.perBucketLimit,
                params.sampleMode
            );
            uidCandidatesAfterSampling += sampled.length;

            for (const uid of sampled) {
                if (params.excludedIds.has(String(uid))) continue;
                selected.add(uid);
                if (selected.size >= params.maxFetch) break;
            }
        } catch {
            // If bucket search fails, caller can fall back to newest-first.
            return {
                uids: [...selected],
                strategy: "newest_first_fallback" as const,
                bucketsTotal,
                bucketsQueried,
                bucketsWithMatches,
                messagesMatchedBeforeCap,
                uidCandidatesBeforeSampling,
                uidCandidatesAfterSampling,
            };
        }
    }

    return {
        uids: [...selected].slice(0, params.maxFetch),
        strategy: "time_buckets" as const,
        bucketsTotal,
        bucketsQueried,
        bucketsWithMatches,
        messagesMatchedBeforeCap,
        uidCandidatesBeforeSampling,
        uidCandidatesAfterSampling,
    };
}

async function appendFetchedMessages(params: {
    client: ImapFlow;
    messages: ProductionImapScanMessage[];
    seenIds: Set<string>;
    uids: number[];
    sourceTag: string;
}) {
    let fetched = 0;

    if (params.uids.length === 0) return fetched;

    for await (const message of params.client.fetch(
        params.uids,
        {
            envelope: true,
            internalDate: true,
            source: {
                maxLength: 20_000,
            },
        } as any,
        { uid: true }
    )) {
        const id = String(message.uid ?? message.seq ?? "");
        const existing = params.messages.find((item) => item.id === id);

        if (existing) {
            if (!existing.sourceTags.includes(params.sourceTag)) {
                existing.sourceTags.push(params.sourceTag);
            }
            continue;
        }

        try {
            const analyzed = await analyzeFetchedMessage(message);
            analyzed.sourceTags.push(params.sourceTag);
            params.messages.push(analyzed);
            params.seenIds.add(analyzed.id);
            fetched += 1;
        } catch {
            // Skip individual bad messages.
        }
    }

    return fetched;
}

async function fetchAnalyzedMessages(params: {
    client: ImapFlow;
    totalMessages: number;
    now: Date;
    defaults: ScanProfileDefaults;
}) {
    const messages: ProductionImapScanMessage[] = [];
    const seenIds = new Set<string>();
    const stats = emptyCollectionStats(params.defaults);
    const recentSince = dateDaysAgo(params.defaults.scanDays, params.now);
    const deepSince = dateDaysAgo(params.defaults.deepDays, params.now);

    try {
        const recentUids = await collectRecentWindowUids(
            params.client,
            recentSince,
            params.defaults.recentLimit
        );
        stats.recentMessagesFetched = await appendFetchedMessages({
            client: params.client,
            messages,
            seenIds,
            uids: recentUids,
            sourceTag: "recent_window",
        });
    } catch (error) {
        stats.fallbackUsed = true;
        stats.fallbackReason =
            error instanceof Error ? error.message : "recent SINCE search failed";

        const newestUids = await collectNewestUidsByEnvelope({
            client: params.client,
            totalMessages: params.totalMessages,
            since: recentSince,
            limit: params.defaults.recentLimit,
            batchSize: params.defaults.deepFallbackBatchSize,
            excludedIds: seenIds,
        });
        stats.recentMessagesFetched = await appendFetchedMessages({
            client: params.client,
            messages,
            seenIds,
            uids: newestUids,
            sourceTag: "recent_window",
        });
    }

    if (params.defaults.targetedEnabled && params.defaults.targetedLimit > 0) {
        const targeted = await collectTargetedSearchUids({
            client: params.client,
            terms: TARGETED_SEARCH_TERMS,
            since: params.defaults.scanMode === "deep" ? deepSince : recentSince,
            limit: params.defaults.targetedLimit,
            headerOnly: false,
        });
        stats.targetedQueriesRun = targeted.queriesRun;
        stats.targetedMessagesMatched = targeted.matched;
        stats.targetedMessagesUniqueMatched = targeted.uniqueMatched;
        stats.targetedMessagesFetched = await appendFetchedMessages({
            client: params.client,
            messages,
            seenIds,
            uids: targeted.uids,
            sourceTag: "targeted",
        });
    }

    if (
        params.defaults.headerTargetedEnabled &&
        params.defaults.headerTargetedLimit > 0
    ) {
        const headerTargeted = await collectTargetedSearchUids({
            client: params.client,
            terms: TARGETED_SEARCH_TERMS,
            since: params.defaults.scanMode === "deep" ? deepSince : recentSince,
            limit: params.defaults.headerTargetedLimit,
            headerOnly: true,
        });
        stats.headerTargetedQueriesRun = headerTargeted.queriesRun;
        stats.headerTargetedMessagesMatched = headerTargeted.matched;
        stats.headerTargetedUniqueMatched = headerTargeted.uniqueMatched;
        stats.headerTargetedMessagesFetched = await appendFetchedMessages({
            client: params.client,
            messages,
            seenIds,
            uids: headerTargeted.uids,
            sourceTag: "header_targeted",
        });
    }

    const targetedUseful =
        stats.targetedMessagesFetched > 0 || stats.headerTargetedMessagesFetched > 0;

    if (params.defaults.metadataPrepassEnabled && !targetedUseful) {
        const prepass = await collectMetadataPrepassUids({
            client: params.client,
            totalMessages: params.totalMessages,
            since: deepSince,
            prepassLimit: params.defaults.metadataPrepassLimit,
            matchLimit: params.defaults.metadataPrepassMatchLimit,
            batchSize: params.defaults.metadataPrepassBatchSize,
            alreadyFetchedIds: seenIds,
        });
        stats.metadataPrepassMessagesScanned = prepass.messagesScanned;
        stats.metadataPrepassMatches = prepass.matches;
        stats.metadataPrepassSkippedAlreadyFetched = prepass.skippedAlreadyFetched;
        stats.metadataPrepassTopTerms = prepass.topTerms;
        stats.metadataPrepassFetched = await appendFetchedMessages({
            client: params.client,
            messages,
            seenIds,
            uids: prepass.uids,
            sourceTag: "metadata-prepass",
        });
    }

    if (params.defaults.deepFallbackEnabled && !targetedUseful) {
        const bucketResult = await collectDeepBucketUids({
            client: params.client,
            since: deepSince,
            now: params.now,
            maxFetch: params.defaults.deepFallbackMaxFetch,
            bucketDays: params.defaults.deepFallbackBucketDays,
            perBucketLimit: params.defaults.deepFallbackPerBucketLimit,
            sampleMode: params.defaults.deepFallbackBucketSampleMode,
            excludedIds: seenIds,
        });
        stats.deepFallbackStrategy = bucketResult.strategy;
        stats.deepFallbackBucketsTotal = bucketResult.bucketsTotal;
        stats.deepFallbackBucketsQueried = bucketResult.bucketsQueried;
        stats.deepFallbackBucketsWithMatches = bucketResult.bucketsWithMatches;
        stats.deepFallbackMessagesMatchedBeforeCap =
            bucketResult.messagesMatchedBeforeCap;
        stats.deepFallbackUidCandidatesBeforeSampling =
            bucketResult.uidCandidatesBeforeSampling;
        stats.deepFallbackUidCandidatesAfterSampling =
            bucketResult.uidCandidatesAfterSampling;

        let fallbackUids = bucketResult.uids;

        if (bucketResult.strategy === "newest_first_fallback") {
            stats.deepFallbackReason = "Per-bucket SINCE/BEFORE search failed.";
            fallbackUids = await collectNewestUidsByEnvelope({
                client: params.client,
                totalMessages: params.totalMessages,
                since: deepSince,
                limit: params.defaults.deepFallbackMaxFetch,
                batchSize: params.defaults.deepFallbackBatchSize,
                excludedIds: seenIds,
            });
        }

        stats.deepFallbackMessagesFetched = await appendFetchedMessages({
            client: params.client,
            messages,
            seenIds,
            uids: fallbackUids,
            sourceTag:
                bucketResult.strategy === "time_buckets"
                    ? "deep_bucket"
                    : "deep_fallback",
        });
        stats.deepFallbackUsed = stats.deepFallbackMessagesFetched > 0;
    }

    return { messages, stats };
}

async function analyzeFetchedMessage(message: {
    uid?: number | string;
    seq?: number | string;
    envelope?: {
        from?: MessageAddressObject[];
        subject?: string;
        date?: Date | string;
    };
    internalDate?: Date | string;
    source?: Buffer;
}): Promise<ProductionImapScanMessage> {
    const id = String(message.uid ?? message.seq ?? "");
    const from = cleanText(formatAddress(message.envelope?.from?.[0]));
    const subject = cleanText(message.envelope?.subject ?? "");
    const dateValue = message.envelope?.date ?? message.internalDate;
    const date =
        dateValue instanceof Date
            ? dateValue.toISOString()
            : cleanText(String(dateValue ?? ""));
    const snippet = await sourceToSnippet(message.source);
    const analysis = analyzeMessageForSubscription({
        id,
        from,
        subject,
        date,
        snippet,
    });
    const debug = debugAnalyzeMessageForSubscription({
        id,
        from,
        subject,
        date,
        snippet,
    });

    return {
        id,
        from,
        subject,
        date,
        snippet,
        confidence: analysis.confidence,
        reasons: analysis.reasons,
        detected: analysis.detected,
        debug,
        sourceTags: [],
    };
}

export async function scanImapSubscriptions(
    input: ScanImapSubscriptionsInput
): Promise<ScanImapSubscriptionsResult> {
    const profile = input.profile ?? "adaptive";
    const defaults = profileDefaults(profile);
    const mailbox = input.mailbox?.trim() || "INBOX";
    const now = input.now ?? new Date();
    const client = new ImapFlow({
        host: input.host,
        port: input.port,
        secure: input.secure,
        auth: {
            user: input.username,
            pass: input.password,
        },
        logger: false,
    });

    try {
        await client.connect();
        const mailboxInfo = await client.mailboxOpen(mailbox);
        const mailboxTotalMessages = mailboxInfo.exists ?? 0;
        const { messages, stats } =
            mailboxTotalMessages > 0
                ? await fetchAnalyzedMessages({
                      client,
                      totalMessages: mailboxTotalMessages,
                      now,
                      defaults,
                  })
                : {
                      messages: [],
                      stats: emptyCollectionStats(defaults),
                  };
        const candidates = messages.filter((message) => message.debug.finalDecision === "candidate");
        const canonicalItems = canonicalItemsFromCandidates(candidates, now);
        const productResult = buildProductResult(canonicalItems);
        const capabilityDiagnostics = buildScanCapabilityDiagnostics({
            fallbackUsed: stats.fallbackUsed,
            mailboxTotalMessages,
            targetedQueriesRun: stats.targetedQueriesRun,
            targetedMessagesUniqueMatched: stats.targetedMessagesUniqueMatched,
            targetedMessagesFetched: stats.targetedMessagesFetched,
            headerTargetedQueriesRun: stats.headerTargetedQueriesRun,
            headerTargetedUniqueMatched: stats.headerTargetedUniqueMatched,
            headerTargetedMessagesFetched: stats.headerTargetedMessagesFetched,
            metadataPrepassEnabled: stats.metadataPrepassEnabled,
            metadataPrepassMessagesScanned: stats.metadataPrepassMessagesScanned,
            metadataPrepassFetched: stats.metadataPrepassFetched,
            deepFallbackUsed: stats.deepFallbackUsed,
            deepFallbackMessagesFetched: stats.deepFallbackMessagesFetched,
            uniqueMessagesAnalyzed: messages.length,
        });
        const plan = planImapScanStrategy(profile, capabilityDiagnostics, {
            scanMode: defaults.scanMode,
            scanDays: defaults.scanDays,
            deepDays: defaults.deepDays,
            recentMessagesFetched: stats.recentMessagesFetched,
            mailboxTotalMessages,
            targetedQueriesRun: stats.targetedQueriesRun,
            headerTargetedQueriesRun: stats.headerTargetedQueriesRun,
            metadataPrepassEnabled: stats.metadataPrepassEnabled,
            deepFallbackUsed: stats.deepFallbackUsed,
            fallbackUsed: stats.fallbackUsed,
            mayMissYearlySubscriptions: defaults.scanDays < 365 && defaults.scanMode !== "deep",
            hasCurrentSubscriptions: productResult.scanSummary.hasCurrentSubscriptions,
            needsReviewSubscriptions:
                productResult.scanSummary.needsReviewSubscriptions,
            historicalSubscriptions:
                productResult.scanSummary.historicalSubscriptions,
            priceChanges: productResult.scanSummary.priceChanges,
            billsOrUtilities: productResult.scanSummary.billsOrUtilities,
        });
        const coverageNote =
            plan.userFacingCoverageNote +
            (stats.targetedQueriesRun > 0 &&
            stats.headerTargetedQueriesRun > 0 &&
            stats.targetedMessagesFetched === 0 &&
            stats.headerTargetedMessagesFetched === 0 &&
            stats.metadataPrepassFetched > 0
                ? " Targeted IMAP search returned 0; metadata prepass was used."
                : "");
        const scanSummary: ImapScanSummary = {
            scanProfile: profile,
            scanMode: defaults.scanMode,
            effectiveScanMode: plan.effectiveScanMode,
            effectiveWindowDays: plan.effectiveWindowDays,
            scanWindowDays: defaults.scanDays,
            deepWindowDays: defaults.deepDays,
            mailbox,
            mailboxTotalMessages,
            recentMessagesFetched: stats.recentMessagesFetched,
            targetedQueriesRun: stats.targetedQueriesRun,
            targetedMessagesMatched: stats.targetedMessagesMatched,
            targetedMessagesUniqueMatched: stats.targetedMessagesUniqueMatched,
            targetedMessagesFetched: stats.targetedMessagesFetched,
            headerTargetedQueriesRun: stats.headerTargetedQueriesRun,
            headerTargetedMessagesMatched: stats.headerTargetedMessagesMatched,
            headerTargetedUniqueMatched: stats.headerTargetedUniqueMatched,
            headerTargetedMessagesFetched: stats.headerTargetedMessagesFetched,
            metadataPrepassEnabled: stats.metadataPrepassEnabled,
            metadataPrepassWindowDays: stats.metadataPrepassWindowDays,
            metadataPrepassMessagesScanned: stats.metadataPrepassMessagesScanned,
            metadataPrepassMatches: stats.metadataPrepassMatches,
            metadataPrepassFetched: stats.metadataPrepassFetched,
            metadataPrepassSkippedAlreadyFetched:
                stats.metadataPrepassSkippedAlreadyFetched,
            metadataPrepassFetchLimit: stats.metadataPrepassFetchLimit,
            metadataPrepassTopTerms: stats.metadataPrepassTopTerms,
            deepFallbackUsed: stats.deepFallbackUsed,
            deepFallbackReason: stats.deepFallbackReason,
            deepFallbackStrategy: stats.deepFallbackStrategy,
            deepFallbackMessagesFetched: stats.deepFallbackMessagesFetched,
            deepFallbackWindowDays: stats.deepFallbackWindowDays,
            deepFallbackBatchSize: stats.deepFallbackBatchSize,
            deepFallbackBucketDays: stats.deepFallbackBucketDays,
            deepFallbackBucketSampleMode: stats.deepFallbackBucketSampleMode,
            deepFallbackBucketsTotal: stats.deepFallbackBucketsTotal,
            deepFallbackBucketsQueried: stats.deepFallbackBucketsQueried,
            deepFallbackBucketsWithMatches: stats.deepFallbackBucketsWithMatches,
            deepFallbackPerBucketLimit: stats.deepFallbackPerBucketLimit,
            deepFallbackMessagesMatchedBeforeCap:
                stats.deepFallbackMessagesMatchedBeforeCap,
            deepFallbackUidCandidatesBeforeSampling:
                stats.deepFallbackUidCandidatesBeforeSampling,
            deepFallbackUidCandidatesAfterSampling:
                stats.deepFallbackUidCandidatesAfterSampling,
            uniqueMessagesAnalyzed: messages.length,
            mayMissYearlySubscriptions:
                defaults.scanDays < 365 && defaults.scanMode !== "deep",
            coverageNote,
            scannedMessages: messages.length,
            candidatesFound: candidates.length,
            rejectedMessages: messages.length - candidates.length,
            scanReliabilityLevel: plan.scanReliabilityLevel,
            scanReliabilityReasons: [
                ...capabilityDiagnostics.scanCapabilityReasons,
                ...plan.scanReliabilityReasons,
            ],
            deepScanRecommended: plan.deepScanRecommended,
            deepScanReason: plan.deepScanReason,
            quickScanLikelyIncomplete: plan.quickScanLikelyIncomplete,
            userFacingCoverageNote: plan.userFacingCoverageNote,
            recommendedScanModeForProvider: plan.recommendedScanModeForProvider,
            recommendedFallbackStrategy: plan.recommendedFallbackStrategy,
            sinceSearchSupported: capabilityDiagnostics.sinceSearchSupported,
            bodySearchSupported: capabilityDiagnostics.bodySearchSupported,
            headerSearchSupported: capabilityDiagnostics.headerSearchSupported,
            uidFetchSupported: capabilityDiagnostics.uidFetchSupported,
            metadataPrepassSupported:
                capabilityDiagnostics.metadataPrepassSupported,
            deepFallbackSupported: capabilityDiagnostics.deepFallbackSupported,
            targetedSearchUseful: capabilityDiagnostics.targetedSearchUseful,
            headerSearchUseful: capabilityDiagnostics.headerSearchUseful,
            metadataPrepassUseful: capabilityDiagnostics.metadataPrepassUseful,
            fallbackUseful: capabilityDiagnostics.fallbackUseful,
            shouldRunTargetedSearch: plan.shouldRunTargetedSearch,
            shouldRunHeaderTargetedSearch: plan.shouldRunHeaderTargetedSearch,
            shouldRunMetadataPrepass: plan.shouldRunMetadataPrepass,
            shouldRunDeepFallback: plan.shouldRunDeepFallback,
            deepScanAvailable: plan.deepScanAvailable,
            canonicalSubscriptions: canonicalItems.length,
            reviewCandidates: 0,
        };

        return {
            productResult,
            scanSummary,
            ...(input.includeDebug
                ? {
                      debug: {
                          messages: messages.map((message) => ({
                              ...message,
                              snippet: truncateEvidenceSnippet(message.snippet),
                          })),
                      },
                  }
                : {}),
        };
    } catch (error) {
        if (error instanceof ImapScanServiceError) {
            throw error;
        }

        throw new ImapScanServiceError(
            "IMAP_SCAN_FAILED",
            error instanceof Error ? error.message : "IMAP scan failed."
        );
    } finally {
        try {
            await client.logout();
        } catch {
            // Ignore logout failures; the scan result/error above is more useful.
        }
    }
}
