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
    return prisma.subscription.findFirst({
        where: {
            userId,
            status: {
                not: SubscriptionStatus.canceled,
            },
            name: {
                equals: data.name,
                mode: "insensitive",
            },
            provider:
                data.provider && data.provider.trim().length > 0
                    ? {
                        equals: data.provider,
                        mode: "insensitive",
                    }
                    : null,
            planName:
                data.planName && data.planName.trim().length > 0
                    ? {
                        equals: data.planName,
                        mode: "insensitive",
                    }
                    : null,
        },
    });
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