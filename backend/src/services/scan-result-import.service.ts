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
};

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
    duplicateSubscriptionId?: string;
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
        amount: z.string().trim().min(1).optional(),
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
        (item) => Boolean(item.id || item.displayName || item.provider || item.name),
        {
            message: "scan item must include id, displayName, provider, or name",
        }
    )
    .refine((item) => Boolean(item.productBucket || item.primaryAction || item.status), {
        message: "scan item must include productBucket, primaryAction, or status",
    });

const importPreviewSchema = z.object({
    items: z.array(scanImportItemSchema).min(1).max(50),
});

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

export function validateScanImportSelection(payload: unknown) {
    return importPreviewSchema.parse(payload);
}

function parseAmount(value: string | undefined) {
    if (!value) return undefined;
    const match = value.replace(/\s/g, "").match(/\d+(?:[,.]\d{1,2})?/);
    if (!match) return undefined;
    const parsed = Number(match[0].replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCurrency(value: string | undefined) {
    if (!value) return undefined;
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

    return {
        sourceItemId: item.id,
        recommendedAction,
        draft,
        warnings,
    };
}

export function buildImportPreview(payload: unknown) {
    const parsed = validateScanImportSelection(payload);

    return {
        drafts: parsed.items.map((item) =>
            mapScanItemToSubscriptionDraft(item as ScanImportItem)
        ),
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

function sanitizeDraftNotes(notes: string | null | undefined) {
    if (!notes) return null;

    const safeLines = notes
        .split(/\r?\n/)
        .filter(
            (line) =>
                !/\b(raw|body|snippet|debug|credential|password|token|secret)\b/i.test(
                    line
                )
        );

    return safeLines.join("\n").slice(0, 1000) || null;
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
        currency: draft.currency ?? "PLN",
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
            skipped.push({
                sourceItemId: item.sourceItemId,
                reason: "unsupported_action",
            });
            continue;
        }

        if (item.recommendedAction === "review_price_change") {
            warnings.add("Price-change items require manual review before saving.");
            skipped.push({
                sourceItemId: item.sourceItemId,
                reason: "unsupported_action",
            });
            continue;
        }

        if (!["create_subscription", "review_bill"].includes(item.recommendedAction)) {
            skipped.push({
                sourceItemId: item.sourceItemId,
                reason: "unsupported_action",
            });
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
            skipped.push({
                sourceItemId: item.sourceItemId,
                reason: "missing_required_field",
                missingFields,
            });
            continue;
        }

        const duplicate = await dependencies.findPotentialDuplicate(userId, input);

        if (duplicate) {
            skipped.push({
                sourceItemId: item.sourceItemId,
                reason: "duplicate",
                duplicateSubscriptionId: duplicate.id,
            });
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
