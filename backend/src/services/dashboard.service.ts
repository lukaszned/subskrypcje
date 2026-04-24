import { prisma } from "../lib/prisma";
import { BillingCycle, SubscriptionStatus } from "@prisma/client";

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

export async function getDashboardSummaryForUser(userId: string) {
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