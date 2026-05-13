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
    scanMode: "recent_window" | "hybrid_window" | "deep";
    scanDays: number;
    deepDays: number;
    targetedSearch: boolean;
    targetedSearchLimit: number;
    targetedTerms: string[];
    targetedVerbose: boolean;
    headerTargetedEnabled: boolean;
    headerTargetedLimit: number;
    headerTargetedTerms: string[];
    metadataPrepassEnabled: boolean;
    metadataPrepassDays: number;
    metadataPrepassLimit: number;
    metadataPrepassFetchBatchSize: number;
    metadataPrepassMatchLimit: number;
    metadataPrepassVerbose: boolean;
    deepFallbackEnabled: boolean;
    deepBatchSize: number;
    deepMaxFetch: number;
    deepBucketDays: number;
    deepPerBucketLimit: number;
    deepBucketSampleMode: "newest" | "mixed" | "even";
    showReviewCandidates: boolean;
    reviewLimit: number;
    reviewSuppressVerbose: boolean;
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
    source: "recent_window" | "targeted_search" | "header_targeted" | "metadata_prepass" | "deep_fallback";
    sourceTags: Array<"recent_window" | "targeted" | "header_targeted" | "metadata-prepass" | "deep_fallback" | "deep_bucket">;
    debug?: EmailDetectionDebugDetails;
};

type ImapScanStats = {
    scanMode: ImapSpikeConfig["scanMode"];
    scanWindowDays: number;
    deepWindowDays?: number;
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
    metadataPrepassWindowDays?: number;
    metadataPrepassMessagesScanned: number;
    metadataPrepassMatches: number;
    metadataPrepassFetched: number;
    metadataPrepassSkippedAlreadyFetched: number;
    metadataPrepassFetchLimit: number;
    metadataPrepassTopTerms: string[];
    uniqueMessagesAnalyzed: number;
    fallbackUsed: boolean;
    fallbackReason?: string;
    deepFallbackUsed: boolean;
    deepFallbackReason?: string;
    deepFallbackStrategy: "time_buckets" | "newest_first_fallback" | "none";
    deepFallbackMessagesFetched: number;
    deepFallbackWindowDays?: number;
    deepFallbackBatchSize: number;
    deepFallbackBucketDays: number;
    deepFallbackBucketSampleMode: ImapSpikeConfig["deepBucketSampleMode"];
    deepFallbackBucketsTotal: number;
    deepFallbackBucketsQueried: number;
    deepFallbackBucketsWithMatches: number;
    deepFallbackPerBucketLimit: number;
    deepFallbackMessagesMatchedBeforeCap: number;
    deepFallbackUidCandidatesBeforeSampling: number;
    deepFallbackUidCandidatesAfterSampling: number;
    reviewCandidatesBeforeSuppression: number;
    reviewCandidatesAfterSuppression: number;
    reviewSuppressedOneTimeOrders: number;
    reviewSuppressedPrimeVideoOrders: number;
    reviewSuppressedWeakPurchases: number;
    mayMissYearlySubscriptions: boolean;
    coverageNote: string;
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
    id: string;
    subscriptionKey: string;
    displayName: string;
    provider?: string;
    billingProvider?: string;
    billingChannel?: string;
    category?: string;
    confidence: number;
    confidenceLevel: "high" | "medium" | "low";
    status: "active" | "trial" | "price_change" | "invoice_due" | "payment_failed" | "cancelled" | "expired" | "unknown";
    source: "message" | "recurring_group" | "marketplace" | "payment_processor" | "mixed";
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
    chargedDateText?: string;
    selectedAmountSourceDate?: string;
    selectedAmountSourceSubject?: string;
    amountSemantics?: AmountSemantics[];
    dateSemantics?: DateSemantics[];
    sourceTypes: string[];
    statusReason?: string;
    amounts: string[];
    allAmounts: string[];
    firstSeen: string;
    lastSeen: string;
    latestSubject?: string;
    messageCount: number;
    sourceMessagesCount: number;
    sourceMessageIds: string[];
    sourceSubjects: string[];
    sourceSenders: string[];
    evidenceTypes: string[];
    evidenceSummary: string[];
    riskSummary: string[];
    reasons: string[];
    needsReview: boolean;
    reviewReason?: string;
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
    scanStats: ImapScanStats;
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

function parseScanMode(value: string | undefined): ImapSpikeConfig["scanMode"] {
    const mode = value?.trim() || "recent_window";

    if (["recent_window", "hybrid_window", "deep"].includes(mode)) {
        return mode as ImapSpikeConfig["scanMode"];
    }

    throw new Error("IMAP_SCAN_MODE must be recent_window, hybrid_window, or deep.");
}

function parseDeepBucketSampleMode(
    value: string | undefined
): ImapSpikeConfig["deepBucketSampleMode"] {
    const mode = value?.trim() || "mixed";

    if (["newest", "mixed", "even"].includes(mode)) {
        return mode as ImapSpikeConfig["deepBucketSampleMode"];
    }

    throw new Error("IMAP_DEEP_BUCKET_SAMPLE_MODE must be newest, mixed, or even.");
}

function parseTargetedTerms(value: string | undefined) {
    if (!value?.trim()) {
        return PRODUCT_TARGETED_SEARCH_TERMS;
    }

    const trimmed = value.trim();
    const override = /^override:/i.test(trimmed);
    const rawTerms = trimmed.replace(/^override:/i, "");
    const envTerms = rawTerms
        .split(",")
        .map((term) => cleanText(term))
        .filter(Boolean);

    return [...new Set([...(override ? [] : PRODUCT_TARGETED_SEARCH_TERMS), ...envTerms])];
}

function parseHeaderTargetedTerms(value: string | undefined) {
    if (!value?.trim()) {
        return HEADER_TARGETED_SEARCH_TERMS;
    }

    const trimmed = value.trim();
    const override = /^override:/i.test(trimmed);
    const rawTerms = trimmed.replace(/^override:/i, "");
    const envTerms = rawTerms
        .split(",")
        .map((term) => cleanText(term))
        .filter(Boolean);

    return [...new Set([...(override ? [] : HEADER_TARGETED_SEARCH_TERMS), ...envTerms])];
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

    const scanMode = parseScanMode(process.env.IMAP_SCAN_MODE);
    const deepDays = parsePositiveInteger(
        process.env.IMAP_DEEP_DAYS,
        730,
        "IMAP_DEEP_DAYS"
    );
    const targetedSearchLimit = parsePositiveInteger(
        process.env.IMAP_TARGETED_LIMIT ?? process.env.IMAP_TARGETED_SEARCH_LIMIT,
        300,
        "IMAP_TARGETED_LIMIT"
    );

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
        scanMode,
        scanDays: parsePositiveInteger(
            process.env.IMAP_SCAN_DAYS,
            90,
            "IMAP_SCAN_DAYS"
        ),
        deepDays,
        targetedSearch: parseBoolean(
            process.env.IMAP_TARGETED_SEARCH,
            ["hybrid_window", "deep"].includes(scanMode)
        ),
        targetedSearchLimit,
        targetedTerms: parseTargetedTerms(process.env.IMAP_TARGETED_TERMS),
        targetedVerbose: parseBoolean(process.env.IMAP_TARGETED_VERBOSE, false),
        headerTargetedEnabled: parseBoolean(
            process.env.IMAP_HEADER_TARGETED_ENABLED,
            scanMode === "deep"
        ),
        headerTargetedLimit: parsePositiveInteger(
            process.env.IMAP_HEADER_TARGETED_LIMIT,
            500,
            "IMAP_HEADER_TARGETED_LIMIT"
        ),
        headerTargetedTerms: parseHeaderTargetedTerms(
            process.env.IMAP_HEADER_TARGETED_TERMS
        ),
        metadataPrepassEnabled: parseBoolean(
            process.env.IMAP_METADATA_PREPASS_ENABLED,
            scanMode === "deep"
        ),
        metadataPrepassDays: parsePositiveInteger(
            process.env.IMAP_METADATA_PREPASS_DAYS,
            deepDays,
            "IMAP_METADATA_PREPASS_DAYS"
        ),
        metadataPrepassLimit: parsePositiveInteger(
            process.env.IMAP_METADATA_PREPASS_LIMIT,
            3000,
            "IMAP_METADATA_PREPASS_LIMIT"
        ),
        metadataPrepassFetchBatchSize: parsePositiveInteger(
            process.env.IMAP_METADATA_PREPASS_FETCH_BATCH_SIZE,
            200,
            "IMAP_METADATA_PREPASS_FETCH_BATCH_SIZE"
        ),
        metadataPrepassMatchLimit: parsePositiveInteger(
            process.env.IMAP_METADATA_PREPASS_MATCH_LIMIT,
            800,
            "IMAP_METADATA_PREPASS_MATCH_LIMIT"
        ),
        metadataPrepassVerbose: parseBoolean(
            process.env.IMAP_METADATA_PREPASS_VERBOSE,
            false
        ),
        deepFallbackEnabled: parseBoolean(
            process.env.IMAP_DEEP_FALLBACK_ENABLED,
            true
        ),
        deepBatchSize: parsePositiveInteger(
            process.env.IMAP_DEEP_BATCH_SIZE,
            200,
            "IMAP_DEEP_BATCH_SIZE"
        ),
        deepMaxFetch: parsePositiveInteger(
            process.env.IMAP_DEEP_MAX_FETCH,
            targetedSearchLimit,
            "IMAP_DEEP_MAX_FETCH"
        ),
        deepBucketDays: parsePositiveInteger(
            process.env.IMAP_DEEP_BUCKET_DAYS,
            30,
            "IMAP_DEEP_BUCKET_DAYS"
        ),
        deepPerBucketLimit: parsePositiveInteger(
            process.env.IMAP_DEEP_PER_BUCKET_LIMIT,
            80,
            "IMAP_DEEP_PER_BUCKET_LIMIT"
        ),
        deepBucketSampleMode: parseDeepBucketSampleMode(
            process.env.IMAP_DEEP_BUCKET_SAMPLE_MODE
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
        reviewSuppressVerbose: parseBoolean(
            process.env.IMAP_REVIEW_SUPPRESS_VERBOSE,
            false
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

const PRODUCT_TARGETED_SEARCH_TERMS = [
    ...TARGETED_SEARCH_TERMS,
    "czlonkostwo",
    "członkostwo",
    "membership",
    "paid plan",
    "plan platny",
    "plan płatny",
    "payment",
    "płatność",
    "platnosc",
    "zaplata",
    "zapłata",
    "charged",
    "obciaz",
    "obciąż",
    "naliczona oplata",
    "naliczona opłata",
    "kwota do zaplaty",
    "kwota do zapłaty",
    "termin platnosci",
    "termin płatności",
    "renew",
    "odnawia",
    "automatycznie odnaw",
    "automatycznie przedluz",
    "automatycznie przedłuż",
    "next billing",
    "nastepna platnosc",
    "następna płatność",
    "billing date",
    "due date",
    "okres probny",
    "okres próbny",
    "bezplatny okres probny",
    "bezpłatny okres próbny",
    "free trial",
    "po zakonczeniu okresu probnego",
    "po zakończeniu okresu próbnego",
    "after trial",
    "zostanie naliczona",
    "eFaktura",
    "e-faktura",
    "Apple",
    "Autopay",
    "PayU",
    "Przelewy24",
    "Tpay",
    "faktura za prad",
    "faktura za prąd",
    "faktura za internet",
    "rachunek za telefon",
    "rachunek za internet",
];

const HEADER_TARGETED_SEARCH_TERMS = [
    ...new Set([
        ...TARGETED_SEARCH_TERMS,
        "subscription",
        "subskrypcja",
        "abonament",
        "renewal",
        "odnowienie",
        "faktura",
        "eFaktura",
        "rachunek",
        "payment",
        "płatność",
        "Prime Video",
        "Google Play",
        "App Store",
        "Amazon Prime",
        "PayPal",
        "Stripe",
        "Adobe",
        "Max",
        "SkyShowtime",
        "Tauron",
        "Uber One",
    ]),
];

const METADATA_PREPASS_TERMS = [
    ...new Set([
        ...HEADER_TARGETED_SEARCH_TERMS,
        "subscription",
        "subskrypcja",
        "abonament",
        "czlonkostwo",
        "członkostwo",
        "membership",
        "premium",
        "plan",
        "faktura",
        "e-faktura",
        "eFaktura",
        "rachunek",
        "płatność",
        "platnosc",
        "payment",
        "invoice",
        "receipt",
        "renewal",
        "odnowienie",
        "automatic renewal",
        "automatycznie odnaw",
        "trial",
        "okres próbny",
        "okres probny",
        "bezpłatny okres próbny",
        "bezplatny okres probny",
        "zostanie naliczona",
        "Netflix",
        "Spotify",
        "YouTube",
        "Google Play",
        "Google One",
        "Apple",
        "iCloud",
        "Disney",
        "Max",
        "SkyShowtime",
        "Prime Video",
        "Amazon Prime",
        "Adobe",
        "Canva",
        "Microsoft",
        "Dropbox",
        "Uber One",
        "Wolt",
        "Allegro Smart",
        "Play",
        "Orange",
        "T-Mobile",
        "Plus",
        "Netia",
        "Vectra",
        "TOYA",
        "Tauron",
        "PGE",
        "Energa",
        "E.ON",
        "PayPal",
        "Stripe",
        "PayU",
        "Przelewy24",
        "Tpay",
        "Autopay",
    ]),
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
    rawSource:
        | "recent_window"
        | "targeted_search"
        | "header_targeted"
        | "metadata_prepass"
        | "deep_fallback"
        | "deep_bucket"
) {
    const id = String(message.uid ?? message.seq);

    if (!id) {
        return;
    }

    const source = rawSource === "deep_bucket" ? "deep_fallback" : rawSource;
    const sourceTags =
        rawSource === "targeted_search"
            ? (["targeted"] as const)
            : rawSource === "header_targeted"
              ? (["header_targeted"] as const)
              : rawSource === "metadata_prepass"
                ? (["metadata-prepass"] as const)
            : rawSource === "deep_fallback"
              ? (["deep_fallback"] as const)
              : rawSource === "deep_bucket"
                ? (["deep_fallback", "deep_bucket"] as const)
                : (["recent_window"] as const);

    if (seenIds.has(id)) {
        const existing = debugMessages.find((item) => item.id === id);

        if (existing) {
            for (const sourceTag of sourceTags) {
                if (!existing.sourceTags.includes(sourceTag)) {
                    existing.sourceTags.push(sourceTag);
                }
            }
        }

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
        sourceTags: [...sourceTags],
        debug,
    });
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
            for (const item of value) {
                addValue(item);
            }
            return;
        }

        if (value instanceof Set) {
            for (const item of value) {
                addValue(item);
            }
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
                    // Fall through to object values for unusual iterable-like results.
                }
            }

            for (const item of Object.values(candidate)) {
                addValue(item);
            }
        }
    };

    addValue(result);

    const uids = values
        .map((value) =>
            typeof value === "number"
                ? value
                : typeof value === "string"
                  ? Number(value)
                  : NaN
        )
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value));

    return [...new Set(uids)].sort((a, b) => b - a);
}

async function collectTargetedSearchUids(
    client: ImapFlow,
    terms: string[],
    since: Date,
    limit: number,
    verbose: boolean
) {
    const uids = new Set<number>();
    let queriesRun = 0;
    let matched = 0;
    const allMatchedUids = new Set<number>();

    for (const term of terms) {
        if (uids.size >= limit) {
            break;
        }

        try {
            queriesRun += 1;
            const result = await (client as any).search(
                { since, body: term },
                { uid: true }
            );
            const matches = normalizeSearchUids(result);
            matched += matches.length;

            for (const uid of matches) {
                allMatchedUids.add(uid);
            }

            if (verbose) {
                console.error(
                    `Targeted IMAP search: term="${term}", type=body, normalizedMatches=${matches.length}`
                );
            }

            for (const uid of matches) {
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

    return {
        uids: [...uids].slice(0, limit),
        queriesRun,
        matched,
        uniqueMatched: allMatchedUids.size,
    };
}

async function collectHeaderTargetedSearchUids(
    client: ImapFlow,
    terms: string[],
    since: Date,
    limit: number,
    verbose: boolean
) {
    const uids = new Set<number>();
    const allMatchedUids = new Set<number>();
    let queriesRun = 0;
    let matched = 0;

    for (const term of terms) {
        if (uids.size >= limit) {
            break;
        }

        const queries: Array<{ label: string; criteria: Record<string, unknown> }> = [
            { label: "subject", criteria: { since, header: ["subject", term] } },
            { label: "from", criteria: { since, from: term } },
        ];

        for (const query of queries) {
            if (uids.size >= limit) {
                break;
            }

            try {
                queriesRun += 1;
                const result = await (client as any).search(query.criteria, {
                    uid: true,
                });
                const matches = normalizeSearchUids(result);
                matched += matches.length;

                for (const uid of matches) {
                    allMatchedUids.add(uid);
                }

                if (verbose) {
                    console.error(
                        `Header targeted IMAP search: term="${term}", type=${query.label}, normalizedMatches=${matches.length}`
                    );
                }

                for (const uid of matches) {
                    uids.add(uid);

                    if (uids.size >= limit) {
                        break;
                    }
                }
            } catch (error) {
                if (verbose) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "header targeted search failed";
                    console.error(
                        `Header targeted IMAP search skipped for "${term}" (${query.label}): ${message}`
                    );
                }
            }
        }
    }

    return {
        uids: [...uids].slice(0, limit),
        queriesRun,
        matched,
        uniqueMatched: allMatchedUids.size,
    };
}

type MetadataPrepassResult = {
    uids: number[];
    messagesScanned: number;
    matches: number;
    skippedAlreadyFetched: number;
    topTerms: string[];
};

function chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}

function scoreMetadataPrepassMessage(message: {
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
    const date = messageDateFromEnvelope(message);
    const text = `${from} ${subject}`.toLowerCase();
    const asciiText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const subjectAscii = subject
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const terms: string[] = [];
    let score = 0;

    const add = (amount: number, term: string) => {
        score += amount;

        if (!terms.includes(term)) {
            terms.push(term);
        }
    };

    if (/\b(subskrypcja|abonament|subscription|membership|premium|paid plan)\b/i.test(asciiText)) {
        add(0.45, "subscription subject");
    }

    if (/\b(faktura|e-faktura|efaktura|rachunek|invoice|receipt|payment|platnosc|platnosc|płatność)\b/i.test(asciiText)) {
        add(0.4, "billing subject");
    }

    if (/\b(renewal|odnowienie|automatycznie odnaw|trial|okres probny|zostanie naliczona)\b/i.test(asciiText)) {
        add(0.4, "renewal/trial subject");
    }

    if (/\b(potwierdzenie platnosci|potwierdzenie płatności|dziekujemy za zakup|dziękujemy za zakup)\b/i.test(asciiText)) {
        add(0.22, "purchase/payment confirmation subject");
    }

    for (const term of METADATA_PREPASS_TERMS) {
        const normalizedTerm = cleanText(term)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (!normalizedTerm || normalizedTerm.length < 3) {
            continue;
        }

        if (subjectAscii.includes(normalizedTerm)) {
            add(0.18, `subject:${term}`);
        } else if (asciiText.includes(normalizedTerm)) {
            add(0.1, `from:${term}`);
        }
    }

    if (/\b(paypal|stripe|payu|przelewy24|tpay|autopay|googleplay-noreply|primevideo|adobe|tauron|uberone|amazon|netflix|spotify|youtube|max|skyshowtime)\b/i.test(asciiText)) {
        add(0.18, "trusted/provider-like sender");
    }

    if (/\b(zamowienie|order|rental|wypozyczenie|refund|zwrot|reklamacja|newsletter|regulamin|terms update|security|login|kod|verification code)\b/i.test(asciiText)) {
        score -= 0.35;
        terms.push("risk:order/security/newsletter");
    }

    return {
        uid: Number.isFinite(uid) && uid > 0 ? Math.trunc(uid) : undefined,
        score,
        date: date?.toISOString() ?? "",
        terms,
    };
}

async function collectMetadataPrepassUids(
    client: ImapFlow,
    totalMessages: number,
    since: Date,
    prepassLimit: number,
    matchLimit: number,
    batchSize: number,
    alreadyFetchedIds: Set<string>,
    verbose: boolean
): Promise<MetadataPrepassResult> {
    let candidateUids: number[] = [];

    try {
        const result = await (client as any).search({ since }, { uid: true });
        candidateUids = normalizeSearchUids(result).slice(0, prepassLimit);
    } catch (error) {
        if (verbose) {
            const message =
                error instanceof Error ? error.message : "metadata SINCE search failed";
            console.error(`Metadata prepass SINCE search skipped: ${message}`);
        }
    }

    if (candidateUids.length === 0) {
        candidateUids = await collectDeepFallbackUidsByBatch(
            client,
            totalMessages,
            since,
            prepassLimit,
            batchSize,
            new Set(),
            verbose
        );
    }

    const hits: Array<{
        uid: number;
        score: number;
        date: string;
        terms: string[];
    }> = [];
    let messagesScanned = 0;
    const termCounts = new Map<string, number>();

    for (const chunk of chunkArray(candidateUids, batchSize)) {
        try {
            for await (const message of client.fetch(
                chunk,
                {
                    envelope: true,
                    internalDate: true,
                    flags: true,
                } as any,
                { uid: true }
            )) {
                messagesScanned += 1;
                const scored = scoreMetadataPrepassMessage(message);

                if (!scored.uid || scored.score < 0.25) {
                    continue;
                }

                hits.push(scored as {
                    uid: number;
                    score: number;
                    date: string;
                    terms: string[];
                });

                for (const term of scored.terms.slice(0, 6)) {
                    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
                }
            }
        } catch (error) {
            if (verbose) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "metadata envelope fetch failed";
                console.error(`Metadata prepass envelope batch skipped: ${message}`);
            }
        }
    }

    const sortedHits = hits.sort(
        (a, b) => b.score - a.score || Date.parse(b.date) - Date.parse(a.date)
    );
    const selected: number[] = [];
    let skippedAlreadyFetched = 0;

    for (const hit of sortedHits) {
        if (alreadyFetchedIds.has(String(hit.uid))) {
            skippedAlreadyFetched += 1;
            continue;
        }

        selected.push(hit.uid);

        if (selected.length >= matchLimit) {
            break;
        }
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

async function collectRecentWindowUids(
    client: ImapFlow,
    since: Date,
    limit: number
) {
    const result = await (client as any).search({ since }, { uid: true });

    return normalizeSearchUids(result).slice(0, limit);
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

async function collectDeepFallbackUidsByBatch(
    client: ImapFlow,
    totalMessages: number,
    since: Date,
    limit: number,
    batchSize: number,
    excludedIds: Set<string>,
    verbose: boolean
) {
    const selected = new Set<number>();
    let currentEnd = totalMessages;

    while (currentEnd > 0 && selected.size < limit) {
        const currentStart = Math.max(1, currentEnd - batchSize + 1);
        const range = `${currentStart}:${currentEnd}`;
        let sawAnyDate = false;
        let newestBatchDate: Date | undefined;

        if (verbose) {
            console.error(`Deep fallback envelope batch: range=${range}`);
        }

        for await (const message of client.fetch(range, {
            envelope: true,
            internalDate: true,
            uid: true,
        } as any)) {
            const uid = Number(message.uid ?? message.seq);
            const messageDate = messageDateFromEnvelope(message);

            if (messageDate) {
                sawAnyDate = true;

                if (!newestBatchDate || messageDate > newestBatchDate) {
                    newestBatchDate = messageDate;
                }
            }

            if (
                Number.isFinite(uid) &&
                uid > 0 &&
                !excludedIds.has(String(uid)) &&
                (!messageDate || messageDate >= since)
            ) {
                selected.add(Math.trunc(uid));

                if (selected.size >= limit) {
                    break;
                }
            }
        }

        if (sawAnyDate && newestBatchDate && newestBatchDate < since) {
            break;
        }

        currentEnd = currentStart - 1;
    }

    return [...selected].sort((a, b) => b - a).slice(0, limit);
}

type DeepFallbackUidResult = {
    uids: number[];
    reason: string;
    strategy: ImapScanStats["deepFallbackStrategy"];
    bucketsTotal: number;
    bucketsQueried: number;
    bucketsWithMatches: number;
    matchedBeforeCap: number;
    uidCandidatesBeforeSampling: number;
    uidCandidatesAfterSampling: number;
};

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function takeEvenlySpaced<T>(items: T[], count: number) {
    if (count <= 0 || items.length === 0) {
        return [];
    }

    if (count >= items.length) {
        return [...items];
    }

    if (count === 1) {
        return [items[Math.floor(items.length / 2)]];
    }

    const selected: T[] = [];
    const lastIndex = items.length - 1;

    for (let index = 0; index < count; index += 1) {
        const itemIndex = Math.round((index * lastIndex) / (count - 1));
        selected.push(items[itemIndex]);
    }

    return selected;
}

function sampleBucketUids(
    uidsNewestFirst: number[],
    limit: number,
    mode: ImapSpikeConfig["deepBucketSampleMode"]
) {
    const uniqueNewestFirst = [...new Set(uidsNewestFirst)];

    if (limit >= uniqueNewestFirst.length) {
        return uniqueNewestFirst;
    }

    if (mode === "newest") {
        return uniqueNewestFirst.slice(0, limit);
    }

    if (mode === "even") {
        return takeEvenlySpaced(uniqueNewestFirst, limit);
    }

    const newestCount = Math.max(1, Math.floor(limit * 0.25));
    const oldestCount = Math.max(1, Math.floor(limit * 0.25));
    const selected = new Set<number>();

    for (const uid of uniqueNewestFirst.slice(0, newestCount)) {
        selected.add(uid);
    }

    for (const uid of uniqueNewestFirst.slice(-oldestCount)) {
        selected.add(uid);
    }

    const remaining = uniqueNewestFirst.filter((uid) => !selected.has(uid));
    const evenCount = limit - selected.size;

    for (const uid of takeEvenlySpaced(remaining, evenCount)) {
        selected.add(uid);
    }

    return [...selected].slice(0, limit);
}

async function collectDeepFallbackUidsByBuckets(
    client: ImapFlow,
    since: Date,
    limit: number,
    bucketDays: number,
    perBucketLimit: number,
    sampleMode: ImapSpikeConfig["deepBucketSampleMode"],
    excludedIds: Set<string>,
    verbose: boolean
): Promise<DeepFallbackUidResult> {
    const now = new Date();
    const selected = new Set<number>();
    let bucketsTotal = 0;
    let bucketsQueried = 0;
    let bucketsWithMatches = 0;
    let matchedBeforeCap = 0;
    let uidCandidatesBeforeSampling = 0;
    let uidCandidatesAfterSampling = 0;
    let bucketEnd = now;

    while (bucketEnd > since) {
        bucketsTotal += 1;
        bucketEnd = addDays(bucketEnd, -bucketDays);
    }

    bucketEnd = now;

    while (bucketEnd > since && selected.size < limit) {
        const bucketStart = addDays(bucketEnd, -bucketDays);
        const boundedStart = bucketStart < since ? since : bucketStart;
        bucketsQueried += 1;

        try {
            const result = await (client as any).search(
                { since: boundedStart, before: bucketEnd },
                { uid: true }
            );
            const matches = normalizeSearchUids(result).filter(
                (uid) => !excludedIds.has(String(uid))
            );
            matchedBeforeCap += matches.length;
            uidCandidatesBeforeSampling += matches.length;
            const sampledMatches = sampleBucketUids(
                matches,
                perBucketLimit,
                sampleMode
            );
            uidCandidatesAfterSampling += sampledMatches.length;

            if (matches.length > 0) {
                bucketsWithMatches += 1;
            }

            if (verbose) {
                console.error(
                    `Deep fallback bucket: since=${boundedStart.toISOString().slice(0, 10)}, before=${bucketEnd.toISOString().slice(0, 10)}, matches=${matches.length}, sampled=${sampledMatches.length}, mode=${sampleMode}`
                );
            }

            for (const uid of sampledMatches) {
                selected.add(uid);

                if (selected.size >= limit) {
                    break;
                }
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "deep bucket search failed";
            throw new Error(`Deep bucket search failed: ${message}`);
        }

        bucketEnd = boundedStart;
    }

    return {
        uids: [...selected].sort((a, b) => b - a).slice(0, limit),
        reason:
            "targeted search returned no usable messages; using stratified deep time-bucket fallback",
        strategy: "time_buckets",
        bucketsTotal,
        bucketsQueried,
        bucketsWithMatches,
        matchedBeforeCap,
        uidCandidatesBeforeSampling,
        uidCandidatesAfterSampling,
    };
}

async function collectDeepFallbackUids(
    client: ImapFlow,
    totalMessages: number,
    since: Date,
    limit: number,
    batchSize: number,
    bucketDays: number,
    perBucketLimit: number,
    sampleMode: ImapSpikeConfig["deepBucketSampleMode"],
    excludedIds: Set<string>,
    verbose: boolean
): Promise<DeepFallbackUidResult> {
    try {
        return await collectDeepFallbackUidsByBuckets(
            client,
            since,
            limit,
            bucketDays,
            perBucketLimit,
            sampleMode,
            excludedIds,
            verbose
        );
    } catch (error) {
        if (verbose) {
            const message =
                error instanceof Error ? error.message : "deep bucket fallback failed";
            console.error(`Deep fallback buckets failed: ${message}`);
        }
    }

    const batchedUids = await collectDeepFallbackUidsByBatch(
        client,
        totalMessages,
        since,
        limit,
        batchSize,
        excludedIds,
        verbose
    );

    return {
        uids: batchedUids,
        reason:
            "targeted search returned no usable messages; deep bucket search failed; using newest-first envelope batch fallback",
        strategy: "newest_first_fallback",
        bucketsTotal: 0,
        bucketsQueried: 0,
        bucketsWithMatches: 0,
        matchedBeforeCap: batchedUids.length,
        uidCandidatesBeforeSampling: batchedUids.length,
        uidCandidatesAfterSampling: batchedUids.length,
    };
}

function dateDaysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

function coverageNoteFor(config: ImapSpikeConfig) {
    if (config.scanMode === "deep") {
        return "Deep scan searches a wider window for yearly or older subscriptions.";
    }

    return "Quick scan covers recent recurring payments. Run deep scan to find yearly or older subscriptions.";
}

function optionalLine(label: string, value: string | number | boolean | undefined) {
    if (value === undefined || value === "") {
        return;
    }

    console.log(`   ${label}: ${value}`);
}

function optionalSummaryLine(
    label: string,
    value: string | number | boolean | undefined
) {
    if (value === undefined || value === "") {
        return;
    }

    console.log(`${label}: ${value}`);
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
        isOneTimeMarketplaceOrEcommerceText(text) &&
        !hasExplicitServiceUtilityOrSubscriptionEvidence(text)
    ) {
        return true;
    }

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

function isPaymentMethodOnlyName(value: string | undefined) {
    return Boolean(
        value &&
            /^(blik|visa|mastercard|master card|card|karta|apple pay|google pay|paypal|wallet|portfel|bank transfer|przelew)$/i.test(
                cleanText(value)
            )
    );
}

function normalizeAsciiText(text: string) {
    return cleanText(text)
        .toLowerCase()
        .replace(/[łŁ]/g, "l")
        .replace(/[ąĄ]/g, "a")
        .replace(/[ćĆ]/g, "c")
        .replace(/[ęĘ]/g, "e")
        .replace(/[ńŃ]/g, "n")
        .replace(/[óÓ]/g, "o")
        .replace(/[śŚ]/g, "s")
        .replace(/[źŹżŻ]/g, "z")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function hasExplicitRecurringSubscriptionEvidence(text: string) {
    const asciiText = normalizeAsciiText(text);

    return /\b(subscription|subskrypcja|abonament|membership|renewal|renews|renew|odnawia|odnowienie|automatic renewal|automatycznie odnaw|automatycznie przedluz|next billing|next renewal|future charge|will be charged|payment method will be charged|metoda platnosci .*bedzie obciazana|zostanie naliczona oplata|billing agreement|recurring payment)\b/i.test(
        asciiText
    );
}

function isOneTimeMarketplaceOrEcommerceText(text: string) {
    const asciiText = normalizeAsciiText(text);

    return /\b(potwierdzenie zakupu|dziekujemy za zakup|thank you for (?:your )?purchase|zamowienie|numer zamowienia|data zamowienia|osoba sprzedajaca|sprzedajacy|przedmiot|produkt|produkty|paczka|wysylka|dostawa|przesylka|wymiana|reklamacja|oplata za ochrone kupujacych|do twojego zamowienia|faktura do zamowienia|e-faktura do|faktura do twojego zamowienia|paragon|order confirmation|purchase confirmation|receipt for your order|invoice for your order|seller|item|items|shipping|delivery|buyer protection|marketplace|return|refund|rental|rented|movie rental|wypozyczenie|wypozyczenia|wypozyczone filmy)\b/i.test(
        asciiText
    );
}

function hasExplicitServiceUtilityOrSubscriptionEvidence(text: string) {
    const asciiText = normalizeAsciiText(text);

    return /\b(subscription|subskrypcja|abonament|membership|renews|renewal|odnawia|automatycznie odnaw|automatycznie przedluz|next billing|next renewal|will be charged|zostanie naliczona oplata|trial|okres probny|recurring payment|automatic payment|billing agreement|kwota do zaplaty|termin platnosci|kod abonenta|numer abonenta|eboa|ebok|faktura za prad|faktura za internet|rachunek za telefon|rachunek za internet|energia|electricity|gaz|internet|telefon|telecom)\b/i.test(
        asciiText
    );
}

function isHardReviewPurchaseNoise(text: string) {
    const asciiText = normalizeAsciiText(text);

    return (
        /\b(zamowienie w amazon prime video|wciaz wazne wypozyczenia|wciaz wazne wypozyczone filmy|wypozyczone filmy|wczesniejsze zakupy i wypozyczenia|data zamowienia|movie rental|rental|rented)\b/i.test(
            asciiText
        ) ||
        /\b(e-faktura do twojego zamowienia|faktura do twojego zamowienia|do twojego zamowienia wygenerowalismy fakture|faktura do zamowienia|numer zamowienia|twoje zamowienie|zamowiles|przesylka|paczka|wysylka|zwrot|wymiana|reklamacja)\b/i.test(
            asciiText
        ) ||
        /\b(vinted|playstation store|tazapay|transaction description|dlc|game purchase|game|add-on|addon|seller|buyer protection|potwierdzenie twojego zakupu|potwierdzenie zakupu)\b/i.test(
            asciiText
        ) ||
        /\b(dziekujemy za zakup|thank you for (?:your )?purchase)\b/i.test(asciiText)
    );
}

function isPrimeVideoOneTimeOrderOrRental(text: string) {
    const asciiText = normalizeAsciiText(text);
    const hasPrimeVideoOrder =
        /\b(zamowienie w amazon prime video|amazon prime video order|your prime video order)\b/i.test(
            asciiText
        );
    const hasRentalOrOrderBody =
        /\b(zamowienie nr|data zamowienia|wciaz wazne wypozyczenia|wciaz wazne wypozyczone filmy|wypozyczenia w usludze|wczesniejsze zakupy|movie rental|rental|order number)\b/i.test(
            asciiText
        );

    return hasPrimeVideoOrder || (/prime video/i.test(asciiText) && hasRentalOrOrderBody);
}

function isEcommerceOrderReviewNoise(text: string) {
    const asciiText = normalizeAsciiText(text);

    return /\b(zamowienie nr|numer zamowienia|twoje zamowienie|do twojego zamowienia|dziekujemy za zakup|thank you for (?:your )?purchase|wykupienie pakietu|pakietu w naszym kreatorze|pakietu|pelen dostep|platnosc zostala otrzymana|potwierdzenie zakupu|package|przesylka|paczka|wysylka|dostawa|zwrot|wymiana|reklamacja|paragon|faktura do zamowienia|e-faktura do twojego zamowienia|order number|shipping|delivery|return|refund|item|product)\b/i.test(
        asciiText
    );
}

function hasExplicitActiveSubscriptionReviewEvidence(text: string) {
    const asciiText = normalizeAsciiText(text);

    return /\b(kontynuujac subskrypcje|subskrypcja rozpocznie sie|wlasnie rozpoczyna sie twoja subskrypcja|automatycznie odnowiona|automatycznie odnawiana|automatycznie odnawiane|odnawia sie|metoda platnosci bedzie obciazana|bedzie obciazana kwota|co miesiac|miesiecznie|co rok|monthly|yearly|annual|next billing|next renewal|future charge|will be charged every (?:month|year)|will renew|subscription will renew|trial then charged)\b/i.test(
        asciiText
    );
}

function hasReviewWorthyPositiveEvidence(message: ImapDebugMessage, text: string) {
    const asciiText = normalizeAsciiText(text);
    const fromDomain = extractSenderDomain(message.from);
    const trustedSubscriptionProviderSender =
        Boolean(message.detected.provider || message.detected.name) &&
        !isPaymentMethodOnlyName(message.detected.provider) &&
        !isPaymentMethodOnlyName(message.detected.name) &&
        /\b(subscription|subskrypcja|abonament|membership|plan|premium|renewal|odnowienie|trial|okres probny)\b/i.test(
            asciiText
        ) &&
        !isEcommerceOrderReviewNoise(asciiText);
    const explicitSubscriptionWithActiveContext =
        /\b(subscription|subskrypcja|abonament|membership|plan)\b/i.test(asciiText) &&
        /\b(renews|renewal|odnawia|automatycznie odnaw|automatycznie przedluz|next billing|next renewal|will be charged|bedzie obciazana|zostanie naliczona oplata|co miesiac|co rok|monthly|yearly|annual|billing agreement|recurring payment|kontynuujac subskrypcje)\b/i.test(
            asciiText
        );
    const billingCycleEvidence = Boolean(message.detected.billingCycle) || /\b(co miesiac|co rok|monthly|yearly|annual|miesiecznie|rocznie)\b/i.test(asciiText);
    const nextChargeEvidence = /\b(next billing|next renewal|nastepna platnosc|nastepna data przedluzenia|future charge|trial then charged|will be charged every (?:month|year)|bedzie obciazana|zostanie naliczona oplata)\b/i.test(
        asciiText
    );
    const invoiceUtilityRecurringEvidence =
        /\b(faktura|rachunek|kwota do zaplaty|termin platnosci|ebok|eboa|panel klienta|kod abonenta|numer abonenta|faktura za prad|faktura za internet|rachunek za telefon|rachunek za internet)\b/i.test(
            asciiText
        ) &&
        !isEcommerceOrderReviewNoise(asciiText) &&
        !/\b(sklep|shop|store|orders?|zamowienia)\b/i.test(fromDomain);
    const paymentProcessorMerchantRecurringEvidence =
        /\b(paypal|stripe|payu|przelewy24|autopay|tpay|merchant|odbiorca|uslugodawca|automatic payment|billing agreement|recurring payment)\b/i.test(
            asciiText
        ) &&
        /\b(merchant|odbiorca|uslugodawca|automatic payment|billing agreement|recurring payment|subscription|subskrypcja|renewal|odnawia)\b/i.test(
            asciiText
        );

    return (
        explicitSubscriptionWithActiveContext ||
        billingCycleEvidence ||
        nextChargeEvidence ||
        invoiceUtilityRecurringEvidence ||
        trustedSubscriptionProviderSender ||
        paymentProcessorMerchantRecurringEvidence
    );
}

function isReviewWorthyMissedSubscription(
    message: ImapDebugMessage,
    scored: ReturnType<typeof scoreReviewCandidate>
) {
    const text = [
        message.from,
        message.subject,
        message.snippet,
        message.reasons.join(" "),
        message.detected.provider,
        message.detected.name,
    ]
        .filter(Boolean)
        .join(" ");
    const hasPositiveEvidence =
        hasReviewWorthyPositiveEvidence(message, text) ||
        scored.hasStrongActiveBillingEvidence;
    const hardOneTimeNoise =
        isPrimeVideoOneTimeOrderOrRental(text) ||
        isEcommerceOrderReviewNoise(text) ||
        isHardReviewPurchaseNoise(text) ||
        scored.riskSignals.some((signal) =>
            /one-time|ecommerce|order|rental|game\/dlc|store purchase|payment method only/i.test(
                signal
            )
        );

    if (hardOneTimeNoise && !hasPositiveEvidence) {
        return false;
    }

    if (!hasPositiveEvidence) {
        return false;
    }

    if (
        scored.riskSignals.some((signal) =>
            /security|newsletter|recommendation|regulation|public\/statutory|loan\/credit|expired|cancelled|refund|raw-header/i.test(
                signal
            )
        ) &&
        !scored.hasStrongActiveBillingEvidence
    ) {
        return false;
    }

    return true;
}

type ReviewSuppressionReason =
    | "prime_video_order"
    | "one_time_order"
    | "weak_purchase"
    | undefined;

function shouldSuppressReviewCandidate(
    candidate: ImapReviewCandidate,
    message: ImapDebugMessage,
    scored: ReturnType<typeof scoreReviewCandidate>
): ReviewSuppressionReason {
    const text = [
        candidate.from,
        candidate.subject,
        candidate.snippet,
        message.snippet,
        candidate.reasons.join(" "),
        candidate.detectedProvider,
        candidate.detectedName,
    ]
        .filter(Boolean)
        .join(" ");
    const hasExplicitActiveEvidence =
        hasExplicitActiveSubscriptionReviewEvidence(text) ||
        scored.hasStrongActiveBillingEvidence;

    if (isPrimeVideoOneTimeOrderOrRental(text) && !hasExplicitActiveEvidence) {
        return "prime_video_order";
    }

    if (isEcommerceOrderReviewNoise(text) && !hasExplicitActiveEvidence) {
        return "one_time_order";
    }

    if (!hasReviewWorthyPositiveEvidence(message, text) && !hasExplicitActiveEvidence) {
        return "weak_purchase";
    }

    return undefined;
}

function shouldSuppressReviewCandidateFinal(candidate: ImapReviewCandidate): {
    suppress: boolean;
    reason?: Exclude<ReviewSuppressionReason, undefined>;
} {
    const text = normalizeAsciiText(
        [
            candidate.detectedProvider,
            candidate.detectedName,
            candidate.from,
            candidate.subject,
            candidate.snippet,
            candidate.blockedReason,
            ...(candidate.reviewSignals ?? []),
            ...(candidate.riskSignals ?? []),
        ]
            .filter(Boolean)
            .join(" ")
    );
    const hasActiveSubscriptionEvidence =
        /\b(kontynuujac subskrypcje|subskrypcja rozpocznie sie|wlasnie rozpoczyna sie twoja subskrypcja|automatycznie odnowiona|automatycznie odnawiana|automatycznie odnawiane|metoda platnosci bedzie obciazana|bedzie obciazana kwota|co miesiac|miesiecznie|monthly|next renewal|next billing)\b/i.test(
            text
        );
    const hasPrimeVideo =
        /\b(amazon prime video|prime video)\b/i.test(text);
    const hasPrimeVideoOneTimeOrder =
        /\b(zamowienie w amazon prime video|zamowienie nr|data zamowienia|wczesniejsze zakupy|wciaz wazne wypozyczenia|wciaz wazne wypozyczone filmy|wypozyczone filmy|wypozyczenia w usludze|prime video order|your prime video order|order number|rental|movie rental)\b/i.test(
            text
        );

    if (hasPrimeVideo && hasPrimeVideoOneTimeOrder && !hasActiveSubscriptionEvidence) {
        return { suppress: true, reason: "prime_video_order" };
    }

    const hasWeakPurchase =
        /\b(dziekujemy za zakup|wykupienie pakietu|numer zamowienia|zamowienie|pelen dostep|pakietu w naszym kreatorze|platnosc zostala otrzymana|potwierdzenie zakupu)\b/i.test(
            text
        );

    if (hasWeakPurchase && !hasActiveSubscriptionEvidence) {
        return { suppress: true, reason: "weak_purchase" };
    }

    return { suppress: false };
}

function applyFinalReviewCandidateSuppression(
    reviewCandidates: ImapReviewCandidate[],
    stats: Pick<
        ImapScanStats,
        | "reviewCandidatesBeforeSuppression"
        | "reviewCandidatesAfterSuppression"
        | "reviewSuppressedOneTimeOrders"
        | "reviewSuppressedPrimeVideoOrders"
        | "reviewSuppressedWeakPurchases"
    >,
    suppressVerbose: boolean
) {
    stats.reviewCandidatesBeforeSuppression = reviewCandidates.length;
    stats.reviewCandidatesAfterSuppression = 0;
    stats.reviewSuppressedOneTimeOrders = 0;
    stats.reviewSuppressedPrimeVideoOrders = 0;
    stats.reviewSuppressedWeakPurchases = 0;

    const filtered = reviewCandidates.filter((candidate) => {
        const suppression = shouldSuppressReviewCandidateFinal(candidate);

        if (!suppression.suppress) {
            return true;
        }

        incrementReviewSuppression(stats, suppression.reason);

        if (suppressVerbose) {
            console.error(
                `Review suppress: reason=${suppression.reason}; from=${candidate.from}; subject=${candidate.subject}`
            );
        }

        return false;
    });

    stats.reviewCandidatesAfterSuppression = filtered.length;

    return filtered;
}

function incrementReviewSuppression(
    stats: Pick<
        ImapScanStats,
        | "reviewSuppressedOneTimeOrders"
        | "reviewSuppressedPrimeVideoOrders"
        | "reviewSuppressedWeakPurchases"
    >,
    reason: ReviewSuppressionReason
) {
    if (reason === "prime_video_order") {
        stats.reviewSuppressedPrimeVideoOrders += 1;
        stats.reviewSuppressedOneTimeOrders += 1;
        return;
    }

    if (reason === "one_time_order") {
        stats.reviewSuppressedOneTimeOrders += 1;
        return;
    }

    if (reason === "weak_purchase") {
        stats.reviewSuppressedWeakPurchases += 1;
    }
}

function createReviewSuppressorSelfTestMessage(
    subject: string,
    snippet: string,
    from = "Amazon Prime Video <no-reply@primevideo.com>"
): ImapDebugMessage {
    return {
        id: `self-test-${subject}`,
        from,
        subject,
        date: new Date(0).toISOString(),
        snippet,
        isCandidate: false,
        confidence: 0.75,
        reasons: [],
        detected: {},
        source: "recent_window",
        sourceTags: ["recent_window"],
    };
}

function reviewSuppressorSelfTestCases() {
    const cases = [
        {
            name: "Prime Video Crimson Peak",
            message: createReviewSuppressorSelfTestMessage(
                "Zamowienie w Amazon Prime Video: Crimson Peak. Wzgorze krwi",
                "Zamowienie nr 123. Data zamowienia. Wczesniejsze zakupy i wciaz wazne wypozyczenia."
            ),
            expected: "prime_video_order",
        },
        {
            name: "Prime Video Grimsby",
            message: createReviewSuppressorSelfTestMessage(
                "Zamowienie w Amazon Prime Video: Grimsby",
                "Wciaz wazne wypozyczone filmy."
            ),
            expected: "prime_video_order",
        },
        {
            name: "InterviewMe weak purchase",
            message: createReviewSuppressorSelfTestMessage(
                "Dziekujemy za zakup",
                "Wykupienie pakietu. Pelen dostep. Numer zamowienia.",
                "InterviewMe <kontakt@e.interviewme.pl>"
            ),
            expected: "one_time_order",
        },
        {
            name: "SkyShowtime continuation",
            message: createReviewSuppressorSelfTestMessage(
                "Potwierdzenie subskrypcji SkyShowtime",
                "Kontynuujac subskrypcje, metoda platnosci bedzie obciazana kwota 4,00 zl miesiecznie.",
                "Prime Video <no-reply@primevideo.com>"
            ),
            expected: undefined,
        },
        {
            name: "Generic renewable subscription purchase",
            message: createReviewSuppressorSelfTestMessage(
                "Dziekujemy za zakup subskrypcji",
                "Subskrypcja automatycznie odnawiane co miesiac.",
                "Example SaaS <billing@example.test>"
            ),
            expected: undefined,
        },
    ];

    return cases.map(({ name, message, expected }) => {
        const scored = scoreReviewCandidate(message);
        const candidate: ImapReviewCandidate = {
            id: message.id,
            reviewKey: reviewKeyForMessage(message),
            reviewScore: Number(scored.score.toFixed(2)),
            from: message.from,
            subject: message.subject,
            date: message.date,
            snippet: message.snippet,
            detectedProvider: message.detected.provider,
            detectedName: message.detected.name,
            blockedReason: scored.blockedReason,
            isCandidate: message.isCandidate,
            confidence: message.confidence,
            reasons: message.reasons,
            reviewSignals: scored.reviewSignals,
            riskSignals: scored.riskSignals,
        };

        return {
            name,
            expected,
            actual: shouldSuppressReviewCandidate(candidate, message, scored),
        };
    });
}

function isCanonicalHardNoiseMessage(message: ImapDebugMessage) {
    const text = `${message.from} ${message.subject} ${message.snippet} ${message.reasons.join(" ")}`;
    const recurringEvidence = hasExplicitRecurringSubscriptionEvidence(text);

    if (
        (isPaymentMethodOnlyName(message.detected.provider) ||
            isPaymentMethodOnlyName(message.detected.name)) &&
        !recurringEvidence
    ) {
        return true;
    }

    if (
        /payment method only without subscription merchant|one-time marketplace\/ecommerce purchase|one-time purchase\/order message|free app\/store purchase|recommendation\/newsletter|refund message|cancellation message/i.test(
            message.reasons.join(" ")
        ) &&
        !recurringEvidence
    ) {
        return true;
    }

    return isOneTimeMarketplaceOrEcommerceText(text) && !recurringEvidence;
}

function isCanonicalHardNoiseGroup(group: ImapRecurringGroup) {
    const text = `${group.suggestedName} ${group.fromSample} ${group.sampleSubjects.join(" ")} ${group.sampleSnippets.join(" ")} ${group.reasons.join(" ")}`;

    return (
        isOneTimeMarketplaceOrEcommerceText(text) &&
        !hasExplicitServiceUtilityOrSubscriptionEvidence(text)
    );
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
        payment_failed: 1,
        invoice_due: 2,
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

    if (/payment_failed|payment failed|card declined|declined/i.test(debugType + reasons)) {
        return "payment_failed";
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
        return "invoice_due";
    }

    return "unknown";
}

function statusForGroup(group: ImapRecurringGroup): ImapCanonicalSubscription["status"] {
    if (/invoice|faktura|payment due|recurring/i.test(group.reasons.join(" "))) {
        return "invoice_due";
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

function hasInvoiceOrBillEvidence(text: string) {
    const normalized = normalizeAsciiText(text);

    return /\b(invoice|faktura|e-faktura|efaktura|rachunek|kwota do zaplaty|termin platnosci|amount due|due date|payment due|bill due|oplaty fakture|oplac fakture)\b/i.test(
        normalized
    );
}

function extractDueDateTextFromMessageText(text: string) {
    const dueDate = firstDateOfKind(extractDateSemantics(text), ["due_date"]);

    if (dueDate) {
        return dueDate;
    }

    const normalized = cleanText(text);
    const match = normalized.match(
        /(?:termin p[lł]atno[sś]ci|termin platnosci|due date|op[lł]acenie do|pay by)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i
    );

    return match?.[1];
}

function selectLatestInvoiceAmountSource(messages: ImapDebugMessage[]) {
    const sortedMessages = [...messages].sort(
        (a, b) => Date.parse(b.date) - Date.parse(a.date)
    );

    for (const message of sortedMessages) {
        const text = `${message.subject} ${message.snippet} ${message.reasons.join(" ")}`;

        if (!hasInvoiceOrBillEvidence(text)) {
            continue;
        }

        const amountSemantics = resolveAmountSemantics(
            extractAmountSemantics(text)
        );
        const dueAmount =
            firstAmountOfKind(amountSemantics, ["due"]) ??
            (message.detected.amountText && !isZeroAmount(message.detected.amountText)
                ? message.detected.amountText
                : undefined) ??
            extractAmounts(text).find((amount) => !isZeroAmount(amount));

        if (!dueAmount) {
            continue;
        }

        return {
            dueAmount,
            dueDateText: extractDueDateTextFromMessageText(text),
            sourceDate: message.date,
            sourceSubject: message.subject,
        };
    }

    return undefined;
}

function confidenceLevelFor(confidence: number): ImapCanonicalSubscription["confidenceLevel"] {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.65) return "medium";
    return "low";
}

function normalizeCanonicalCategory(category: string | undefined, draftText: string) {
    const text = cleanText(`${category ?? ""} ${draftText}`).toLowerCase();
    const normalizedCategory = cleanText(category ?? "").toLowerCase();

    if (normalizedCategory && normalizedCategory !== "unknown") {
        const mappedCategory: Record<string, string> = {
            streaming_video: "streaming_video",
            music_audio: "music_audio",
            cloud_storage: "cloud_storage",
            ai_tools: "ai_tools",
            design_creative: "software_saas",
            productivity_office: "productivity",
            developer_tools: "software_saas",
            delivery_membership: "delivery_membership",
            ecommerce_membership: "ecommerce_membership",
            telecom_mobile: "telecom_mobile",
            internet_isp: "internet_isp",
            utilities_energy: "utilities_energy",
            education_learning: "education",
            fitness_health: "health_fitness",
            gaming: "gaming",
        };

        if (mappedCategory[normalizedCategory]) {
            return mappedCategory[normalizedCategory];
        }
    }

    if (/streaming|video|prime video|netflix|skyshowtime|max|hbo|disney|apple tv|player|canal/.test(text)) {
        return "streaming_video";
    }

    if (/music|audio|spotify|youtube music|tidal|deezer|audible|storytel/.test(text)) {
        return "music_audio";
    }

    if (/cloud|storage|icloud|google one|dropbox|drive|onedrive/.test(text)) {
        return "cloud_storage";
    }

    if (/\b(ai|chatgpt|openai|claude|perplexity|copilot|midjourney)\b/.test(text)) {
        return "ai_tools";
    }

    if (/delivery|uber one|uber eats|wolt|glovo/.test(text)) {
        return "delivery_membership";
    }

    if (/allegro smart|amazon prime|ecommerce/.test(text)) {
        return "ecommerce_membership";
    }

    if (/telecom|mobile|play|orange|t-mobile|plus|plush|nju/.test(text)) {
        return "telecom_mobile";
    }

    if (/internet|isp|toya|netia|vectra|inea|localnet|fiber/.test(text)) {
        return "internet_isp";
    }

    if (/utility|utilities|energy|electricity|power|pr[aą]d|prad|gaz|tauron|pge|energa|enea|e\.on|invoice_due/.test(text)) {
        return "utilities_energy";
    }

    if (/finance|insurance|bank|tax|accounting|zus|krus/.test(text)) {
        return "finance_insurance";
    }

    if (/software|saas|acrobat|adobe|canva|figma/.test(text)) {
        return "software_saas";
    }

    if (/productivity|office|microsoft 365|notion|slack|zoom|prezi/.test(text)) {
        return "productivity";
    }

    if (/education|learning|duolingo|coursera|udemy/.test(text)) {
        return "education";
    }

    if (/health|fitness|strava|alltrails|calm|headspace/.test(text)) {
        return "health_fitness";
    }

    if (/travel|transport|ticket|bolt/.test(text)) {
        return "travel_transport";
    }

    if (/government|tax|krus|zus/.test(text)) {
        return "government_tax_insurance";
    }

    if (/invoice|faktura|rachunek|bill|payment due/.test(text)) {
        return "other_bill";
    }

    return "other_subscription";
}

function sourceForCanonical(
    sourceTypes: string[],
    billingChannel: string | undefined,
    hasMessageSource: boolean
): ImapCanonicalSubscription["source"] {
    const hasRecurring = sourceTypes.includes("recurring_group");

    if (hasRecurring && hasMessageSource) return "mixed";
    if (isMarketplaceChannel(billingChannel)) return "marketplace";
    if (billingChannel && /paypal|stripe|payu|przelewy24|tpay|autopay/i.test(billingChannel)) {
        return "payment_processor";
    }
    if (hasRecurring) return "recurring_group";
    return "message";
}

function evidenceSummaryForCanonical(
    status: ImapCanonicalSubscription["status"],
    evidenceTypes: string[],
    billingChannel: string | undefined,
    billingCycle: string | undefined
) {
    const text = evidenceTypes.join(" ");
    const summary: string[] = [];

    if (/payment confirmation|payment\/charged|charged/i.test(text)) summary.push("payment confirmation");
    if (/future charge|continuation/i.test(text)) summary.push("subscription continuation/future charge");
    if (/trial/i.test(text) || status === "trial") summary.push("trial/future paid conversion");
    if (/invoice|payment due|recurring bill/i.test(text) || status === "invoice_due") summary.push("invoice or bill due");
    if (/price change/i.test(text) || status === "price_change") summary.push("active price change");
    if (billingCycle && billingCycle !== "unknown") summary.push(`${billingCycle} billing`);
    if (billingChannel) summary.push(`billing channel: ${billingChannel}`);

    return [...new Set(summary)].slice(0, 8);
}

function riskSummaryForCanonical(reasons: string[]) {
    return reasons
        .filter((reason) => /^-|blocked|suspicious|raw header|risk/i.test(reason))
        .map((reason) => reason.replace(/^[-+]\d?(?:\.\d+)?\s*/, ""))
        .slice(0, 6);
}

function reviewNeedForCanonical(args: {
    confidenceLevel: ImapCanonicalSubscription["confidenceLevel"];
    status: ImapCanonicalSubscription["status"];
    source: ImapCanonicalSubscription["source"];
    amount: string | undefined;
    category: string | undefined;
    cadenceUnknown: boolean;
    riskSummary: string[];
    provider: string | undefined;
    evidenceSummary: string[];
}) {
    const reasons: string[] = [];
    const category = args.category ?? "";
    const hasKnownProvider = Boolean(args.provider);
    const hasStrongActiveEvidence = args.evidenceSummary.some((evidence) =>
        /payment confirmation|active|renewal|future charge|subscription|monthly billing|billing channel/i.test(
            evidence
        )
    );
    const isSubscriptionLikeCategory =
        /(streaming_video|music_audio|software_saas|cloud_storage|ai_tools|gaming|delivery_membership|ecommerce_membership|productivity|education|health_fitness|other_subscription)/i.test(
            category
        );

    if (args.confidenceLevel === "low") reasons.push("low confidence");
    if (args.status === "unknown") reasons.push("unknown status");
    if (args.source === "mixed" && args.riskSummary.length > 0) reasons.push("mixed source with risk evidence");
    if (
        !args.amount &&
        ["active", "trial", "price_change"].includes(args.status) &&
        !/(utilities_energy|internet_isp|other_bill)/i.test(category) &&
        !(
            args.confidenceLevel === "high" &&
            hasKnownProvider &&
            hasStrongActiveEvidence &&
            isSubscriptionLikeCategory
        )
    ) {
        reasons.push("missing amount for likely paid subscription");
    }
    if (args.cadenceUnknown && !args.amount) reasons.push("recurring group has unknown cadence and weak amount semantics");

    return {
        needsReview: reasons.length > 0,
        reviewReason: reasons.join("; ") || undefined,
    };
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
            amountKind: status === "invoice_due" ? "invoice_due" as const : "latest" as const,
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

        if (isCanonicalHardNoiseMessage(message)) {
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
        if (isCanonicalHardNoiseGroup(group)) {
            continue;
        }

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
            let dueAmount = firstAmountOfKind(uniqueAmountSemantics, ["due"]);
            const currentAmount = firstAmountOfKind(uniqueAmountSemantics, ["current_price", "old_price"]);
            const futureAmount = firstAmountOfKind(uniqueAmountSemantics, ["new_price", "future_price", "trial_then_price"]);
            const promoAmount = firstAmountOfKind(uniqueAmountSemantics, ["promo_price"]);
            const regularAmount = firstAmountOfKind(uniqueAmountSemantics, ["regular_price"]);
            const trialThenAmount = firstAmountOfKind(uniqueAmountSemantics, ["trial_then_price"]);
            const fallbackAmountChoice = (() => {
                if (amountChoice.displayAmount) return amountChoice;
                if (trialThenAmount) return { ...amountChoice, displayAmount: trialThenAmount, amountKind: "trial_then_price" as const };
                if (futureAmount) return { ...amountChoice, displayAmount: futureAmount, amountKind: "future_price" as const };
                if (regularAmount) return { ...amountChoice, displayAmount: regularAmount, amountKind: "regular_price" as const };
                if (dueAmount) return { ...amountChoice, displayAmount: dueAmount, amountKind: "due" as const };
                if (chargedAmount) return { ...amountChoice, displayAmount: chargedAmount, amountKind: "charged" as const };
                return amountChoice;
            })();
            const sourceTypes = [...new Set(draft.sourceTypes)].slice(0, 10);
            const hasMessageSource = draft.sourceMessages.length > 0;
            const source = sourceForCanonical(sourceTypes, draft.billingChannel, hasMessageSource);
            const latestSubject = draft.sourceMessages
                .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]
                ?.subject ?? [...new Set(draft.subjects)].slice(-1)[0];
            const category = normalizeCanonicalCategory(
                draft.category,
                `${draft.provider ?? ""} ${draft.displayName ?? ""} ${draft.subjects.join(" ")} ${draft.reasons.join(" ")} ${status}`
            );
            const evidenceTypes = [...new Set(draft.evidence)].slice(0, 12);
            const reasons = [...new Set(draft.reasons)].slice(0, 14);
            const latestInvoiceAmountSource = selectLatestInvoiceAmountSource(
                draft.sourceMessages
            );
            const isRecurringBillCanonical =
                status === "invoice_due" ||
                /invoice|bill due|payment due|recurring bill|faktura|rachunek/i.test(
                    `${category} ${evidenceTypes.join(" ")} ${reasons.join(" ")}`
                ) ||
                (/(utilities_energy|internet_isp|telecom_mobile|other_bill)/i.test(
                    category
                ) &&
                    Boolean(latestInvoiceAmountSource));
            const latestBillAmountChoice =
                isRecurringBillCanonical && latestInvoiceAmountSource
                    ? {
                        ...fallbackAmountChoice,
                        displayAmount: latestInvoiceAmountSource.dueAmount,
                        amountKind: "due" as const,
                    }
                    : fallbackAmountChoice;

            if (isRecurringBillCanonical && latestInvoiceAmountSource?.dueAmount) {
                dueAmount = latestInvoiceAmountSource.dueAmount;
            }

            const confidenceLevel = confidenceLevelFor(confidence);
            const riskSummary = riskSummaryForCanonical(reasons);
            const evidenceSummary = evidenceSummaryForCanonical(
                status,
                evidenceTypes,
                draft.billingChannel,
                sortedCycles[0]?.value
            );
            const reviewNeed = reviewNeedForCanonical({
                confidenceLevel,
                status,
                source,
                amount: latestBillAmountChoice.displayAmount,
                category,
                cadenceUnknown: draft.groupCadences.includes("unknown"),
                riskSummary,
                provider: draft.provider,
                evidenceSummary,
            });
            const statusReason =
                status === "active"
                    ? "active payment, continuation, renewal, or invoice evidence"
                    : status === "trial"
                    ? "trial evidence without later active payment/continuation"
                    : status === "price_change"
                    ? "active price-change evidence"
                    : status === "invoice_due"
                    ? "invoice or recurring bill evidence"
                    : status === "payment_failed"
                    ? "payment failed or card declined evidence"
                    : undefined;

            return {
                id: draft.key,
                subscriptionKey: draft.key,
                displayName:
                    draft.displayName ??
                    draft.provider ??
                    titleFromSubjectFamily(draft.key) ??
                    draft.key,
                provider: draft.provider,
                billingProvider: draft.billingChannel,
                billingChannel: draft.billingChannel,
                category,
                confidence,
                confidenceLevel,
                status,
                source,
                billingCycle: sortedCycles[0]?.value,
                amount: latestBillAmountChoice.displayAmount,
                displayAmount: latestBillAmountChoice.displayAmount,
                chargedAmount,
                dueAmount,
                currentAmount,
                latestAmount,
                futureAmount,
                promoAmount,
                regularAmount,
                trialThenAmount,
                ignoredAmounts: [...new Set(latestBillAmountChoice.ignoredAmounts)].slice(0, 10),
                amountKind: latestBillAmountChoice.amountKind,
                dueDateText:
                    isRecurringBillCanonical && latestInvoiceAmountSource?.dueDateText
                        ? latestInvoiceAmountSource.dueDateText
                        : firstDateOfKind(uniqueDateSemantics, ["due_date"]),
                billingDateText: firstDateOfKind(uniqueDateSemantics, ["charged_date", "invoice_date"]),
                chargedDateText: firstDateOfKind(uniqueDateSemantics, ["charged_date"]),
                nextBillingDateText: firstDateOfKind(uniqueDateSemantics, ["next_renewal_date"]),
                nextRenewalDateText: firstDateOfKind(uniqueDateSemantics, ["next_renewal_date"]),
                trialEndDateText:
                    draft.sourceMessages
                        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                        .find((message) => message.detected.trialEndDateText)?.detected.trialEndDateText ??
                    firstDateOfKind(uniqueDateSemantics, ["trial_end_date"]),
                effectiveDateText: firstDateOfKind(uniqueDateSemantics, ["effective_date"]),
                selectedAmountSourceDate: latestInvoiceAmountSource?.sourceDate,
                selectedAmountSourceSubject: latestInvoiceAmountSource?.sourceSubject,
                amountSemantics: uniqueAmountSemantics,
                dateSemantics: uniqueDateSemantics,
                sourceTypes,
                statusReason,
                amounts: uniqueAmounts,
                allAmounts: uniqueAmounts,
                firstSeen: sortedDates[0] ?? "",
                lastSeen: sortedDates[sortedDates.length - 1] ?? "",
                latestSubject,
                messageCount: uniqueMessageIds.length,
                sourceMessagesCount: uniqueMessageIds.length,
                sourceMessageIds: uniqueMessageIds,
                sourceSubjects: [...new Set(draft.subjects)].slice(0, 6),
                sourceSenders: [...new Set(draft.senders)].slice(0, 6),
                evidenceTypes,
                evidenceSummary,
                riskSummary,
                reasons,
                needsReview: reviewNeed.needsReview,
                reviewReason: reviewNeed.reviewReason,
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
    const hasExplicitRecurringOrServiceEvidence =
        hasExplicitRecurringSubscriptionEvidence(asciiText) ||
        hasExplicitServiceUtilityOrSubscriptionEvidence(asciiText);
    const hasHardPurchaseNoise = isHardReviewPurchaseNoise(asciiText);
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

    if (
        isPaymentMethodOnlyName(message.detected.provider) ||
        isPaymentMethodOnlyName(message.detected.name) ||
        /payment method only without subscription merchant/i.test(text)
    ) {
        riskSignals.push("payment method only");
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
    addReviewSignal(
        riskSignals,
        asciiText,
        /\b(regulamin|regulation|terms update|terms of service|privacy policy|polityka prywatnosci|zmiany w regulaminie|onet poczta)\b/i,
        "newsletter/recommendation/regulation"
    );
    addReviewSignal(
        riskSignals,
        asciiText,
        /\b(do twojego zamowienia|e-faktura do|faktura do zamowienia|ecommerce invoice|zwrot|reklamacja|movie rental|prime video zamowienie)\b/i,
        "one-time ecommerce/order/rental/refund"
    );
    addReviewSignal(
        riskSignals,
        asciiText,
        /\b(getting started|rozpoczynanie pracy|welcome to product|witamy w|pobierz program|pobierz oprogramowanie|download the app|download software)\b/i,
        "onboarding-only without billing"
    );
    addReviewSignal(
        riskSignals,
        asciiText,
        /\b(ekrus|zus|skladki|skladka|ubezpieczenie spoleczne|social insurance|tax office|urzad skarbowy|podatek|tax)\b/i,
        "public/statutory/tax/social insurance reminder"
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

    if (riskSignals.some((signal) => /one-time|ecommerce|order|rental|refund/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /security|login|work\/business profile|credits marketing|game\/dlc|store purchase/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /marketing\/upsell/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /newsletter|recommendation|regulation/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.44);
    }

    if (riskSignals.some((signal) => /payment method only/i.test(signal)) && !hasStrongActiveBillingEvidence) {
        score = Math.min(score, 0.39);
    }

    if (
        riskSignals.some((signal) => /onboarding-only/i.test(signal)) &&
        !hasStrongActiveBillingEvidence &&
        !message.detected.amountText &&
        !message.detected.billingCycle
    ) {
        score = Math.min(score, 0.39);
    }

    if (
        riskSignals.some((signal) => /public\/statutory|social insurance|tax/i.test(signal)) &&
        !hasStrongActiveBillingEvidence
    ) {
        score = Math.min(score, 0.39);
    }

    if (/one-time marketplace\/ecommerce purchase|payment method only without subscription merchant|one-time purchase\/order|free app\/store purchase/i.test(blockedReason ?? "")) {
        score = Math.min(score, 0.39);
    }

    if (hasHardPurchaseNoise && !hasExplicitRecurringOrServiceEvidence) {
        score = Math.min(score, 0.39);
        if (!riskSignals.includes("hard one-time ecommerce/order/rental noise")) {
            riskSignals.push("hard one-time ecommerce/order/rental noise");
        }
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
    canonicalSubscriptions: ImapCanonicalSubscription[] = [],
    suppressionStats?: Pick<
        ImapScanStats,
        | "reviewSuppressedOneTimeOrders"
        | "reviewSuppressedPrimeVideoOrders"
        | "reviewSuppressedWeakPurchases"
    >,
    suppressVerbose = false
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
        const suppressionReason = shouldSuppressReviewCandidate(
            candidate,
            message,
            scored
        );

        if (suppressionReason) {
            if (suppressionStats) {
                incrementReviewSuppression(suppressionStats, suppressionReason);
            }
            if (suppressVerbose) {
                console.error(
                    `Review candidate suppressed: reason=${suppressionReason}; from=${candidate.from}; subject=${candidate.subject}`
                );
            }
            continue;
        }

        if (!isReviewWorthyMissedSubscription(message, scored)) {
            continue;
        }

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
    console.log(`scanMode: ${result.scanStats.scanMode}`);
    console.log(`scanWindowDays: ${result.scanStats.scanWindowDays}`);
    optionalSummaryLine("deepWindowDays", result.scanStats.deepWindowDays);
    console.log(`mailboxTotalMessages: ${result.scanStats.mailboxTotalMessages}`);
    console.log(`recentMessagesFetched: ${result.scanStats.recentMessagesFetched}`);
    console.log(`targetedQueriesRun: ${result.scanStats.targetedQueriesRun}`);
    console.log(`targetedMessagesMatched: ${result.scanStats.targetedMessagesMatched}`);
    console.log(`targetedMessagesUniqueMatched: ${result.scanStats.targetedMessagesUniqueMatched}`);
    console.log(`targetedMessagesFetched: ${result.scanStats.targetedMessagesFetched}`);
    console.log(`headerTargetedQueriesRun: ${result.scanStats.headerTargetedQueriesRun}`);
    console.log(`headerTargetedMessagesMatched: ${result.scanStats.headerTargetedMessagesMatched}`);
    console.log(`headerTargetedUniqueMatched: ${result.scanStats.headerTargetedUniqueMatched}`);
    console.log(`headerTargetedMessagesFetched: ${result.scanStats.headerTargetedMessagesFetched}`);
    console.log(`metadataPrepassEnabled: ${result.scanStats.metadataPrepassEnabled ? "yes" : "no"}`);
    optionalSummaryLine("metadataPrepassWindowDays", result.scanStats.metadataPrepassWindowDays);
    console.log(`metadataPrepassMessagesScanned: ${result.scanStats.metadataPrepassMessagesScanned}`);
    console.log(`metadataPrepassMatches: ${result.scanStats.metadataPrepassMatches}`);
    console.log(`metadataPrepassFetched: ${result.scanStats.metadataPrepassFetched}`);
    console.log(`metadataPrepassSkippedAlreadyFetched: ${result.scanStats.metadataPrepassSkippedAlreadyFetched}`);
    console.log(`metadataPrepassFetchLimit: ${result.scanStats.metadataPrepassFetchLimit}`);
    optionalSummaryLine("metadataPrepassTopTerms", result.scanStats.metadataPrepassTopTerms.join(", "));
    console.log(`deepFallbackUsed: ${result.scanStats.deepFallbackUsed ? "yes" : "no"}`);
    optionalSummaryLine("deepFallbackReason", result.scanStats.deepFallbackReason);
    console.log(`deepFallbackStrategy: ${result.scanStats.deepFallbackStrategy}`);
    console.log(`deepFallbackMessagesFetched: ${result.scanStats.deepFallbackMessagesFetched}`);
    optionalSummaryLine("deepFallbackWindowDays", result.scanStats.deepFallbackWindowDays);
    console.log(`deepFallbackBatchSize: ${result.scanStats.deepFallbackBatchSize}`);
    console.log(`deepFallbackBucketDays: ${result.scanStats.deepFallbackBucketDays}`);
    console.log(`deepFallbackBucketSampleMode: ${result.scanStats.deepFallbackBucketSampleMode}`);
    console.log(`deepFallbackBucketsTotal: ${result.scanStats.deepFallbackBucketsTotal}`);
    console.log(`deepFallbackBucketsQueried: ${result.scanStats.deepFallbackBucketsQueried}`);
    console.log(`deepFallbackBucketsWithMatches: ${result.scanStats.deepFallbackBucketsWithMatches}`);
    console.log(`deepFallbackPerBucketLimit: ${result.scanStats.deepFallbackPerBucketLimit}`);
    console.log(`deepFallbackMessagesMatchedBeforeCap: ${result.scanStats.deepFallbackMessagesMatchedBeforeCap}`);
    console.log(`deepFallbackUidCandidatesBeforeSampling: ${result.scanStats.deepFallbackUidCandidatesBeforeSampling}`);
    console.log(`deepFallbackUidCandidatesAfterSampling: ${result.scanStats.deepFallbackUidCandidatesAfterSampling}`);
    console.log(`uniqueMessagesAnalyzed: ${result.scanStats.uniqueMessagesAnalyzed}`);
    console.log(`fallbackUsed: ${result.scanStats.fallbackUsed ? "yes" : "no"}`);
    optionalSummaryLine("fallbackReason", result.scanStats.fallbackReason);
    console.log(`mayMissYearlySubscriptions: ${result.scanStats.mayMissYearlySubscriptions ? "yes" : "no"}`);
    console.log(`coverageNote: ${result.scanStats.coverageNote}`);
    console.log(`scannedMessages: ${result.scannedMessages}`);
    console.log(`candidatesFound: ${result.candidatesFound}`);
    console.log(`rejectedMessages: ${result.rejectedMessages}`);
    console.log(`canonicalSubscriptions: ${result.canonicalSubscriptions.length}`);
    console.log(`reviewCandidates: ${result.reviewCandidates.length}`);
    console.log(`reviewCandidatesBeforeSuppression: ${result.scanStats.reviewCandidatesBeforeSuppression}`);
    console.log(`reviewCandidatesAfterSuppression: ${result.scanStats.reviewCandidatesAfterSuppression}`);
    console.log(`reviewSuppressedOneTimeOrders: ${result.scanStats.reviewSuppressedOneTimeOrders}`);
    console.log(`reviewSuppressedPrimeVideoOrders: ${result.scanStats.reviewSuppressedPrimeVideoOrders}`);
    console.log(`reviewSuppressedWeakPurchases: ${result.scanStats.reviewSuppressedWeakPurchases}`);
    console.log("");

    console.log("Canonical subscriptions:");

    if (result.canonicalSubscriptions.length === 0) {
        console.log("none");
    }

    result.canonicalSubscriptions.slice(0, 30).forEach((subscription, index) => {
        console.log("");
        console.log(`${index + 1}. ${subscription.displayName}`);
        console.log(`   status: ${subscription.status} (${subscription.confidenceLevel}, ${subscription.confidence.toFixed(2)})`);
        console.log(`   id: ${subscription.id}`);
        optionalLine("provider", subscription.provider);
        optionalLine("billingChannel", subscription.billingChannel);
        optionalLine("category", subscription.category);
        optionalLine("source", subscription.source);
        optionalLine("displayAmount", subscription.displayAmount);
        optionalLine("amountKind", subscription.amountKind);
        optionalLine("billingCycle", subscription.billingCycle);
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
        optionalLine("selectedAmountSourceDate", subscription.selectedAmountSourceDate?.slice(0, 10));
        optionalLine("selectedAmountSourceSubject", subscription.selectedAmountSourceSubject);
        optionalLine("needsReview", subscription.needsReview ? "yes" : undefined);
        optionalLine("reviewReason", subscription.reviewReason);
        optionalLine("statusReason", subscription.statusReason);
        console.log(`   sourceMessagesCount: ${subscription.sourceMessagesCount}`);
        optionalLine("firstSeen", subscription.firstSeen.slice(0, 10));
        optionalLine("lastSeen", subscription.lastSeen.slice(0, 10));
        optionalLine("latestSubject", subscription.latestSubject);

        if (subscription.sourceSubjects.length > 0) {
            console.log("   source subjects:");

            for (const subject of subscription.sourceSubjects.slice(0, 4)) {
                console.log(`   - ${subject}`);
            }
        }

        if (subscription.evidenceSummary.length > 0) {
            console.log("   evidenceSummary:");

            for (const evidence of subscription.evidenceSummary.slice(0, 6)) {
                console.log(`   - ${evidence}`);
            }
        }

        if (subscription.riskSummary.length > 0) {
            console.log("   riskSummary:");

            for (const risk of subscription.riskSummary.slice(0, 4)) {
                console.log(`   - ${risk}`);
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
        const scanStats: ImapScanStats = {
            scanMode: config.scanMode,
            scanWindowDays: config.scanDays,
            deepWindowDays: config.scanMode === "deep" ? config.deepDays : undefined,
            mailboxTotalMessages: totalMessages,
            recentMessagesFetched: 0,
            targetedQueriesRun: 0,
            targetedMessagesMatched: 0,
            targetedMessagesUniqueMatched: 0,
            targetedMessagesFetched: 0,
            headerTargetedQueriesRun: 0,
            headerTargetedMessagesMatched: 0,
            headerTargetedUniqueMatched: 0,
            headerTargetedMessagesFetched: 0,
            metadataPrepassEnabled:
                config.metadataPrepassEnabled && config.scanMode !== "recent_window",
            metadataPrepassWindowDays:
                config.metadataPrepassEnabled && config.scanMode !== "recent_window"
                    ? config.metadataPrepassDays
                    : undefined,
            metadataPrepassMessagesScanned: 0,
            metadataPrepassMatches: 0,
            metadataPrepassFetched: 0,
            metadataPrepassSkippedAlreadyFetched: 0,
            metadataPrepassFetchLimit: config.metadataPrepassMatchLimit,
            metadataPrepassTopTerms: [],
            uniqueMessagesAnalyzed: 0,
            fallbackUsed: false,
            deepFallbackUsed: false,
            deepFallbackStrategy: "none",
            deepFallbackMessagesFetched: 0,
            deepFallbackWindowDays: config.scanMode === "deep" ? config.deepDays : undefined,
            deepFallbackBatchSize: config.deepBatchSize,
            deepFallbackBucketDays: config.deepBucketDays,
            deepFallbackBucketSampleMode: config.deepBucketSampleMode,
            deepFallbackBucketsTotal: 0,
            deepFallbackBucketsQueried: 0,
            deepFallbackBucketsWithMatches: 0,
            deepFallbackPerBucketLimit: config.deepPerBucketLimit,
            deepFallbackMessagesMatchedBeforeCap: 0,
            deepFallbackUidCandidatesBeforeSampling: 0,
            deepFallbackUidCandidatesAfterSampling: 0,
            reviewCandidatesBeforeSuppression: 0,
            reviewCandidatesAfterSuppression: 0,
            reviewSuppressedOneTimeOrders: 0,
            reviewSuppressedPrimeVideoOrders: 0,
            reviewSuppressedWeakPurchases: 0,
            mayMissYearlySubscriptions: config.scanMode !== "deep" && config.scanDays < 365,
            coverageNote: coverageNoteFor(config),
        };

        if (totalMessages > 0) {
            const recentSince = dateDaysAgo(config.scanDays);
            let recentUids: number[] = [];

            try {
                recentUids = await collectRecentWindowUids(client, recentSince, config.limit);
            } catch (error) {
                scanStats.fallbackUsed = true;
                scanStats.fallbackReason =
                    error instanceof Error ? error.message : "recent SINCE search failed";

                if (config.verbose) {
                    console.error(`Recent window search fallback: ${scanStats.fallbackReason}`);
                }
            }

            if (scanStats.fallbackUsed) {
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
                        "recent_window"
                    );
                }
            } else if (recentUids.length > 0) {
                for await (const message of client.fetch(
                    recentUids,
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
                        "recent_window"
                    );
                }
            }

            scanStats.recentMessagesFetched = debugMessages.filter((message) =>
                message.sourceTags.includes("recent_window")
            ).length;

            if (config.targetedSearch && config.scanMode !== "recent_window") {
                const targetedSince = dateDaysAgo(
                    config.scanMode === "deep" ? config.deepDays : config.scanDays
                );

                if (config.verbose || config.targetedVerbose) {
                    console.error(
                        `Running targeted IMAP search, mode ${config.scanMode}, limit ${config.targetedSearchLimit}`
                    );
                }

                const targeted = await collectTargetedSearchUids(
                    client,
                    config.targetedTerms,
                    targetedSince,
                    config.targetedSearchLimit,
                    config.verbose || config.targetedVerbose
                );
                scanStats.targetedQueriesRun = targeted.queriesRun;
                scanStats.targetedMessagesMatched = targeted.matched;
                scanStats.targetedMessagesUniqueMatched = targeted.uniqueMatched;

                if (targeted.uids.length > 0) {
                    try {
                        for await (const message of client.fetch(
                            targeted.uids,
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
                    } catch (error) {
                        if (config.targetedVerbose || config.verbose) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : "targeted fetch failed";
                            console.error(`Targeted IMAP fetch skipped: ${message}`);
                        }
                    }
                }

                scanStats.targetedMessagesFetched = debugMessages.filter((message) =>
                    message.sourceTags.includes("targeted")
                ).length;

                if (config.targetedVerbose || config.verbose) {
                    console.error(
                        `Targeted IMAP search summary: matched=${scanStats.targetedMessagesMatched}, unique=${scanStats.targetedMessagesUniqueMatched}, fetched=${scanStats.targetedMessagesFetched}`
                    );
                }

                if (
                    config.scanMode === "deep" &&
                    config.headerTargetedEnabled
                ) {
                    const headerTargeted = await collectHeaderTargetedSearchUids(
                        client,
                        config.headerTargetedTerms,
                        targetedSince,
                        config.headerTargetedLimit,
                        config.targetedVerbose || config.verbose
                    );
                    scanStats.headerTargetedQueriesRun =
                        headerTargeted.queriesRun;
                    scanStats.headerTargetedMessagesMatched =
                        headerTargeted.matched;
                    scanStats.headerTargetedUniqueMatched =
                        headerTargeted.uniqueMatched;

                    if (headerTargeted.uids.length > 0) {
                        try {
                            for await (const message of client.fetch(
                                headerTargeted.uids,
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
                                    "header_targeted"
                                );
                            }
                        } catch (error) {
                            if (config.targetedVerbose || config.verbose) {
                                const message =
                                    error instanceof Error
                                        ? error.message
                                        : "header targeted fetch failed";
                                console.error(
                                    `Header targeted IMAP fetch skipped: ${message}`
                                );
                            }
                        }
                    }

                    scanStats.headerTargetedMessagesFetched =
                        debugMessages.filter((message) =>
                            message.sourceTags.includes("header_targeted")
                        ).length;

                    if (config.targetedVerbose || config.verbose) {
                        console.error(
                            `Header targeted IMAP summary: matched=${scanStats.headerTargetedMessagesMatched}, unique=${scanStats.headerTargetedUniqueMatched}, fetched=${scanStats.headerTargetedMessagesFetched}`
                        );
                    }
                }

                if (config.metadataPrepassEnabled) {
                    const metadataSince = dateDaysAgo(config.metadataPrepassDays);
                    const metadataPrepass = await collectMetadataPrepassUids(
                        client,
                        totalMessages,
                        metadataSince,
                        config.metadataPrepassLimit,
                        config.metadataPrepassMatchLimit,
                        config.metadataPrepassFetchBatchSize,
                        seenMessageIds,
                        config.metadataPrepassVerbose || config.verbose
                    );
                    scanStats.metadataPrepassMessagesScanned =
                        metadataPrepass.messagesScanned;
                    scanStats.metadataPrepassMatches = metadataPrepass.matches;
                    scanStats.metadataPrepassSkippedAlreadyFetched =
                        metadataPrepass.skippedAlreadyFetched;
                    scanStats.metadataPrepassTopTerms = metadataPrepass.topTerms;

                    if (metadataPrepass.uids.length > 0) {
                        try {
                            for await (const message of client.fetch(
                                metadataPrepass.uids,
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
                                    "metadata_prepass"
                                );
                            }
                        } catch (error) {
                            if (config.metadataPrepassVerbose || config.verbose) {
                                const message =
                                    error instanceof Error
                                        ? error.message
                                        : "metadata prepass fetch failed";
                                console.error(
                                    `Metadata prepass IMAP fetch skipped: ${message}`
                                );
                            }
                        }
                    }

                    scanStats.metadataPrepassFetched = debugMessages.filter(
                        (message) => message.sourceTags.includes("metadata-prepass")
                    ).length;

                    if (config.metadataPrepassVerbose || config.verbose) {
                        console.error(
                            `Metadata prepass summary: scanned=${scanStats.metadataPrepassMessagesScanned}, matches=${scanStats.metadataPrepassMatches}, fetched=${scanStats.metadataPrepassFetched}`
                        );
                    }
                }

                if (
                    config.scanMode === "deep" &&
                    config.deepFallbackEnabled &&
                    (scanStats.targetedMessagesUniqueMatched === 0 ||
                        scanStats.targetedMessagesFetched === 0)
                ) {
                    const deepSince = dateDaysAgo(config.deepDays);
                    const deepFallback = await collectDeepFallbackUids(
                        client,
                        totalMessages,
                        deepSince,
                        config.deepMaxFetch,
                        config.deepBatchSize,
                        config.deepBucketDays,
                        config.deepPerBucketLimit,
                        config.deepBucketSampleMode,
                        seenMessageIds,
                        config.targetedVerbose || config.verbose
                    );

                    scanStats.deepFallbackUsed = true;
                    scanStats.deepFallbackReason = deepFallback.reason;
                    scanStats.deepFallbackStrategy = deepFallback.strategy;
                    scanStats.deepFallbackBucketsTotal = deepFallback.bucketsTotal;
                    scanStats.deepFallbackBucketsQueried = deepFallback.bucketsQueried;
                    scanStats.deepFallbackBucketsWithMatches =
                        deepFallback.bucketsWithMatches;
                    scanStats.deepFallbackMessagesMatchedBeforeCap =
                        deepFallback.matchedBeforeCap;
                    scanStats.deepFallbackUidCandidatesBeforeSampling =
                        deepFallback.uidCandidatesBeforeSampling;
                    scanStats.deepFallbackUidCandidatesAfterSampling =
                        deepFallback.uidCandidatesAfterSampling;

                    if (config.targetedVerbose || config.verbose) {
                        console.error(
                            `Deep fallback selected ${deepFallback.uids.length} messages, limit ${config.deepMaxFetch}`
                        );
                    }

                    if (deepFallback.uids.length > 0) {
                        try {
                            for await (const message of client.fetch(
                                deepFallback.uids,
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
                                    deepFallback.strategy === "time_buckets"
                                        ? "deep_bucket"
                                        : "deep_fallback"
                                );
                            }
                        } catch (error) {
                            if (config.targetedVerbose || config.verbose) {
                                const message =
                                    error instanceof Error
                                        ? error.message
                                        : "deep fallback fetch failed";
                                console.error(`Deep fallback IMAP fetch skipped: ${message}`);
                            }
                        }
                    }

                    scanStats.deepFallbackMessagesFetched = debugMessages.filter(
                        (message) => message.sourceTags.includes("deep_fallback")
                    ).length;
                }
            }
        }

        if (
            scanStats.metadataPrepassFetched > 0 &&
            scanStats.targetedMessagesUniqueMatched === 0 &&
            scanStats.headerTargetedUniqueMatched === 0
        ) {
            scanStats.coverageNote = `${scanStats.coverageNote} Targeted IMAP search returned 0; metadata prepass was used.`;
        }

        scanStats.uniqueMessagesAnalyzed = debugMessages.length;

        const candidatesFound = debugMessages.filter(
            (message) => message.isCandidate
        ).length;
        const recurringGroups = buildRecurringGroups(debugMessages);
        const canonicalSubscriptions = buildCanonicalSubscriptions(
            debugMessages,
            recurringGroups
        );
        const reviewCandidatesBeforeFinalSuppression = buildReviewCandidates(
            debugMessages,
            canonicalSubscriptions,
            scanStats,
            config.reviewSuppressVerbose
        );
        const reviewCandidates = applyFinalReviewCandidateSuppression(
            reviewCandidatesBeforeFinalSuppression,
            scanStats,
            config.reviewSuppressVerbose
        );
        const result: ImapScanSpikeResult = {
            mailbox: config.mailbox,
            scanStats,
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
