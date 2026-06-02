export type ProductBucket =
    | "currentSubscriptions"
    | "needsReviewSubscriptions"
    | "historicalSubscriptions"
    | "priceChanges"
    | "billsOrUtilities";

export type ProductPrimaryAction =
    | "show_as_active"
    | "confirm_still_active"
    | "confirm_manually"
    | "review_old_bill"
    | "review_price_change"
    | "ignore_or_archive"
    | "create_subscription"
    | "skip";

export type ProductBucketInput = {
    displayName?: string;
    provider?: string;
    billingChannel?: string;
    category?: string;
    status: string;
    confidence?: number;
    amount?: string | number;
    displayAmount?: string;
    amountKind?: string | null;
    currentAmount?: string;
    regularAmount?: string;
    futureAmount?: string;
    promoAmount?: string;
    trialThenAmount?: string;
    dueAmount?: string;
    latestAmount?: string;
    warnings?: string[];
    lastEvidenceDate?: string;
    recencyStatus?: string;
    source?: string;
    needsReview?: boolean;
    stalenessReason?: string;
    evidenceTypes?: string[];
    evidenceSummary?: string[];
    reasons?: string[];
};

export type ProductBucketDecision = {
    bucket: ProductBucket;
    primaryAction: ProductPrimaryAction;
    userFacingReason: string;
};

export type ProductResultItem<T extends ProductBucketInput> = T & {
    productBucket: ProductBucket;
    primaryAction: ProductPrimaryAction;
    userFacingReason: string;
    productBucketLabel: string;
    categoryLabel: string;
    primaryActionLabel: string;
    amountKindLabel: string | null;
    recommendedSelected: boolean;
    selectionReason: string | null;
};

export type ProductResult<T extends ProductBucketInput> = {
    currentSubscriptions: Array<ProductResultItem<T>>;
    needsReviewSubscriptions: Array<ProductResultItem<T>>;
    historicalSubscriptions: Array<ProductResultItem<T>>;
    priceChanges: Array<ProductResultItem<T>>;
    billsOrUtilities: Array<ProductResultItem<T>>;
    scanSummary: {
        currentSubscriptions: number;
        needsReviewSubscriptions: number;
        historicalSubscriptions: number;
        priceChanges: number;
        billsOrUtilities: number;
        totalCanonicalSubscriptions: number;
        recommendedDefaultMode: string;
        recommendedUserMessage: string;
        hasCurrentSubscriptions: boolean;
        hasOnlyHistoricalEvidence: boolean;
        hasPriceChanges: boolean;
        hasBillsOrUtilities: boolean;
    };
};

const PRODUCT_BUCKET_LABELS: Record<ProductBucket, string> = {
    currentSubscriptions: "Aktywne subskrypcje",
    needsReviewSubscriptions: "Do sprawdzenia",
    historicalSubscriptions: "Historyczne",
    priceChanges: "Zmiany cen",
    billsOrUtilities: "Rachunki cykliczne",
};

const CATEGORY_LABELS: Record<string, string> = {
    payment_processor: "Operator płatności",
    internet_isp: "Internet",
    telecom_mobile: "Telefon",
    telecom: "Telefon",
    ai_tools: "Narzędzia AI",
    delivery_membership: "Dostawy / membership",
    software_saas: "Software / SaaS",
    app_store_marketplace: "App Store / marketplace",
    productivity: "Produktywność",
    productivity_office: "Produktywność",
    utilities: "Rachunki",
    utilities_energy: "Rachunki",
    streaming: "Streaming",
    streaming_video: "Streaming",
    streaming_music: "Streaming",
    music_audio: "Streaming",
    cloud_storage: "Chmura / storage",
    finance: "Finanse",
    finance_accounting: "Finanse",
    ecommerce: "Zakupy",
    ecommerce_membership: "Zakupy",
    shopping: "Zakupy",
    unknown: "Inne",
};

const PRIMARY_ACTION_LABELS: Record<string, string> = {
    show_as_active: "Dodaj jako aktywną",
    confirm_still_active: "Potwierdź, czy nadal aktywna",
    confirm_manually: "Potwierdź ręcznie",
    review_old_bill: "Sprawdź rachunek",
    review_bill: "Sprawdź rachunek",
    review_price_change: "Sprawdź zmianę ceny",
    skip: "Pomiń",
    ignore_or_archive: "Pomiń",
    create_subscription: "Utwórz subskrypcję",
};

const AMOUNT_KIND_LABELS: Record<string, string> = {
    due: "Kwota do zapłaty",
    paid: "Zapłacono",
    charged: "Pobrano",
    upcoming: "Nadchodząca płatność",
    unknown: "Kwota do sprawdzenia",
    regular_price: "Kwota regularna",
    promo_price: "Kwota promocyjna",
    trial_then_price: "Kwota po okresie próbnym",
    new_price: "Nowa cena",
};

const EMAIL_SCAN_USER_MESSAGES: Record<string, string> = {
    AUTH_REQUIRED: "Zaloguj się ponownie, aby kontynuować.",
    UNAUTHORIZED: "Zaloguj się ponownie, aby kontynuować.",
    AUTH_DATABASE_UNAVAILABLE:
        "Chwilowy problem z połączeniem z bazą danych. Spróbuj ponownie za chwilę.",
    VALIDATION_ERROR: "Sprawdź formularz i uzupełnij wymagane pola.",
    IMAP_AUTH_FAILED:
        "Nie udało się zalogować do skrzynki. Sprawdź adres e-mail i hasło albo użyj hasła aplikacji.",
    IMAP_CONNECTION_FAILED:
        "Nie udało się połączyć ze skrzynką. Sprawdź serwer, port i ustawienia SSL.",
    IMAP_CONNECTION_TIMEOUT:
        "Skanowanie skrzynki trwało zbyt długo. Spróbuj ponownie lub użyj szybkiego trybu.",
    IMAP_MAILBOX_NOT_FOUND: "Nie znaleziono wybranego folderu poczty.",
    IMAP_UNSUPPORTED:
        "Ten serwer pocztowy nie obsługuje wymaganej operacji skanowania.",
    IMAP_SCAN_FAILED: "Nie udało się przeskanować skrzynki. Spróbuj ponownie.",
    GMAIL_CONNECTION_NOT_FOUND: "Połącz konto Gmail, aby uruchomić skanowanie.",
    GMAIL_REAUTH_REQUIRED:
        "Połączenie z Gmail wygasło. Połącz Gmail ponownie.",
    GMAIL_REFRESH_FAILED:
        "Nie udało się odświeżyć dostępu do Gmail. Połącz konto ponownie.",
    GMAIL_TOKEN_DECRYPT_FAILED:
        "Nie udało się odczytać połączenia Gmail. Połącz konto ponownie.",
    GMAIL_API_FAILED:
        "Gmail chwilowo nie odpowiedział poprawnie. Spróbuj ponownie.",
    GMAIL_OAUTH_CONFIG_MISSING: "Konfiguracja Gmail OAuth jest niekompletna.",
    GMAIL_SCAN_FAILED: "Nie udało się przeskanować Gmail. Spróbuj ponownie.",
    INTERNAL_SERVER_ERROR: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę.",
};

function normalizeAsciiText(text: string) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u0142/g, "l")
        .replace(/\u0141/g, "L")
        .toLowerCase();
}

export function getProductBucketLabel(bucket: string | undefined) {
    return PRODUCT_BUCKET_LABELS[bucket as ProductBucket] ?? "Do sprawdzenia";
}

export function getCategoryLabel(category: string | undefined) {
    const normalized = (category ?? "unknown").trim().toLowerCase();

    if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized];

    return "Inne";
}

export function getPrimaryActionLabel(action: string | undefined) {
    return PRIMARY_ACTION_LABELS[action ?? ""] ?? "Sprawdź ręcznie";
}

export function getAmountKindLabel(amountKind: string | null | undefined) {
    if (!amountKind) return null;

    return AMOUNT_KIND_LABELS[amountKind] ?? "Kwota do sprawdzenia";
}

export function getEmailScanUserMessage(code: string | undefined) {
    return (
        EMAIL_SCAN_USER_MESSAGES[code ?? ""] ??
        EMAIL_SCAN_USER_MESSAGES.INTERNAL_SERVER_ERROR
    );
}

export function isSubscriptionLikeCategory(category: string | undefined) {
    return /(streaming_video|streaming_music|music_audio|software_saas|ai_tools|cloud_storage|ecommerce_membership|delivery_membership|fitness|health_fitness|education|productivity|gaming_subscription|gaming|other_subscription)/i.test(
        category ?? ""
    );
}

export function isMembershipLikeCategory(category: string | undefined) {
    return /(ecommerce_membership|delivery_membership|gaming_subscription)/i.test(
        category ?? ""
    );
}

export function isBillLikeCategory(category: string | undefined) {
    return /(utilities_energy|telecom|telecom_mobile|internet_isp|insurance|finance_insurance|government|government_tax_insurance|rent|loan_credit|other_bill)/i.test(
        category ?? ""
    );
}

export function isPaymentProcessorLikeIdentity(value: string | undefined) {
    const normalized = normalizeAsciiText(value ?? "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, "_");

    return /^(payment_processor|payment|payments|processor|payment_channel|operator_platnosci|platnosc|platnosci|tpay|payu|przelewy24|p24|autopay|stripe|paypal|google_payments|apple_billing|apple_billing_and_subscriptions)$/.test(
        normalized
    );
}

function hasReliableMerchantIdentity(item: ProductBucketInput) {
    const provider = item.provider ?? item.displayName;

    return Boolean(
        provider &&
            !isPaymentProcessorLikeIdentity(provider) &&
            item.category !== "payment_processor"
    );
}

export function isPaymentProcessorOnlyProductItem(item: ProductBucketInput) {
    const text = normalizeAsciiText(
        [
            item.billingChannel,
            ...(item.evidenceTypes ?? []),
            ...(item.evidenceSummary ?? []),
            ...(item.reasons ?? []),
        ]
            .filter(Boolean)
            .join(" ")
    );
    const processorIdentity =
        item.category === "payment_processor" ||
        isPaymentProcessorLikeIdentity(item.provider) ||
        isPaymentProcessorLikeIdentity(item.displayName);
    const processorChannel =
        isPaymentProcessorLikeIdentity(item.billingChannel) ||
        /\b(payment processor|operator platnosci|tpay|payu|przelewy24|stripe|paypal|google payments)\b/i.test(
            text
        );

    return Boolean(
        (processorIdentity || processorChannel) && !hasReliableMerchantIdentity(item)
    );
}

function hasStrongCurrentSubscriptionEvidence(item: ProductBucketInput) {
    const text = normalizeAsciiText(
        [
            item.billingChannel,
            ...(item.evidenceTypes ?? []),
            ...(item.evidenceSummary ?? []),
            ...(item.reasons ?? []),
        ]
            .filter(Boolean)
            .join(" ")
    );

    if (isPaymentProcessorOnlyProductItem(item)) return false;

    return /(active subscription|subscription active|membership active|payment confirmation|charged|paid|renewal|renews|will renew|next billing|next renewal|recurring payment|automatic payment|trial.*charged|trial.*paid|future charge|receipt|invoice|billing evidence|amount\/currency detected|billing cycle)/i.test(
        text
    );
}

export function isUtilityOrFormalBill(item: ProductBucketInput) {
    const category = item.category ?? "";
    const text = normalizeAsciiText(
        [
            item.displayName,
            item.provider,
            item.billingChannel,
            category,
            item.status,
            ...(item.evidenceTypes ?? []),
            ...(item.evidenceSummary ?? []),
            ...(item.reasons ?? []),
        ]
            .filter(Boolean)
            .join(" ")
    );
    const subscriptionLike = isSubscriptionLikeCategory(category);

    if (isMembershipLikeCategory(category)) return false;
    if (isBillLikeCategory(category)) return true;
    if (subscriptionLike) return false;

    if (
        item.status === "invoice_due" &&
        /(utility|utilities|energy|electricity|power|prad|gaz|telecom|mobile|internet|isp|insurance|government|tax|zus|krus|czynsz|rent|loan|credit|faktura za internet|rachunek za telefon|rachunek za internet|faktura za prad)/i.test(
            text
        )
    ) {
        return true;
    }

    return (
        !subscriptionLike &&
        item.source === "recurring_group" &&
        /(invoice|faktura|rachunek|payment due|recurring bill|kwota do zaplaty|termin platnosci)/i.test(
            text
        ) &&
        /(utility|utilities|energy|electricity|power|prad|gaz|telecom|mobile|internet|isp|insurance|government|tax|zus|krus|czynsz|rent)/i.test(
            text
        )
    );
}

function sentenceWithDetail(prefix: string, detail: string) {
    const trimmedDetail = detail.trim().replace(/[.!?]+$/g, "");
    return `${prefix}: ${trimmedDetail}.`;
}

function itemTimestamp(item: ProductBucketInput) {
    const parsed = Date.parse(item.lastEvidenceDate ?? "");
    return Number.isFinite(parsed) ? parsed : 0;
}

function itemName(item: ProductBucketInput) {
    return (item.displayName ?? item.provider ?? "").toLowerCase();
}

function sortByConfidenceDateName<T extends ProductBucketInput>(
    left: ProductResultItem<T>,
    right: ProductResultItem<T>
) {
    return (
        (right.confidence ?? 0) - (left.confidence ?? 0) ||
        itemTimestamp(right) - itemTimestamp(left) ||
        itemName(left).localeCompare(itemName(right))
    );
}

function sortByDateName<T extends ProductBucketInput>(
    left: ProductResultItem<T>,
    right: ProductResultItem<T>
) {
    return (
        itemTimestamp(right) - itemTimestamp(left) ||
        itemName(left).localeCompare(itemName(right))
    );
}

function hasImportableAmount(item: ProductBucketInput) {
    return Boolean(
        item.amount ||
            item.displayAmount ||
            item.dueAmount ||
            item.regularAmount ||
            item.latestAmount ||
            item.trialThenAmount ||
            item.futureAmount ||
            item.promoAmount
    );
}

function buildSelectionRecommendation(
    item: ProductBucketInput,
    bucket: ProductBucket,
    primaryAction: ProductPrimaryAction
) {
    const hasAmount = hasImportableAmount(item);

    if (isPaymentProcessorOnlyProductItem(item) || item.category === "payment_processor") {
        return {
            recommendedSelected: false,
            selectionReason:
                "Wykryto operatora płatności, ale usługa wymaga potwierdzenia.",
        };
    }

    if (bucket === "priceChanges") {
        return {
            recommendedSelected: false,
            selectionReason:
                "Wykryto możliwą zmianę ceny — sprawdź ręcznie.",
        };
    }

    if (bucket === "historicalSubscriptions") {
        return {
            recommendedSelected: false,
            selectionReason:
                "Znaleziono starszy sygnał — potwierdź, czy nadal aktywne.",
        };
    }

    if (bucket === "needsReviewSubscriptions") {
        return {
            recommendedSelected: false,
            selectionReason: "Wynik wymaga ręcznego potwierdzenia.",
        };
    }

    if (!hasAmount) {
        return {
            recommendedSelected: false,
            selectionReason: "Brakuje kwoty — uzupełnij przed zapisem.",
        };
    }

    if (
        bucket === "currentSubscriptions" &&
        (primaryAction === "show_as_active" ||
            primaryAction === "create_subscription") &&
        item.category !== "payment_processor"
    ) {
        return {
            recommendedSelected: true,
            selectionReason:
                "Wykryto aktywną subskrypcję z danymi płatności.",
        };
    }

    if (
        bucket === "billsOrUtilities" &&
        (primaryAction === "show_as_active" ||
            primaryAction === "review_old_bill")
    ) {
        return {
            recommendedSelected: true,
            selectionReason: item.dueAmount
                ? "Rachunek z kwotą do sprawdzenia."
                : "Wykryto rachunek cykliczny z kwotą.",
        };
    }

    return {
        recommendedSelected: false,
        selectionReason: "Wynik wymaga ręcznego potwierdzenia.",
    };
}

function hasManualReviewPriority<T extends ProductBucketInput>(
    productResult: ProductResult<T>
) {
    return (
        productResult.needsReviewSubscriptions.length +
            productResult.billsOrUtilities.length >
            productResult.currentSubscriptions.length ||
        productResult.needsReviewSubscriptions.some(isPaymentProcessorOnlyProductItem) ||
        (productResult.currentSubscriptions.length <= 1 &&
            productResult.needsReviewSubscriptions.length +
                productResult.billsOrUtilities.length >=
                2)
    );
}

export function classifyProductBucket(
    item: ProductBucketInput
): ProductBucketDecision {
    const isBillOrUtility = isUtilityOrFormalBill(item);
    const isSubscriptionLike = isSubscriptionLikeCategory(item.category);

    if (item.status === "price_change") {
        return {
            bucket: "priceChanges",
            primaryAction: "review_price_change",
            userFacingReason: "Price-change evidence was found for an existing customer or plan.",
        };
    }

    if (isBillOrUtility) {
        return {
            bucket: "billsOrUtilities",
            primaryAction: item.needsReview ? "review_old_bill" : "show_as_active",
            userFacingReason: item.needsReview
                ? "A recurring bill or invoice was found, but the latest evidence is old or needs confirmation."
                : "Recent recurring bill or invoice evidence was found.",
        };
    }

    if (isPaymentProcessorOnlyProductItem(item)) {
        return {
            bucket: "needsReviewSubscriptions",
            primaryAction: "confirm_manually",
            userFacingReason:
                "Detected payment through a payment processor, but the actual subscription service is unclear. Please confirm manually.",
        };
    }

    if (
        isSubscriptionLike &&
        ["active", "likely_active"].includes(item.status) &&
        item.recencyStatus !== "stale_needs_review" &&
        !item.needsReview &&
        hasStrongCurrentSubscriptionEvidence(item)
    ) {
        return {
            bucket: "currentSubscriptions",
            primaryAction: item.status === "likely_active" ? "confirm_still_active" : "show_as_active",
            userFacingReason:
                item.status === "likely_active"
                    ? "Subscription-like evidence was found, but it is slightly outside the recent active window."
                    : "Recent active subscription or membership evidence was found.",
        };
    }

    if (
        isSubscriptionLike &&
        ["active", "likely_active"].includes(item.status) &&
        item.recencyStatus !== "stale_needs_review" &&
        !item.needsReview
    ) {
        return {
            bucket: "needsReviewSubscriptions",
            primaryAction: "confirm_still_active",
            userFacingReason:
                "Subscription-like evidence was found, but current billing evidence is not strong enough to show as active.",
        };
    }

    if (
        isSubscriptionLike &&
        (item.needsReview ||
            item.recencyStatus === "stale_needs_review" ||
            item.status === "stale_needs_review" ||
            item.status === "likely_active" ||
            item.status === "trial")
    ) {
        return {
            bucket: "needsReviewSubscriptions",
            primaryAction: "confirm_still_active",
            userFacingReason: item.stalenessReason
                ? sentenceWithDetail(
                      "Historical subscription evidence found",
                      item.stalenessReason
                  )
                : "Subscription-like evidence was found, but it should be confirmed before showing as active.",
        };
    }

    if (
        ["active", "likely_active"].includes(item.status) &&
        item.recencyStatus !== "stale_needs_review" &&
        !item.needsReview &&
        hasStrongCurrentSubscriptionEvidence(item)
    ) {
        return {
            bucket: "currentSubscriptions",
            primaryAction: "show_as_active",
            userFacingReason: "Recent or likely-current subscription evidence was found.",
        };
    }

    if (
        ["active", "likely_active"].includes(item.status) &&
        item.recencyStatus !== "stale_needs_review" &&
        !item.needsReview
    ) {
        return {
            bucket: "needsReviewSubscriptions",
            primaryAction: "confirm_still_active",
            userFacingReason:
                "Possible subscription evidence was found, but current billing evidence should be confirmed manually.",
        };
    }

    if (
        item.needsReview ||
        item.recencyStatus === "stale_needs_review" ||
        item.status === "stale_needs_review" ||
        item.status === "likely_active"
    ) {
        return {
            bucket: "needsReviewSubscriptions",
            primaryAction: "confirm_still_active",
            userFacingReason: item.stalenessReason
                ? sentenceWithDetail(
                      "Historical subscription evidence found",
                      item.stalenessReason
                  )
                : "Subscription-like evidence was found, but it should be confirmed before showing as active.",
        };
    }

    return {
        bucket: "historicalSubscriptions",
        primaryAction: "ignore_or_archive",
        userFacingReason: "Only historical subscription evidence was found.",
    };
}

export function buildProductResult<T extends ProductBucketInput>(
    items: T[]
): ProductResult<T> {
    const productResult: ProductResult<T> = {
        currentSubscriptions: [],
        needsReviewSubscriptions: [],
        historicalSubscriptions: [],
        priceChanges: [],
        billsOrUtilities: [],
        scanSummary: {
            currentSubscriptions: 0,
            needsReviewSubscriptions: 0,
            historicalSubscriptions: 0,
            priceChanges: 0,
            billsOrUtilities: 0,
            totalCanonicalSubscriptions: items.length,
            recommendedDefaultMode: "review",
            recommendedUserMessage: "Review detected subscriptions and bills before showing them as active.",
            hasCurrentSubscriptions: false,
            hasOnlyHistoricalEvidence: false,
            hasPriceChanges: false,
            hasBillsOrUtilities: false,
        },
    };

    for (const item of items) {
        const productDecision = classifyProductBucket(item);
        const selectionRecommendation = buildSelectionRecommendation(
            item,
            productDecision.bucket,
            productDecision.primaryAction
        );
        const productItem: ProductResultItem<T> = {
            ...item,
            productBucket: productDecision.bucket,
            primaryAction: productDecision.primaryAction,
            userFacingReason: productDecision.userFacingReason,
            productBucketLabel: getProductBucketLabel(productDecision.bucket),
            categoryLabel: getCategoryLabel(item.category),
            primaryActionLabel: getPrimaryActionLabel(productDecision.primaryAction),
            amountKindLabel: getAmountKindLabel(item.amountKind),
            recommendedSelected: selectionRecommendation.recommendedSelected,
            selectionReason: selectionRecommendation.selectionReason,
        };

        productResult[productDecision.bucket].push(productItem);
    }

    productResult.currentSubscriptions.sort(sortByConfidenceDateName);
    productResult.needsReviewSubscriptions.sort(sortByConfidenceDateName);
    productResult.historicalSubscriptions.sort(sortByDateName);
    productResult.priceChanges.sort(sortByDateName);
    productResult.billsOrUtilities.sort(sortByDateName);

    productResult.scanSummary.currentSubscriptions =
        productResult.currentSubscriptions.length;
    productResult.scanSummary.needsReviewSubscriptions =
        productResult.needsReviewSubscriptions.length;
    productResult.scanSummary.historicalSubscriptions =
        productResult.historicalSubscriptions.length;
    productResult.scanSummary.priceChanges = productResult.priceChanges.length;
    productResult.scanSummary.billsOrUtilities =
        productResult.billsOrUtilities.length;
    productResult.scanSummary.hasCurrentSubscriptions =
        productResult.currentSubscriptions.length > 0;
    productResult.scanSummary.hasPriceChanges =
        productResult.priceChanges.length > 0;
    productResult.scanSummary.hasBillsOrUtilities =
        productResult.billsOrUtilities.length > 0;
    productResult.scanSummary.hasOnlyHistoricalEvidence =
        productResult.currentSubscriptions.length === 0 &&
        (productResult.needsReviewSubscriptions.length > 0 ||
            productResult.historicalSubscriptions.length > 0 ||
            productResult.billsOrUtilities.some((subscription) => subscription.needsReview));

    if (
        productResult.currentSubscriptions.length > 0 &&
        !hasManualReviewPriority(productResult)
    ) {
        productResult.scanSummary.recommendedDefaultMode = "current";
        productResult.scanSummary.recommendedUserMessage =
            "We found recent active subscriptions. Review any older or bill-like items separately.";
    } else if (productResult.currentSubscriptions.length > 0) {
        productResult.scanSummary.recommendedDefaultMode = "review";
        productResult.scanSummary.recommendedUserMessage =
            "We found possible subscriptions and recurring bills. Please review the results before importing.";
    } else if (
        productResult.needsReviewSubscriptions.length > 0 &&
        productResult.priceChanges.length > 0
    ) {
        productResult.scanSummary.recommendedDefaultMode = "review";
        productResult.scanSummary.recommendedUserMessage =
            "We found historical subscription evidence and one price-change notice, but no recent active subscription payments. Please confirm which historical subscriptions are still active.";
    } else if (productResult.needsReviewSubscriptions.length > 0) {
        productResult.scanSummary.recommendedDefaultMode = "review";
        productResult.scanSummary.recommendedUserMessage =
            "We found historical subscription evidence, but no recent active subscription payments. Please confirm which subscriptions are still active.";
    } else if (productResult.priceChanges.length > 0) {
        productResult.scanSummary.recommendedDefaultMode = "price_changes";
        productResult.scanSummary.recommendedUserMessage =
            "We found price-change notices, but no recent active subscription payments in this scan window.";
    } else if (productResult.billsOrUtilities.length > 0) {
        productResult.scanSummary.recommendedDefaultMode = "bills";
        productResult.scanSummary.recommendedUserMessage =
            "We found bill or utility evidence. Review stale bills before treating them as current.";
    } else {
        productResult.scanSummary.recommendedDefaultMode = "empty";
        productResult.scanSummary.recommendedUserMessage =
            "No current subscription evidence was found in this scan window.";
    }

    return productResult;
}
