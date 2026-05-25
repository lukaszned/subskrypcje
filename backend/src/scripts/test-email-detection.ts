import { emailDetectionFixtureCases } from "../fixtures/email-detection-cases";
import { analyzeMessageForSubscription } from "../services/email-detection.service";
import {
    ImapScanCapabilities,
    ImapScanPlannerObservedStats,
    planImapScanStrategy,
} from "../services/imap-scan-planner.service";
import {
    buildProductionImapCanonicalItemsForTest,
    buildProductionImapProductResultForTest,
    ProductionImapScanMessage,
    selectPreservedRetrievalCandidatesForTest,
} from "../services/imap-scan.service";
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

function makeProductionMessage(
    input: Partial<ProductionImapScanMessage> & {
        id: string;
        provider: string;
        name?: string;
        subject: string;
        date: string;
        snippet: string;
        messageType: string;
        category: string;
    }
): ProductionImapScanMessage {
    return {
        id: input.id,
        from: input.from ?? `${input.provider} <billing@example.com>`,
        subject: input.subject,
        date: input.date,
        snippet: input.snippet,
        confidence: input.confidence ?? 1,
        reasons: input.reasons ?? [`+ message type: ${input.messageType}`],
        detected: {
            provider: input.provider,
            name: input.detected?.name ?? input.name ?? input.provider,
            amountText: input.detected?.amountText,
            billingCycle: input.detected?.billingCycle,
            isTrial: input.detected?.isTrial,
        },
        debug: {
            messageType: input.messageType,
            provider: input.provider,
            name: input.debug?.name ?? input.detected?.name ?? input.name,
            category: input.category,
            billingChannel: input.debug?.billingChannel,
            amountText: input.debug?.amountText,
            billingCycle: input.debug?.billingCycle ?? input.detected?.billingCycle,
            isTrial: input.debug?.isTrial ?? input.detected?.isTrial,
            positiveEvidence: input.debug?.positiveEvidence ?? [],
            negativeEvidence: input.debug?.negativeEvidence ?? [],
            trustEvidence: input.debug?.trustEvidence ?? [],
            riskEvidence: input.debug?.riskEvidence ?? [],
            evidenceTiers:
                input.debug?.evidenceTiers ??
                (input.messageType === "invoice"
                    ? ["Tier B invoice/recurring bill evidence"]
                    : ["Tier A active subscription/payment evidence"]),
            finalDecision: input.debug?.finalDecision ?? "candidate",
            finalBlockReason: input.debug?.finalBlockReason,
        } as ProductionImapScanMessage["debug"],
        sourceTags: input.sourceTags ?? ["test"],
    };
}

function runProductionImapAggregationCase() {
    const now = new Date("2026-05-24T12:00:00.000Z");
    const result = buildProductionImapProductResultForTest(
        [
            makeProductionMessage({
                id: "uber-1",
                provider: "Uber One",
                category: "delivery_membership",
                subject: "Potwierdzenie płatności Uber One",
                date: "2025-03-23T10:00:00.000Z",
                snippet: "Dziękujemy za płatność za członkostwo Uber One.",
                messageType: "payment_confirmation",
            }),
            makeProductionMessage({
                id: "tauron-old",
                provider: "Tauron",
                category: "utilities_energy",
                subject: "Wystawiliśmy fakturę za prąd 06/2024",
                date: "2024-06-01T10:00:00.000Z",
                snippet: "Faktura jest dostępna. Kwota do zapłaty: 466.51 zł. Termin płatności: 11.06.2024.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "utility-latest",
                provider: "Tauron",
                category: "utilities_energy",
                subject: "Wystawiliśmy fakturę za prąd 11/2024",
                date: "2024-11-27T10:00:00.000Z",
                snippet: "Faktura jest dostępna. Harmonogram płatności zawiera 521.48 zł z terminem 12.02.2025. Kwota do zapłaty: 216.39 zł. Termin płatności: 12.12.2024.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "adobe-1",
                provider: "Adobe",
                name: "Adobe Acrobat Pro",
                category: "software_saas",
                subject: "Dziękujemy za zakup!",
                date: "2024-11-06T10:00:00.000Z",
                snippet: "Rozpoczął się okres próbny Adobe Acrobat Pro. Po zakończeniu bezpłatnego okresu próbnego zostanie naliczona opłata w wysokości 36,89 ( brutto) miesięcznie. Subskrypcje będą automatycznie odnawiane co miesiąc.",
                messageType: "trial_started_future_charge",
                detected: {
                    provider: "Adobe",
                    name: "Adobe Acrobat Pro",
                    billingCycle: "monthly",
                    isTrial: true,
                },
            }),
            makeProductionMessage({
                id: "sky-1",
                provider: "SkyShowtime",
                name: "SkyShowtime on Prime Video",
                category: "streaming_video",
                subject: "Potwierdzenie — Oferta specjalna dotycząca subskrypcji SkyShowtime",
                date: "2025-01-13T10:00:00.000Z",
                snippet: "Kontynuując subskrypcję, korzystasz z oferty specjalnej kwotą 4,00 zł miesięcznie przez kolejny okres wynoszący 1 miesiąc. Po upływie okresu promocji subskrypcja zostanie automatycznie odnowiona w cenie 24,99 zł miesięcznie.",
                messageType: "subscription_continuation",
                detected: {
                    provider: "SkyShowtime",
                    name: "SkyShowtime on Prime Video",
                    billingCycle: "monthly",
                    amountText: "4,00 zł",
                },
                debug: {
                    billingChannel: "Prime Video",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "amazon-1",
                provider: "Amazon",
                name: "Amazon Prime",
                category: "ecommerce_membership",
                subject: "Wymagane działanie: Przejrzyj nową cenę Amazon Prime",
                date: "2026-01-25T10:00:00.000Z",
                snippet: "Aktualna cena planu: 49,00 zł/rok. Nowa cena planu: 69,00 zł/rok. Dla Ciebie, aktualnego klienta Prime, zmiana wejdzie w życie w 2027.",
                messageType: "active_price_change",
                detected: {
                    provider: "Amazon",
                    name: "Amazon Prime",
                    amountText: "69,00 zł",
                    billingCycle: "yearly",
                },
                debug: {
                    evidenceTiers: ["Tier C active price-change evidence"],
                } as ProductionImapScanMessage["debug"],
            }),
        ],
        now
    );
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const findByName = (displayName: string) =>
        [
            ...result.currentSubscriptions,
            ...result.needsReviewSubscriptions,
            ...result.historicalSubscriptions,
            ...result.priceChanges,
            ...result.billsOrUtilities,
        ].find((item) => item.displayName === displayName);

    const uber = findByName("Uber One");
    const tauron = findByName("Tauron");
    const adobe = findByName("Adobe Acrobat Pro");
    const sky = findByName("SkyShowtime on Prime Video");
    const amazon = findByName("Amazon Prime");

    assertField("Uber bucket", "needsReviewSubscriptions", uber?.productBucket);
    assertField("Uber action", "confirm_still_active", uber?.primaryAction);
    assertField("Uber displayAmount", undefined, uber?.displayAmount);
    assertField("Tauron bucket", "billsOrUtilities", tauron?.productBucket);
    assertField("Tauron displayAmount", "216.39 zł", tauron?.displayAmount);
    assertField("Tauron amountKind", "due", tauron?.amountKind);
    assertField("Tauron source date", "2024-11-27T10:00:00.000Z", tauron?.selectedAmountSourceDate);
    assertField("Tauron sourceMessagesCount", 2, tauron?.sourceMessagesCount);
    assertField(
        "Tauron allAmounts",
        "466.51 zł|521.48 zł|216.39 zł",
        tauron?.allAmounts?.join("|")
    );
    assertField("Adobe trialThenAmount", "36,89 ( brutto) miesięcznie", adobe?.trialThenAmount);
    assertField("Adobe amountKind", "trial_then_price", adobe?.amountKind);
    assertField("Adobe billingCycle", "monthly", adobe?.billingCycle);
    assertField("Sky billingChannel", "Prime Video", sky?.billingChannel);
    assertField("Sky futureAmount", "24,99 zł miesięcznie", sky?.futureAmount);
    assertField("Sky amountKind", "promo_price", sky?.amountKind);
    assertField("Sky promoAmount", "4,00 zł miesięcznie", sky?.promoAmount);
    assertField("Sky regularAmount", "24,99 zł miesięcznie", sky?.regularAmount);
    assertField("Amazon bucket", "priceChanges", amazon?.productBucket);
    assertField("Amazon currentAmount", "49,00 zł/rok", amazon?.currentAmount);
    assertField("Amazon futureAmount", "69,00 zł/rok", amazon?.futureAmount);
    assertField("Amazon amountKind", "new_price", amazon?.amountKind);
    assertField(
        "User-facing reason has no double punctuation",
        false,
        Boolean(uber?.userFacingReason.includes(".."))
    );

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: global production IMAP aggregation semantics");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("global production IMAP aggregation semantics");
    console.log("FAIL productResult: global production IMAP aggregation semantics");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify(result, null, 2));
}

function runProductionImapAmountSemanticsCase() {
    const now = new Date("2026-05-24T12:00:00.000Z");
    const canonicalItems = buildProductionImapCanonicalItemsForTest(
        [
            makeProductionMessage({
                id: "promo-1",
                provider: "Generic Stream",
                name: "Generic Stream on Marketplace",
                category: "streaming_video",
                subject: "Special offer subscription confirmation",
                date: "2025-01-13T10:00:00.000Z",
                snippet: "Continuing your subscription, you are using a special offer at 4.00 PLN monthly for 1 month. After the promotional period, your subscription will renew at 24.99 PLN monthly.",
                messageType: "subscription_continuation",
                detected: {
                    provider: "Generic Stream",
                    name: "Generic Stream on Marketplace",
                    billingCycle: "monthly",
                },
                debug: {
                    billingChannel: "Marketplace",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "trial-1",
                provider: "Generic SaaS",
                name: "Generic SaaS Pro",
                category: "software_saas",
                subject: "Your trial has started",
                date: "2025-02-01T10:00:00.000Z",
                snippet: "Your free trial has started. After your trial ends, your subscription will be charged 9.99 USD monthly and will automatically renew.",
                messageType: "trial_started_future_charge",
                detected: {
                    provider: "Generic SaaS",
                    name: "Generic SaaS Pro",
                    billingCycle: "monthly",
                    isTrial: true,
                },
            }),
            makeProductionMessage({
                id: "price-1",
                provider: "Generic Membership",
                name: "Generic Membership Annual",
                category: "ecommerce_membership",
                subject: "Your plan price is changing",
                date: "2026-01-01T10:00:00.000Z",
                snippet: "Current price: 49.00 PLN/year. New price: 69.00 PLN/year. The new price applies to your active membership next year.",
                messageType: "active_price_change",
                detected: {
                    provider: "Generic Membership",
                    name: "Generic Membership Annual",
                    billingCycle: "yearly",
                },
                debug: {
                    evidenceTiers: ["Tier C active price-change evidence"],
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "bill-old",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Utility invoice 01/2025",
                date: "2025-01-10T10:00:00.000Z",
                snippet: "Invoice available. Amount due: 101.11 PLN. Due date: 20.01.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "bill-2",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Utility invoice 02/2025",
                date: "2025-02-10T10:00:00.000Z",
                snippet: "Invoice available. Amount due: 112.22 PLN. Due date: 20.02.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "bill-3",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Utility invoice 03/2025",
                date: "2025-03-10T10:00:00.000Z",
                snippet: "Invoice available. Amount due: 123.33 PLN. Due date: 20.03.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "bill-4",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Utility invoice 04/2025",
                date: "2025-04-10T10:00:00.000Z",
                snippet: "Invoice available. Amount due: 134.44 PLN. Due date: 20.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "bill-new",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Utility invoice 05/2025",
                date: "2025-05-10T10:00:00.000Z",
                snippet: "Previous balance example 999.99 PLN. Invoice available. Amount due: 222.22 PLN. Due date: 20.05.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "telecom-old",
                provider: "Generic Telecom",
                category: "telecom_mobile",
                subject: "Monthly phone bill 04/2025",
                date: "2025-04-12T10:00:00.000Z",
                snippet: "Your telecom bill is ready. Amount due: 55.00 PLN. Due date: 25.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "telecom-new",
                provider: "Generic Telecom",
                category: "telecom_mobile",
                subject: "Monthly phone bill 05/2025",
                date: "2025-05-12T10:00:00.000Z",
                snippet: "Your telecom bill is ready. Amount due: 66.00 PLN. Due date: 25.05.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "shop-invoice",
                provider: "Generic Shop",
                category: "other_bill",
                subject: "E-faktura do Twojego zamówienia",
                date: "2025-05-13T10:00:00.000Z",
                snippet: "Do Twojego zamówienia wygenerowaliśmy fakturę. Numer zamówienia 123. Dostawa, zwrot, reklamacja. Kwota do zapłaty: 88.00 PLN.",
                messageType: "invoice",
                debug: {
                    finalDecision: "rejected",
                    finalBlockReason: "blocked: ecommerce order invoice",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "loan-ad",
                provider: "Generic Finance",
                category: "other_bill",
                subject: "Credit offer",
                date: "2025-05-14T10:00:00.000Z",
                snippet: "Loan credit offer RRSO 9.91%, kwota 16900 PLN, leasing and monthly installments.",
                messageType: "marketing_offer",
                debug: {
                    finalDecision: "rejected",
                    finalBlockReason: "blocked: credit marketing",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "saas-invoice",
                provider: "Generic SaaS Invoice",
                name: "Generic SaaS Invoice Pro",
                category: "software_saas",
                subject: "Subscription invoice",
                date: "2025-05-15T10:00:00.000Z",
                snippet: "Invoice for your monthly subscription plan. Amount due: 19.00 USD. Due date: 25.05.2025. The subscription renews monthly.",
                messageType: "invoice",
                detected: {
                    provider: "Generic SaaS Invoice",
                    name: "Generic SaaS Invoice Pro",
                    billingCycle: "monthly",
                },
            }),
            makeProductionMessage({
                id: "sub-trial",
                provider: "Generic Bundle",
                name: "Generic Bundle Plus",
                category: "software_saas",
                subject: "Your trial started",
                date: "2026-04-01T10:00:00.000Z",
                snippet: "Your trial has started. After trial, your plan will renew at 15.00 USD monthly.",
                messageType: "trial_started_future_charge",
                detected: {
                    provider: "Generic Bundle",
                    name: "Generic Bundle Plus",
                    billingCycle: "monthly",
                    isTrial: true,
                },
            }),
            makeProductionMessage({
                id: "sub-payment",
                provider: "Generic Bundle",
                name: "Generic Bundle Plus",
                category: "software_saas",
                subject: "Payment confirmation",
                date: "2026-05-01T10:00:00.000Z",
                snippet: "Your monthly subscription payment was charged 15.00 USD.",
                messageType: "payment_confirmation",
                detected: {
                    provider: "Generic Bundle",
                    name: "Generic Bundle Plus",
                    billingCycle: "monthly",
                },
            }),
        ],
        now
    );
    const result = buildProductResult(canonicalItems);
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const findCanonical = (displayName: string) =>
        canonicalItems.find((item) => item.displayName === displayName);
    const findProduct = (displayName: string) =>
        [
            ...result.currentSubscriptions,
            ...result.needsReviewSubscriptions,
            ...result.historicalSubscriptions,
            ...result.priceChanges,
            ...result.billsOrUtilities,
        ].find((item: ProductBucketInput) => item.displayName === displayName);

    const promo = findCanonical("Generic Stream on Marketplace");
    const trial = findCanonical("Generic SaaS Pro");
    const price = findCanonical("Generic Membership Annual");
    const priceProduct = findProduct("Generic Membership Annual");
    const bill = findCanonical("Generic Utility");
    const billProduct = findProduct("Generic Utility");
    const telecom = findCanonical("Generic Telecom");
    const telecomProduct = findProduct("Generic Telecom");
    const shop = findCanonical("Generic Shop");
    const loan = findCanonical("Generic Finance");
    const saasInvoiceProduct = findProduct("Generic SaaS Invoice Pro");
    const bundle = findCanonical("Generic Bundle Plus");

    assertField("Promo amount", "4.00 PLN monthly", promo?.promoAmount);
    assertField("Promo futureAmount", "24.99 PLN monthly", promo?.futureAmount);
    assertField("Promo regularAmount", "24.99 PLN monthly", promo?.regularAmount);
    assertField("Promo future not current promo", false, promo?.futureAmount === promo?.promoAmount);
    assertField("Promo amountKind", "promo_price", promo?.amountKind);
    assertField("Trial amountKind", "trial_then_price", trial?.amountKind);
    assertField("Trial trialThenAmount", "9.99 USD monthly", trial?.trialThenAmount);
    assertField("Trial futureAmount", "9.99 USD monthly", trial?.futureAmount);
    assertField("Price bucket", "priceChanges", priceProduct?.productBucket);
    assertField("Price action", "review_price_change", priceProduct?.primaryAction);
    assertField("Price currentAmount", "49.00 PLN/year", price?.currentAmount);
    assertField("Price futureAmount", "69.00 PLN/year", price?.futureAmount);
    assertField("Price amountKind", "new_price", price?.amountKind);
    assertField("Bill bucket", "billsOrUtilities", billProduct?.productBucket);
    assertField("Bill action", "review_old_bill", billProduct?.primaryAction);
    assertField("Bill dueAmount", "222.22 PLN", bill?.dueAmount);
    assertField("Bill dueDateText", "20.05.2025", bill?.dueDateText);
    assertField("Bill sourceMessagesCount", 5, bill?.sourceMessagesCount);
    assertField("Bill firstSeen", "2025-01-10T10:00:00.000Z", bill?.firstSeen);
    assertField("Bill lastSeen", "2025-05-10T10:00:00.000Z", bill?.lastSeen);
    assertField(
        "Bill allAmounts",
        "101.11 PLN|112.22 PLN|123.33 PLN|134.44 PLN|999.99 PLN|222.22 PLN",
        bill?.allAmounts?.join("|")
    );
    assertField("Telecom bucket", "billsOrUtilities", telecomProduct?.productBucket);
    assertField("Telecom sourceMessagesCount", 2, telecom?.sourceMessagesCount);
    assertField("Telecom dueAmount", "66.00 PLN", telecom?.dueAmount);
    assertField("Ecommerce invoice rejected", undefined, shop?.displayName);
    assertField("Loan ad rejected", undefined, loan?.displayName);
    assertField("SaaS invoice bucket", "needsReviewSubscriptions", saasInvoiceProduct?.productBucket);
    assertField("Bundle sourceMessagesCount", 2, bundle?.sourceMessagesCount);
    assertField("Bundle firstSeen", "2026-04-01T10:00:00.000Z", bundle?.firstSeen);
    assertField("Bundle lastSeen", "2026-05-01T10:00:00.000Z", bundle?.lastSeen);
    assertField("Bundle lastEvidenceDate", "2026-05-01T10:00:00.000Z", bundle?.lastEvidenceDate);

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: production IMAP amount semantics");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("production IMAP amount semantics");
    console.log("FAIL productResult: production IMAP amount semantics");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify({ canonicalItems, result }, null, 2));
}

function runProductionImapRetrievalStabilityCase() {
    const candidates = [
        { uid: 1, from: "Shop <orders@example.com>", subject: "Order number 1 shipping" },
        { uid: 2, from: "Stream <billing@example.com>", subject: "Your premium subscription renewal" },
        { uid: 3, from: "Security <login@example.com>", subject: "Your verification code" },
        { uid: 4, from: "Utility <billing@example.com>", subject: "Invoice amount due May" },
        { uid: 5, from: "SaaS <billing@example.com>", subject: "Trial will be charged monthly after trial" },
        { uid: 6, from: "Utility <billing@example.com>", subject: "Statement payment due April" },
        { uid: 7, from: "Marketplace <billing@example.com>", subject: "Prime Video subscription will renew monthly" },
        { uid: 8, from: "News <newsletter@example.com>", subject: "Premium tips newsletter" },
        { uid: 9, from: "Finance <ads@example.com>", subject: "Loan credit offer RRSO" },
    ];
    const reversedCandidates = [...candidates].reverse();
    const selected = selectPreservedRetrievalCandidatesForTest(candidates, 5).map(
        (candidate) => candidate.uid
    );
    const selectedReversed = selectPreservedRetrievalCandidatesForTest(
        reversedCandidates,
        5
    ).map((candidate) => candidate.uid);
    const manyBills = [
        { uid: 10, from: "Utility <billing@example.com>", subject: "Invoice amount due 1" },
        { uid: 11, from: "Utility <billing@example.com>", subject: "Invoice amount due 2" },
        { uid: 12, from: "Utility <billing@example.com>", subject: "Invoice amount due 3" },
        { uid: 13, from: "Utility <billing@example.com>", subject: "Invoice amount due 4" },
        { uid: 14, from: "Stream <billing@example.com>", subject: "Subscription renewal monthly" },
        { uid: 15, from: "Software <billing@example.com>", subject: "Paid plan will renew monthly" },
        { uid: 16, from: "Shop <orders@example.com>", subject: "Order confirmation delivery" },
    ];
    const selectedManyBills = selectPreservedRetrievalCandidatesForTest(
        manyBills,
        4
    ).map((candidate) => candidate.uid);
    const sortedResult = buildProductResult([
        {
            displayName: "Zulu",
            category: "streaming_video",
            status: "stale_needs_review",
            confidence: 0.8,
            lastEvidenceDate: "2025-01-01T00:00:00.000Z",
            needsReview: true,
        },
        {
            displayName: "Alpha",
            category: "streaming_video",
            status: "stale_needs_review",
            confidence: 0.9,
            lastEvidenceDate: "2025-01-01T00:00:00.000Z",
            needsReview: true,
        },
        {
            displayName: "Beta",
            category: "streaming_video",
            status: "stale_needs_review",
            confidence: 0.9,
            lastEvidenceDate: "2025-02-01T00:00:00.000Z",
            needsReview: true,
        },
        {
            displayName: "Energy",
            category: "utilities_energy",
            status: "stale_needs_review",
            lastEvidenceDate: "2025-03-01T00:00:00.000Z",
            needsReview: true,
        },
        {
            displayName: "Annual Plan",
            category: "ecommerce_membership",
            status: "price_change",
            lastEvidenceDate: "2025-04-01T00:00:00.000Z",
            needsReview: false,
        },
    ]);
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };

    assertField("Preserved deterministic order", selected.join(","), selectedReversed.join(","));
    assertField("Preserves subscription candidate", true, selected.includes(2));
    assertField("Preserves trial candidate", true, selected.includes(5));
    assertField("Preserves marketplace subscription candidate", true, selected.includes(7));
    assertField("Preserves bill candidate", true, selected.includes(4) || selected.includes(6));
    assertField("Drops order/security risk first", false, selected.includes(1) || selected.includes(3));
    assertField("Many bills keep subscription one", true, selectedManyBills.includes(14));
    assertField("Many bills keep subscription two", true, selectedManyBills.includes(15));
    assertField(
        "Needs review deterministic sort",
        "Beta|Alpha|Zulu",
        sortedResult.needsReviewSubscriptions
            .map((item) => item.displayName)
            .join("|")
    );
    assertField("Bill sort bucket", "Energy", sortedResult.billsOrUtilities[0]?.displayName);
    assertField("Price sort bucket", "Annual Plan", sortedResult.priceChanges[0]?.displayName);

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: production IMAP retrieval stability");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("production IMAP retrieval stability");
    console.log("FAIL productResult: production IMAP retrieval stability");
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

function runImapFrontendContractCase() {
    const now = new Date("2026-05-24T12:00:00.000Z");
    const result = buildProductionImapProductResultForTest(
        [
            makeProductionMessage({
                id: "contract-review",
                provider: "Contract Stream",
                category: "streaming_video",
                subject: "Subscription renewal confirmation",
                date: "2025-01-01T10:00:00.000Z",
                snippet: "Your subscription will renew monthly at 29.99 PLN monthly.",
                messageType: "subscription_continuation",
                detected: {
                    provider: "Contract Stream",
                    billingCycle: "monthly",
                },
            }),
            makeProductionMessage({
                id: "contract-price",
                provider: "Contract Prime",
                name: "Contract Prime Annual",
                category: "ecommerce_membership",
                subject: "Your plan price is changing",
                date: "2026-01-01T10:00:00.000Z",
                snippet: "Current price: 49.00 PLN/year. New price: 69.00 PLN/year.",
                messageType: "active_price_change",
                debug: {
                    evidenceTiers: ["Tier C active price-change evidence"],
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "contract-bill",
                provider: "Contract Utility",
                category: "utilities_energy",
                subject: "Invoice ready",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 123.45 PLN. Due date: 15.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "contract-promo",
                provider: "Contract Promo",
                name: "Contract Promo on Marketplace",
                category: "streaming_video",
                subject: "Special offer subscription confirmation",
                date: "2025-03-01T10:00:00.000Z",
                snippet: "Special offer at 4.00 PLN monthly for 1 month. After the promotional period, subscription will renew at 24.99 PLN monthly.",
                messageType: "subscription_continuation",
                debug: {
                    billingChannel: "Marketplace",
                } as ProductionImapScanMessage["debug"],
            }),
        ],
        now
    );
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const bucketNames = [
        "currentSubscriptions",
        "needsReviewSubscriptions",
        "historicalSubscriptions",
        "priceChanges",
        "billsOrUtilities",
    ] as const;

    for (const bucket of bucketNames) {
        assertField(`${bucket} is array`, true, Array.isArray(result[bucket]));
    }

    assertField(
        "scanSummary has currentSubscriptions",
        "number",
        typeof result.scanSummary.currentSubscriptions
    );
    assertField(
        "scanSummary has recommendedDefaultMode",
        "string",
        typeof result.scanSummary.recommendedDefaultMode
    );
    assertField(
        "scanSummary has hasOnlyHistoricalEvidence",
        "boolean",
        typeof result.scanSummary.hasOnlyHistoricalEvidence
    );

    const allItems = bucketNames.flatMap((bucket) => result[bucket]);
    const price = result.priceChanges.find(
        (item) => item.displayName === "Contract Prime Annual"
    );
    const bill = result.billsOrUtilities.find(
        (item) => item.displayName === "Contract Utility"
    );
    const promo = result.needsReviewSubscriptions.find(
        (item) => item.displayName === "Contract Promo on Marketplace"
    );

    for (const item of allItems) {
        assertField(`${item.displayName} productBucket`, "string", typeof item.productBucket);
        assertField(`${item.displayName} primaryAction`, "string", typeof item.primaryAction);
        assertField(`${item.displayName} userFacingReason`, "string", typeof item.userFacingReason);
        assertField(
            `${item.displayName} userFacingReason no double punctuation`,
            false,
            /[.!?]{2,}/.test(item.userFacingReason)
        );
    }

    assertField("Price currentAmount", "49.00 PLN/year", price?.currentAmount);
    assertField("Price futureAmount", "69.00 PLN/year", price?.futureAmount);
    assertField("Bill dueAmount", "123.45 PLN", bill?.dueAmount);
    assertField("Promo promoAmount", "4.00 PLN monthly", promo?.promoAmount);
    assertField("Promo futureAmount", "24.99 PLN monthly", promo?.futureAmount);

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: IMAP frontend contract");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("IMAP frontend contract");
    console.log("FAIL productResult: IMAP frontend contract");
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

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
runProductionImapAggregationCase();
runProductionImapAmountSemanticsCase();
runProductionImapRetrievalStabilityCase();
runImapFrontendContractCase();

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
