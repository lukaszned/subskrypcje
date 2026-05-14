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

type ImapScanMessage = {
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
    displayAmount?: string;
    amountKind?: string;
    allAmounts: string[];
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
    effectiveScanMode: ImapScanMode;
    effectiveWindowDays: number;
    mailbox: string;
    mailboxTotalMessages: number;
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
};

export type ScanImapSubscriptionsResult = {
    productResult: ProductResult<ImapProductCanonicalItem>;
    scanSummary: ImapScanSummary;
    debug?: {
        messages: ImapScanMessage[];
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

function profileDefaults(profile: ImapProductScanProfile) {
    switch (profile) {
        case "fast":
            return { days: 90, limit: 50, mode: "recent_window" as const };
        case "balanced":
            return { days: 120, limit: 100, mode: "hybrid_window" as const };
        case "deep":
            return { days: 730, limit: 200, mode: "deep" as const };
        case "adaptive":
        default:
            return { days: 120, limit: 100, mode: "recent_window" as const };
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

function statusForMessage(message: ImapScanMessage) {
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

function evidenceSummaryFor(message: ImapScanMessage) {
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

function canonicalItemsFromCandidates(
    messages: ImapScanMessage[]
): ImapProductCanonicalItem[] {
    const grouped = new Map<string, ImapScanMessage[]>();

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
        const status = statusForMessage(latest);

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
            displayAmount: amount,
            amountKind:
                status === "invoice_due"
                    ? "due"
                    : status === "price_change"
                      ? "new_price"
                      : amount
                        ? "charged"
                        : "unknown",
            allAmounts: [
                ...new Set(
                    group
                        .map((item) => item.detected.amountText ?? item.debug.amountText)
                        .filter((item): item is string => Boolean(item))
                ),
            ].slice(0, 10),
            evidenceTypes: [...new Set(group.flatMap((item) => item.debug.evidenceTiers))],
            evidenceSummary: evidenceSummaryFor(latest),
            riskSummary: [...new Set(group.flatMap((item) => item.debug.riskEvidence))].slice(0, 8),
            needsReview: confidenceLevelFor(highestConfidence) === "low",
            reviewReason:
                confidenceLevelFor(highestConfidence) === "low"
                    ? "Low confidence IMAP detection should be reviewed before showing as active."
                    : undefined,
        };
    });
}

async function fetchAnalyzedMessages(params: {
    client: ImapFlow;
    totalMessages: number;
    since: Date;
    limit: number;
}) {
    const messages: ImapScanMessage[] = [];
    let fallbackUsed = false;
    let uids: number[] = [];

    try {
        const result = await (params.client as any).search(
            { since: params.since },
            { uid: true }
        );
        uids = normalizeSearchUids(result).slice(0, params.limit);
    } catch {
        fallbackUsed = true;
    }

    if (fallbackUsed || uids.length === 0) {
        const startSeq = Math.max(1, params.totalMessages - params.limit + 1);
        const range = `${startSeq}:*`;

        for await (const message of params.client.fetch(range, {
            envelope: true,
            internalDate: true,
            source: {
                maxLength: 20_000,
            },
        } as any)) {
            messages.push(await analyzeFetchedMessage(message));
        }

        return { messages, fallbackUsed };
    }

    for await (const message of params.client.fetch(
        uids,
        {
            envelope: true,
            internalDate: true,
            source: {
                maxLength: 20_000,
            },
        } as any,
        { uid: true }
    )) {
        messages.push(await analyzeFetchedMessage(message));
    }

    return { messages, fallbackUsed };
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
}): Promise<ImapScanMessage> {
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
    };
}

export async function scanImapSubscriptions(
    input: ScanImapSubscriptionsInput
): Promise<ScanImapSubscriptionsResult> {
    const profile = input.profile ?? "adaptive";
    const defaults = profileDefaults(profile);
    const mailbox = input.mailbox?.trim() || "INBOX";
    const now = input.now ?? new Date();
    const since = dateDaysAgo(defaults.days, now);
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
        const { messages, fallbackUsed } =
            mailboxTotalMessages > 0
                ? await fetchAnalyzedMessages({
                      client,
                      totalMessages: mailboxTotalMessages,
                      since,
                      limit: defaults.limit,
                  })
                : { messages: [], fallbackUsed: false };
        const candidates = messages.filter((message) => message.debug.finalDecision === "candidate");
        const canonicalItems = canonicalItemsFromCandidates(candidates);
        const productResult = buildProductResult(canonicalItems);
        const capabilityDiagnostics = buildScanCapabilityDiagnostics({
            fallbackUsed,
            mailboxTotalMessages,
            targetedQueriesRun: 0,
            targetedMessagesUniqueMatched: 0,
            targetedMessagesFetched: 0,
            headerTargetedQueriesRun: 0,
            headerTargetedUniqueMatched: 0,
            headerTargetedMessagesFetched: 0,
            metadataPrepassEnabled: false,
            metadataPrepassMessagesScanned: 0,
            metadataPrepassFetched: 0,
            deepFallbackUsed: false,
            deepFallbackMessagesFetched: 0,
            uniqueMessagesAnalyzed: messages.length,
        });
        const plan = planImapScanStrategy(profile, capabilityDiagnostics, {
            scanMode: defaults.mode,
            scanDays: defaults.days,
            deepDays: profile === "deep" ? defaults.days : 730,
            recentMessagesFetched: messages.length,
            mailboxTotalMessages,
            targetedQueriesRun: 0,
            headerTargetedQueriesRun: 0,
            metadataPrepassEnabled: false,
            deepFallbackUsed: false,
            fallbackUsed,
            mayMissYearlySubscriptions: defaults.days < 365,
            hasCurrentSubscriptions: productResult.scanSummary.hasCurrentSubscriptions,
            needsReviewSubscriptions:
                productResult.scanSummary.needsReviewSubscriptions,
            historicalSubscriptions:
                productResult.scanSummary.historicalSubscriptions,
            priceChanges: productResult.scanSummary.priceChanges,
            billsOrUtilities: productResult.scanSummary.billsOrUtilities,
        });
        const scanSummary: ImapScanSummary = {
            scanProfile: profile,
            effectiveScanMode: plan.effectiveScanMode,
            effectiveWindowDays: plan.effectiveWindowDays,
            mailbox,
            mailboxTotalMessages,
            scannedMessages: messages.length,
            candidatesFound: candidates.length,
            rejectedMessages: messages.length - candidates.length,
            scanReliabilityLevel: plan.scanReliabilityLevel,
            scanReliabilityReasons: [
                ...capabilityDiagnostics.scanCapabilityReasons,
                ...plan.scanReliabilityReasons,
            ],
            deepScanRecommended: plan.deepScanRecommended,
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
