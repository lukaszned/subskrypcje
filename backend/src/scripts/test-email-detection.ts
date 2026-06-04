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
    classifyImapScanError,
    normalizeImapScanProfile,
    ProductionImapScanMessage,
    selectPreservedRetrievalCandidatesForTest,
} from "../services/imap-scan.service";
import { calculateGmailDuplicateQueryMatches } from "../services/gmail-scan.service";
import {
    buildGmailOAuthDiagnostics,
    getGmailRedirectDiagnostics,
    resolveGmailRedirectUri,
} from "../services/gmail-oauth.service";
import {
    buildProductResult,
    classifyProductBucket,
    getEmailScanUserMessage,
    ProductBucketInput,
} from "../services/subscription-product-buckets.service";
import {
    buildImportPreview,
    confirmScanImportDrafts,
    ImportPreviewServiceError,
    ImportPreviewValidationError,
} from "../services/scan-result-import.service";

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
let importPreviewPassed = 0;
let importPreviewFailed = 0;
const failedImportPreviewCases: string[] = [];
let importConfirmPassed = 0;
let importConfirmFailed = 0;
const failedImportConfirmCases: string[] = [];

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

function runProductionImapBillDedupeCase() {
    const now = new Date("2026-05-24T12:00:00.000Z");
    const utilityUnknownMessages = Array.from({ length: 25 }, (_, index) =>
        makeProductionMessage({
            id: `utility-unknown-${index}`,
            provider: "Generic Utility SA",
            category: "utilities_energy",
            subject: `Generic Utility invoice archive ${index}`,
            date: `2025-01-${String(Math.min(index + 1, 28)).padStart(2, "0")}T10:00:00.000Z`,
            snippet: "Your invoice archive notification is available.",
            messageType: "invoice",
        })
    );
    const canonicalItems = buildProductionImapCanonicalItemsForTest(
        [
            makeProductionMessage({
                id: "utility-due-old",
                provider: "Generic Utility Sp. z o.o.",
                category: "utilities_energy",
                subject: "Generic Utility invoice April",
                date: "2025-04-10T10:00:00.000Z",
                snippet: "Amount due: 100.00 PLN. Due date: 20.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "utility-due-new",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Generic Utility invoice May",
                date: "2025-05-10T10:00:00.000Z",
                snippet: "Amount due: 120.00 PLN. Due date: 20.05.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "utility-payment-processor",
                provider: "Generic Utility",
                category: "utilities_energy",
                subject: "Payment forwarded to service provider - Generic Utility",
                date: "2025-05-21T10:00:00.000Z",
                snippet: "Payment confirmation. We forwarded your payment to the service provider. Amount 120.00 PLN.",
                messageType: "payment_confirmation",
                debug: {
                    billingChannel: "Payment Processor",
                } as ProductionImapScanMessage["debug"],
            }),
            ...utilityUnknownMessages,
            makeProductionMessage({
                id: "telecom-unknown",
                provider: "Mobile Provider S.A.",
                category: "telecom_mobile",
                subject: "Mobile Provider invoice notice",
                date: "2025-03-01T10:00:00.000Z",
                snippet: "Your monthly bill is available.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "telecom-due",
                provider: "Mobile Provider",
                category: "telecom_mobile",
                subject: "Mobile Provider amount due",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 55.50 PLN. Due date: 15.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "telecom-payment-processor",
                provider: "Mobile Provider",
                category: "telecom_mobile",
                subject: "Payment forwarded to service provider - Mobile Provider",
                date: "2025-04-16T10:00:00.000Z",
                snippet: "Payment confirmation. Amount 55.50 PLN.",
                messageType: "payment_confirmation",
                debug: {
                    billingChannel: "Payment Processor",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "utility-a",
                provider: "Utility Alpha",
                category: "utilities_energy",
                subject: "Utility Alpha invoice",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 11.00 PLN. Due date: 10.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "utility-b",
                provider: "Utility Beta",
                category: "utilities_energy",
                subject: "Utility Beta invoice",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 22.00 PLN. Due date: 10.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "channel-a",
                provider: "Channel Provider",
                category: "internet_isp",
                subject: "Channel Provider direct service A",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 12.00 PLN. Due date: 10.04.2025.",
                messageType: "invoice",
                debug: {
                    billingChannel: "Tenant A",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "channel-b",
                provider: "Channel Provider",
                category: "internet_isp",
                subject: "Channel Provider direct service B",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 13.00 PLN. Due date: 10.04.2025.",
                messageType: "invoice",
                debug: {
                    billingChannel: "Tenant B",
                } as ProductionImapScanMessage["debug"],
            }),
            makeProductionMessage({
                id: "shared-telecom",
                provider: "Shared Provider",
                category: "telecom_mobile",
                subject: "Shared Provider mobile bill",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 33.00 PLN. Due date: 10.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "shared-insurance",
                provider: "Shared Provider",
                category: "finance_insurance",
                subject: "Shared Provider insurance bill",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Amount due: 44.00 PLN. Due date: 10.04.2025.",
                messageType: "invoice",
            }),
            makeProductionMessage({
                id: "shared-membership",
                provider: "Shared Provider",
                category: "ecommerce_membership",
                subject: "Shared Provider membership renewal",
                date: "2025-04-01T10:00:00.000Z",
                snippet: "Your membership subscription renews monthly at 9.99 PLN monthly.",
                messageType: "subscription_continuation",
                detected: {
                    provider: "Shared Provider",
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
    const utilityBills = result.billsOrUtilities.filter((item) =>
        item.provider?.startsWith("Generic Utility")
    );
    const utility = utilityBills[0];
    const telecomBills = result.billsOrUtilities.filter((item) =>
        item.provider?.startsWith("Mobile Provider")
    );
    const telecom = telecomBills[0];
    const differentUtilityProviders = result.billsOrUtilities.filter((item) =>
        /^Utility (Alpha|Beta)$/.test(item.provider ?? "")
    );
    const channelProviderBills = result.billsOrUtilities.filter(
        (item) => item.provider === "Channel Provider"
    );
    const sharedBills = result.billsOrUtilities.filter(
        (item) => item.provider === "Shared Provider"
    );
    const sharedMembership = result.needsReviewSubscriptions.find(
        (item) => item.provider === "Shared Provider"
    );
    const preview = utility
        ? buildImportPreview({ items: [utility] })
        : { drafts: [] };
    const draft = preview.drafts[0];

    assertField("Duplicate utility groups merged", 1, utilityBills.length);
    assertField("Utility merged sourceMessagesCount", 28, utility?.sourceMessagesCount);
    assertField("Utility amountKind", "due", utility?.amountKind);
    assertField("Utility latest dueAmount", "120.00 PLN", utility?.dueAmount);
    assertField("Utility bucket", "billsOrUtilities", utility?.productBucket);
    assertField(
        "Utility allAmounts merged",
        true,
        utility?.allAmounts?.includes("100.00 PLN") &&
            utility?.allAmounts?.includes("120.00 PLN")
    );
    assertField("Duplicate telecom groups merged", 1, telecomBills.length);
    assertField("Telecom sourceMessagesCount", 3, telecom?.sourceMessagesCount);
    assertField("Telecom amountKind", "due", telecom?.amountKind);
    assertField("Different bill providers remain separate", 2, differentUtilityProviders.length);
    assertField("Different meaningful bill channels remain separate", 2, channelProviderBills.length);
    assertField("Same provider different bill categories remain separate", 2, sharedBills.length);
    assertField("Subscription-like same provider remains subscription bucket", "needsReviewSubscriptions", sharedMembership?.productBucket);
    assertField("Import preview bill action", "review_bill", draft?.recommendedAction);
    assertField("Import preview recurring bill", true, draft?.draft?.isRecurringBill);
    assertField(
        "Import preview source count in notes",
        true,
        draft?.draft?.notes?.includes("Source messages: 28")
    );

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: production IMAP bill dedupe");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("production IMAP bill dedupe");
    console.log("FAIL productResult: production IMAP bill dedupe");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify({ canonicalItems, result, preview }, null, 2));
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
        assertField(`${item.displayName} productBucketLabel`, "string", typeof item.productBucketLabel);
        assertField(`${item.displayName} categoryLabel`, "string", typeof item.categoryLabel);
        assertField(`${item.displayName} primaryActionLabel`, "string", typeof item.primaryActionLabel);
        assertField(`${item.displayName} recommendedSelected`, "boolean", typeof item.recommendedSelected);
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

function runProductResultFrontendHelperCase() {
    const result = buildProductResult([
        {
            displayName: "Strong Current",
            provider: "Strong Current",
            category: "ai_tools",
            status: "active",
            confidence: 0.95,
            displayAmount: "20.00 USD monthly",
            amountKind: "charged",
            lastEvidenceDate: "2026-05-01T00:00:00.000Z",
            evidenceSummary: ["active subscription payment confirmation"],
        },
        {
            displayName: "Current Missing Amount",
            provider: "Current Missing Amount",
            category: "ai_tools",
            status: "active",
            confidence: 0.95,
            lastEvidenceDate: "2026-05-02T00:00:00.000Z",
            evidenceSummary: ["active subscription payment confirmation"],
        },
        {
            displayName: "Payment Processor",
            provider: "Tpay",
            category: "payment_processor",
            status: "active",
            displayAmount: "49.99 PLN",
            billingChannel: "Payment Processor",
            evidenceSummary: ["payment processor"],
        },
        {
            displayName: "Utility Bill",
            provider: "Utility Bill",
            category: "internet_isp",
            status: "invoice_due",
            dueAmount: "55.13 PLN",
            amountKind: "due",
            lastEvidenceDate: "2026-05-03T00:00:00.000Z",
        },
        {
            displayName: "Weak Membership",
            provider: "Weak Membership",
            category: "delivery_membership",
            status: "stale_needs_review",
            needsReview: true,
            displayAmount: "29.99 PLN",
        },
        {
            displayName: "Unknown Category",
            provider: "Unknown Category",
            category: "custom_unknown_category",
            status: "stale_needs_review",
            needsReview: true,
            displayAmount: "10.00 PLN",
        },
    ]);
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const allItems = [
        ...result.currentSubscriptions,
        ...result.needsReviewSubscriptions,
        ...result.historicalSubscriptions,
        ...result.priceChanges,
        ...result.billsOrUtilities,
    ];
    const strong = result.currentSubscriptions.find(
        (item) => item.displayName === "Strong Current"
    );
    const missing = result.currentSubscriptions.find(
        (item) => item.displayName === "Current Missing Amount"
    );
    const processor = result.needsReviewSubscriptions.find(
        (item) => item.displayName === "Payment Processor"
    );
    const bill = result.billsOrUtilities.find(
        (item) => item.displayName === "Utility Bill"
    );
    const weak = result.needsReviewSubscriptions.find(
        (item) => item.displayName === "Weak Membership"
    );
    const unknown = result.needsReviewSubscriptions.find(
        (item) => item.displayName === "Unknown Category"
    );

    assertField("Current bucket label", "Aktywne subskrypcje", strong?.productBucketLabel);
    assertField("Current category label", "Narzędzia AI", strong?.categoryLabel);
    assertField("Current action label", "Dodaj jako aktywną", strong?.primaryActionLabel);
    assertField("Current amount kind label", "Pobrano", strong?.amountKindLabel);
    assertField("Current recommended selected", true, strong?.recommendedSelected);
    assertField(
        "Every item has sourceItemId",
        true,
        allItems.every((item) => Boolean(item.sourceItemId))
    );
    assertField(
        "Every item has itemSelectionKey",
        true,
        allItems.every((item) => Boolean(item.itemSelectionKey))
    );
    assertField(
        "Every item has helper labels",
        true,
        allItems.every(
            (item) =>
                Boolean(item.productBucketLabel) &&
                Boolean(item.categoryLabel) &&
                Boolean(item.primaryActionLabel)
        )
    );
    assertField("Current missing amount recommended", false, missing?.recommendedSelected);
    assertField(
        "Current missing amount reason",
        "Brakuje kwoty — uzupełnij przed zapisem.",
        missing?.selectionReason
    );
    assertField("Processor recommended selected", false, processor?.recommendedSelected);
    assertField("Processor category label", "Operator płatności", processor?.categoryLabel);
    assertField("Bill recommended selected", true, bill?.recommendedSelected);
    assertField("Bill bucket label", "Rachunki cykliczne", bill?.productBucketLabel);
    assertField("Bill amount kind label", "Kwota do zapłaty", bill?.amountKindLabel);
    assertField("Weak membership selected", false, weak?.recommendedSelected);
    assertField("Unknown category fallback", "Inne", unknown?.categoryLabel);
    assertField(
        "IMAP auth userMessage",
        "Nie udało się zalogować do skrzynki. Sprawdź adres e-mail i hasło albo użyj hasła aplikacji.",
        getEmailScanUserMessage("IMAP_AUTH_FAILED")
    );
    assertField(
        "Import preview cap userMessage present",
        true,
        getEmailScanUserMessage("IMPORT_PREVIEW_TOO_MANY_ITEMS").length > 0 &&
            getEmailScanUserMessage("IMPORT_PREVIEW_TOO_MANY_ITEMS") !==
                getEmailScanUserMessage("INTERNAL_SERVER_ERROR")
    );
    assertField(
        "Gmail OAuth state userMessage present",
        true,
        getEmailScanUserMessage("GMAIL_OAUTH_STATE_INVALID").length > 0 &&
            getEmailScanUserMessage("GMAIL_OAUTH_STATE_INVALID") !==
                getEmailScanUserMessage("INTERNAL_SERVER_ERROR")
    );
    assertField(
        "Auth database unavailable userMessage present",
        true,
        getEmailScanUserMessage("AUTH_DATABASE_UNAVAILABLE").length > 0 &&
            getEmailScanUserMessage("AUTH_DATABASE_UNAVAILABLE") !==
                getEmailScanUserMessage("INTERNAL_SERVER_ERROR")
    );
    assertField(
        "Unknown code fallback",
        "Wystąpił błąd serwera. Spróbuj ponownie za chwilę.",
        getEmailScanUserMessage("SOMETHING_UNKNOWN")
    );

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: frontend helper labels and selection");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("frontend helper labels and selection");
    console.log("FAIL productResult: frontend helper labels and selection");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify(result, null, 2));
}

function runImportPreviewCase() {
    const wrappedProductItem = {
        id: "wrapped-sub",
        sourceItemId: "wrapped-source",
        itemSelectionKey: "wrapped-selection-key",
        displayName: "Wrapped Stream",
        provider: "Wrapped Stream",
        category: "streaming_video",
        status: "active",
        productBucket: "currentSubscriptions",
        primaryAction: "show_as_active",
        displayAmount: "19.99 PLN monthly",
        amount: 19.99,
        billingCycle: "monthly",
        categoryLabel: "Streaming",
        productBucketLabel: "Current",
        primaryActionLabel: "Add",
        recommendedSelected: true,
        selectionReason: "test",
        selected: true,
        localDecision: "checked",
    };
    const payload = {
        items: [
            {
                id: "stale-sub",
                displayName: "Review Stream",
                provider: "Review Stream",
                category: "streaming_video",
                status: "stale_needs_review",
                productBucket: "needsReviewSubscriptions",
                primaryAction: "confirm_still_active",
                displayAmount: "29.99 PLN monthly",
                regularAmount: "29.99 PLN monthly",
                billingCycle: "monthly",
                lastEvidenceDate: "2025-01-01T00:00:00.000Z",
                lastSeen: "2025-01-01T00:00:00.000Z",
                sourceMessagesCount: 2,
            },
            {
                id: "promo-sub",
                displayName: "Promo Stream",
                provider: "Promo Stream",
                billingChannel: "Marketplace",
                category: "streaming_video",
                status: "stale_needs_review",
                productBucket: "needsReviewSubscriptions",
                primaryAction: "confirm_still_active",
                promoAmount: "4.00 PLN monthly",
                futureAmount: "24.99 PLN monthly",
                regularAmount: "24.99 PLN monthly",
                displayAmount: "4.00 PLN monthly",
                amountKind: "promo_price",
                billingCycle: "monthly",
                lastEvidenceDate: "2025-01-01T00:00:00.000Z",
            },
            {
                id: "price-change",
                displayName: "Annual Prime",
                provider: "Annual Prime",
                category: "ecommerce_membership",
                status: "price_change",
                productBucket: "priceChanges",
                primaryAction: "review_price_change",
                currentAmount: "49.00 PLN/year",
                futureAmount: "69.00 PLN/year",
            },
            {
                id: "bill",
                displayName: "Utility Bill",
                provider: "Utility Bill",
                category: "utilities_energy",
                status: "stale_needs_review",
                productBucket: "billsOrUtilities",
                primaryAction: "show_as_active",
                dueAmount: "123.45 PLN",
                dueDateText: "15.04.2025",
                billingCycle: "monthly",
            },
            {
                id: "current-missing-amount",
                displayName: "Current Missing Amount",
                provider: "Current Missing Amount",
                category: "ai_tools",
                status: "active",
                productBucket: "currentSubscriptions",
                primaryAction: "show_as_active",
                billingCycle: "monthly",
                lastEvidenceDate: "2026-01-01T00:00:00.000Z",
            },
            {
                id: "processor-only",
                displayName: "Tpay",
                provider: "Tpay",
                billingChannel: "Payment Processor",
                category: "payment_processor",
                status: "active",
                productBucket: "needsReviewSubscriptions",
                primaryAction: "confirm_manually",
                displayAmount: "10.00 PLN",
                billingCycle: "monthly",
                evidenceSummary: ["payment through payment processor"],
            },
        ],
    };
    const preview = buildImportPreview(payload);
    const selectedItemsPreview = buildImportPreview({
        selectedItems: [wrappedProductItem],
    });
    const selectedPreview = buildImportPreview({
        selected: [wrappedProductItem],
    });
    const directArrayPreview = buildImportPreview([wrappedProductItem]);
    const wrappedItemPreview = buildImportPreview({
        items: [
            {
                item: wrappedProductItem,
                selected: true,
                decision: "preview",
                localDecision: "selected",
                reviewedAt: "2026-06-03T10:00:00.000Z",
                uiState: "checked",
            },
        ],
    });
    const wrappedProductItemPreview = buildImportPreview({
        items: [{ productItem: wrappedProductItem, checked: true }],
    });
    const wrappedSourceItemPreview = buildImportPreview({
        items: [{ sourceItem: wrappedProductItem }],
    });
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const byId = (id: string) =>
        preview.drafts.find((draft) => draft.sourceItemId === id);
    const stale = byId("stale-sub");
    const promo = byId("promo-sub");
    const price = byId("price-change");
    const bill = byId("bill");
    const currentMissingAmount = byId("current-missing-amount");
    const processorOnly = byId("processor-only");
    const mixedPreview = buildImportPreview({
        items: [wrappedProductItem, { id: "bad-item" }],
    });
    let invalidRejected = false;
    let invalidUserMessage = false;
    let invalidReceivedKeys: string[] = [];
    let idOnlyRejected = false;
    let idOnlyMessage: string | undefined;
    const tooManyItems = Array.from({ length: 51 }, (_, index) => ({
        id: `item-${index}`,
        displayName: `Item ${index}`,
        provider: "Provider",
        category: "ai_tools",
        status: "active",
        productBucket: "currentSubscriptions",
        primaryAction: "show_as_active",
        displayAmount: "10.00 PLN",
    }));
    let tooManyRejected = false;
    let tooManyCode: string | undefined;

    try {
        buildImportPreview({ unknownShape: [{ id: "bad-item" }] });
    } catch (error) {
        invalidRejected = true;
        invalidUserMessage = error instanceof ImportPreviewValidationError;
        invalidReceivedKeys =
            error instanceof ImportPreviewValidationError
                ? error.details.receivedKeys
                : [];
    }

    try {
        buildImportPreview({
            items: [
                {
                    id: "only-id",
                    selected: true,
                    localDecision: "selected",
                },
            ],
        });
    } catch (error) {
        idOnlyRejected = error instanceof ImportPreviewValidationError;
        idOnlyMessage = error instanceof Error ? error.message : undefined;
    }

    try {
        buildImportPreview({ items: tooManyItems });
    } catch (error) {
        tooManyRejected = true;
        tooManyCode =
            error instanceof ImportPreviewServiceError ? error.code : undefined;
    }

    assertField("Draft count", 6, preview.drafts.length);
    assertField("selectedItems shape works", 1, selectedItemsPreview.drafts.length);
    assertField("selected shape works", 1, selectedPreview.drafts.length);
    assertField("direct array shape works", 1, directArrayPreview.drafts.length);
    assertField("wrapped item shape works", 1, wrappedItemPreview.drafts.length);
    assertField(
        "wrapped productItem shape works",
        1,
        wrappedProductItemPreview.drafts.length
    );
    assertField("wrapped sourceItem shape works", 1, wrappedSourceItemPreview.drafts.length);
    assertField(
        "helper fields tolerated",
        "wrapped-source",
        selectedItemsPreview.drafts[0]?.sourceItemId
    );
    assertField(
        "Preview debug source shape",
        "selectedItems:direct",
        selectedItemsPreview.sourceShape
    );
    assertField(
        "Preview debug raw count",
        1,
        selectedItemsPreview.previewDebug?.rawItemCount
    );
    assertField(
        "Preview debug accepted wrapper",
        "direct",
        selectedItemsPreview.previewDebug?.acceptedWrapperKeys.join("|")
    );
    assertField("Stale action", "create_subscription", stale?.recommendedAction);
    assertField("Stale category", "entertainment", stale?.draft?.category);
    assertField("Stale review warning", true, stale?.warnings.some((warning) => warning.includes("confirm")));
    assertField("Promo action", "create_subscription", promo?.recommendedAction);
    assertField("Promo regular amount parsed", 24.99, promo?.draft?.amount);
    assertField("Promo future in notes", true, promo?.draft?.notes?.includes("Future amount: 24.99 PLN monthly"));
    assertField("Promo channel in notes", true, promo?.draft?.notes?.includes("Billing channel: Marketplace"));
    assertField("Price action", "review_price_change", price?.recommendedAction);
    assertField("Price no draft", undefined, price?.draft);
    assertField("Bill action", "review_bill", bill?.recommendedAction);
    assertField("Bill category", "utilities", bill?.draft?.category);
    assertField("Bill amount", 123.45, bill?.draft?.amount);
    assertField("Bill nextPaymentDate", "2025-04-15T00:00:00.000Z", bill?.draft?.nextPaymentDate);
    assertField("Bill can confirm", true, bill?.canConfirm);
    assertField("Bill missing fields", "", bill?.missingFields.join("|"));
    assertField("Bill recurring", true, bill?.draft?.isRecurringBill);
    assertField(
        "Bill notes import recommendation",
        true,
        bill?.draft?.notes?.includes("Import recommendation: review_bill")
    );
    assertField(
        "Bill notes no conflicting recommended action",
        false,
        bill?.draft?.notes?.includes("Recommended action: show_as_active")
    );
    assertField(
        "Current missing amount warning",
        true,
        currentMissingAmount?.warnings.some((warning) =>
            warning.includes("Confirm amount before saving")
        )
    );
    assertField("Current missing amount canConfirm", false, currentMissingAmount?.canConfirm);
    assertField(
        "Current missing amount missingFields",
        "amount",
        currentMissingAmount?.missingFields.filter((field) => field === "amount").join("|")
    );
    assertField("Processor-only action", "create_subscription", processorOnly?.recommendedAction);
    assertField(
        "Processor-only warning",
        true,
        processorOnly?.warnings.some((warning) =>
            warning.includes("Payment processor detected")
        )
    );
    assertField(
        "No unsafe raw content in notes",
        false,
        /raw|snippet|password|credential|token|secret/i.test(
            JSON.stringify(preview.drafts.map((draft) => draft.draft?.notes ?? ""))
        )
    );
    assertField("Mixed malformed item keeps valid draft", 1, mixedPreview.drafts.length);
    assertField(
        "Mixed malformed item warning",
        true,
        mixedPreview.warnings?.some((warning) =>
            warning.includes("not valid import candidates")
        )
    );
    assertField("Invalid-only payload rejected", true, invalidRejected);
    assertField("Invalid-only payload typed error", true, invalidUserMessage);
    assertField("Invalid-only received keys", "unknownShape", invalidReceivedKeys.join("|"));
    assertField("ID-only payload rejected", true, idOnlyRejected);
    assertField("ID-only message", "No valid import candidates found.", idOnlyMessage);
    assertField("Too many items rejected", true, tooManyRejected);
    assertField("Too many items code", "IMPORT_PREVIEW_TOO_MANY_ITEMS", tooManyCode);

    if (failures.length === 0) {
        importPreviewPassed += 1;
        console.log("PASS importPreview: scan item mapping");
        return;
    }

    importPreviewFailed += 1;
    failedImportPreviewCases.push("scan item mapping");
    console.log("FAIL importPreview: scan item mapping");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify(preview, null, 2));
}

async function runImportConfirmCase() {
    const failures: AssertionFailure[] = [];
    const createdInputs: Array<{ userId: string; data: Record<string, unknown> }> = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const baseDraft = {
        name: "ChatGPT Plus",
        provider: "OpenAI",
        planName: "ChatGPT Plus",
        amount: 20,
        currency: "USD",
        category: "productivity",
        billingCycle: "monthly",
        nextPaymentDate: "2026-04-23T10:34:28.000Z",
        lastPaymentDate: "2026-03-23T10:34:28.000Z",
        trialEndDate: null,
        isTrial: false,
        isRecurringBill: false,
        paymentMethodLabel: null,
        status: "pending",
        notes:
            "Imported from IMAP scan preview.\nRaw body: secret\nPassword: nope\nOAuth token: nope\nUseful note",
    };
    const result = await confirmScanImportDrafts(
        "auth-user",
        {
            userId: "client-forged-user",
            drafts: [
                {
                    sourceItemId: "openai||ai_tools",
                    recommendedAction: "create_subscription",
                    draft: baseDraft,
                    warnings: [],
                    rawBody: "do not persist",
                },
                {
                    sourceItemId: "utility||utilities",
                    recommendedAction: "review_bill",
                    draft: {
                        ...baseDraft,
                        name: "Utility Bill",
                        provider: "UtilityCo",
                        category: "utilities",
                        amount: 123.45,
                        currency: "PLN",
                        isRecurringBill: false,
                    },
                    warnings: [],
                },
                {
                    sourceItemId: "skip||historical",
                    recommendedAction: "skip",
                    warnings: [],
                },
                {
                    sourceItemId: "price||change",
                    recommendedAction: "review_price_change",
                    warnings: [],
                },
                {
                    sourceItemId: "duplicate||service",
                    recommendedAction: "create_subscription",
                    draft: {
                        ...baseDraft,
                        name: "Duplicate Service",
                        provider: "DuplicateCo",
                    },
                    warnings: [],
                },
                {
                    sourceItemId: "missing||amount",
                    recommendedAction: "create_subscription",
                    draft: {
                        ...baseDraft,
                        name: "Missing Amount",
                        amount: undefined,
                    },
                    warnings: [],
                },
                {
                    sourceItemId: "invalid||date",
                    recommendedAction: "create_subscription",
                    draft: {
                        ...baseDraft,
                        name: "Invalid Date",
                        nextPaymentDate: "not-a-date",
                    },
                    warnings: [],
                },
            ],
        },
        {
            findPotentialDuplicate: async (_userId, data) =>
                data.name === "Duplicate Service" ? { id: "existing-sub" } : null,
            createSubscription: async (userId, data) => {
                createdInputs.push({ userId, data });
                return {
                    id: `sub-${createdInputs.length}`,
                    name: data.name,
                    provider: data.provider ?? null,
                    amount: data.amount,
                    currency: data.currency,
                    billingCycle: data.billingCycle,
                    category: data.category,
                    status: data.status ?? "pending",
                    isRecurringBill: data.isRecurringBill ?? true,
                    nextPaymentDate: data.nextPaymentDate,
                    createdAt: "2026-04-23T10:34:28.000Z",
                };
            },
        }
    );

    assertField("Created count", 2, result.summary.created);
    assertField("Skipped count", 5, result.summary.skipped);
    assertField("Create subscription persisted", "sub-1", result.created[0]?.subscriptionId);
    assertField("Created item name", "ChatGPT Plus", result.created[0]?.name);
    assertField("Created item provider", "OpenAI", result.created[0]?.provider);
    assertField("Created item amount", 20, result.created[0]?.amount);
    assertField("Created item currency", "USD", result.created[0]?.currency);
    assertField("Created item billing cycle", "monthly", result.created[0]?.billingCycle);
    assertField("Created item category", "productivity", result.created[0]?.category);
    assertField("Created item status visible convention", "pending", result.created[0]?.status);
    assertField("Created item recurring flag", false, result.created[0]?.isRecurringBill);
    assertField(
        "Created item visibility hint",
        "created_active_subscription",
        result.created[0]?.visibilityHint
    );
    assertField(
        "Bill visibility hint",
        "created_recurring_bill",
        result.created[1]?.visibilityHint
    );
    assertField(
        "Created item next payment date",
        "2026-04-23T10:34:28.000Z",
        result.created[0]?.nextPaymentDate
    );
    assertField(
        "Refresh hints include subscriptions",
        true,
        result.refreshHints.invalidateQueries.includes("subscriptions")
    );
    assertField(
        "Refresh hints include dashboard",
        true,
        result.refreshHints.invalidateQueries.includes("dashboard")
    );
    assertField(
        "Refresh hints created ids",
        "sub-1|sub-2",
        result.refreshHints.createdSubscriptionIds.join("|")
    );
    assertField("Review bill persisted", true, result.created[1]?.isRecurringBill);
    assertField(
        "Price change skipped unsupported",
        "unsupported_action",
        result.skipped.find((item) => item.sourceItemId === "price||change")?.reason
    );
    assertField(
        "Skip action skipped unsupported",
        "unsupported_action",
        result.skipped.find((item) => item.sourceItemId === "skip||historical")?.reason
    );
    assertField(
        "Duplicate skipped",
        "duplicate",
        result.skipped.find((item) => item.sourceItemId === "duplicate||service")?.reason
    );
    assertField(
        "Missing amount skipped",
        "missing_required_field",
        result.skipped.find((item) => item.sourceItemId === "missing||amount")?.reason
    );
    assertField(
        "Missing amount visibility hint",
        "skipped_missing_amount",
        result.skipped.find((item) => item.sourceItemId === "missing||amount")
            ?.visibilityHint
    );
    assertField(
        "Invalid date skipped",
        "missing_required_field",
        result.skipped.find((item) => item.sourceItemId === "invalid||date")?.reason
    );
    assertField(
        "Invalid date visibility hint",
        "skipped_invalid_field",
        result.skipped.find((item) => item.sourceItemId === "invalid||date")
            ?.visibilityHint
    );
    assertField(
        "Missing amount user message",
        "Uzupełnij kwotę przed zapisaniem tej pozycji.",
        result.skipped.find((item) => item.sourceItemId === "missing||amount")
            ?.userMessage
    );
    assertField(
        "Duplicate user message",
        "Ta pozycja wygląda na już dodaną.",
        result.skipped.find((item) => item.sourceItemId === "duplicate||service")
            ?.userMessage
    );
    assertField(
        "Duplicate skipped name",
        "Duplicate Service",
        result.skipped.find((item) => item.sourceItemId === "duplicate||service")
            ?.name
    );
    assertField(
        "Unsupported user message",
        "Ten typ wyniku wymaga ręcznego sprawdzenia.",
        result.skipped.find((item) => item.sourceItemId === "price||change")
            ?.userMessage
    );
    assertField("Client userId ignored", true, createdInputs.every((item) => item.userId === "auth-user"));
    assertField(
        "Unsafe notes stripped",
        false,
        /raw body|password|secret|credential|token|oauth|debug/i.test(
            String(createdInputs[0]?.data.notes ?? "")
        )
    );
    assertField(
        "Useful notes preserved",
        true,
        String(createdInputs[0]?.data.notes ?? "").includes("Useful note")
    );
    assertField("Bill category normalized", "utilities", createdInputs[1]?.data.category);
    assertField("Bill status normalized", "pending", createdInputs[1]?.data.status);
    assertField("Currency normalized", "USD", createdInputs[0]?.data.currency);

    const persistedKeys = new Set<string>();
    const idempotentPayload = {
        drafts: [
            {
                sourceItemId: "idempotent||subscription",
                recommendedAction: "create_subscription",
                draft: {
                    ...baseDraft,
                    name: "Idempotent Service",
                    provider: "IdempotentCo",
                    amount: 19.99,
                    currency: "pln",
                },
                warnings: [],
            },
        ],
    };
    const idempotentDependencies = {
        findPotentialDuplicate: async (_userId: string, data: Record<string, unknown>) => {
            const key = [
                data.provider,
                data.name,
                data.category,
                data.amount,
                data.currency,
            ]
                .join("|")
                .toLowerCase();
            return persistedKeys.has(key) ? { id: "existing-after-first-import" } : null;
        },
        createSubscription: async (_userId: string, data: Record<string, unknown>) => {
            const key = [
                data.provider,
                data.name,
                data.category,
                data.amount,
                data.currency,
            ]
                .join("|")
                .toLowerCase();
            persistedKeys.add(key);
            return {
                id: "created-once",
                name: String(data.name),
                provider: (data.provider as string | null) ?? null,
                amount: data.amount,
                currency: String(data.currency),
                billingCycle: String(data.billingCycle),
                category: String(data.category),
                status: String(data.status ?? "pending"),
                isRecurringBill: Boolean(data.isRecurringBill),
                nextPaymentDate: String(data.nextPaymentDate),
                createdAt: "2026-04-23T10:34:28.000Z",
            };
        },
    };
    const firstIdempotent = await confirmScanImportDrafts(
        "auth-user",
        idempotentPayload,
        idempotentDependencies
    );
    const secondIdempotent = await confirmScanImportDrafts(
        "auth-user",
        idempotentPayload,
        idempotentDependencies
    );

    assertField("First idempotent import creates", 1, firstIdempotent.summary.created);
    assertField("Second idempotent import skips", 1, secondIdempotent.summary.skipped);
    assertField(
        "Second idempotent duplicate reason",
        "duplicate",
        secondIdempotent.skipped[0]?.reason
    );
    assertField(
        "Second idempotent existing id",
        "existing-after-first-import",
        secondIdempotent.skipped[0]?.existingSubscriptionId
    );

    if (failures.length === 0) {
        importConfirmPassed += 1;
        console.log("PASS importConfirm: confirmed draft persistence contract");
        return;
    }

    importConfirmFailed += 1;
    failedImportConfirmCases.push("confirmed draft persistence contract");
    console.log("FAIL importConfirm: confirmed draft persistence contract");
    console.log("  failures:", JSON.stringify(failures, null, 2));
    console.log("  actual:", JSON.stringify(result, null, 2));
}

function runGmailLegacyQualityCase() {
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const duplicateSuppressed = calculateGmailDuplicateQueryMatches(
        [
            { analyzed: 12 },
            { analyzed: 5 },
            { analyzed: 1 },
            { analyzed: 25 },
            { analyzed: 9 },
            { analyzed: 3 },
        ],
        38
    );
    const security = analyzeMessageForSubscription({
        id: "gmail-security",
        from: "Google <no-reply@accounts.google.com>",
        subject: "Security alert",
        snippet: "A new sign-in was detected. Check your Gmail account activity.",
    });
    const onboarding = analyzeMessageForSubscription({
        id: "gmail-onboarding",
        from: "Canva <hello@canva.com>",
        subject: "Welcome to Canva",
        snippet: "Your account is ready. Start using templates and designs today.",
    });
    const marketing = analyzeMessageForSubscription({
        id: "gmail-marketing",
        from: "Spotify <news@spotify.com>",
        subject: "Premium offer",
        snippet: "Get three free months of Premium in our limited promotion.",
    });
    const ecommerce = analyzeMessageForSubscription({
        id: "gmail-shop",
        from: "Shop <orders@example.com>",
        subject: "Order receipt",
        snippet: "Order number 123. Your item was shipped. Total paid 49.99 USD.",
    });
    const processorSetup = analyzeMessageForSubscription({
        id: "gmail-processor-setup",
        from: "PayPal <service@paypal.com>",
        subject: "Your PayPal account is ready",
        snippet: "You can now send payments and manage your account.",
    });
    const subscription = analyzeMessageForSubscription({
        id: "gmail-subscription",
        from: "Netflix <info@netflix.com>",
        subject: "Your Netflix subscription receipt",
        snippet: "Your monthly subscription renews automatically. You were charged 29.99 PLN monthly.",
    });
    const trialThenPaid = analyzeMessageForSubscription({
        id: "gmail-trial",
        from: "Canva <billing@canva.com>",
        subject: "Your Canva Pro trial started",
        snippet: "Your free trial has started. After trial, you will be charged 12.99 USD monthly unless canceled.",
    });
    const priceChange = analyzeMessageForSubscription({
        id: "gmail-price",
        from: "Spotify <no-reply@spotify.com>",
        subject: "Your Premium price is changing",
        snippet: "You are a Premium subscriber. Current price is 23.99 PLN monthly. New price is 26.99 PLN monthly.",
    });
    const termsUpdate = analyzeMessageForSubscription({
        id: "gmail-terms",
        from: "Google One <googleone-noreply@google.com>",
        subject: "We've updated our Google One Terms of Service",
        snippet: "We updated our terms and privacy information. Review the changes in your account settings.",
    });
    const repoInvite = analyzeMessageForSubscription({
        id: "gmail-repo-invite",
        from: "GitHub <noreply@github.com>",
        subject: "lukaszned invited you to lukaszned/subskrypcje",
        snippet: "You can accept or decline this repository invitation.",
    });
    const googlePlayTrialReceipt = analyzeMessageForSubscription({
        id: "gmail-google-play-trial",
        from: "Google Play <googleplay-noreply@google.com>",
        subject: "Your Google Play Order Receipt from Nov 10, 2025",
        snippet: "You have signed up for a trial subscription for YouTube Premium on Google Play. Your trial will end on Dec 10, 2025. You will be automatically charged 25.99 PLN monthly unless canceled.",
    });

    assertField("Duplicate query matches suppressed", 17, duplicateSuppressed);
    assertField("Security rejected", false, security.isCandidate);
    assertField("Onboarding rejected", false, onboarding.isCandidate);
    assertField("Marketing rejected", false, marketing.isCandidate);
    assertField("Ecommerce rejected", false, ecommerce.isCandidate);
    assertField("Processor account setup rejected", false, processorSetup.isCandidate);
    assertField("Strong subscription accepted", true, subscription.isCandidate);
    assertField("Trial then paid accepted", true, trialThenPaid.isCandidate);
    assertField("Price change accepted", true, priceChange.isCandidate);
    assertField("Terms update rejected", false, termsUpdate.isCandidate);
    assertField("Repo invitation rejected", false, repoInvite.isCandidate);
    assertField("Google Play trial receipt accepted", true, googlePlayTrialReceipt.isCandidate);
    assertField(
        "Google Play trial receipt does not infer Nov provider",
        false,
        googlePlayTrialReceipt.detected.provider === "Nov" ||
            googlePlayTrialReceipt.reasons.some((reason) =>
                /provider from payment processor:\s*Nov\b/i.test(reason)
            )
    );

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: Gmail legacy quality guardrails");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("Gmail legacy quality guardrails");
    console.log("FAIL productResult: Gmail legacy quality guardrails");
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

function runImapScanErrorClassifierCase() {
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const cases = [
        {
            name: "AUTHENTICATIONFAILED",
            error: Object.assign(new Error("NO [AUTHENTICATIONFAILED] Invalid credentials"), {
                responseCode: "AUTHENTICATIONFAILED",
            }),
            expected: "IMAP_AUTH_FAILED",
        },
        {
            name: "ETIMEDOUT",
            error: Object.assign(new Error("Socket timeout while waiting for greeting"), {
                code: "ETIMEDOUT",
            }),
            expected: "IMAP_CONNECTION_TIMEOUT",
        },
        {
            name: "ENOTFOUND",
            error: Object.assign(new Error("getaddrinfo ENOTFOUND imap.example.test"), {
                code: "ENOTFOUND",
            }),
            expected: "IMAP_CONNECTION_FAILED",
        },
        {
            name: "mailbox not found",
            error: new Error("SELECT failed: no such mailbox"),
            expected: "IMAP_MAILBOX_NOT_FOUND",
        },
        {
            name: "unsupported search",
            error: new Error("BAD unsupported search charset"),
            expected: "IMAP_UNSUPPORTED",
        },
        {
            name: "unknown runtime bug",
            error: new Error("Cannot read properties of undefined"),
            expected: "IMAP_SCAN_FAILED",
        },
    ];

    for (const testCase of cases) {
        assertField(
            testCase.name,
            testCase.expected,
            classifyImapScanError(testCase.error).code
        );
    }

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: IMAP scan error classifier");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("IMAP scan error classifier");
    console.log("FAIL productResult: IMAP scan error classifier");
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

function runImapProfileNormalizationCase() {
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const cases: Array<{
        name: string;
        input: unknown;
        requested: string | null;
        normalizedFrom: string | null;
        hasWarning: boolean;
    }> = [
        {
            name: "missing",
            input: undefined,
            requested: null,
            normalizedFrom: null,
            hasWarning: true,
        },
        {
            name: "fast",
            input: "fast",
            requested: "fast",
            normalizedFrom: null,
            hasWarning: false,
        },
        {
            name: "adaptive",
            input: "adaptive",
            requested: "adaptive",
            normalizedFrom: "adaptive",
            hasWarning: true,
        },
        {
            name: "deep",
            input: "deep",
            requested: "deep",
            normalizedFrom: "deep",
            hasWarning: true,
        },
        {
            name: "balanced",
            input: "balanced",
            requested: "balanced",
            normalizedFrom: "balanced",
            hasWarning: true,
        },
        {
            name: "unknown",
            input: "experimental",
            requested: "experimental",
            normalizedFrom: "experimental",
            hasWarning: true,
        },
    ];

    for (const testCase of cases) {
        const actual = normalizeImapScanProfile(testCase.input);
        assertField(`${testCase.name} effective`, "fast", actual.effectiveProfile);
        assertField(`${testCase.name} requested`, testCase.requested, actual.requestedProfile);
        assertField(`${testCase.name} normalizedFrom`, testCase.normalizedFrom, actual.normalizedFrom);
        assertField(`${testCase.name} warning`, testCase.hasWarning, Boolean(actual.warning));
        assertField(
            `${testCase.name} warning text`,
            testCase.hasWarning,
            Boolean(actual.warning?.includes("fast profile"))
        );
    }

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: IMAP MVP fast profile normalization");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("IMAP MVP fast profile normalization");
    console.log("FAIL productResult: IMAP MVP fast profile normalization");
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

function runGmailRedirectConfigCase() {
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };
    const previousBase = process.env.GMAIL_REDIRECT_BASE_URL;
    const previousRedirect = process.env.GOOGLE_REDIRECT_URI;

    try {
        delete process.env.GMAIL_REDIRECT_BASE_URL;
        delete process.env.GOOGLE_REDIRECT_URI;
        assertField(
            "Default localhost redirect",
            "http://localhost:3000/email-scan/gmail/callback",
            resolveGmailRedirectUri()
        );

        process.env.GOOGLE_REDIRECT_URI =
            "http://localhost:3000/email-scan/gmail/callback";
        assertField(
            "Legacy GOOGLE_REDIRECT_URI fallback",
            "http://localhost:3000/email-scan/gmail/callback",
            resolveGmailRedirectUri()
        );

        process.env.GMAIL_REDIRECT_BASE_URL = "http://192.168.18.5:3000/";
        assertField(
            "GMAIL_REDIRECT_BASE_URL wins",
            "http://192.168.18.5:3000/email-scan/gmail/callback",
            resolveGmailRedirectUri()
        );

        const diagnostics = getGmailRedirectDiagnostics(resolveGmailRedirectUri());
        assertField("Redirect mode", "lan_or_custom", diagnostics.redirectMode);
        assertField("Redirect host", "192.168.18.5", diagnostics.redirectUriHost);
        assertField("Callback path", "/email-scan/gmail/callback", diagnostics.callbackPath);

        process.env.GMAIL_REDIRECT_BASE_URL =
            "https://sub-sentry-test.trycloudflare.com";
        const tunnelDiagnostics = buildGmailOAuthDiagnostics();
        assertField(
            "Tunnel redirect URI",
            "https://sub-sentry-test.trycloudflare.com/email-scan/gmail/callback",
            tunnelDiagnostics.redirectUri
        );
        assertField("Tunnel detected", true, tunnelDiagnostics.isTunnelRedirect);
        assertField(
            "Tunnel callback path",
            "/email-scan/gmail/callback",
            tunnelDiagnostics.callbackPath
        );
        assertField(
            "No OAuth secret in diagnostics",
            false,
            /client_secret|refresh_token|access_token/i.test(
                JSON.stringify(tunnelDiagnostics)
            )
        );
    } finally {
        if (previousBase === undefined) {
            delete process.env.GMAIL_REDIRECT_BASE_URL;
        } else {
            process.env.GMAIL_REDIRECT_BASE_URL = previousBase;
        }

        if (previousRedirect === undefined) {
            delete process.env.GOOGLE_REDIRECT_URI;
        } else {
            process.env.GOOGLE_REDIRECT_URI = previousRedirect;
        }
    }

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: Gmail redirect config");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("Gmail redirect config");
    console.log("FAIL productResult: Gmail redirect config");
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

function runProductResultReviewDefaultCase() {
    const items: ProductBucketInput[] = [
        {
            displayName: "ChatGPT Plus",
            provider: "OpenAI",
            category: "ai_tools",
            status: "active",
            confidence: 0.98,
            evidenceSummary: [
                "active subscription payment confirmation",
                "charged monthly",
                "billing cycle",
            ],
            evidenceTypes: ["payment confirmation", "subscription renewal"],
        },
        {
            displayName: "Apple",
            provider: "Apple",
            billingChannel: "Apple",
            category: "app_store_marketplace",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
        },
        {
            displayName: "Uber One",
            provider: "Uber One",
            category: "delivery_membership",
            status: "active",
            confidence: 0.7,
            evidenceSummary: ["membership benefits", "savings summary"],
            evidenceTypes: ["membership wording"],
        },
        {
            displayName: "Tpay",
            provider: "Tpay",
            billingChannel: "Payment Processor",
            category: "payment_processor",
            status: "active",
            evidenceSummary: ["payment through payment processor"],
        },
        {
            displayName: "Baselinker",
            provider: "Baselinker",
            category: "software_saas",
            status: "stale_needs_review",
            recencyStatus: "stale_needs_review",
            needsReview: true,
        },
        {
            displayName: "PayU",
            provider: "PayU",
            billingChannel: "Payment Processor",
            category: "payment_processor",
            status: "active",
            evidenceSummary: ["payment through payment processor"],
        },
        {
            displayName: "TOYA",
            provider: "TOYA",
            category: "internet_isp",
            status: "invoice_due",
            evidenceSummary: ["invoice due"],
        },
        {
            displayName: "Play",
            provider: "Play",
            category: "telecom_mobile",
            status: "invoice_due",
            evidenceSummary: ["payment due reminder"],
        },
    ];
    const actual = buildProductResult(items);
    const failures: AssertionFailure[] = [];
    const assertField = (field: string, expected: unknown, value: unknown) => {
        if (value !== expected) {
            failures.push({ field, expected, actual: value });
        }
    };

    assertField("currentSubscriptions", 1, actual.scanSummary.currentSubscriptions);
    assertField("needsReviewSubscriptions", 5, actual.scanSummary.needsReviewSubscriptions);
    assertField("billsOrUtilities", 2, actual.scanSummary.billsOrUtilities);
    assertField("recommendedDefaultMode", "review", actual.scanSummary.recommendedDefaultMode);
    assertField(
        "recommendedUserMessage",
        "We found possible subscriptions and recurring bills. Please review the results before importing.",
        actual.scanSummary.recommendedUserMessage
    );

    if (failures.length === 0) {
        productResultPassed += 1;
        console.log("PASS productResult: review default when review items dominate");
        return;
    }

    productResultFailed += 1;
    failedProductResultCases.push("review default when review items dominate");
    console.log("FAIL productResult: review default when review items dominate");
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

async function main() {
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

runProductBucketCase(
    "Tpay-like payment processor-only item",
    {
        displayName: "Tpay",
        provider: "Tpay",
        billingChannel: "Payment Processor",
        category: "payment_processor",
        status: "active",
        confidence: 0.9,
        evidenceSummary: ["payment through payment processor", "amount/currency detected"],
        evidenceTypes: ["payment confirmation"],
    },
    {
        bucket: "needsReviewSubscriptions",
        primaryAction: "confirm_manually",
    }
);

runProductBucketCase(
    "PayU-like unclear payment processor item",
    {
        displayName: "PayU",
        provider: "PayU",
        billingChannel: "Payment Processor",
        category: "payment_processor",
        status: "active",
        confidence: 0.85,
        evidenceSummary: ["payment confirmation", "merchant unclear"],
    },
    {
        bucket: "needsReviewSubscriptions",
        primaryAction: "confirm_manually",
    }
);

runProductBucketCase(
    "Payment processor with clear merchant subscription",
    {
        displayName: "Netflix",
        provider: "Netflix",
        billingChannel: "Payment Processor",
        category: "streaming_video",
        status: "active",
        confidence: 0.95,
        evidenceSummary: [
            "automatic payment to merchant",
            "active subscription payment confirmation",
            "monthly renewal",
        ],
        evidenceTypes: ["payment confirmation", "subscription renewal"],
    },
    {
        bucket: "currentSubscriptions",
        primaryAction: "show_as_active",
    }
);

runProductBucketCase(
    "Weak delivery membership does not become current",
    {
        displayName: "Delivery Club",
        provider: "Delivery Club",
        category: "delivery_membership",
        status: "active",
        confidence: 0.7,
        evidenceSummary: ["membership benefits", "savings summary"],
        evidenceTypes: ["membership wording"],
    },
    {
        bucket: "needsReviewSubscriptions",
        primaryAction: "confirm_still_active",
    }
);

runProductBucketCase(
    "Strong delivery membership renewal can become current",
    {
        displayName: "Delivery Club",
        provider: "Delivery Club",
        category: "delivery_membership",
        status: "active",
        confidence: 0.95,
        evidenceSummary: [
            "active membership payment confirmation",
            "charged monthly",
            "next billing date",
        ],
        evidenceTypes: ["payment confirmation", "billing cycle"],
    },
    {
        bucket: "currentSubscriptions",
        primaryAction: "show_as_active",
    }
);

runProductBucketCase(
    "ChatGPT Plus current remains current",
    {
        displayName: "ChatGPT Plus",
        provider: "OpenAI",
        category: "ai_tools",
        status: "active",
        confidence: 0.98,
        evidenceSummary: [
            "active subscription payment confirmation",
            "charged monthly",
            "billing cycle",
        ],
        evidenceTypes: ["payment confirmation", "subscription renewal"],
    },
    {
        bucket: "currentSubscriptions",
        primaryAction: "show_as_active",
    }
);

runProductResultContractCase();
runProductResultReviewDefaultCase();
runProductionImapAggregationCase();
runProductionImapAmountSemanticsCase();
runProductionImapRetrievalStabilityCase();
runProductionImapBillDedupeCase();
runImapFrontendContractCase();
runProductResultFrontendHelperCase();
runImapProfileNormalizationCase();
runImportPreviewCase();
await runImportConfirmCase();
runGmailLegacyQualityCase();
runImapScanErrorClassifierCase();
runGmailRedirectConfigCase();

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
console.log(`ImportPreview Passed: ${importPreviewPassed}`);
console.log(`ImportPreview Failed: ${importPreviewFailed}`);
console.log(`ImportConfirm Passed: ${importConfirmPassed}`);
console.log(`ImportConfirm Failed: ${importConfirmFailed}`);

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

if (failedImportPreviewCases.length > 0) {
    console.log(`Failed importPreview cases: ${failedImportPreviewCases.join(", ")}`);
    process.exitCode = 1;
}

if (failedImportConfirmCases.length > 0) {
    console.log(`Failed importConfirm cases: ${failedImportConfirmCases.join(", ")}`);
    process.exitCode = 1;
}
}

main().catch((error) => {
    console.error("Email detection test runner failed:", error);
    process.exitCode = 1;
});
