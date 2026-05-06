import {
    BillingCycle,
    DetectedSubscriptionStatus,
    EmailProvider,
    Prisma,
    SubscriptionCategory,
    SubscriptionEventType,
    SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AcceptDetectedSubscriptionInput } from "../validators/email-scan";
import { CreateSubscriptionInput } from "../validators/subscription";
import { findPotentialDuplicateSubscription } from "./subscription.service";

export type DetectionListParams = {
    status?: DetectedSubscriptionStatus;
    limit: number;
    offset: number;
};

export type DisconnectEmailConnectionOptions = {
    deleteDetections: boolean;
};

type DetectionActionResult =
    | "not_found"
    | "already_accepted"
    | "already_ignored"
    | "marked_duplicate";

export type IgnoreDetectedSubscriptionResult =
    | {
        status: "ignored";
        id: string;
    }
    | {
        status: DetectionActionResult;
    };

export type AcceptDetectedSubscriptionResult =
    | {
        status: "accepted";
        detection: {
            id: string;
            status: DetectedSubscriptionStatus;
            acceptedSubscriptionId: string | null;
        };
        subscription: {
            id: string;
            name: string;
            provider: string | null;
            amount: number;
            currency: string;
            billingCycle: BillingCycle;
            nextPaymentDate: Date;
            status: SubscriptionStatus;
        };
    }
    | {
        status: DetectionActionResult | "needs_review" | "duplicate_subscription";
        missingFields?: string[];
        duplicate?: {
            id: string;
            name: string;
            provider: string | null;
            planName: string | null;
            status: SubscriptionStatus;
        };
    };

export async function getEmailScanStatus(userId: string) {
    const [
        connectionsCount,
        latestScannedGmailConnection,
        latestGmailConnection,
        pendingDetectionsCount,
        acceptedDetectionsCount,
        ignoredDetectionsCount,
        duplicateDetectionsCount,
    ] = await prisma.$transaction([
        prisma.emailConnection.count({
            where: {
                userId,
                provider: EmailProvider.gmail,
            },
        }),
        prisma.emailConnection.findFirst({
            where: {
                userId,
                provider: EmailProvider.gmail,
                lastScanAt: {
                    not: null,
                },
            },
            orderBy: {
                lastScanAt: "desc",
            },
            select: {
                lastScanAt: true,
            },
        }),
        prisma.emailConnection.findFirst({
            where: {
                userId,
                provider: EmailProvider.gmail,
            },
            orderBy: {
                updatedAt: "desc",
            },
            select: {
                id: true,
                email: true,
                provider: true,
                connectedAt: true,
                lastScanAt: true,
            },
        }),
        prisma.detectedSubscription.count({
            where: {
                userId,
                status: DetectedSubscriptionStatus.pending,
            },
        }),
        prisma.detectedSubscription.count({
            where: {
                userId,
                status: DetectedSubscriptionStatus.accepted,
            },
        }),
        prisma.detectedSubscription.count({
            where: {
                userId,
                status: DetectedSubscriptionStatus.ignored,
            },
        }),
        prisma.detectedSubscription.count({
            where: {
                userId,
                status: DetectedSubscriptionStatus.duplicate,
            },
        }),
    ]);

    return {
        gmailConnected: connectionsCount > 0,
        connectionsCount,
        lastScanAt: latestScannedGmailConnection?.lastScanAt ?? null,
        gmailConnection: latestGmailConnection,
        pendingDetectionsCount,
        acceptedDetectionsCount,
        ignoredDetectionsCount,
        duplicateDetectionsCount,
    };
}

export async function getEmailConnectionsForUser(userId: string) {
    const connections = await prisma.emailConnection.findMany({
        where: {
            userId,
        },
        orderBy: {
            updatedAt: "desc",
        },
        select: {
            id: true,
            provider: true,
            email: true,
            connectedAt: true,
            lastScanAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return {
        count: connections.length,
        items: connections,
    };
}

export async function disconnectEmailConnectionForUser(
    userId: string,
    connectionId: string,
    options: DisconnectEmailConnectionOptions
) {
    const connection = await prisma.emailConnection.findFirst({
        where: {
            id: connectionId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!connection) {
        return {
            status: "not_found" as const,
        };
    }

    const result = await prisma.$transaction(async (tx) => {
        let deletedDetections = 0;

        if (options.deleteDetections) {
            const deleted = await tx.detectedSubscription.deleteMany({
                where: {
                    emailConnectionId: connection.id,
                    status: {
                        not: DetectedSubscriptionStatus.accepted,
                    },
                },
            });

            deletedDetections = deleted.count;
        }

        await tx.emailConnection.delete({
            where: {
                id: connection.id,
            },
        });

        return {
            deletedDetections,
        };
    });

    return {
        status: "disconnected" as const,
        deletedDetections: result.deletedDetections,
    };
}

export async function getDetectedSubscriptionsForUser(
    userId: string,
    params: DetectionListParams
) {
    const where: Prisma.DetectedSubscriptionWhereInput = {
        userId,
        ...(params.status ? { status: params.status } : {}),
    };

    const [count, detections] = await prisma.$transaction([
        prisma.detectedSubscription.count({ where }),
        prisma.detectedSubscription.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            take: params.limit,
            skip: params.offset,
        }),
    ]);

    return {
        count,
        limit: params.limit,
        offset: params.offset,
        items: detections.map((detection) => ({
            id: detection.id,
            sourceProvider: detection.sourceProvider,
            sourceMessageId: detection.sourceMessageId,
            provider: detection.provider,
            name: detection.name,
            amount:
                detection.amount === null ? null : Number(detection.amount.toString()),
            currency: detection.currency,
            billingCycle: detection.billingCycle,
            nextPaymentDate: detection.nextPaymentDate,
            trialEndDate: detection.trialEndDate,
            isTrial: detection.isTrial,
            category: detection.category,
            confidence: Number(detection.confidence.toString()),
            status: detection.status,
            evidenceSnippet: detection.evidenceSnippet,
            acceptedSubscriptionId: detection.acceptedSubscriptionId,
            createdAt: detection.createdAt,
            updatedAt: detection.updatedAt,
        })),
    };
}

export async function ignoreDetectedSubscriptionForUser(
    userId: string,
    detectionId: string
): Promise<IgnoreDetectedSubscriptionResult> {
    const detection = await prisma.detectedSubscription.findFirst({
        where: {
            id: detectionId,
            userId,
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (!detection) {
        return { status: "not_found" };
    }

    if (detection.status === DetectedSubscriptionStatus.accepted) {
        return { status: "already_accepted" };
    }

    if (detection.status === DetectedSubscriptionStatus.ignored) {
        return {
            status: "ignored",
            id: detection.id,
        };
    }

    const updatedDetection = await prisma.detectedSubscription.update({
        where: {
            id: detection.id,
        },
        data: {
            status: DetectedSubscriptionStatus.ignored,
        },
        select: {
            id: true,
        },
    });

    return {
        status: "ignored",
        id: updatedDetection.id,
    };
}

function decimalToNumber(value: Prisma.Decimal | null) {
    return value === null ? undefined : Number(value.toString());
}

function dateToInputString(value: Date | null) {
    return value ? value.toISOString() : undefined;
}

function nullableDateToInputString(value: Date | null) {
    return value ? value.toISOString() : null;
}

function buildSubscriptionInputFromDetection(
    detection: Awaited<ReturnType<typeof getDetectedSubscriptionForAccept>>,
    input: AcceptDetectedSubscriptionInput
) {
    if (!detection) {
        return {
            data: null,
            missingFields: [],
        };
    }

    const data = {
        name: input.name ?? detection.name,
        provider:
            input.provider !== undefined ? input.provider : detection.provider ?? null,
        planName: input.planName !== undefined ? input.planName : null,
        amount: input.amount ?? decimalToNumber(detection.amount),
        currency: input.currency ?? detection.currency ?? undefined,
        category: input.category ?? detection.category ?? undefined,
        billingCycle: input.billingCycle ?? detection.billingCycle ?? undefined,
        nextPaymentDate:
            input.nextPaymentDate ?? dateToInputString(detection.nextPaymentDate),
        trialEndDate:
            input.trialEndDate !== undefined
                ? input.trialEndDate
                : nullableDateToInputString(detection.trialEndDate),
        isTrial: input.isTrial ?? detection.isTrial,
        isRecurringBill: true,
        reminderDaysBefore: input.reminderDaysBefore ?? 1,
        paymentMethodLabel:
            input.paymentMethodLabel !== undefined
                ? input.paymentMethodLabel
                : "Email scan",
        notes:
            input.notes !== undefined
                ? input.notes
                : detection.sourceProvider === EmailProvider.gmail
                    ? "Detected from Gmail."
                    : null,
        status: SubscriptionStatus.pending,
    };

    const missingFields = [
        !data.name ? "name" : null,
        data.amount === undefined ? "amount" : null,
        !data.currency ? "currency" : null,
        !data.category ? "category" : null,
        !data.billingCycle ? "billingCycle" : null,
        !data.nextPaymentDate ? "nextPaymentDate" : null,
    ].filter((field): field is string => field !== null);

    return {
        data,
        missingFields,
    };
}

async function getDetectedSubscriptionForAccept(userId: string, detectionId: string) {
    return prisma.detectedSubscription.findFirst({
        where: {
            id: detectionId,
            userId,
        },
    });
}

export async function acceptDetectedSubscriptionForUser(
    userId: string,
    detectionId: string,
    input: AcceptDetectedSubscriptionInput
): Promise<AcceptDetectedSubscriptionResult> {
    const detection = await getDetectedSubscriptionForAccept(userId, detectionId);

    if (!detection) {
        return { status: "not_found" };
    }

    if (detection.status === DetectedSubscriptionStatus.accepted) {
        return { status: "already_accepted" };
    }

    if (detection.status === DetectedSubscriptionStatus.ignored) {
        return { status: "already_ignored" };
    }

    if (detection.status === DetectedSubscriptionStatus.duplicate) {
        return { status: "marked_duplicate" };
    }

    const { data, missingFields } = buildSubscriptionInputFromDetection(
        detection,
        input
    );

    if (!data || missingFields.length > 0) {
        return {
            status: "needs_review",
            missingFields,
        };
    }

    const subscriptionInput = data as CreateSubscriptionInput;
    const duplicate = await findPotentialDuplicateSubscription(
        userId,
        subscriptionInput
    );

    if (duplicate) {
        return {
            status: "duplicate_subscription",
            duplicate: {
                id: duplicate.id,
                name: duplicate.name,
                provider: duplicate.provider,
                planName: duplicate.planName,
                status: duplicate.status,
            },
        };
    }

    const result = await prisma.$transaction(async (tx) => {
        const subscription = await tx.subscription.create({
            data: {
                userId,
                name: subscriptionInput.name,
                provider: subscriptionInput.provider ?? null,
                planName: subscriptionInput.planName ?? null,
                amount: subscriptionInput.amount,
                currency: subscriptionInput.currency,
                category: subscriptionInput.category as SubscriptionCategory,
                billingCycle: subscriptionInput.billingCycle as BillingCycle,
                nextPaymentDate: new Date(subscriptionInput.nextPaymentDate),
                trialEndDate: subscriptionInput.trialEndDate
                    ? new Date(subscriptionInput.trialEndDate)
                    : null,
                isTrial: subscriptionInput.isTrial ?? false,
                isRecurringBill: true,
                reminderDaysBefore: subscriptionInput.reminderDaysBefore ?? 1,
                paymentMethodLabel: subscriptionInput.paymentMethodLabel ?? null,
                notes: subscriptionInput.notes ?? null,
                status: SubscriptionStatus.pending,
            },
        });

        await tx.subscriptionEvent.create({
            data: {
                subscriptionId: subscription.id,
                userId,
                type: SubscriptionEventType.created,
                payload: {
                    source: "email_scan_detection",
                    detectionId: detection.id,
                    name: subscription.name,
                    provider: subscription.provider,
                    planName: subscription.planName,
                    amount: subscription.amount.toString(),
                    currency: subscription.currency,
                    category: subscription.category,
                    billingCycle: subscription.billingCycle,
                    nextPaymentDate: subscription.nextPaymentDate.toISOString(),
                    status: subscription.status,
                },
            },
        });

        const updatedDetection = await tx.detectedSubscription.update({
            where: {
                id: detection.id,
            },
            data: {
                status: DetectedSubscriptionStatus.accepted,
                acceptedSubscriptionId: subscription.id,
            },
            select: {
                id: true,
                status: true,
                acceptedSubscriptionId: true,
            },
        });

        return {
            detection: updatedDetection,
            subscription,
        };
    });

    return {
        status: "accepted",
        detection: result.detection,
        subscription: {
            id: result.subscription.id,
            name: result.subscription.name,
            provider: result.subscription.provider,
            amount: Number(result.subscription.amount.toString()),
            currency: result.subscription.currency,
            billingCycle: result.subscription.billingCycle,
            nextPaymentDate: result.subscription.nextPaymentDate,
            status: result.subscription.status,
        },
    };
}
