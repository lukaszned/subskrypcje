import { prisma } from "../lib/prisma";
import { findCancelGuideForSubscription } from "./cancel-guide.service";

function slugifyProvider(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function createServiceError(
    message: string,
    code: string,
    statusCode: number,
    extra?: Record<string, unknown>
) {
    const error = new Error(message);

    Object.assign(error, {
        code,
        statusCode,
        ...extra,
    });

    return error;
}

export async function createCancelGuideRequest(
    userId: string,
    subscriptionId: string
) {
    const subscription = await prisma.subscription.findFirst({
        where: {
            id: subscriptionId,
            userId,
        },
    });

    if (!subscription) {
        throw createServiceError(
            "Subskrypcja nie została znaleziona.",
            "SUBSCRIPTION_NOT_FOUND",
            404
        );
    }

    const cancelGuideResult = await findCancelGuideForSubscription(subscription);

    if (cancelGuideResult.hasGuide && cancelGuideResult.guide) {
        throw createServiceError(
            "Instrukcja anulowania dla tej subskrypcji już istnieje.",
            "CANCEL_GUIDE_ALREADY_EXISTS",
            409,
            {
                guide: {
                    providerName: cancelGuideResult.guide.providerName,
                    providerSlug: cancelGuideResult.guide.providerSlug,
                    difficulty: cancelGuideResult.guide.difficulty,
                    estimatedTimeMinutes:
                        cancelGuideResult.guide.estimatedTimeMinutes,
                },
            }
        );
    }

    const existingRequest = await prisma.cancelGuideRequest.findFirst({
        where: {
            userId,
            subscriptionId,
            status: {
                in: ["pending", "reviewed"],
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    if (existingRequest) {
        return {
            request: existingRequest,
            alreadyExisted: true,
            subscription,
        };
    }

    const provider = subscription.provider?.trim() || null;
    const providerSlug = provider
        ? slugifyProvider(provider)
        : slugifyProvider(subscription.name);

    const request = await prisma.cancelGuideRequest.create({
        data: {
            userId,
            subscriptionId,
            subscriptionName: subscription.name,
            provider,
            providerSlug,
            status: "pending",
        },
    });

    return {
        request,
        alreadyExisted: false,
        subscription,
    };
}