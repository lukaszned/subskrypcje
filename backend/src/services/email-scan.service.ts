import {
    DetectedSubscriptionStatus,
    EmailProvider,
    Prisma,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

export type DetectionListParams = {
    status?: DetectedSubscriptionStatus;
    limit: number;
    offset: number;
};

export async function getEmailScanStatus(userId: string) {
    const [
        connectionsCount,
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
        lastScanAt: latestGmailConnection?.lastScanAt ?? null,
        pendingDetectionsCount,
        acceptedDetectionsCount,
        ignoredDetectionsCount,
        duplicateDetectionsCount,
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
