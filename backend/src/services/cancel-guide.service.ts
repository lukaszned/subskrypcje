import {
    CancelDifficulty,
    ProviderCancelGuide,
    SubscriptionCategory,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

type SubscriptionForCancelGuideMatching = {
    id: string;
    name: string;
    provider: string | null;
    cancelUrl: string | null;
};

export type CancelGuideCatalogInput = {
    providerName: string;
    providerSlug: string;
    category: SubscriptionCategory;
    logoKey?: string | null;
    cancelUrl?: string | null;
    supportUrl?: string | null;
    difficulty: CancelDifficulty;
    estimatedTimeMinutes: number;
    instructions: string[];
    notes?: string | null;
    matchingKeywords: string[];
};

function normalize(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

function buildSearchText(subscription: SubscriptionForCancelGuideMatching) {
    return normalize(`${subscription.name} ${subscription.provider ?? ""}`);
}

function guideMatchesSubscription(
    guide: ProviderCancelGuide,
    subscription: SubscriptionForCancelGuideMatching
): boolean {
    const searchText = buildSearchText(subscription);

    const normalizedProviderName = normalize(guide.providerName);
    const normalizedSlug = normalize(guide.providerSlug).replace(/-/g, " ");

    if (normalizedProviderName && searchText.includes(normalizedProviderName)) {
        return true;
    }

    if (normalizedSlug && searchText.includes(normalizedSlug)) {
        return true;
    }

    return guide.matchingKeywords.some((keyword) => {
        const normalizedKeyword = normalize(keyword);
        return normalizedKeyword.length > 0 && searchText.includes(normalizedKeyword);
    });
}

export async function getActiveCancelGuides() {
    return prisma.providerCancelGuide.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            providerName: "asc",
        },
    });
}

export async function getCancelGuideBySlug(providerSlug: string) {
    return prisma.providerCancelGuide.findFirst({
        where: {
            providerSlug,
            isActive: true,
        },
    });
}

export async function findCancelGuideForSubscription(
    subscription: SubscriptionForCancelGuideMatching
) {
    const guides = await getActiveCancelGuides();

    const matchedGuide = guides.find((guide) =>
        guideMatchesSubscription(guide, subscription)
    );

    if (matchedGuide) {
        return {
            hasGuide: true,
            source: "catalog" as const,
            guide: {
                id: matchedGuide.id,
                providerName: matchedGuide.providerName,
                providerSlug: matchedGuide.providerSlug,
                category: matchedGuide.category,
                logoKey: matchedGuide.logoKey,
                cancelUrl: matchedGuide.cancelUrl,
                supportUrl: matchedGuide.supportUrl,
                difficulty: matchedGuide.difficulty,
                estimatedTimeMinutes: matchedGuide.estimatedTimeMinutes,
                instructions: matchedGuide.instructions,
                notes: matchedGuide.notes,
            },
        };
    }

    if (subscription.cancelUrl) {
        return {
            hasGuide: false,
            source: "subscription" as const,
            guide: {
                id: null,
                providerName: subscription.provider ?? subscription.name,
                providerSlug: null,
                category: null,
                logoKey: null,
                cancelUrl: subscription.cancelUrl,
                supportUrl: null,
                difficulty: null,
                estimatedTimeMinutes: null,
                instructions: [],
                notes:
                    "Brak gotowego przewodnika anulowania dla tej usługi. Możesz użyć zapisanego linku anulowania.",
            },
        };
    }

    return {
        hasGuide: false,
        source: "none" as const,
        guide: null,
    };
}

export async function upsertCancelGuide(data: CancelGuideCatalogInput) {
    return prisma.providerCancelGuide.upsert({
        where: {
            providerSlug: data.providerSlug,
        },
        update: {
            providerName: data.providerName,
            category: data.category,
            logoKey: data.logoKey ?? null,
            cancelUrl: data.cancelUrl ?? null,
            supportUrl: data.supportUrl ?? null,
            difficulty: data.difficulty,
            estimatedTimeMinutes: data.estimatedTimeMinutes,
            instructions: data.instructions,
            notes: data.notes ?? null,
            matchingKeywords: data.matchingKeywords,
            isActive: true,
        },
        create: {
            providerName: data.providerName,
            providerSlug: data.providerSlug,
            category: data.category,
            logoKey: data.logoKey ?? null,
            cancelUrl: data.cancelUrl ?? null,
            supportUrl: data.supportUrl ?? null,
            difficulty: data.difficulty,
            estimatedTimeMinutes: data.estimatedTimeMinutes,
            instructions: data.instructions,
            notes: data.notes ?? null,
            matchingKeywords: data.matchingKeywords,
            isActive: true,
        },
    });
}