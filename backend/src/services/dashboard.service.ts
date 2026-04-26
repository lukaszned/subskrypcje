import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    SubscriptionCategory,
    SubscriptionStatus,
} from "@prisma/client";
import { syncOverdueSubscriptionsForUser } from "./subscription.service";

function toNumber(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toString" in value &&
        typeof value.toString === "function"
    ) {
        const parsed = Number(value.toString());
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
}

function calculateMonthlyEquivalent(
    amount: number,
    billingCycle: BillingCycle
): number {
    switch (billingCycle) {
        case BillingCycle.monthly:
            return amount;
        case BillingCycle.yearly:
            return amount / 12;
        case BillingCycle.weekly:
            return (amount * 52) / 12;
        case BillingCycle.one_time:
            return 0;
        case BillingCycle.custom:
            return 0;
        default:
            return 0;
    }
}

function calculateYearlyEquivalent(
    amount: number,
    billingCycle: BillingCycle
): number {
    switch (billingCycle) {
        case BillingCycle.monthly:
            return amount * 12;
        case BillingCycle.yearly:
            return amount;
        case BillingCycle.weekly:
            return amount * 52;
        case BillingCycle.one_time:
            return 0;
        case BillingCycle.custom:
            return 0;
        default:
            return 0;
    }
}

function getDaysLeft(targetDate: Date, now: Date): number {
    const msInDay = 1000 * 60 * 60 * 24;
    return Math.ceil((targetDate.getTime() - now.getTime()) / msInDay);
}

function calculateRemindAt(
    nextPaymentDate: Date,
    reminderDaysBefore: number
): Date {
    const remindAt = new Date(nextPaymentDate);
    remindAt.setDate(remindAt.getDate() - reminderDaysBefore);
    return remindAt;
}

export async function getDashboardSummaryForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
        },
        orderBy: {
            nextPaymentDate: "asc",
        },
    });

    const activeSubscriptions = subscriptions.filter(
        (subscription) => subscription.status !== SubscriptionStatus.canceled
    );

    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    const monthlyTotal = activeSubscriptions.reduce((sum, subscription) => {
        const amount = toNumber(subscription.amount);
        return sum + calculateMonthlyEquivalent(amount, subscription.billingCycle);
    }, 0);

    const yearlyTotal = activeSubscriptions.reduce((sum, subscription) => {
        const amount = toNumber(subscription.amount);
        return sum + calculateYearlyEquivalent(amount, subscription.billingCycle);
    }, 0);

    const trialsCount = activeSubscriptions.filter(
        (subscription) => subscription.isTrial
    ).length;

    const upcomingPaymentsCount = activeSubscriptions.filter((subscription) => {
        return (
            subscription.nextPaymentDate >= now &&
            subscription.nextPaymentDate <= next7Days
        );
    }).length;

    const overdueCount = subscriptions.filter(
        (subscription) => subscription.status === SubscriptionStatus.overdue
    ).length;

    return {
        monthlyTotal: Number(monthlyTotal.toFixed(2)),
        yearlyTotal: Number(yearlyTotal.toFixed(2)),
        activeSubscriptionsCount: activeSubscriptions.length,
        trialsCount,
        upcomingPaymentsCount,
        overdueCount,
    };
}

export async function getUpcomingPaymentsForUser(
    userId: string,
    days: number = 7
) {
    await syncOverdueSubscriptionsForUser(userId);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
            status: {
                not: SubscriptionStatus.canceled,
            },
            nextPaymentDate: {
                gte: now,
                lte: futureDate,
            },
        },
        orderBy: {
            nextPaymentDate: "asc",
        },
        select: {
            id: true,
            name: true,
            provider: true,
            planName: true,
            amount: true,
            currency: true,
            nextPaymentDate: true,
            status: true,
            isTrial: true,
            reminderDaysBefore: true,
        },
    });

    return subscriptions.map((subscription) => ({
        ...subscription,
        amount: Number(toNumber(subscription.amount).toFixed(2)),
    }));
}

export async function getTrialsForUser(userId: string, days: number = 30) {
    await syncOverdueSubscriptionsForUser(userId);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
            isTrial: true,
            status: {
                not: SubscriptionStatus.canceled,
            },
            trialEndDate: {
                not: null,
                gte: now,
                lte: futureDate,
            },
        },
        orderBy: {
            trialEndDate: "asc",
        },
        select: {
            id: true,
            name: true,
            provider: true,
            planName: true,
            amount: true,
            currency: true,
            trialEndDate: true,
            nextPaymentDate: true,
            status: true,
            cancelUrl: true,
            reminderDaysBefore: true,
        },
    });

    return subscriptions.map((subscription) => {
        const trialEndDate = subscription.trialEndDate as Date;

        return {
            ...subscription,
            amount: Number(toNumber(subscription.amount).toFixed(2)),
            daysLeft: getDaysLeft(trialEndDate, now),
        };
    });
}

export async function getCategoryBreakdownForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
            status: {
                not: SubscriptionStatus.canceled,
            },
        },
    });

    const categoryMap = new Map<
        SubscriptionCategory,
        {
            category: SubscriptionCategory;
            monthlyAmount: number;
            subscriptionCount: number;
        }
    >();

    for (const subscription of subscriptions) {
        const monthlyAmount = calculateMonthlyEquivalent(
            toNumber(subscription.amount),
            subscription.billingCycle
        );

        if (monthlyAmount <= 0) {
            continue;
        }

        const existing = categoryMap.get(subscription.category);

        if (existing) {
            existing.monthlyAmount += monthlyAmount;
            existing.subscriptionCount += 1;
        } else {
            categoryMap.set(subscription.category, {
                category: subscription.category,
                monthlyAmount,
                subscriptionCount: 1,
            });
        }
    }

    const items = Array.from(categoryMap.values())
        .map((item) => ({
            ...item,
            monthlyAmount: Number(item.monthlyAmount.toFixed(2)),
        }))
        .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    const totalMonthly = Number(
        items.reduce((sum, item) => sum + item.monthlyAmount, 0).toFixed(2)
    );

    const itemsWithPercentage = items.map((item) => ({
        ...item,
        percentage:
            totalMonthly > 0
                ? Number(((item.monthlyAmount / totalMonthly) * 100).toFixed(2))
                : 0,
    }));

    return {
        totalMonthly,
        items: itemsWithPercentage,
    };
}

export async function getRemindersForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    const now = new Date();

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
            status: {
                not: SubscriptionStatus.canceled,
            },
            nextPaymentDate: {
                gte: now,
            },
        },
        orderBy: {
            nextPaymentDate: "asc",
        },
        select: {
            id: true,
            name: true,
            provider: true,
            nextPaymentDate: true,
            reminderDaysBefore: true,
            status: true,
        },
    });

    const items = subscriptions.map((subscription) => {
        const reminderDaysBefore = subscription.reminderDaysBefore ?? 1;
        const remindAt = calculateRemindAt(
            subscription.nextPaymentDate,
            reminderDaysBefore
        );

        return {
            id: subscription.id,
            name: subscription.name,
            provider: subscription.provider,
            nextPaymentDate: subscription.nextPaymentDate,
            reminderDaysBefore,
            remindAt,
            status: subscription.status,
        };
    });

    return {
        count: items.length,
        items,
    };
}