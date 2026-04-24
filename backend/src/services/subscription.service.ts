import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    SubscriptionCategory,
    SubscriptionStatus,
} from "@prisma/client";
import {
    CreateSubscriptionInput,
    UpdateSubscriptionInput,
} from "../validators/subscription";

export async function getSubscriptionsForUser(
    userId: string,
    filters?: {
        category?: string;
        status?: string;
    }
) {
    return prisma.subscription.findMany({
        where: {
            userId,
            ...(filters?.category
                ? { category: filters.category as SubscriptionCategory }
                : {}),
            ...(filters?.status
                ? { status: filters.status as SubscriptionStatus }
                : {}),
        },
        orderBy: {
            nextPaymentDate: "asc",
        },
    });
}

export async function getSubscriptionByIdForUser(id: string, userId: string) {
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
            reminderDaysBefore: data.reminderDaysBefore ?? 1,
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
    return prisma.subscription.updateMany({
        where: {
            id,
            userId,
        },
        data: {
            status: SubscriptionStatus.paid,
            lastPaymentDate: new Date(),
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