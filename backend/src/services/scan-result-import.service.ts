import { z } from "zod";
import { CreateSubscriptionInput } from "../validators/subscription";
import {
    createSubscription,
    findPotentialDuplicateSubscription,
} from "./subscription.service";
import {
    ProductBucketInput,
    isPaymentProcessorOnlyProductItem,
} from "./subscription-product-buckets.service";

export type ImportRecommendation =
    | "create_subscription"
    | "review_price_change"
    | "review_bill"
    | "skip";

export type SubscriptionDraft = {
    name: string;
    provider?: string | null;
    planName?: string | null;
    amount?: number;
    currency?: string;
    category: string;
    billingCycle: string;
    nextPaymentDate?: string;
    lastPaymentDate?: string | null;
    trialEndDate?: string | null;
    isTrial?: boolean;
    isRecurringBill?: boolean;
    paymentMethodLabel?: string | null;
    notes?: string | null;
    status?: string;
};

export type ScanImportPreviewDraft = {
    sourceItemId?: string;
    recommendedAction: ImportRecommendation;
    draft?: SubscriptionDraft;
    warnings: string[];
    previewTitle?: string;
    previewSubtitle?: string;
    previewWarnings: string[];
    canConfirm: boolean;
    missingFields: string[];
};

export type ImportPreviewServiceErrorCode =
    | "IMPORT_PREVIEW_TOO_MANY_ITEMS"
    | "IMPORT_PREVIEW_TIMEOUT";

export class ImportPreviewServiceError extends Error {
    constructor(
        public code: ImportPreviewServiceErrorCode,
        message: string
    ) {
        super(message);
        this.name = "ImportPreviewServiceError";
    }
}

export class ImportPreviewValidationError extends Error {
    constructor(
        message: string,
        public details: {
            receivedKeys: string[];
            expectedShape: string;
            sourceShape?: string;
            warnings?: string[];
        }
    ) {
        super(message);
        this.name = "ImportPreviewValidationError";
    }
}

export type ScanImportConfirmCreatedItem = {
    sourceItemId?: string;
    subscriptionId: string;
    name: string;
    provider?: string | null;
    isRecurringBill: boolean;
};

export type ScanImportConfirmSkippedItem = {
    sourceItemId?: string;
    reason: "duplicate" | "unsupported_action" | "missing_required_field";
    message: string;
    userMessage: string;
    duplicateSubscriptionId?: string;
    existingSubscriptionId?: string;
    missingFields?: string[];
};

export type ScanImportConfirmResult = {
    created: ScanImportConfirmCreatedItem[];
    skipped: ScanImportConfirmSkippedItem[];
    warnings: string[];
    summary: {
        requested: number;
        created: number;
        skipped: number;
    };
};

type ImportConfirmDependencies = {
    findPotentialDuplicate: (
        userId: string,
        data: CreateSubscriptionInput
    ) => Promise<{ id: string } | null>;
    createSubscription: (
        userId: string,
        data: CreateSubscriptionInput
    ) => Promise<{
        id: string;
        name: string;
        provider: string | null;
        isRecurringBill: boolean;
    }>;
};

const scanImportItemSchema = z
    .object({
        id: z.string().trim().min(1).optional(),
        sourceItemId: z.string().trim().min(1).optional(),
        itemSelectionKey: z.string().trim().min(1).optional(),
        displayName: z.string().trim().min(1).optional(),
        provider: z.string().trim().min(1).optional(),
        name: z.string().trim().min(1).optional(),
        billingChannel: z.string().trim().min(1).optional(),
        category: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
        confidence: z.number().optional(),
        confidenceLevel: z.string().trim().min(1).optional(),
        productBucket: z.string().trim().min(1).optional(),
        primaryAction: z.string().trim().min(1).optional(),
        userFacingReason: z.string().trim().min(1).optional(),
        amount: z.union([z.string().trim().min(1), z.number().positive()]).optional(),
        displayAmount: z.string().trim().min(1).optional(),
        amountKind: z.string().trim().min(1).optional(),
        billingCycle: z.string().trim().min(1).optional(),
        currentAmount: z.string().trim().min(1).optional(),
        regularAmount: z.string().trim().min(1).optional(),
        futureAmount: z.string().trim().min(1).optional(),
        promoAmount: z.string().trim().min(1).optional(),
        trialThenAmount: z.string().trim().min(1).optional(),
        dueAmount: z.string().trim().min(1).optional(),
        latestAmount: z.string().trim().min(1).optional(),
        amounts: z.array(z.string()).optional(),
        allAmounts: z.array(z.string()).optional(),
        nextRenewalDateText: z.string().trim().min(1).optional(),
        dueDateText: z.string().trim().min(1).optional(),
        trialEndDateText: z.string().trim().min(1).optional(),
        firstSeen: z.string().trim().min(1).optional(),
        lastSeen: z.string().trim().min(1).optional(),
        lastEvidenceDate: z.string().trim().min(1).optional(),
        evidenceAgeDays: z.number().optional(),
        sourceMessagesCount: z.number().optional(),
        selectedAmountSourceDate: z.string().trim().min(1).optional(),
        selectedAmountSourceSubject: z.string().trim().min(1).optional(),
    })
        .passthrough()
    .refine(
        (item) =>
            Boolean(item.displayName || item.provider || item.name),
        {
            message: "scan item must include displayName, provider, or name",
        }
    )
    .refine((item) => Boolean(item.productBucket || item.primaryAction || item.status), {
        message: "scan item must include productBucket, primaryAction, or status",
    });

const IMPORT_PREVIEW_MAX_ITEMS = 50;

const importPreviewSchema = z.object({
    items: z.array(z.unknown()),
});

const IMPORT_PREVIEW_ARRAY_KEYS = [
    "items",
    "selectedItems",
    "selected",
    "draftsCandidates",
] as const;

const IMPORT_PREVIEW_WRAPPER_KEYS = [
    "item",
    "productItem",
    "sourceItem",
    "originalItem",
    "product",
    "data",
] as const;

const UI_ONLY_IMPORT_KEYS = new Set([
    "selected",
    "localDecision",
    "checked",
    "reviewedAt",
    "uiState",
]);

const subscriptionDraftSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        provider: z.union([z.string().trim().min(1), z.null()]).optional(),
        planName: z.union([z.string().trim().min(1), z.null()]).optional(),
        amount: z.coerce.number().positive().optional(),
        currency: z.string().trim().min(3).max(5).optional(),
        category: z.string().trim().min(1).optional(),
        billingCycle: z.string().trim().min(1).optional(),
        nextPaymentDate: z.string().trim().min(1).optional(),
        lastPaymentDate: z.union([z.string().trim().min(1), z.null()]).optional(),
        trialEndDate: z.union([z.string().trim().min(1), z.null()]).optional(),
        isTrial: z.coerce.boolean().optional(),
        isRecurringBill: z.coerce.boolean().optional(),
        paymentMethodLabel: z.union([z.string().trim().min(1), z.null()]).optional(),
        status: z.string().trim().min(1).optional(),
        notes: z.union([z.string().trim().max(1000), z.null()]).optional(),
    })
    .strip();

const importConfirmDraftSchema = z
    .object({
        sourceItemId: z.string().trim().min(1).optional(),
        recommendedAction: z.enum([
            "create_subscription",
            "review_price_change",
            "review_bill",
            "skip",
        ]),
        draft: subscriptionDraftSchema.optional(),
        warnings: z.array(z.string().trim().min(1).max(300)).optional().default([]),
    })
    .strip();

const importConfirmSchema = z.object({
    drafts: z.array(importConfirmDraftSchema).min(1).max(50),
});

type ScanImportItem = z.infer<typeof scanImportItemSchema> & ProductBucketInput;

type ImportPreviewNormalization = {
    items: unknown[];
    sourceShape: string;
    rawItemCount: number;
    normalizedItemCount: number;
    skippedItemCount: number;
    acceptedWrapperKeys: string[];
    warnings: string[];
    receivedKeys: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function objectKeys(value: unknown) {
    return isRecord(value) ? Object.keys(value).sort() : [];
}

function findInputArray(payload: unknown): {
    items: unknown[];
    sourceShape: string;
    receivedKeys: string[];
} {
    if (Array.isArray(payload)) {
        return {
            items: payload,
            sourceShape: "array_body",
            receivedKeys: [],
        };
    }

    if (!isRecord(payload)) {
        return {
            items: [],
            sourceShape: "invalid_body",
            receivedKeys: [],
        };
    }

    for (const key of IMPORT_PREVIEW_ARRAY_KEYS) {
        if (Array.isArray(payload[key])) {
            return {
                items: payload[key] as unknown[],
                sourceShape: key,
                receivedKeys: objectKeys(payload),
            };
        }
    }

    return {
        items: [],
        sourceShape: "missing_items_array",
        receivedKeys: objectKeys(payload),
    };
}

function stripUiOnlyFields(value: Record<string, unknown>) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
        if (!UI_ONLY_IMPORT_KEYS.has(key)) {
            sanitized[key] = fieldValue;
        }
    }

    return sanitized;
}

function unwrapImportPreviewItem(value: unknown): {
    item?: unknown;
    wrapperKey?: string;
} {
    if (!isRecord(value)) {
        return {};
    }

    for (const key of IMPORT_PREVIEW_WRAPPER_KEYS) {
        if (isRecord(value[key])) {
            return {
                item: stripUiOnlyFields(value[key] as Record<string, unknown>),
                wrapperKey: key,
            };
        }
    }

    return {
        item: stripUiOnlyFields(value),
        wrapperKey: "direct",
    };
}

export function normalizeImportPreviewItems(
    payload: unknown
): ImportPreviewNormalization {
    const input = findInputArray(payload);
    const warnings: string[] = [];
    const items: unknown[] = [];
    let skippedItemCount = 0;
    const wrapperShapes = new Set<string>();

    for (const rawItem of input.items) {
        const unwrapped = unwrapImportPreviewItem(rawItem);

        if (!unwrapped.item) {
            skippedItemCount += 1;
            continue;
        }

        if (unwrapped.wrapperKey) {
            wrapperShapes.add(unwrapped.wrapperKey);
        }

        items.push(unwrapped.item);
    }

    if (skippedItemCount > 0) {
        warnings.push(
            "Some selected items were skipped because they were not valid import candidates."
        );
    }

    return {
        items,
        sourceShape:
            wrapperShapes.size > 0
                ? `${input.sourceShape}:${Array.from(wrapperShapes).sort().join("|")}`
                : input.sourceShape,
        rawItemCount: input.items.length,
        normalizedItemCount: items.length,
        skippedItemCount,
        acceptedWrapperKeys: Array.from(wrapperShapes).sort(),
        warnings,
        receivedKeys: input.receivedKeys,
    };
}

export function validateScanImportSelection(payload: unknown) {
    const normalized = normalizeImportPreviewItems(payload);

    return {
        ...importPreviewSchema.parse({ items: normalized.items }),
        normalization: normalized,
    };
}

function parseAmount(value: string | number | undefined) {
    if (!value) return undefined;
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? value : undefined;
    }
    const match = value.replace(/\s/g, "").match(/\d+(?:[,.]\d{1,2})?/);
    if (!match) return undefined;
    const parsed = Number(match[0].replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCurrency(value: string | number | undefined) {
    if (!value) return undefined;
    if (typeof value === "number") return undefined;
    const upper = value.toUpperCase();

    if (upper.includes("PLN") || /\bz[łl]\b/i.test(value)) return "PLN";
    if (upper.includes("USD") || value.includes("$")) return "USD";
    if (upper.includes("EUR") || value.includes("€")) return "EUR";
    if (upper.includes("GBP") || value.includes("£")) return "GBP";

    return undefined;
}

function parseDateText(value: string | undefined) {
    if (!value) return undefined;
    const trimmed = value.trim();
    const european = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

    if (european) {
        const day = european[1].padStart(2, "0");
        const month = european[2].padStart(2, "0");
        const year =
            european[3].length === 2 ? `20${european[3]}` : european[3];
        const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function addCycle(date: Date, billingCycle: string) {
    const next = new Date(date);

    switch (billingCycle) {
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
        default:
            next.setMonth(next.getMonth() + 1);
    }

    return next.toISOString();
}

function normalizeBillingCycle(value: string | undefined) {
    switch ((value ?? "").toLowerCase()) {
        case "weekly":
            return "weekly";
        case "yearly":
        case "annual":
        case "annually":
            return "yearly";
        case "one_time":
            return "one_time";
        case "monthly":
            return "monthly";
        default:
            return "custom";
    }
}

function mapCategory(value: string | undefined) {
    if (!value) return "other";

    if (
        /streaming|music|entertainment|gaming|ecommerce_membership|delivery_membership/.test(
            value
        )
    ) {
        return "entertainment";
    }

    if (/utilities|telecom|internet_isp|other_bill|government|rent/.test(value)) {
        return "utilities";
    }

    if (/health|fitness/.test(value)) return "health";
    if (/education/.test(value)) return "education";
    if (/productivity|software|saas|cloud|ai_tools|developer|design/.test(value)) {
        return "productivity";
    }
    if (/finance|insurance|loan|credit/.test(value)) return "finance";
    if (/transport|travel/.test(value)) return "transport";
    if (/shopping/.test(value)) return "shopping";

    return "other";
}

function chooseAmountText(item: ScanImportItem) {
    if (item.productBucket === "billsOrUtilities") {
        return item.dueAmount ?? item.displayAmount ?? item.latestAmount ?? item.amount;
    }

    return (
        item.regularAmount ??
        item.displayAmount ??
        item.trialThenAmount ??
        item.futureAmount ??
        item.latestAmount ??
        item.amount
    );
}

function chooseNextPaymentDate(item: ScanImportItem, billingCycle: string) {
    return (
        parseDateText(item.nextRenewalDateText) ??
        parseDateText(item.dueDateText) ??
        parseDateText(item.selectedAmountSourceDate) ??
        parseDateText(item.lastEvidenceDate) ??
        (item.lastSeen ? addCycle(new Date(item.lastSeen), billingCycle) : undefined)
    );
}

function buildNotes(
    item: ScanImportItem,
    warnings: string[],
    recommendedAction: ImportRecommendation
) {
    const lines = [
        "Imported from IMAP scan preview.",
        item.productBucket ? `Bucket: ${item.productBucket}` : undefined,
        item.primaryAction ? `Product action: ${item.primaryAction}` : undefined,
        `Import recommendation: ${recommendedAction}`,
        item.billingChannel ? `Billing channel: ${item.billingChannel}` : undefined,
        item.amountKind ? `Amount kind: ${item.amountKind}` : undefined,
        item.promoAmount ? `Promo amount: ${item.promoAmount}` : undefined,
        item.regularAmount ? `Regular amount: ${item.regularAmount}` : undefined,
        item.futureAmount ? `Future amount: ${item.futureAmount}` : undefined,
        item.trialThenAmount ? `Trial then amount: ${item.trialThenAmount}` : undefined,
        item.currentAmount ? `Current amount: ${item.currentAmount}` : undefined,
        item.dueAmount ? `Due amount: ${item.dueAmount}` : undefined,
        item.firstSeen ? `First seen: ${item.firstSeen}` : undefined,
        item.lastSeen ? `Last seen: ${item.lastSeen}` : undefined,
        item.lastEvidenceDate ? `Last evidence: ${item.lastEvidenceDate}` : undefined,
        item.sourceMessagesCount
            ? `Source messages: ${item.sourceMessagesCount}`
            : undefined,
        item.selectedAmountSourceSubject
            ? `Amount source subject: ${item.selectedAmountSourceSubject}`
            : undefined,
        warnings.length > 0 ? `Warnings: ${warnings.join("; ")}` : undefined,
    ].filter((line): line is string => Boolean(line));

    return lines.join("\n").slice(0, 1000);
}

export function mapProductBucketToImportRecommendation(
    bucket: string | undefined,
    item: ScanImportItem
): ImportRecommendation {
    if (bucket === "priceChanges" || item.primaryAction === "review_price_change") {
        return "review_price_change";
    }

    if (bucket === "billsOrUtilities" || item.primaryAction === "review_old_bill") {
        return "review_bill";
    }

    if (bucket === "historicalSubscriptions") return "skip";

    if (
        bucket === "currentSubscriptions" ||
        bucket === "needsReviewSubscriptions" ||
        item.primaryAction === "confirm_still_active" ||
        item.primaryAction === "confirm_manually" ||
        item.primaryAction === "show_as_active"
    ) {
        return "create_subscription";
    }

    return "skip";
}

export function mapScanItemToSubscriptionDraft(
    item: ScanImportItem
): ScanImportPreviewDraft {
    const warnings: string[] = [];
    const recommendedAction = mapProductBucketToImportRecommendation(
        item.productBucket,
        item
    );

    if (recommendedAction === "review_price_change") {
        warnings.push("Price-change notices should update an existing record after user review.");
    }

    if (recommendedAction === "skip") {
        warnings.push("Historical or unsupported scan item should not be imported automatically.");
    }

    const amountText = chooseAmountText(item);
    const amount = parseAmount(amountText);
    const currency =
        parseCurrency(amountText) ??
        parseCurrency(item.displayAmount) ??
        parseCurrency(item.dueAmount) ??
        "PLN";
    const billingCycle = normalizeBillingCycle(item.billingCycle);
    const nextPaymentDate = chooseNextPaymentDate(item, billingCycle);

    if (!amount) {
        warnings.push("Amount is missing or could not be parsed. Confirm amount before saving.");
    }
    if (!nextPaymentDate) warnings.push("Next payment date is missing or estimated.");
    if (item.productBucket === "needsReviewSubscriptions") {
        warnings.push("User should confirm this historical subscription is still active.");
    }
    if (isPaymentProcessorOnlyProductItem(item)) {
        warnings.push("Payment processor detected; service name requires confirmation.");
    }
    if (recommendedAction === "review_bill") {
        warnings.push("Bill-like item should be reviewed before creating a recurring bill.");
    }

    const draft: SubscriptionDraft | undefined =
        recommendedAction === "skip" || recommendedAction === "review_price_change"
            ? undefined
            : {
                  name: item.displayName ?? item.name ?? item.provider ?? "Imported item",
                  provider: item.provider ?? null,
                  planName:
                      item.name && item.name !== item.provider ? item.name : null,
                  amount,
                  currency,
                  category: mapCategory(item.category),
                  billingCycle,
                  nextPaymentDate,
                  lastPaymentDate: parseDateText(item.lastEvidenceDate) ?? null,
                  trialEndDate: parseDateText(item.trialEndDateText) ?? null,
                  isTrial: item.status === "trial",
                  isRecurringBill: recommendedAction === "review_bill",
                  paymentMethodLabel: item.billingChannel ?? null,
                  status: "pending",
                  notes: buildNotes(item, warnings, recommendedAction),
              };
    const missingFields: string[] = [];

    if (
        ["create_subscription", "review_bill"].includes(recommendedAction) &&
        !amount
    ) {
        missingFields.push("amount");
    }

    if (
        ["create_subscription", "review_bill"].includes(recommendedAction) &&
        !nextPaymentDate
    ) {
        missingFields.push("nextPaymentDate");
    }

    const canConfirm = Boolean(
        draft &&
            ["create_subscription", "review_bill"].includes(recommendedAction) &&
            missingFields.length === 0
    );

    return {
        sourceItemId: item.sourceItemId ?? item.id ?? item.itemSelectionKey,
        recommendedAction,
        draft,
        warnings,
        previewTitle: item.displayName ?? item.name ?? item.provider ?? "Scan item",
        previewSubtitle:
            recommendedAction === "review_bill"
                ? "Recurring bill"
                : recommendedAction === "review_price_change"
                ? "Price change"
                : recommendedAction === "create_subscription"
                ? "Subscription draft"
                : "Skipped",
        previewWarnings: warnings,
        canConfirm,
        missingFields,
    };
}

export function buildImportPreview(payload: unknown) {
    const parsed = validateScanImportSelection(payload);

    if (parsed.items.length > IMPORT_PREVIEW_MAX_ITEMS) {
        throw new ImportPreviewServiceError(
            "IMPORT_PREVIEW_TOO_MANY_ITEMS",
            "Too many import preview items."
        );
    }

    const warnings = [...parsed.normalization.warnings];
    const drafts: ScanImportPreviewDraft[] = [];
    let invalidSchemaItems = 0;

    for (const item of parsed.items) {
        const itemResult = scanImportItemSchema.safeParse(item);

        if (!itemResult.success) {
            invalidSchemaItems += 1;
            continue;
        }

        drafts.push(mapScanItemToSubscriptionDraft(itemResult.data as ScanImportItem));
    }

    if (invalidSchemaItems > 0) {
        warnings.push(
            "Some selected items were skipped because they were not valid import candidates."
        );
    }

    if (drafts.length === 0) {
        throw new ImportPreviewValidationError(
            "No valid import candidates found.",
            {
                receivedKeys: parsed.normalization.receivedKeys,
                expectedShape: "{ items: [productResultItem] }",
                sourceShape: parsed.normalization.sourceShape,
                warnings,
            }
        );
    }

    return {
        drafts,
        warnings,
        sourceShape: parsed.normalization.sourceShape,
        previewDebug: {
            rawItemCount: parsed.normalization.rawItemCount,
            normalizedItemCount: parsed.normalization.normalizedItemCount,
            skippedItemCount:
                parsed.normalization.skippedItemCount + invalidSchemaItems,
            receivedKeys: parsed.normalization.receivedKeys,
            acceptedWrapperKeys: parsed.normalization.acceptedWrapperKeys,
        },
    };
}

function normalizeConfirmCategory(value: string | undefined) {
    return mapCategory(value);
}

function normalizeConfirmBillingCycle(value: string | undefined) {
    return normalizeBillingCycle(value);
}

function normalizeConfirmStatus(value: string | undefined) {
    if (["pending", "paid", "overdue", "canceled"].includes(value ?? "")) {
        return value as CreateSubscriptionInput["status"];
    }

    return "pending";
}

function normalizeConfirmCurrency(value: string | undefined) {
    const normalized = (value ?? "PLN").trim().toUpperCase();

    return /^[A-Z]{3,5}$/.test(normalized) ? normalized : "PLN";
}

function sanitizeDraftNotes(notes: string | null | undefined) {
    if (!notes) return null;

    const safeLines = notes
        .split(/\r?\n/)
        .filter(
            (line) =>
                !/\b(raw|body|snippet|debug|credential|password|token|secret|oauth|authorization)\b/i.test(
                    line
                ) &&
                !/\b(access|refresh)\s+token\b/i.test(line)
        );

    return safeLines.join("\n").slice(0, 1000) || null;
}

function buildSkippedImportItem(args: {
    sourceItemId?: string;
    reason: ScanImportConfirmSkippedItem["reason"];
    missingFields?: string[];
    duplicateSubscriptionId?: string;
}): ScanImportConfirmSkippedItem {
    const hasMissingAmount = args.missingFields?.includes("draft.amount");
    const userMessage =
        args.reason === "duplicate"
            ? "Ta pozycja wygląda na już dodaną."
            : args.reason === "missing_required_field" && hasMissingAmount
            ? "Uzupełnij kwotę przed zapisaniem tej pozycji."
            : args.reason === "missing_required_field"
            ? "Uzupełnij brakujące dane przed zapisaniem tej pozycji."
            : "Ten typ wyniku wymaga ręcznego sprawdzenia.";
    const message =
        args.reason === "duplicate"
            ? "Duplicate subscription skipped."
            : args.reason === "missing_required_field"
            ? "Required subscription fields are missing."
            : "Unsupported import action skipped.";

    return {
        sourceItemId: args.sourceItemId,
        reason: args.reason,
        message,
        userMessage,
        ...(args.missingFields ? { missingFields: args.missingFields } : {}),
        ...(args.duplicateSubscriptionId
            ? {
                  duplicateSubscriptionId: args.duplicateSubscriptionId,
                  existingSubscriptionId: args.duplicateSubscriptionId,
              }
            : {}),
    };
}

function toCreateSubscriptionInput(
    draft: Partial<SubscriptionDraft> | undefined,
    action: ImportRecommendation
): { input?: CreateSubscriptionInput; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!draft?.name) missingFields.push("draft.name");
    if (!draft?.amount) missingFields.push("draft.amount");
    if (!draft?.nextPaymentDate || Number.isNaN(Date.parse(draft.nextPaymentDate))) {
        missingFields.push("draft.nextPaymentDate");
    }

    if (missingFields.length > 0 || !draft?.name || !draft.amount || !draft.nextPaymentDate) {
        return { missingFields };
    }

    const input: CreateSubscriptionInput = {
        name: draft.name,
        provider: draft.provider ?? null,
        planName: draft.planName ?? null,
        amount: draft.amount,
        currency: normalizeConfirmCurrency(draft.currency),
        category: normalizeConfirmCategory(draft.category),
        billingCycle: normalizeConfirmBillingCycle(draft.billingCycle),
        nextPaymentDate: new Date(draft.nextPaymentDate).toISOString(),
        lastPaymentDate:
            draft.lastPaymentDate && !Number.isNaN(Date.parse(draft.lastPaymentDate))
                ? new Date(draft.lastPaymentDate).toISOString()
                : null,
        trialEndDate:
            draft.trialEndDate && !Number.isNaN(Date.parse(draft.trialEndDate))
                ? new Date(draft.trialEndDate).toISOString()
                : null,
        isTrial: draft.isTrial ?? false,
        isRecurringBill:
            action === "review_bill" ? true : draft.isRecurringBill ?? false,
        paymentMethodLabel: draft.paymentMethodLabel ?? null,
        status: normalizeConfirmStatus(draft.status),
        notes: sanitizeDraftNotes(draft.notes),
    };

    return { input, missingFields };
}

export async function confirmScanImportDrafts(
    userId: string,
    payload: unknown,
    dependencies: ImportConfirmDependencies = {
        findPotentialDuplicate: findPotentialDuplicateSubscription,
        createSubscription,
    }
): Promise<ScanImportConfirmResult> {
    const parsed = importConfirmSchema.parse(payload);
    const created: ScanImportConfirmCreatedItem[] = [];
    const skipped: ScanImportConfirmSkippedItem[] = [];
    const warnings = new Set<string>();

    for (const item of parsed.drafts) {
        if (item.recommendedAction === "skip") {
            skipped.push(buildSkippedImportItem({
                sourceItemId: item.sourceItemId,
                reason: "unsupported_action",
            }));
            continue;
        }

        if (item.recommendedAction === "review_price_change") {
            warnings.add("Price-change items require manual review before saving.");
            skipped.push(buildSkippedImportItem({
                sourceItemId: item.sourceItemId,
                reason: "unsupported_action",
            }));
            continue;
        }

        if (!["create_subscription", "review_bill"].includes(item.recommendedAction)) {
            skipped.push(buildSkippedImportItem({
                sourceItemId: item.sourceItemId,
                reason: "unsupported_action",
            }));
            continue;
        }

        if (item.recommendedAction === "review_bill") {
            warnings.add("Some bill-like items were saved as recurring bills after review.");
        }

        const { input, missingFields } = toCreateSubscriptionInput(
            item.draft,
            item.recommendedAction
        );

        if (!input) {
            skipped.push(buildSkippedImportItem({
                sourceItemId: item.sourceItemId,
                reason: "missing_required_field",
                missingFields,
            }));
            continue;
        }

        const duplicate = await dependencies.findPotentialDuplicate(userId, input);

        if (duplicate) {
            skipped.push(buildSkippedImportItem({
                sourceItemId: item.sourceItemId,
                reason: "duplicate",
                duplicateSubscriptionId: duplicate.id,
            }));
            continue;
        }

        const subscription = await dependencies.createSubscription(userId, input);

        created.push({
            sourceItemId: item.sourceItemId,
            subscriptionId: subscription.id,
            name: subscription.name,
            provider: subscription.provider,
            isRecurringBill: subscription.isRecurringBill,
        });
    }

    return {
        created,
        skipped,
        warnings: Array.from(warnings),
        summary: {
            requested: parsed.drafts.length,
            created: created.length,
            skipped: skipped.length,
        },
    };
}
