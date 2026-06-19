import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    Prisma,
    SubscriptionCategory,
    SubscriptionStatus,
} from "@prisma/client";
import {
    CreateSubscriptionInput,
    UpdateSubscriptionInput,
} from "../validators/subscription";
import { getOrCreateUserSettings } from "./user-settings.service";

type SubscriptionListFilters = {
    category?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
};

function getSubscriptionOrderBy(
    sortBy?: string,
    sortOrder?: string
): Prisma.SubscriptionOrderByWithRelationInput {
    const direction: Prisma.SortOrder = sortOrder === "desc" ? "desc" : "asc";

    switch (sortBy) {
        case "name":
            return { name: direction };
        case "createdAt":
            return { createdAt: direction };
        case "amount":
            return { amount: direction };
        case "nextPaymentDate":
        default:
            return { nextPaymentDate: direction };
    }
}

export async function syncOverdueSubscriptionsForUser(userId: string) {
    const now = new Date();

    await prisma.subscription.updateMany({
        where: {
            userId,
            status: SubscriptionStatus.pending,
            nextPaymentDate: {
                lt: now,
            },
        },
        data: {
            status: SubscriptionStatus.overdue,
        },
    });
}

export async function getSubscriptionsForUser(
    userId: string,
    filters?: SubscriptionListFilters
) {
    await syncOverdueSubscriptionsForUser(userId);

    const { category, status, search } = filters || {};

    return prisma.subscription.findMany({
        where: {
            userId,
            ...(category ? { category: category as SubscriptionCategory } : {}),
            ...(status ? { status: status as SubscriptionStatus } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { provider: { contains: search, mode: "insensitive" } },
                        { notes: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {}),
        },
        orderBy: getSubscriptionOrderBy(filters?.sortBy, filters?.sortOrder),
    });
}

export async function getSubscriptionByIdForUser(id: string, userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    return prisma.subscription.findFirst({
        where: {
            id,
            userId,
        },
    });
}

export async function findPotentialDuplicateSubscription(
    userId: string,
    data: CreateSubscriptionInput
) {
    const candidates = await prisma.subscription.findMany({
        where: {
            userId,
            status: {
                not: SubscriptionStatus.canceled,
            },
        },
        select: {
            id: true,
            name: true,
            provider: true,
            planName: true,
            category: true,
            amount: true,
            currency: true,
            status: true,
        },
    });

    const inputProvider = normalizeDuplicateText(data.provider ?? data.name);
    const inputName = normalizeDuplicateText(data.name);
    const inputCategory = normalizeDuplicateText(data.category);
    const inputCurrency = normalizeDuplicateText(data.currency);
    const inputAmount = normalizeDuplicateAmount(data.amount);

    return (
        candidates.find((candidate) => {
            const candidateProvider = normalizeDuplicateText(
                candidate.provider ?? candidate.name
            );
            const candidateName = normalizeDuplicateText(candidate.name);
            const candidateCategory = normalizeDuplicateText(candidate.category);
            const candidateCurrency = normalizeDuplicateText(candidate.currency);
            const candidateAmount = normalizeDuplicateAmount(candidate.amount);

            return (
                candidateProvider === inputProvider &&
                candidateName === inputName &&
                candidateCategory === inputCategory &&
                candidateCurrency === inputCurrency &&
                candidateAmount === inputAmount
            );
        }) ?? null
    );
}

function normalizeDuplicateText(value: unknown) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizeDuplicateAmount(value: unknown) {
    if (typeof value === "number") {
        return Math.round(value * 100);
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toString" in value &&
        typeof value.toString === "function"
    ) {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

export async function createSubscription(
    userId: string,
    data: CreateSubscriptionInput
) {
    const settings = await getOrCreateUserSettings(userId);

    return prisma.subscription.create({
        data: {
            userId,
            name: data.name,
            provider: data.provider ?? null,
            planName: data.planName ?? null,
            amount: data.amount,
            currency: data.currency,
            category: data.category as SubscriptionCategory,
            billingCycle: data.billingCycle as BillingCycle,
            nextPaymentDate: new Date(data.nextPaymentDate),
            lastPaymentDate: data.lastPaymentDate
                ? new Date(data.lastPaymentDate)
                : null,
            trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
            isTrial: data.isTrial ?? false,
            isRecurringBill: data.isRecurringBill ?? true,
            reminderDaysBefore:
                data.reminderDaysBefore ?? settings.defaultReminderDaysBefore,
            paymentMethodLabel: data.paymentMethodLabel ?? null,
            cancelUrl: data.cancelUrl ?? null,
            notes: data.notes ?? null,
            status: (data.status as SubscriptionStatus) || SubscriptionStatus.pending,
        },
    });
}

export async function updateSubscriptionForUser(
    id: string,
    userId: string,
    data: UpdateSubscriptionInput
) {
    return prisma.subscription.updateMany({
        where: {
            id,
            userId,
        },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.provider !== undefined && { provider: data.provider ?? null }),
            ...(data.planName !== undefined && { planName: data.planName ?? null }),
            ...(data.amount !== undefined && { amount: data.amount }),
            ...(data.currency !== undefined && { currency: data.currency }),
            ...(data.category !== undefined && {
                category: data.category as SubscriptionCategory,
            }),
            ...(data.billingCycle !== undefined && {
                billingCycle: data.billingCycle as BillingCycle,
            }),
            ...(data.nextPaymentDate !== undefined && {
                nextPaymentDate: new Date(data.nextPaymentDate),
            }),
            ...(data.lastPaymentDate !== undefined && {
                lastPaymentDate: data.lastPaymentDate
                    ? new Date(data.lastPaymentDate)
                    : null,
            }),
            ...(data.trialEndDate !== undefined && {
                trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
            }),
            ...(data.isTrial !== undefined && { isTrial: data.isTrial }),
            ...(data.isRecurringBill !== undefined && {
                isRecurringBill: data.isRecurringBill,
            }),
            ...(data.reminderDaysBefore !== undefined && {
                reminderDaysBefore: data.reminderDaysBefore,
            }),
            ...(data.paymentMethodLabel !== undefined && {
                paymentMethodLabel: data.paymentMethodLabel ?? null,
            }),
            ...(data.cancelUrl !== undefined && {
                cancelUrl: data.cancelUrl ?? null,
            }),
            ...(data.notes !== undefined && {
                notes: data.notes ?? null,
            }),
            ...(data.status !== undefined && {
                status: data.status as SubscriptionStatus,
            }),
        },
    });
}

export async function markSubscriptionAsPaidForUser(
    id: string,
    userId: string
) {
    const subscription = await prisma.subscription.findFirst({
        where: { id, userId },
    });

    if (!subscription) return null;

    const nextDate = new Date(subscription.nextPaymentDate);

    switch (subscription.billingCycle) {
        case BillingCycle.monthly:
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case BillingCycle.yearly:
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        case BillingCycle.weekly:
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case BillingCycle.one_time:
            return prisma.subscription.updateMany({
                where: { id, userId },
                data: {
                    status: SubscriptionStatus.paid,
                    lastPaymentDate: new Date(),
                },
            });
        case BillingCycle.custom:
            return prisma.subscription.updateMany({
                where: { id, userId },
                data: {
                    status: SubscriptionStatus.paid,
                    lastPaymentDate: new Date(),
                },
            });
    }

    return prisma.subscription.updateMany({
        where: {
            id,
            userId,
        },
        data: {
            status: SubscriptionStatus.pending,
            lastPaymentDate: new Date(),
            nextPaymentDate: nextDate,
        },
    });
}

export async function cancelSubscriptionForUser(id: string, userId: string) {
    return prisma.subscription.updateMany({
        where: {
            id,
            userId,
        },
        data: {
            status: SubscriptionStatus.canceled,
        },
    });
}

export async function deleteSubscriptionForUser(id: string, userId: string) {
    return prisma.subscription.deleteMany({
        where: {
            id,
            userId,
        },
    });
}
