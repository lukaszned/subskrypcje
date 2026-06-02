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
    isBillLikeCategory,
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
    profile?: ImapProductScanProfile | string | null;
    includeDebug?: boolean;
    now?: Date;
};

export type ImapScanSummary = {
    scanProfile: ImapProductScanProfile;
    profileRequested?: string | null;
    profileEffective: "fast";
    profileNormalized: boolean;
    profileNormalizationReason?: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
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
    billLikeMetadataMatches?: number;
    billLikeCandidatesFound?: number;
    billLikeCanonicalCount?: number;
    billLikeMessagesMerged?: number;
    billCanonicalGroupsBeforeDedupe?: number;
    billCanonicalGroupsAfterDedupe?: number;
    billCanonicalGroupsMergedByDedupe?: number;
    billCanonicalGroupsMergedAcrossPaymentChannel?: number;
    billCanonicalDedupeSkippedDifferentMeaningfulChannel?: number;
    candidateMessagesAfterDedupe?: number;
    canonicalMergeGroups?: number;
    preservedHighSignalCandidates?: number;
    preservedSubscriptionLikeCandidates?: number;
    preservedBillLikeCandidates?: number;
    sampledLowSignalCandidates?: number;
    candidatesDroppedByCap?: number;
    candidatePreservationCap?: number;
    metadataPrepassCandidatesBeforeCap?: number;
    deepFallbackCandidatesBeforeCap?: number;
    deepFallbackCandidatesAfterPriorityPreserve?: number;
};

export function normalizeImapScanProfile(inputProfile: unknown): {
    requestedProfile: string | null;
    effectiveProfile: "fast";
    normalizedFrom: string | null;
    warning?: string;
} {
    const requestedProfile =
        typeof inputProfile === "string" && inputProfile.trim().length > 0
            ? inputProfile.trim()
            : null;

    return {
        requestedProfile,
        effectiveProfile: "fast",
        normalizedFrom:
            requestedProfile && requestedProfile !== "fast"
                ? requestedProfile
                : null,
        warning:
            requestedProfile && requestedProfile !== "fast"
                ? "MVP mobile scan uses the fast profile to avoid long mailbox scans."
                : requestedProfile
                ? undefined
                : "MVP mobile scan uses the fast profile to avoid long mailbox scans.",
    };
}

export type ScanImapSubscriptionsResult = {
    productResult: ProductResult<ImapProductCanonicalItem>;
    scanSummary: ImapScanSummary;
    debug?: {
        messages: ProductionImapScanMessage[];
    };
};

export type ImapScanServiceErrorCode =
    | "IMAP_CONNECTION_FAILED"
    | "IMAP_AUTH_FAILED"
    | "IMAP_CONNECTION_TIMEOUT"
    | "IMAP_MAILBOX_NOT_FOUND"
    | "IMAP_UNSUPPORTED"
    | "IMAP_SCAN_FAILED";

export class ImapScanServiceError extends Error {
    constructor(
        public code: ImapScanServiceErrorCode,
        message: string,
        public safeCause?: {
            name?: string;
            code?: string;
            status?: string | number;
            responseCode?: string;
            message?: string;
        }
    ) {
        super(message);
        this.name = "ImapScanServiceError";
    }
}

function getSafeImapErrorCause(error: unknown): ImapScanServiceError["safeCause"] {
    if (!error || typeof error !== "object") {
        return {
            message: typeof error === "string" ? error : undefined,
        };
    }

    const value = error as Record<string, unknown>;

    return {
        name: error instanceof Error ? error.name : undefined,
        code: typeof value.code === "string" ? value.code : undefined,
        status:
            typeof value.status === "string" || typeof value.status === "number"
                ? value.status
                : undefined,
        responseCode:
            typeof value.responseCode === "string"
                ? value.responseCode
                : typeof value.response === "string"
                ? value.response
                : undefined,
        message: error instanceof Error ? error.message : undefined,
    };
}

export function classifyImapScanError(error: unknown): ImapScanServiceError {
    const safeCause = getSafeImapErrorCause(error);
    const combined = [
        safeCause?.name,
        safeCause?.code,
        safeCause?.status,
        safeCause?.responseCode,
        safeCause?.message,
    ]
        .filter(Boolean)
        .join(" ");
    const normalized = normalizeAsciiText(combined);

    if (
        /auth|authentication|authenticationfailed|authenticate|login failed|login|credentials|invalid user|invalid credentials|bad credentials|password|app password|application password|\bno\b.*authenticationfailed/.test(
            normalized
        )
    ) {
        return new ImapScanServiceError(
            "IMAP_AUTH_FAILED",
            "IMAP authentication failed.",
            safeCause
        );
    }

    if (
        /timeout|timed out|etimedout|greeting timeout|command timeout|socket timeout/.test(
            normalized
        )
    ) {
        return new ImapScanServiceError(
            "IMAP_CONNECTION_TIMEOUT",
            "IMAP connection timed out.",
            safeCause
        );
    }

    if (
        /mailbox.*(not found|not exist|does not exist|missing)|folder.*(not found|not exist|does not exist)|no such mailbox|select failed|mailbox doesn't exist|mailbox does not exist/.test(
            normalized
        )
    ) {
        return new ImapScanServiceError(
            "IMAP_MAILBOX_NOT_FOUND",
            "Requested IMAP mailbox was not found.",
            safeCause
        );
    }

    if (
        /unsupported|not supported|capability|invalid command|unsupported search|unsupported charset|bad charset|search.*not supported|uid search.*bad|command not understood/.test(
            normalized
        )
    ) {
        return new ImapScanServiceError(
            "IMAP_UNSUPPORTED",
            "IMAP server does not support a required scan operation.",
            safeCause
        );
    }

    if (
        /connect|connection|econnrefused|enotfound|eai_again|econnreset|network|socket|tls|ssl|certificate|cert_|self signed|socket closed|closed before secure|handshake|wrong version number/.test(
            normalized
        )
    ) {
        return new ImapScanServiceError(
            "IMAP_CONNECTION_FAILED",
            "Could not connect to the IMAP server.",
            safeCause
        );
    }

    return new ImapScanServiceError("IMAP_SCAN_FAILED", "IMAP scan failed.", safeCause);
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
    "do zaplaty",
    "termin platnosci",
    "naleznosc",
    "oplata",
    "platnosc",
    "payment due",
    "amount due",
    "total due",
    "bill",
    "invoice",
    "billing",
    "statement",
    "rozliczenie",
    "receipt",
    "payment",
    "energia",
    "prad",
    "electricity",
    "internet",
    "telefon",
    "telecom",
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

function hasBillLikeMetadataText(value: string) {
    return /\b(faktura|e-faktura|efaktura|rachunek|invoice|bill|billing|statement|payment due|amount due|total due|kwota do zaplaty|do zaplaty|termin platnosci|naleznosc|rozliczenie|oplata|platnosc|energia|prad|electricity|internet|telefon|telecom)\b/.test(
        normalizeAsciiText(value)
    );
}

function hasEcommerceOrRiskText(value: string) {
    return /\b(zamowienie|order|rental|wypozyczenie|refund|zwrot|reklamacja|wysylka|dostawa|shipping|delivery|newsletter|regulamin|terms update|security|login|kod|verification code|kredyt|pozyczka|leasing|rrso)\b/.test(
        normalizeAsciiText(value)
    );
}

function hasExplicitDueEvidence(value: string) {
    return /\b(kwota do zaplaty|do zaplaty|termin platnosci|amount due|total due|payment due|due date|naleznosc|invoice total)\b/.test(
        normalizeAsciiText(value)
    );
}

type RetrievalSignalKind =
    | "subscription"
    | "bill"
    | "payment"
    | "price_change"
    | "trial"
    | "low"
    | "risk";

export type RetrievalPreservationInput = {
    uid: number;
    from?: string;
    subject?: string;
    score?: number;
};

type RetrievalPreservationCandidate = RetrievalPreservationInput & {
    preservationScore: number;
    kind: RetrievalSignalKind;
    isHighSignal: boolean;
    isSubscriptionLike: boolean;
    isBillLike: boolean;
};

function scoreRetrievalPreservationCandidate(
    candidate: RetrievalPreservationInput
): RetrievalPreservationCandidate {
    const text = normalizeAsciiText(
        [candidate.from, candidate.subject].filter(Boolean).join(" ")
    );
    let preservationScore = candidate.score ?? 0;
    let kind: RetrievalSignalKind = "low";
    const risk = hasEcommerceOrRiskText(text);
    const subscriptionLike =
        /\b(subscription|subskrypcja|abonament|membership|czlonkostwo|premium|paid plan|plan platny|automatycznie odnaw|will renew|renewal|odnowienie|next billing|next renewal)\b/.test(
            text
        );
    const marketplaceLike =
        /\b(prime video|google play|app store|apple|paypal|stripe|autopay|payu|przelewy24|tpay)\b/.test(
            text
        ) && subscriptionLike;
    const trialLike =
        /\b(trial|okres probny|bezplatny okres probny|after trial|zostanie naliczona)\b/.test(
            text
        );
    const priceChangeLike =
        /\b(price change|new price|nowa cena|aktualna cena|current price|zaktualizowana cena)\b/.test(
            text
        );
    const billLike = hasBillLikeMetadataText(text);
    const paymentLike =
        /\b(payment confirmation|potwierdzenie platnosci|charged|obciaz|pobrano|paid|platnosc)\b/.test(
            text
        ) && (subscriptionLike || billLike || marketplaceLike);

    if (subscriptionLike || marketplaceLike) {
        kind = "subscription";
        preservationScore += marketplaceLike ? 0.85 : 0.75;
    }

    if (trialLike) {
        kind = kind === "low" ? "trial" : kind;
        preservationScore += 0.65;
    }

    if (priceChangeLike) {
        kind = "price_change";
        preservationScore += 0.7;
    }

    if (paymentLike) {
        kind = kind === "low" ? "payment" : kind;
        preservationScore += 0.45;
    }

    if (billLike && !risk) {
        kind = kind === "low" ? "bill" : kind;
        preservationScore += hasExplicitDueEvidence(text) ? 0.8 : 0.55;
    }

    if (risk && !subscriptionLike && !billLike && !priceChangeLike && !trialLike) {
        kind = "risk";
        preservationScore -= 0.75;
    } else if (risk) {
        preservationScore -= 0.35;
    }

    const isSubscriptionLike =
        kind === "subscription" ||
        kind === "trial" ||
        kind === "payment" ||
        kind === "price_change";
    const isBillLike = kind === "bill";

    return {
        ...candidate,
        preservationScore,
        kind,
        isSubscriptionLike,
        isBillLike,
        isHighSignal:
            preservationScore >= 0.45 &&
            kind !== "risk" &&
            (isSubscriptionLike || isBillLike),
    };
}

function sortPreservationCandidate(
    a: RetrievalPreservationCandidate,
    b: RetrievalPreservationCandidate
) {
    return b.preservationScore - a.preservationScore || b.uid - a.uid;
}

export function selectPreservedRetrievalCandidatesForTest(
    candidates: RetrievalPreservationInput[],
    limit: number
) {
    return selectPreservedRetrievalCandidates(candidates, limit).selected;
}

function selectPreservedRetrievalCandidates(
    candidates: RetrievalPreservationInput[],
    limit: number
) {
    const scored = candidates
        .map(scoreRetrievalPreservationCandidate)
        .filter((candidate) => Number.isFinite(candidate.uid) && candidate.uid > 0);
    const selected = new Map<number, RetrievalPreservationCandidate>();
    const addCandidates = (
        pool: RetrievalPreservationCandidate[],
        maxCount: number
    ) => {
        for (const candidate of pool.sort(sortPreservationCandidate)) {
            if (selected.size >= limit || maxCount <= 0) break;
            if (selected.has(candidate.uid)) continue;
            selected.set(candidate.uid, candidate);
            maxCount -= 1;
        }
    };
    const highSubscription = scored.filter(
        (candidate) => candidate.isHighSignal && candidate.isSubscriptionLike
    );
    const highBill = scored.filter(
        (candidate) => candidate.isHighSignal && candidate.isBillLike
    );
    const highOther = scored.filter(
        (candidate) =>
            candidate.isHighSignal &&
            !candidate.isSubscriptionLike &&
            !candidate.isBillLike
    );
    const lowSignal = scored.filter((candidate) => !candidate.isHighSignal);
    const reservedPerHighSignalClass = Math.max(1, Math.floor(limit * 0.35));

    addCandidates(highSubscription, reservedPerHighSignalClass);
    addCandidates(highBill, reservedPerHighSignalClass);
    addCandidates(highOther, Math.max(0, limit - selected.size));
    addCandidates(
        scored.filter((candidate) => candidate.isHighSignal),
        Math.max(0, limit - selected.size)
    );
    addCandidates(lowSignal, Math.max(0, limit - selected.size));

    const selectedItems = [...selected.values()].sort(sortPreservationCandidate);
    const selectedIds = new Set(selectedItems.map((candidate) => candidate.uid));
    const droppedByCap = Math.max(0, scored.length - selectedItems.length);

    return {
        selected: selectedItems,
        droppedByCap,
        highSignalCount: selectedItems.filter((item) => item.isHighSignal).length,
        subscriptionLikeCount: selectedItems.filter((item) => item.isSubscriptionLike)
            .length,
        billLikeCount: selectedItems.filter((item) => item.isBillLike).length,
        lowSignalCount: selectedItems.filter((item) => !item.isHighSignal).length,
        dropped: scored.filter((candidate) => !selectedIds.has(candidate.uid)),
    };
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
    position: number;
    context: string;
    beforeContext: string;
    afterContext: string;
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
    dueDateText?: string;
};

function parseComparableAmount(value: string | undefined) {
    if (!value) return undefined;
    const match = value.replace(/\s/g, "").match(/\d+(?:[,.]\d{2})?/);
    if (!match) return undefined;
    const parsed = Number(match[0].replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
}

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
        let raw = cleanText(match[0]);
        const trailingCycle = text
            .slice(match.index + match[0].length, match.index + match[0].length + 12)
            .match(/^\s*\/\s*(year|month)\b/i)?.[0];

        if (trailingCycle && !/\/\s*(year|month)\b/i.test(raw)) {
            raw = cleanText(`${raw}${trailingCycle}`);
        }

        if (!raw) continue;

        const start = Math.max(0, match.index - 140);
        const end = Math.min(text.length, match.index + raw.length + 140);
        const context = normalizeAsciiText(text.slice(start, end));
        const beforeContext = normalizeAsciiText(text.slice(start, match.index));
        const afterContext = normalizeAsciiText(
            text.slice(match.index + raw.length, end)
        );
        const localBeforeContext = beforeContext.slice(-70);
        const localAfterContext = afterContext.slice(0, 90);
        const extendedBeforeContext = beforeContext.slice(-180);
        const extendedAfterContext = afterContext.slice(0, 180);
        const explicitPromoContext =
            /(oferta specjalna|special offer|cena promocyjna|promocyjna|promo|discount|rabat)/;
        const promoDurationContext =
            /(przez pierwszy miesiac|przez kolejny okres|przez\s+\d+\s+miesiac|for\s+\d+\s+month|for the first month)/;
        const postPromoContext =
            /(po uplywie okresu promocji|after (?:the )?promotional period|regular price|standard price|cena regularna)/;
        const futureRenewalContext =
            /(odnowiona w cenie|odnowi sie w cenie|will renew at|next renewal price|bedzie obciazana kwota|your payment method will be charged)/;
        const fullTrialContext = /\b(trial|okres probny|bezplatny okres probny)\b/.test(
            asciiText
        );
        const fullPromoContext =
            /(oferta specjalna|special offer|cena promocyjna|promocyjna|promo|discount|rabat|okresu promocji|promotional period)/.test(
                asciiText
            );
        const hasLocalTrialCharge =
            /(po zakonczeniu|after.*trial|zostanie naliczona|will be charged|automatically renew at|odnowi sie w cenie|odnowiona w cenie)/.test(
                context
            ) ||
            ((/(zostanie naliczona|will be charged)/.test(extendedBeforeContext) ||
                /(miesiecznie|monthly|rocznie|yearly)/.test(extendedAfterContext)) &&
                fullTrialContext);
        const hasNearDueLabel =
            /(kwota do zaplaty|amount due|invoice total|total due|do zaplaty)/.test(
                localBeforeContext
            );
        const hasBroadDueLabel =
            /(kwota do zaplaty|amount due|invoice total|total due|do zaplaty|faktura.*na kwote|na kwote)/.test(
                context
            );
        const hasLocalPromoLabel =
            explicitPromoContext.test(localBeforeContext) ||
            explicitPromoContext.test(localAfterContext) ||
            (fullPromoContext && promoDurationContext.test(localAfterContext));
        const hasPostPromoLabel =
            postPromoContext.test(localBeforeContext) ||
            postPromoContext.test(extendedBeforeContext);
        let kind: AmountKind = "unknown";
        let confidence = 0.4;

        if (
            (fullTrialContext ||
                /(po zakonczeniu.*okresu probnego|after.*trial)/.test(asciiText)) &&
            hasLocalTrialCharge
        ) {
            kind = "trial_then_price";
            confidence = 0.95;
        } else if (hasNearDueLabel) {
            kind = "due";
            confidence = 0.98;
        } else if (hasBroadDueLabel) {
            kind = "due";
            confidence = 0.86;
        } else if (/(nowa cena|zaktualizowana cena|new price|price will change to|cena zmieni sie na)/.test(localBeforeContext)) {
            kind = "new_price";
            confidence = 0.95;
        } else if (/(aktualna cena|obecna cena|dotychczasowa cena|current price|current plan price|old price)/.test(localBeforeContext)) {
            kind = "current_price";
            confidence = 0.9;
        } else if (hasPostPromoLabel) {
            kind = "regular_price";
            confidence = 0.92;
        } else if (fullPromoContext && hasLocalPromoLabel && !hasPostPromoLabel) {
            kind = "promo_price";
            confidence = 0.92;
        } else if (futureRenewalContext.test(localBeforeContext) || futureRenewalContext.test(extendedBeforeContext)) {
            kind = "future_price";
            confidence = 0.9;
        } else if (/(po uplywie okresu promocji|after (?:the )?promotional period|regular price|standard price|cena regularna|odnowiona w cenie|will renew at|next renewal price|bedzie obciazana kwota)/.test(beforeContext)) {
            kind = /(regular price|standard price|cena regularna|po uplywie okresu promocji|after (?:the )?promotional period)/.test(context)
                ? "regular_price"
                : "future_price";
            confidence = 0.88;
        } else if (
            explicitPromoContext.test(localBeforeContext) ||
            promoDurationContext.test(localAfterContext)
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

        results.push({
            raw,
            kind,
            confidence,
            position: match.index,
            context,
            beforeContext: localBeforeContext,
            afterContext: localAfterContext,
        });
    }

    const detectedAmount = message.detected.amountText ?? message.debug.amountText;

    if (detectedAmount && !results.some((result) => result.raw === detectedAmount)) {
        results.push({
            raw: detectedAmount,
            kind: "unknown",
            confidence: 0.35,
            position: Number.MAX_SAFE_INTEGER,
            context: "",
            beforeContext: "",
            afterContext: "",
        });
    }

    return results;
}

function extractDueDateFromAmountContext(amount: AmountSemantic | undefined) {
    if (!amount) return undefined;

    const labelBeforeDate = amount.context.match(
        /(termin platnosci|due date|payment due|pay by|oplacenie do|naleznosc)\D{0,60}(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i
    );

    if (labelBeforeDate?.[2]) return labelBeforeDate[2];

    const dateBeforeLabel = amount.context.match(
        /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\D{0,60}(termin platnosci|due date|payment due|pay by|oplacenie do)/i
    );

    return dateBeforeLabel?.[1];
}

function latestMessageWithAmount(
    messages: ProductionImapScanMessage[],
    predicate: (amount: AmountSemantic) => boolean
) {
    return [...messages]
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .map((message) => ({
            message,
            amount: extractAmountSemantics(message)
                .filter(predicate)
                .sort(
                    (a, b) =>
                        b.confidence - a.confidence ||
                        a.position - b.position
                )[0],
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

    selection.regularAmount = regular?.amount?.raw;
    selection.promoAmount = promo?.amount?.raw;
    selection.trialThenAmount = trialThen?.amount?.raw;
    selection.futureAmount =
        newPrice?.amount?.raw ?? future?.amount?.raw ?? trialThen?.amount?.raw;

    const promoValue = parseComparableAmount(selection.promoAmount);
    const regularValue = parseComparableAmount(selection.regularAmount);

    if (
        selection.promoAmount &&
        selection.regularAmount &&
        regularValue !== undefined &&
        promoValue !== undefined &&
        regularValue > promoValue
    ) {
        selection.futureAmount = selection.futureAmount ?? selection.regularAmount;
    }

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
            selection.dueAmount = due.amount?.raw;
            selection.latestAmount = due.amount?.raw;
            selection.dueDateText = extractDueDateFromAmountContext(due.amount);
            selection.selectedAmountSourceDate = due.message.date;
            selection.selectedAmountSourceSubject = due.message.subject;
            return selection;
        }
    }

    const source =
        charged ??
        trialThen ??
        promo ??
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

function isBillingEvidenceMessage(message: ProductionImapScanMessage) {
    const messageType = message.debug.messageType;
    const tiers = message.debug.evidenceTiers.join(" ");

    return (
        ["invoice", "payment_due", "recurring_bill", "payment_confirmation", "processor_payment", "marketplace_subscription", "active_price_change", "price_change_active"].includes(
            messageType
        ) ||
        /invoice|recurring bill|payment|price-change/i.test(tiers) ||
        Boolean(message.detected.amountText ?? message.debug.amountText)
    );
}

function isActiveEvidenceMessage(message: ProductionImapScanMessage) {
    const messageType = message.debug.messageType;
    const tiers = message.debug.evidenceTiers.join(" ");

    return (
        [
            "payment_confirmation",
            "subscription_started",
            "subscription_active",
            "subscription_continuation",
            "trial_started_future_charge",
            "marketplace_subscription",
            "active_price_change",
            "price_change_active",
        ].includes(messageType) || /active subscription|payment evidence|price-change/i.test(tiers)
    );
}

function isProductionBillLikeCandidate(message: ProductionImapScanMessage) {
    if (message.debug.finalDecision === "candidate") return true;

    const category = broadCategoryFor(message.debug.category);
    const text = [
        message.from,
        message.subject,
        message.snippet,
        ...message.reasons,
        message.debug.finalBlockReason,
    ].join(" ");
    const hasBillText = hasBillLikeMetadataText(text);
    const hasDueEvidence = hasExplicitDueEvidence(text);
    const hasAmounts = extractAmountSemantics(message).some(
        (amount) => amount.kind === "due"
    );

    return Boolean(
        isBillLikeCategory(category) &&
            hasBillText &&
            (hasDueEvidence || hasAmounts) &&
            !hasEcommerceOrRiskText(text)
    );
}

function latestByDate(messages: ProductionImapScanMessage[]) {
    return [...messages].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
}

type BillCanonicalDedupeStats = {
    billCanonicalGroupsBeforeDedupe: number;
    billCanonicalGroupsAfterDedupe: number;
    billCanonicalGroupsMergedByDedupe: number;
    billCanonicalGroupsMergedAcrossPaymentChannel: number;
    billCanonicalDedupeSkippedDifferentMeaningfulChannel: number;
};

function itemDateValue(item: {
    selectedAmountSourceDate?: string;
    lastBillingEvidenceDate?: string;
    lastEvidenceDate?: string;
    lastSeen?: string;
}) {
    const parsed = Date.parse(
        item.selectedAmountSourceDate ??
            item.lastBillingEvidenceDate ??
            item.lastEvidenceDate ??
            item.lastSeen ??
            ""
    );

    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCanonicalIdentity(value: string | undefined) {
    if (!value) return "";

    return normalizeAsciiText(value)
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\b(spolka z ograniczona odpowiedzialnoscia|sp z o o|sp zoo|s a|sa|inc|llc|ltd|limited|gmbh)\b/g, " ")
        .replace(/\b(billing|payments?|faktury|rachunki|invoice|invoices|noreply|no reply)\b/g, " ")
        .trim()
        .replace(/\s+/g, "_");
}

function isWeakBillProviderIdentity(value: string) {
    return (
        !value ||
        /^(unknown|detected_subscription|subscription|bill|bills|invoice|invoices|faktura|faktury|rachunek|rachunki|payment|payments|platnosc|do_zaplaty|kwota_do_zaplaty)$/.test(
            value
        )
    );
}

function isPaymentProcessorLikeChannel(value: string | undefined) {
    const normalized = normalizeCanonicalIdentity(value);

    return (
        !normalized ||
        /^(unknown|payment_processor|payment|payments|processor|payment_channel|platnosc|operator_platnosci|payu|przelewy24|p24|tpay|autopay|stripe|paypal)$/.test(
            normalized
        )
    );
}

function billDedupeBaseKey(item: ImapProductCanonicalItem) {
    if (!isBillLikeCategory(item.category)) return undefined;

    const providerKey = normalizeCanonicalIdentity(
        item.provider ?? item.displayName ?? item.name
    );
    const categoryKey = normalizeCanonicalIdentity(item.category);

    if (isWeakBillProviderIdentity(providerKey) || !categoryKey) {
        return undefined;
    }

    return [providerKey, categoryKey].join("|");
}

function billDedupeKey(item: ImapProductCanonicalItem) {
    const baseKey = billDedupeBaseKey(item);
    if (!baseKey) return undefined;

    const channelKey = normalizeCanonicalIdentity(item.billingChannel);

    return [
        baseKey,
        isPaymentProcessorLikeChannel(item.billingChannel) ? "" : channelKey,
    ].join("|");
}

function uniqueStrings(values: Array<string | undefined>, limit = 20) {
    return [...new Set(values.filter(Boolean) as string[])].slice(0, limit);
}

function pickLatestCanonicalItem(items: ImapProductCanonicalItem[]) {
    return [...items].sort(
        (left, right) =>
            itemDateValue(right) - itemDateValue(left) ||
            (right.confidence ?? 0) - (left.confidence ?? 0) ||
            (left.displayName ?? "").localeCompare(right.displayName ?? "")
    )[0];
}

function mergeBillCanonicalGroup(items: ImapProductCanonicalItem[]) {
    if (items.length === 1) return items[0];

    const sortedByFirstSeen = [...items].sort(
        (a, b) => Date.parse(a.firstSeen) - Date.parse(b.firstSeen)
    );
    const sortedByLastSeen = [...items].sort(
        (a, b) => Date.parse(a.lastSeen) - Date.parse(b.lastSeen)
    );
    const latest = sortedByLastSeen[sortedByLastSeen.length - 1];
    const dueItems = items.filter(
        (item) => item.amountKind === "due" || Boolean(item.dueAmount)
    );
    const selectedAmountItem =
        dueItems.length > 0 ? pickLatestCanonicalItem(dueItems) : pickLatestCanonicalItem(items);
    const allAmounts = uniqueStrings(
        items.flatMap((item) => [
            ...(item.allAmounts ?? []),
            ...(item.amounts ?? []),
            item.dueAmount,
            item.displayAmount,
            item.latestAmount,
            item.amount,
        ]),
        30
    );
    const evidenceSummary = uniqueStrings(
        items.flatMap((item) => item.evidenceSummary ?? []),
        12
    );
    const riskSummary = uniqueStrings(
        items.flatMap((item) => item.riskSummary ?? []),
        12
    );
    const selectedDueAmount =
        selectedAmountItem.dueAmount ??
        (selectedAmountItem.amountKind === "due"
            ? selectedAmountItem.displayAmount
            : undefined);
    const displayAmount =
        selectedDueAmount ??
        selectedAmountItem.displayAmount ??
        selectedAmountItem.latestAmount;
    const amountKind = selectedDueAmount ? "due" : selectedAmountItem.amountKind;
    const sourceMessagesCount = items.reduce(
        (sum, item) => sum + Math.max(0, item.sourceMessagesCount ?? 0),
        0
    );
    const highestConfidence = Math.max(...items.map((item) => item.confidence ?? 0));
    const id = billDedupeKey(selectedAmountItem) ?? selectedAmountItem.id;
    const paymentChannel = items.find(
        (item) => item.billingChannel && isPaymentProcessorLikeChannel(item.billingChannel)
    )?.billingChannel;

    return {
        ...selectedAmountItem,
        id: id.replace(/[^a-z0-9|_-]+/gi, "_"),
        displayName: selectedAmountItem.displayName ?? latest.displayName,
        provider: selectedAmountItem.provider ?? latest.provider,
        billingChannel: selectedAmountItem.billingChannel ?? paymentChannel ?? latest.billingChannel,
        category: selectedAmountItem.category ?? latest.category,
        status: items.some((item) => item.status === "stale_needs_review")
            ? "stale_needs_review"
            : latest.status,
        recencyStatus: items.some((item) => item.recencyStatus === "stale_needs_review")
            ? "stale_needs_review"
            : latest.recencyStatus,
        confidence: Math.min(1, highestConfidence + Math.max(0, items.length - 1) * 0.03),
        confidenceLevel: confidenceLevelFor(highestConfidence),
        sourceMessagesCount,
        firstSeen: sortedByFirstSeen[0].firstSeen,
        lastSeen: latest.lastSeen,
        latestSubject: latest.latestSubject,
        sourceSubjects: uniqueStrings(
            items.flatMap((item) => item.sourceSubjects ?? []),
            20
        ),
        amount: displayAmount,
        displayAmount,
        amountKind,
        dueAmount: selectedDueAmount ?? selectedAmountItem.dueAmount,
        latestAmount: displayAmount ?? selectedAmountItem.latestAmount,
        amounts: allAmounts.slice(0, 10),
        allAmounts,
        dueDateText: selectedAmountItem.dueDateText ?? latest.dueDateText,
        selectedAmountSourceDate:
            selectedAmountItem.selectedAmountSourceDate ??
            selectedAmountItem.lastBillingEvidenceDate ??
            selectedAmountItem.lastEvidenceDate,
        selectedAmountSourceSubject:
            selectedAmountItem.selectedAmountSourceSubject ??
            selectedAmountItem.latestSubject,
        evidenceTypes: uniqueStrings(
            items.flatMap((item) => item.evidenceTypes ?? []),
            20
        ),
        evidenceSummary,
        riskSummary,
        lastEvidenceDate: latest.lastEvidenceDate ?? latest.lastSeen,
        lastBillingEvidenceDate:
            selectedAmountItem.lastBillingEvidenceDate ??
            selectedAmountItem.selectedAmountSourceDate ??
            latest.lastBillingEvidenceDate,
        lastActiveEvidenceDate: pickLatestCanonicalItem(
            items.filter((item) => item.lastActiveEvidenceDate)
        )?.lastActiveEvidenceDate,
        evidenceAgeDays: selectedAmountItem.evidenceAgeDays ?? latest.evidenceAgeDays,
        stalenessReason: selectedAmountItem.stalenessReason ?? latest.stalenessReason,
        statusReason:
            "Merged duplicate bill-like scan evidence for the same provider/category.",
        needsReview: items.some((item) => item.needsReview),
        reviewReason:
            selectedAmountItem.reviewReason ??
            latest.reviewReason ??
            (items.some((item) => item.needsReview)
                ? "Merged bill evidence should be reviewed before treating it as current."
                : undefined),
    };
}

function dedupeBillCanonicalItems(items: ImapProductCanonicalItem[]) {
    const passthrough: ImapProductCanonicalItem[] = [];
    const billBaseGroups = new Map<string, ImapProductCanonicalItem[]>();
    let billItemsBefore = 0;
    let skippedDifferentMeaningfulChannel = 0;

    for (const item of items) {
        if (isBillLikeCategory(item.category)) {
            billItemsBefore += 1;
        }

        const key = billDedupeBaseKey(item);

        if (!key) {
            passthrough.push(item);
            continue;
        }

        const group = billBaseGroups.get(key) ?? [];
        group.push(item);
        billBaseGroups.set(key, group);
    }

    const mergedBills: ImapProductCanonicalItem[] = [];
    let mergedAcrossPaymentChannel = 0;

    for (const group of billBaseGroups.values()) {
        const channelGroups = new Map<string, ImapProductCanonicalItem[]>();
        const paymentCompatibleItems: ImapProductCanonicalItem[] = [];

        for (const item of group) {
            if (isPaymentProcessorLikeChannel(item.billingChannel)) {
                paymentCompatibleItems.push(item);
                continue;
            }

            const channelKey = normalizeCanonicalIdentity(item.billingChannel);
            const channelGroup = channelGroups.get(channelKey) ?? [];
            channelGroup.push(item);
            channelGroups.set(channelKey, channelGroup);
        }

        if (channelGroups.size === 0) {
            mergedBills.push(mergeBillCanonicalGroup(paymentCompatibleItems));
            if (
                paymentCompatibleItems.some((item) => item.billingChannel) &&
                paymentCompatibleItems.some((item) => !item.billingChannel)
            ) {
                mergedAcrossPaymentChannel += 1;
            }
            continue;
        }

        if (channelGroups.size === 1) {
            const meaningfulGroup = [...channelGroups.values()][0];
            const mergedGroup = [...meaningfulGroup, ...paymentCompatibleItems];
            mergedBills.push(mergeBillCanonicalGroup(mergedGroup));
            if (paymentCompatibleItems.length > 0 && meaningfulGroup.length > 0) {
                mergedAcrossPaymentChannel += 1;
            }
            continue;
        }

        skippedDifferentMeaningfulChannel += group.length;

        for (const channelGroup of channelGroups.values()) {
            mergedBills.push(mergeBillCanonicalGroup(channelGroup));
        }

        if (paymentCompatibleItems.length > 0) {
            mergedBills.push(mergeBillCanonicalGroup(paymentCompatibleItems));
        }
    }

    const stats: BillCanonicalDedupeStats = {
        billCanonicalGroupsBeforeDedupe: billItemsBefore,
        billCanonicalGroupsAfterDedupe:
            passthrough.filter((item) => isBillLikeCategory(item.category)).length +
            mergedBills.length,
        billCanonicalGroupsMergedByDedupe: Math.max(
            0,
            billItemsBefore -
                (passthrough.filter((item) => isBillLikeCategory(item.category)).length +
                    mergedBills.length)
        ),
        billCanonicalGroupsMergedAcrossPaymentChannel: mergedAcrossPaymentChannel,
        billCanonicalDedupeSkippedDifferentMeaningfulChannel:
            skippedDifferentMeaningfulChannel,
    };

    return {
        items: [...passthrough, ...mergedBills],
        stats,
    };
}

function canonicalItemsFromCandidatesRaw(
    messages: ProductionImapScanMessage[],
    now: Date
): ImapProductCanonicalItem[] {
    const grouped = new Map<string, ProductionImapScanMessage[]>();
    const seenMessageIdsByGroup = new Map<string, Set<string>>();

    for (const message of messages) {
        const provider = message.detected.provider ?? message.debug.provider;
        const name = message.detected.name ?? message.debug.name ?? provider;
        const billingChannel = message.debug.billingChannel;
        const category = broadCategoryFor(message.debug.category);
        const key = [provider ?? name ?? "unknown", billingChannel ?? "", category ?? ""]
            .join("|")
            .toLowerCase();
        const seenIds = seenMessageIdsByGroup.get(key) ?? new Set<string>();

        if (seenIds.has(message.id)) {
            continue;
        }

        const group = grouped.get(key) ?? [];
        group.push(message);
        grouped.set(key, group);
        seenIds.add(message.id);
        seenMessageIdsByGroup.set(key, seenIds);
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
        const latestActive = latestByDate(group.filter(isActiveEvidenceMessage));
        const latestBilling = latestByDate(group.filter(isBillingEvidenceMessage));
        const freshnessMessage =
            rawStatus === "invoice_due"
                ? latestBilling ?? latest
                : rawStatus === "price_change"
                  ? latestBilling ?? latestActive ?? latest
                  : latestActive ?? latestBilling ?? latest;
        const freshnessTime = Date.parse(freshnessMessage.date);
        const ageDays = Number.isFinite(freshnessTime)
            ? Math.max(
                  0,
                  Math.floor((now.getTime() - freshnessTime) / (24 * 60 * 60 * 1000))
              )
            : undefined;
        const staleThreshold =
            rawStatus === "trial" ? 45 : rawStatus === "invoice_due" ? 120 : 120;
        const isStale =
            rawStatus !== "price_change" &&
            ageDays !== undefined &&
            ageDays > staleThreshold;
        const status = isStale ? "stale_needs_review" : rawStatus;
        const amountSelection = selectCanonicalAmounts(group, rawStatus);
        const dueDateText =
            amountSelection.dueDateText ?? extractDateText(group, "due");
        const nextRenewalDateText = extractDateText(group, "renewal");
        const stalenessReason = isStale
            ? `Latest relevant evidence is ${ageDays} days old`
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
                isStale && stalenessReason
                    ? `${stalenessReason}. Confirm whether it is still active.`
                    : confidenceLevelFor(highestConfidence) === "low"
                      ? "Low confidence IMAP detection should be reviewed before showing as active."
                      : undefined,
        };
    });
}

function canonicalItemsFromCandidatesWithStats(
    messages: ProductionImapScanMessage[],
    now: Date
) {
    const rawItems = canonicalItemsFromCandidatesRaw(messages, now);
    const deduped = dedupeBillCanonicalItems(rawItems);

    return {
        items: deduped.items,
        billDedupeStats: deduped.stats,
    };
}

function canonicalItemsFromCandidates(
    messages: ProductionImapScanMessage[],
    now: Date
): ImapProductCanonicalItem[] {
    return canonicalItemsFromCandidatesWithStats(messages, now).items;
}

export function buildProductionImapCanonicalItemsForTest(
    messages: ProductionImapScanMessage[],
    now: Date
) {
    return canonicalItemsFromCandidates(
        messages.filter(isProductionBillLikeCandidate),
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
    billLikeMetadataMatches: number;
    preservedHighSignalCandidates: number;
    preservedSubscriptionLikeCandidates: number;
    preservedBillLikeCandidates: number;
    sampledLowSignalCandidates: number;
    candidatesDroppedByCap: number;
    candidatePreservationCap: number;
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
        billLikeMetadataMatches: 0,
        preservedHighSignalCandidates: 0,
        preservedSubscriptionLikeCandidates: 0,
        preservedBillLikeCandidates: 0,
        sampledLowSignalCandidates: 0,
        candidatesDroppedByCap: 0,
        candidatePreservationCap: defaults.deepFallbackPerBucketLimit,
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

    if (hasBillLikeMetadataText(asciiText)) {
        add(0.4, "billing subject");
    }

    if (/\b(kwota do zaplaty|do zaplaty|termin platnosci|payment due|amount due|total due|naleznosc|rozliczenie|statement)\b/.test(asciiText)) {
        add(0.28, "bill due subject");
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

    if (hasEcommerceOrRiskText(asciiText)) {
        score -= 0.35;
        terms.push("risk:order/security/newsletter");
    }

    return {
        uid: Number.isFinite(uid) && uid > 0 ? Math.trunc(uid) : undefined,
        from,
        subject,
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

async function prioritizeBucketMetadataUids(params: {
    client: ImapFlow;
    uids: number[];
    limit: number;
}) {
    const candidates: RetrievalPreservationInput[] = [];

    if (params.uids.length === 0 || params.limit <= 0) {
        return {
            uids: [] as number[],
            billLikeCount: 0,
            highSignalCount: 0,
            subscriptionLikeCount: 0,
            lowSignalCount: 0,
            droppedByCap: 0,
        };
    }

    try {
        for await (const message of params.client.fetch(
            params.uids,
            {
                envelope: true,
                internalDate: true,
                flags: true,
            } as any,
            { uid: true }
        )) {
            const uid = Number(message.uid ?? message.seq);
            const metadataScore = scoreMetadataMessage(message);
            const from = cleanText(formatAddress(message.envelope?.from?.[0]));
            const subject = cleanText(message.envelope?.subject ?? "");

            if (!Number.isFinite(uid) || uid <= 0) continue;

            candidates.push({
                uid: Math.trunc(uid),
                from,
                subject,
                score: metadataScore.score,
            });
        }
    } catch {
        return {
            uids: [] as number[],
            billLikeCount: 0,
            highSignalCount: 0,
            subscriptionLikeCount: 0,
            lowSignalCount: 0,
            droppedByCap: 0,
        };
    }

    const preserved = selectPreservedRetrievalCandidates(candidates, params.limit);

    return {
        uids: preserved.selected.map((item) => item.uid),
        billLikeCount: preserved.billLikeCount,
        highSignalCount: preserved.highSignalCount,
        subscriptionLikeCount: preserved.subscriptionLikeCount,
        lowSignalCount: preserved.lowSignalCount,
        droppedByCap: preserved.droppedByCap,
    };
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

    const hits: Array<{
        uid: number;
        from?: string;
        subject?: string;
        score: number;
        terms: string[];
    }> = [];
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

                hits.push(scored as {
                    uid: number;
                    from?: string;
                    subject?: string;
                    score: number;
                    terms: string[];
                });

                for (const term of scored.terms.slice(0, 6)) {
                    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
                }
            }
        } catch {
            // Skip bad metadata batches.
        }
    }

    const sortedHits = hits.sort((a, b) => b.score - a.score);
    const preservedHits = selectPreservedRetrievalCandidates(
        sortedHits.map((hit) => ({
            uid: hit.uid,
            from: hit.from,
            subject: hit.subject,
            score: hit.score,
        })),
        params.matchLimit
    );
    const selected: number[] = [];
    let skippedAlreadyFetched = 0;

    for (const hit of preservedHits.selected) {
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
    let billLikeMetadataMatches = 0;
    let preservedHighSignalCandidates = 0;
    let preservedSubscriptionLikeCandidates = 0;
    let preservedBillLikeCandidates = 0;
    let sampledLowSignalCandidates = 0;
    let candidatesDroppedByCap = 0;

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
            const priorityLimit = Math.max(1, Math.floor(params.perBucketLimit * 0.5));
            const prioritized = await prioritizeBucketMetadataUids({
                client: params.client,
                uids: matches,
                limit: priorityLimit,
            });
            billLikeMetadataMatches += prioritized.billLikeCount;
            preservedHighSignalCandidates += prioritized.highSignalCount;
            preservedSubscriptionLikeCandidates += prioritized.subscriptionLikeCount;
            preservedBillLikeCandidates += prioritized.billLikeCount;
            sampledLowSignalCandidates += prioritized.lowSignalCount;
            candidatesDroppedByCap += prioritized.droppedByCap;
            const priorityUids = prioritized.uids;
            const remainingMatches = matches.filter((uid) => !priorityUids.includes(uid));
            const sampled = [
                ...priorityUids,
                ...sampleBucketUids(
                    remainingMatches,
                    Math.max(0, params.perBucketLimit - priorityUids.length),
                    params.sampleMode
                ),
            ].slice(0, params.perBucketLimit);
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
                billLikeMetadataMatches,
                preservedHighSignalCandidates,
                preservedSubscriptionLikeCandidates,
                preservedBillLikeCandidates,
                sampledLowSignalCandidates,
                candidatesDroppedByCap,
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
        billLikeMetadataMatches,
        preservedHighSignalCandidates,
        preservedSubscriptionLikeCandidates,
        preservedBillLikeCandidates,
        sampledLowSignalCandidates,
        candidatesDroppedByCap,
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
        stats.billLikeMetadataMatches = bucketResult.billLikeMetadataMatches;
        stats.preservedHighSignalCandidates =
            bucketResult.preservedHighSignalCandidates;
        stats.preservedSubscriptionLikeCandidates =
            bucketResult.preservedSubscriptionLikeCandidates;
        stats.preservedBillLikeCandidates =
            bucketResult.preservedBillLikeCandidates;
        stats.sampledLowSignalCandidates = bucketResult.sampledLowSignalCandidates;
        stats.candidatesDroppedByCap = bucketResult.candidatesDroppedByCap;
        stats.candidatePreservationCap = params.defaults.deepFallbackPerBucketLimit;

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
    const profileNormalization = normalizeImapScanProfile(input.profile);
    const profile = profileNormalization.effectiveProfile;
    const defaults = profileDefaults(profile);
    const mailbox = input.mailbox?.trim() || "INBOX";
    const now = input.now ?? new Date();
    const startedAt = new Date();
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
        const candidates = messages.filter(isProductionBillLikeCandidate);
        const canonicalBuild = canonicalItemsFromCandidatesWithStats(candidates, now);
        const canonicalItems = canonicalBuild.items;
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
        const completedAt = new Date();
        const scanSummary: ImapScanSummary = {
            scanProfile: profile,
            profileRequested: profileNormalization.requestedProfile,
            profileEffective: profileNormalization.effectiveProfile,
            profileNormalized: Boolean(profileNormalization.warning),
            profileNormalizationReason: profileNormalization.warning,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            durationMs: completedAt.getTime() - startedAt.getTime(),
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
            billLikeMetadataMatches: stats.billLikeMetadataMatches,
            billLikeCandidatesFound: candidates.filter((message) =>
                isBillLikeCategory(broadCategoryFor(message.debug.category))
            ).length,
            billLikeCanonicalCount: canonicalItems.filter((item) =>
                isBillLikeCategory(item.category)
            ).length,
            billLikeMessagesMerged: canonicalItems
                .filter((item) => isBillLikeCategory(item.category))
                .reduce((sum, item) => sum + item.sourceMessagesCount, 0),
            billCanonicalGroupsBeforeDedupe:
                canonicalBuild.billDedupeStats.billCanonicalGroupsBeforeDedupe,
            billCanonicalGroupsAfterDedupe:
                canonicalBuild.billDedupeStats.billCanonicalGroupsAfterDedupe,
            billCanonicalGroupsMergedByDedupe:
                canonicalBuild.billDedupeStats.billCanonicalGroupsMergedByDedupe,
            billCanonicalGroupsMergedAcrossPaymentChannel:
                canonicalBuild.billDedupeStats
                    .billCanonicalGroupsMergedAcrossPaymentChannel,
            billCanonicalDedupeSkippedDifferentMeaningfulChannel:
                canonicalBuild.billDedupeStats
                    .billCanonicalDedupeSkippedDifferentMeaningfulChannel,
            candidateMessagesAfterDedupe: candidates.length,
            canonicalMergeGroups: canonicalItems.length,
            preservedHighSignalCandidates: stats.preservedHighSignalCandidates,
            preservedSubscriptionLikeCandidates:
                stats.preservedSubscriptionLikeCandidates,
            preservedBillLikeCandidates: stats.preservedBillLikeCandidates,
            sampledLowSignalCandidates: stats.sampledLowSignalCandidates,
            candidatesDroppedByCap: stats.candidatesDroppedByCap,
            candidatePreservationCap: stats.candidatePreservationCap,
            metadataPrepassCandidatesBeforeCap: stats.metadataPrepassMatches,
            deepFallbackCandidatesBeforeCap:
                stats.deepFallbackUidCandidatesBeforeSampling,
            deepFallbackCandidatesAfterPriorityPreserve:
                stats.deepFallbackUidCandidatesAfterSampling,
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

        throw classifyImapScanError(error);
    } finally {
        try {
            await client.logout();
        } catch {
            // Ignore logout failures; the scan result/error above is more useful.
        }
    }
}
