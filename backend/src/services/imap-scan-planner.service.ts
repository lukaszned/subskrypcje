export type ImapProductScanProfile = "fast" | "balanced" | "deep" | "adaptive";

export type ImapScanMode = "recent_window" | "hybrid_window" | "deep";

export type ImapRecommendedFallbackStrategy =
    | "recent_window_only"
    | "targeted_search"
    | "metadata_prepass"
    | "time_buckets"
    | "metadata_prepass_plus_time_buckets"
    | "newest_n_fallback";

export type ImapScanReliabilityLevel = "high" | "medium" | "low";

export type ImapScanCapabilities = {
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
    scanCapabilityReasons: string[];
};

export type ImapScanCapabilityStatsInput = {
    fallbackUsed: boolean;
    mailboxTotalMessages: number;
    targetedQueriesRun: number;
    targetedMessagesUniqueMatched: number;
    targetedMessagesFetched: number;
    headerTargetedQueriesRun: number;
    headerTargetedUniqueMatched: number;
    headerTargetedMessagesFetched: number;
    metadataPrepassEnabled: boolean;
    metadataPrepassMessagesScanned: number;
    metadataPrepassFetched: number;
    deepFallbackUsed: boolean;
    deepFallbackMessagesFetched: number;
    uniqueMessagesAnalyzed: number;
};

export type ImapScanPlannerObservedStats = {
    scanMode: ImapScanMode;
    scanDays: number;
    deepDays?: number;
    recentMessagesFetched: number;
    mailboxTotalMessages: number;
    targetedQueriesRun: number;
    headerTargetedQueriesRun: number;
    metadataPrepassEnabled: boolean;
    deepFallbackUsed: boolean;
    fallbackUsed: boolean;
    mayMissYearlySubscriptions: boolean;
    hasCurrentSubscriptions: boolean;
    needsReviewSubscriptions: number;
    historicalSubscriptions: number;
    priceChanges: number;
    billsOrUtilities: number;
};

export type ImapScanStrategyPlan = {
    effectiveScanMode: ImapScanMode;
    effectiveWindowDays: number;
    shouldRunTargetedSearch: boolean;
    shouldRunHeaderTargetedSearch: boolean;
    shouldRunMetadataPrepass: boolean;
    shouldRunDeepFallback: boolean;
    recommendedScanModeForProvider: ImapScanMode;
    recommendedFallbackStrategy: ImapRecommendedFallbackStrategy;
    scanReliabilityLevel: ImapScanReliabilityLevel;
    scanReliabilityReasons: string[];
    deepScanAvailable: boolean;
    deepScanRecommended: boolean;
    deepScanReason?: string;
    quickScanLikelyIncomplete: boolean;
    userFacingCoverageNote: string;
};

export function isPositiveCount(value: number | undefined) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildScanCapabilityDiagnostics(
    scanStats: ImapScanCapabilityStatsInput
): ImapScanCapabilities {
    const reasons: string[] = [];
    const sinceSearchSupported = !scanStats.fallbackUsed;
    const bodySearchSupported =
        scanStats.targetedQueriesRun > 0 &&
        isPositiveCount(scanStats.targetedMessagesUniqueMatched);
    const headerSearchSupported =
        scanStats.headerTargetedQueriesRun > 0 &&
        isPositiveCount(scanStats.headerTargetedUniqueMatched);
    const uidFetchSupported = isPositiveCount(scanStats.uniqueMessagesAnalyzed);
    const metadataPrepassSupported =
        scanStats.metadataPrepassEnabled &&
        (isPositiveCount(scanStats.metadataPrepassMessagesScanned) ||
            isPositiveCount(scanStats.metadataPrepassFetched));
    const deepFallbackSupported =
        scanStats.deepFallbackUsed &&
        isPositiveCount(scanStats.deepFallbackMessagesFetched);
    const targetedSearchUseful = isPositiveCount(scanStats.targetedMessagesFetched);
    const headerSearchUseful = isPositiveCount(scanStats.headerTargetedMessagesFetched);
    const metadataPrepassUseful = isPositiveCount(scanStats.metadataPrepassFetched);
    const fallbackUseful = isPositiveCount(scanStats.deepFallbackMessagesFetched);

    if (!sinceSearchSupported) {
        reasons.push("Recent SINCE search fell back to newest-message fetching.");
    }

    if (scanStats.targetedQueriesRun > 0 && !bodySearchSupported) {
        reasons.push("Body/TEXT targeted search produced no usable UID matches.");
    }

    if (scanStats.headerTargetedQueriesRun > 0 && !headerSearchSupported) {
        reasons.push("Header targeted search produced no usable UID matches.");
    }

    if (scanStats.metadataPrepassEnabled && !metadataPrepassSupported) {
        reasons.push("Metadata prepass was enabled but did not scan usable metadata.");
    }

    if (scanStats.deepFallbackUsed && !deepFallbackSupported) {
        reasons.push("Deep fallback was attempted but did not fetch additional messages.");
    }

    if (!uidFetchSupported && scanStats.mailboxTotalMessages > 0) {
        reasons.push("No messages were fetched/analyzed despite a non-empty mailbox.");
    }

    return {
        sinceSearchSupported,
        bodySearchSupported,
        headerSearchSupported,
        uidFetchSupported,
        metadataPrepassSupported,
        deepFallbackSupported,
        targetedSearchUseful,
        headerSearchUseful,
        metadataPrepassUseful,
        fallbackUseful,
        scanCapabilityReasons: reasons,
    };
}

export function planImapScanStrategy(
    profile: ImapProductScanProfile,
    capabilities: ImapScanCapabilities,
    observedStats: ImapScanPlannerObservedStats
): ImapScanStrategyPlan {
    const reasons: string[] = [];
    const targetedUseful =
        capabilities.targetedSearchUseful || capabilities.headerSearchUseful;
    const metadataUseful = capabilities.metadataPrepassUseful;
    const deepFallbackUseful = capabilities.fallbackUseful;
    const recentUseful = isPositiveCount(observedStats.recentMessagesFetched);
    const hasCurrent = observedStats.hasCurrentSubscriptions;
    const hasAnyFinding =
        hasCurrent ||
        observedStats.needsReviewSubscriptions > 0 ||
        observedStats.historicalSubscriptions > 0 ||
        observedStats.priceChanges > 0 ||
        observedStats.billsOrUtilities > 0;
    const quickScanOnly =
        observedStats.scanMode === "recent_window" &&
        !targetedUseful &&
        !metadataUseful &&
        !deepFallbackUseful;
    const onlyFallbackCoverage =
        !targetedUseful &&
        (metadataUseful || deepFallbackUseful);

    let recommendedScanModeForProvider: ImapScanMode = "recent_window";
    let effectiveScanMode = observedStats.scanMode;
    let effectiveWindowDays =
        observedStats.scanMode === "deep"
            ? observedStats.deepDays ?? observedStats.scanDays
            : observedStats.scanDays;
    let shouldRunTargetedSearch = false;
    let shouldRunHeaderTargetedSearch = false;
    let shouldRunMetadataPrepass = false;
    let shouldRunDeepFallback = false;

    if (targetedUseful) {
        recommendedScanModeForProvider = "hybrid_window";
    }

    if (
        !hasCurrent &&
        (observedStats.needsReviewSubscriptions > 0 ||
            observedStats.historicalSubscriptions > 0 ||
            observedStats.priceChanges > 0)
    ) {
        recommendedScanModeForProvider = "deep";
    }

    if (quickScanOnly && (!hasCurrent || !hasAnyFinding)) {
        recommendedScanModeForProvider = "deep";
    }

    let recommendedFallbackStrategy: ImapRecommendedFallbackStrategy =
        "recent_window_only";

    if (targetedUseful) {
        recommendedFallbackStrategy = "targeted_search";
    } else if (metadataUseful && deepFallbackUseful) {
        recommendedFallbackStrategy = "metadata_prepass_plus_time_buckets";
    } else if (metadataUseful) {
        recommendedFallbackStrategy = "metadata_prepass";
    } else if (deepFallbackUseful) {
        recommendedFallbackStrategy = "time_buckets";
    } else if (observedStats.fallbackUsed) {
        recommendedFallbackStrategy = "newest_n_fallback";
    }

    if (quickScanOnly && !hasCurrent) {
        recommendedFallbackStrategy = "metadata_prepass_plus_time_buckets";
    }

    if (profile === "fast") {
        effectiveScanMode = "recent_window";
        effectiveWindowDays = observedStats.scanDays;
    } else if (profile === "balanced") {
        effectiveScanMode = "hybrid_window";
        effectiveWindowDays = Math.max(observedStats.scanDays, 120);
        shouldRunTargetedSearch = capabilities.bodySearchSupported || !metadataUseful;
        shouldRunHeaderTargetedSearch =
            capabilities.headerSearchSupported || !metadataUseful;
        shouldRunMetadataPrepass = !targetedUseful && capabilities.uidFetchSupported;
    } else if (profile === "adaptive") {
        effectiveScanMode = targetedUseful ? "hybrid_window" : "deep";
        effectiveWindowDays =
            effectiveScanMode === "deep"
                ? observedStats.deepDays ?? observedStats.scanDays
                : observedStats.scanDays;
        shouldRunTargetedSearch =
            capabilities.bodySearchSupported || observedStats.targetedQueriesRun === 0;
        shouldRunHeaderTargetedSearch =
            capabilities.headerSearchSupported ||
            observedStats.headerTargetedQueriesRun === 0;
        shouldRunMetadataPrepass = !targetedUseful && capabilities.uidFetchSupported;
        shouldRunDeepFallback =
            !targetedUseful &&
            capabilities.uidFetchSupported &&
            (!metadataUseful || hasAnyFinding || !hasCurrent);
    } else {
        effectiveScanMode = "deep";
        effectiveWindowDays = observedStats.deepDays ?? observedStats.scanDays;
        shouldRunTargetedSearch =
            capabilities.bodySearchSupported || observedStats.targetedQueriesRun === 0;
        shouldRunHeaderTargetedSearch =
            capabilities.headerSearchSupported ||
            observedStats.headerTargetedQueriesRun === 0;
        shouldRunMetadataPrepass = capabilities.uidFetchSupported;
        shouldRunDeepFallback = capabilities.uidFetchSupported;
    }

    let scanReliabilityLevel: ImapScanReliabilityLevel = "medium";

    if (!recentUseful || observedStats.fallbackUsed || !capabilities.uidFetchSupported) {
        scanReliabilityLevel = "low";
        reasons.push("Recent scan did not have reliable SINCE/UID coverage.");
    } else if (quickScanOnly && !hasCurrent) {
        scanReliabilityLevel = hasAnyFinding ? "medium" : "low";
        reasons.push(
            "Quick scan only: no metadata prepass, targeted search, or deep fallback was used."
        );
        reasons.push("Deep scan recommended to check older, yearly, or marketplace-billed subscriptions.");
    } else if (onlyFallbackCoverage) {
        scanReliabilityLevel = "medium";
        reasons.push(
            "IMAP targeted search was not useful; scanner relies on metadata prepass and/or time-bucket fallback."
        );
    } else if (targetedUseful) {
        scanReliabilityLevel = "high";
        reasons.push("Server-side targeted search returned usable matches.");
    } else {
        scanReliabilityLevel = hasCurrent ? "medium" : "low";
        reasons.push("Recent scan completed, but no broader discovery strategy was used.");
    }

    if (observedStats.targetedQueriesRun === 0) {
        reasons.push("No server-side body search was run for this profile.");
    } else if (!capabilities.bodySearchSupported) {
        reasons.push("Body/TEXT search matched 0 messages.");
    }

    if (observedStats.headerTargetedQueriesRun === 0) {
        reasons.push("No server-side header search was run for this profile.");
    } else if (!capabilities.headerSearchSupported) {
        reasons.push("Header search matched 0 messages.");
    }

    if (metadataUseful) {
        reasons.push("Metadata prepass fetched likely relevant messages without relying on server-side body search.");
    }

    if (deepFallbackUseful) {
        reasons.push("Deep fallback fetched messages across the configured time window.");
    }

    const deepWasUsed =
        observedStats.scanMode === "deep" ||
        (profile === "adaptive" && effectiveScanMode === "deep");
    const quickScanLikelyIncomplete =
        observedStats.scanMode !== "deep" &&
        (observedStats.mayMissYearlySubscriptions ||
            !hasCurrent ||
            scanReliabilityLevel !== "high");
    let deepScanRecommended = false;
    let deepScanReason: string | undefined;
    let userFacingCoverageNote: string;

    if (hasCurrent) {
        deepScanReason = "Recent active subscription or bill evidence was found.";
        userFacingCoverageNote =
            scanReliabilityLevel === "high"
                ? "Recent active subscriptions or bills were found in this scan window."
                : "Recent active subscriptions or bills were found, but IMAP search capability was limited, so older results may still need review.";
    } else if (observedStats.needsReviewSubscriptions > 0) {
        deepScanRecommended = !deepWasUsed;
        deepScanReason = deepWasUsed
            ? "Deep/adaptive scan already found historical subscription evidence."
            : "Only historical subscription evidence was found; a deeper scan may find older or yearly renewals.";
        userFacingCoverageNote =
            "We found historical subscription evidence, but no recent active subscription payments. Please confirm which historical subscriptions are still active.";
    } else if (!hasAnyFinding && profile === "fast") {
        deepScanRecommended = true;
        deepScanReason = "Fast scan found no current subscription evidence.";
        userFacingCoverageNote =
            "No current subscriptions were found in the quick scan. A deeper scan may find older, yearly, or marketplace-billed subscriptions.";
    } else if (observedStats.priceChanges > 0) {
        deepScanRecommended = !deepWasUsed;
        deepScanReason =
            "Price-change evidence was found without recent active payment evidence.";
        userFacingCoverageNote =
            "We found price-change notices, but no recent active subscription payments in this scan window.";
    } else if (observedStats.billsOrUtilities > 0) {
        deepScanRecommended = !deepWasUsed;
        deepScanReason =
            "Bill or utility evidence was found without recent subscription payments.";
        userFacingCoverageNote =
            "We found bill or utility evidence. Review stale bills before treating them as current.";
    } else {
        deepScanRecommended = observedStats.scanMode !== "deep";
        deepScanReason = deepScanRecommended
            ? "No product-facing evidence was found in the current scan window."
            : "Deep scan found no product-facing subscription evidence.";
        userFacingCoverageNote =
            scanReliabilityLevel === "high"
                ? "No current subscription evidence was found in this scan window."
                : "No current subscription evidence was found, and IMAP search capability was limited; a later deep scan may still find older subscriptions.";
    }

    if (deepScanRecommended) {
        reasons.push("Deep scan recommended based on current findings and coverage.");
    }

    return {
        effectiveScanMode,
        effectiveWindowDays,
        shouldRunTargetedSearch,
        shouldRunHeaderTargetedSearch,
        shouldRunMetadataPrepass,
        shouldRunDeepFallback,
        recommendedScanModeForProvider,
        recommendedFallbackStrategy,
        scanReliabilityLevel,
        scanReliabilityReasons: reasons,
        deepScanAvailable: true,
        deepScanRecommended,
        deepScanReason,
        quickScanLikelyIncomplete,
        userFacingCoverageNote,
    };
}
