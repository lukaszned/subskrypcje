import { emailDetectionFixtureCases } from "../fixtures/email-detection-cases";
import { analyzeMessageForSubscription } from "../services/email-detection.service";
import {
    ImapScanCapabilities,
    ImapScanPlannerObservedStats,
    planImapScanStrategy,
} from "../services/imap-scan-planner.service";
import {
    buildProductResult,
    classifyProductBucket,
    ProductBucketInput,
} from "../services/subscription-product-buckets.service";

type AssertionFailure = {
    field: string;
    expected: unknown;
    actual: unknown;
};

function collectFailures(
    expected: (typeof emailDetectionFixtureCases)[number]["expected"],
    actual: ReturnType<typeof analyzeMessageForSubscription>
) {
    const failures: AssertionFailure[] = [];

    if (actual.isCandidate !== expected.isCandidate) {
        failures.push({
            field: "isCandidate",
            expected: expected.isCandidate,
            actual: actual.isCandidate,
        });
    }

    if (
        expected.provider !== undefined &&
        actual.detected.provider !== expected.provider
    ) {
        failures.push({
            field: "provider",
            expected: expected.provider,
            actual: actual.detected.provider,
        });
    }

    if (expected.name !== undefined && actual.detected.name !== expected.name) {
        failures.push({
            field: "name",
            expected: expected.name,
            actual: actual.detected.name,
        });
    }

    if (
        expected.isTrial !== undefined &&
        actual.detected.isTrial !== expected.isTrial
    ) {
        failures.push({
            field: "isTrial",
            expected: expected.isTrial,
            actual: actual.detected.isTrial,
        });
    }

    if (
        expected.billingCycle !== undefined &&
        actual.detected.billingCycle !== expected.billingCycle
    ) {
        failures.push({
            field: "billingCycle",
            expected: expected.billingCycle,
            actual: actual.detected.billingCycle,
        });
    }

    if (
        expected.amountText !== undefined &&
        actual.detected.amountText !== expected.amountText
    ) {
        failures.push({
            field: "amountText",
            expected: expected.amountText,
            actual: actual.detected.amountText,
        });
    }

    if (
        expected.minConfidence !== undefined &&
        actual.confidence < expected.minConfidence
    ) {
        failures.push({
            field: "minConfidence",
            expected: `>= ${expected.minConfidence}`,
            actual: actual.confidence,
        });
    }

    if (
        expected.maxConfidence !== undefined &&
        actual.confidence > expected.maxConfidence
    ) {
        failures.push({
            field: "maxConfidence",
            expected: `<= ${expected.maxConfidence}`,
            actual: actual.confidence,
        });
    }

    return failures;
}

let passed = 0;
let failed = 0;
const failedCaseNames: string[] = [];
const passedCaseNames: string[] = [];
let plannerPassed = 0;
let plannerFailed = 0;
const failedPlannerCases: string[] = [];
let bucketPassed = 0;
let bucketFailed = 0;
const failedBucketCases: string[] = [];
let productResultPassed = 0;
let productResultFailed = 0;
const failedProductResultCases: string[] = [];

function runPlannerCase(
    name: string,
    profile: "fast" | "balanced" | "deep" | "adaptive",
    capabilities: ImapScanCapabilities,
    observedStats: ImapScanPlannerObservedStats,
    expected: Partial<ReturnType<typeof planImapScanStrategy>>
) {
    const actual = planImapScanStrategy(profile, capabilities, observedStats);
    const failures = Object.entries(expected).filter(
        ([key, value]) => actual[key as keyof typeof actual] !== value
    );

    if (failures.length === 0) {
        plannerPassed += 1;
        console.log(`PASS planner: ${name}`);
        return;
    }

    plannerFailed += 1;
    failedPlannerCases.push(name);
    console.log(`FAIL planner: ${name}`);
    console.log("  expected:", JSON.stringify(expected, null, 2));
    console.log("  actual:", JSON.stringify(actual, null, 2));
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

function runProductBucketCase(
    name: string,
    input: ProductBucketInput,
    expected: Partial<ReturnType<typeof classifyProductBucket>>
) {
    const actual = classifyProductBucket(input);
    const failures = Object.entries(expected).filter(
        ([key, value]) => actual[key as keyof typeof actual] !== value
    );

    if (failures.length === 0) {
        bucketPassed += 1;
        console.log(`PASS bucket: ${name}`);
        return;
    }

    bucketFailed += 1;
    failedBucketCases.push(name);
    console.log(`FAIL bucket: ${name}`);
    console.log("  expected:", JSON.stringify(expected, null, 2));
    console.log("  actual:", JSON.stringify(actual, null, 2));
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

function runProductResultContractCase() {
    const items: ProductBucketInput[] = [
        {
            displayName: "Uber One",
            provider: "Uber One",
            category: "delivery_membership",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
            evidenceSummary: ["payment confirmation", "invoice/recurring bill"],
            evidenceTypes: ["payment confirmation", "invoice", "bill due"],
        },
        {
            displayName: "Max",
            provider: "Max",
            category: "streaming_video",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
            evidenceSummary: ["subscription continuation/future charge"],
        },
        {
            displayName: "SkyShowtime on Prime Video",
            provider: "SkyShowtime",
            billingChannel: "Prime Video",
            category: "streaming_video",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
            evidenceSummary: ["marketplace subscription continuation"],
        },
        {
            displayName: "Adobe Acrobat Pro",
            provider: "Adobe",
            category: "software_saas",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
            evidenceSummary: ["trial future charge"],
        },
        {
            displayName: "Amazon Prime",
            provider: "Amazon",
            category: "ecommerce_membership",
            status: "price_change",
            needsReview: false,
            evidenceSummary: ["active price-change evidence"],
        },
        {
            displayName: "Tauron",
            provider: "Tauron",
            category: "utilities_energy",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
            evidenceSummary: ["invoice or bill due"],
            evidenceTypes: ["invoice", "payment due"],
        },
    ];
    const actual = buildProductResult(items);
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const findByName = (
        rows: Array<ProductBucketInput & { primaryAction: string }>,
        displayName: string
    ) => rows.find((row) => row.displayName === displayName);

    assertField("currentSubscriptions", 0, actual.scanSummary.currentSubscriptions);
    assertField("needsReviewSubscriptions", 4, actual.scanSummary.needsReviewSubscriptions);
    assertField("priceChanges", 1, actual.scanSummary.priceChanges);
    assertField("billsOrUtilities", 1, actual.scanSummary.billsOrUtilities);
    assertField("historicalSubscriptions", 0, actual.scanSummary.historicalSubscriptions);
    assertField("recommendedDefaultMode", "review", actual.scanSummary.recommendedDefaultMode);
    assertField("hasCurrentSubscriptions", false, actual.scanSummary.hasCurrentSubscriptions);
    assertField("hasOnlyHistoricalEvidence", true, actual.scanSummary.hasOnlyHistoricalEvidence);
    assertField("hasPriceChanges", true, actual.scanSummary.hasPriceChanges);
    assertField("hasBillsOrUtilities", true, actual.scanSummary.hasBillsOrUtilities);
    assertField(
        "Uber One primaryAction",
        "confirm_still_active",
        findByName(actual.needsReviewSubscriptions, "Uber One")?.primaryAction
    );
    assertField(
        "Tauron primaryAction",
        "review_old_bill",
        findByName(actual.billsOrUtilities, "Tauron")?.primaryAction
    );
    assertField(
        "Amazon primaryAction",
        "review_price_change",
        findByName(actual.priceChanges, "Amazon Prime")?.primaryAction
    );

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: mixed historical subscriptions and bills");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("mixed historical subscriptions and bills");
    console.log("FAIL productResult: mixed historical subscriptions and bills");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify(actual.scanSummary, null, 2));
}

const strongCapabilities: ImapScanCapabilities = {
    sinceSearchSupported: true,
    bodySearchSupported: true,
    headerSearchSupported: true,
    uidFetchSupported: true,
    metadataPrepassSupported: false,
    deepFallbackSupported: false,
    targetedSearchUseful: true,
    headerSearchUseful: true,
    metadataPrepassUseful: false,
    fallbackUseful: false,
    scanCapabilityReasons: [],
};

const weakSearchCapabilities: ImapScanCapabilities = {
    sinceSearchSupported: true,
    bodySearchSupported: false,
    headerSearchSupported: false,
    uidFetchSupported: true,
    metadataPrepassSupported: true,
    deepFallbackSupported: true,
    targetedSearchUseful: false,
    headerSearchUseful: false,
    metadataPrepassUseful: true,
    fallbackUseful: true,
    scanCapabilityReasons: [],
};

const uidLimitedCapabilities: ImapScanCapabilities = {
    sinceSearchSupported: false,
    bodySearchSupported: false,
    headerSearchSupported: false,
    uidFetchSupported: false,
    metadataPrepassSupported: false,
    deepFallbackSupported: false,
    targetedSearchUseful: false,
    headerSearchUseful: false,
    metadataPrepassUseful: false,
    fallbackUseful: false,
    scanCapabilityReasons: [],
};

const baseObservedStats: ImapScanPlannerObservedStats = {
    scanMode: "recent_window",
    scanDays: 90,
    deepDays: 730,
    recentMessagesFetched: 100,
    mailboxTotalMessages: 1000,
    targetedQueriesRun: 0,
    headerTargetedQueriesRun: 0,
    metadataPrepassEnabled: false,
    deepFallbackUsed: false,
    fallbackUsed: false,
    mayMissYearlySubscriptions: true,
    hasCurrentSubscriptions: false,
    needsReviewSubscriptions: 0,
    historicalSubscriptions: 0,
    priceChanges: 0,
    billsOrUtilities: 0,
};

runPlannerCase(
    "strong IMAP search provider",
    "adaptive",
    strongCapabilities,
    {
        ...baseObservedStats,
        scanMode: "hybrid_window",
        targetedQueriesRun: 12,
        headerTargetedQueriesRun: 4,
        hasCurrentSubscriptions: true,
    },
    {
        recommendedFallbackStrategy: "targeted_search",
        scanReliabilityLevel: "high",
        recommendedScanModeForProvider: "hybrid_window",
    }
);

runPlannerCase(
    "weak IMAP search provider",
    "deep",
    weakSearchCapabilities,
    {
        ...baseObservedStats,
        scanMode: "deep",
        metadataPrepassEnabled: true,
        deepFallbackUsed: true,
        needsReviewSubscriptions: 4,
    },
    {
        recommendedFallbackStrategy: "metadata_prepass_plus_time_buckets",
        scanReliabilityLevel: "medium",
        deepScanRecommended: false,
    }
);

runPlannerCase(
    "UID fetch limited provider",
    "adaptive",
    uidLimitedCapabilities,
    {
        ...baseObservedStats,
        recentMessagesFetched: 0,
        fallbackUsed: true,
    },
    {
        scanReliabilityLevel: "low",
        deepScanRecommended: true,
    }
);

runPlannerCase(
    "fast empty scan",
    "fast",
    {
        ...weakSearchCapabilities,
        metadataPrepassSupported: false,
        deepFallbackSupported: false,
        metadataPrepassUseful: false,
        fallbackUseful: false,
    },
    baseObservedStats,
    {
        recommendedScanModeForProvider: "deep",
        recommendedFallbackStrategy: "metadata_prepass_plus_time_buckets",
        scanReliabilityLevel: "low",
        deepScanRecommended: true,
        quickScanLikelyIncomplete: true,
    }
);

runPlannerCase(
    "adaptive with historical findings",
    "adaptive",
    weakSearchCapabilities,
    {
        ...baseObservedStats,
        scanMode: "deep",
        metadataPrepassEnabled: true,
        deepFallbackUsed: true,
        needsReviewSubscriptions: 4,
    },
    {
        recommendedFallbackStrategy: "metadata_prepass_plus_time_buckets",
        deepScanRecommended: false,
        quickScanLikelyIncomplete: false,
    }
);

runProductBucketCase(
    "Uber One-like delivery membership with invoice evidence",
    {
        displayName: "Uber One",
        provider: "Uber One",
        category: "delivery_membership",
        status: "stale_needs_review",
        recencyStatus: "stale_needs_review",
        needsReview: true,
        evidenceSummary: ["payment confirmation", "invoice/recurring bill"],
        evidenceTypes: ["payment confirmation", "invoice", "bill due"],
        reasons: ["+ payment confirmation", "+ invoice/recurring bill"],
    },
    {
        bucket: "needsReviewSubscriptions",
        primaryAction: "confirm_still_active",
    }
);

runProductBucketCase(
    "Tauron-like stale utility bill",
    {
        displayName: "Tauron",
        provider: "Tauron",
        category: "utilities_energy",
        status: "stale_needs_review",
        recencyStatus: "stale_needs_review",
        needsReview: true,
        evidenceSummary: ["invoice or bill due"],
        evidenceTypes: ["invoice", "faktura", "payment due"],
        reasons: ["+ invoice due"],
    },
    {
        bucket: "billsOrUtilities",
        primaryAction: "review_old_bill",
    }
);

runProductBucketCase(
    "Amazon Prime-like price change membership",
    {
        displayName: "Amazon Prime",
        provider: "Amazon",
        category: "ecommerce_membership",
        status: "price_change",
        needsReview: false,
        evidenceSummary: ["active price-change evidence"],
        evidenceTypes: ["price_change"],
    },
    {
        bucket: "priceChanges",
        primaryAction: "review_price_change",
    }
);

runProductBucketCase(
    "Streaming stale subscription",
    {
        displayName: "SkyShowtime on Prime Video",
        provider: "SkyShowtime",
        billingChannel: "Prime Video",
        category: "streaming_video",
        status: "stale_needs_review",
        recencyStatus: "stale_needs_review",
        needsReview: true,
        evidenceSummary: ["subscription continuation/future charge"],
        evidenceTypes: ["subscription continuation", "future charge"],
    },
    {
        bucket: "needsReviewSubscriptions",
        primaryAction: "confirm_still_active",
    }
);

runProductResultContractCase();

for (const fixtureCase of emailDetectionFixtureCases) {
    const actual = analyzeMessageForSubscription(fixtureCase.input);
    const failures = collectFailures(fixtureCase.expected, actual);

    if (failures.length === 0) {
        passed += 1;
        passedCaseNames.push(fixtureCase.name);
        console.log(`PASS ${fixtureCase.name}`);
        continue;
    }

    failed += 1;
    failedCaseNames.push(fixtureCase.name);
    console.log(`FAIL ${fixtureCase.name}`);
    console.log("  expected:", JSON.stringify(fixtureCase.expected, null, 2));
    console.log(
        "  actual:",
        JSON.stringify(
            {
                isCandidate: actual.isCandidate,
                confidence: actual.confidence,
                detected: actual.detected,
                reasons: actual.reasons,
            },
            null,
            2
        )
    );
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

console.log("");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Planner Passed: ${plannerPassed}`);
console.log(`Planner Failed: ${plannerFailed}`);
console.log(`Bucket Passed: ${bucketPassed}`);
console.log(`Bucket Failed: ${bucketFailed}`);
console.log(`ProductResult Passed: ${productResultPassed}`);
console.log(`ProductResult Failed: ${productResultFailed}`);

if (passedCaseNames.length > 0) {
    console.log(`Passed cases: ${passedCaseNames.join(", ")}`);
}

if (failedCaseNames.length > 0) {
    console.log(`Failed cases: ${failedCaseNames.join(", ")}`);
    process.exitCode = 1;
}

if (failedPlannerCases.length > 0) {
    console.log(`Failed planner cases: ${failedPlannerCases.join(", ")}`);
    process.exitCode = 1;
}

if (failedBucketCases.length > 0) {
    console.log(`Failed bucket cases: ${failedBucketCases.join(", ")}`);
    process.exitCode = 1;
}

if (failedProductResultCases.length > 0) {
    console.log(`Failed productResult cases: ${failedProductResultCases.join(", ")}`);
    process.exitCode = 1;
}
