import { prisma } from "../lib/prisma";
import { BillingCycle, SubscriptionStatus } from "@prisma/client";
import { ensureOverdueStatusUpdated } from "./subscription.service";

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

const EXCHANGE_RATES: Record<string, number> = {
    PLN: 1.0,
    USD: 4.0,
    EUR: 4.3,
    GBP: 5.1,
};

function convertToPLN(amount: number, currency: string): number {
    const rate = EXCHANGE_RATES[currency.toUpperCase()] || 1.0;
    return amount * rate;
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

export async function getDashboardSummaryForUser(userId: string) {
    // Upewniamy się, że statusy są aktualne przed liczeniem statystyk
    await ensureOverdueStatusUpdated(userId);

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
        const amountInPLN = convertToPLN(amount, subscription.currency);
        return sum + calculateMonthlyEquivalent(amountInPLN, subscription.billingCycle);
    }, 0);

    const yearlyTotal = activeSubscriptions.reduce((sum, subscription) => {
        const amount = toNumber(subscription.amount);
        const amountInPLN = convertToPLN(amount, subscription.currency);
        return sum + calculateYearlyEquivalent(amountInPLN, subscription.billingCycle);
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
    // Odświeżamy statusy
    await ensureOverdueStatusUpdated(userId);

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
    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
            status: {
                not: SubscriptionStatus.canceled,
            },
        },
    });

    const breakdown: Record<
        string,
        { total: number; count: number; currency: string }
    > = {};

    subscriptions.forEach((sub) => {
        const amount = toNumber(sub.amount);
        const amountInPLN = convertToPLN(amount, sub.currency);
        const monthly = calculateMonthlyEquivalent(amountInPLN, sub.billingCycle);
        const cat = sub.category;

        if (!breakdown[cat]) {
            breakdown[cat] = { total: 0, count: 0, currency: "PLN" };
        }

        breakdown[cat].total += monthly;
        breakdown[cat].count += 1;
    });

    return Object.entries(breakdown).map(([category, data]) => ({
        category,
        monthlyAmount: Number(data.total.toFixed(2)),
        subscriptionCount: data.count,
        percentage: 0, // Obliczamy poniżej
    })).map((item, index, array) => {
        const totalAll = array.reduce((s, i) => s + i.monthlyAmount, 0);
        return {
            ...item,
            percentage: totalAll > 0 ? Number(((item.monthlyAmount / totalAll) * 100).toFixed(1)) : 0
        };
    });
}

export async function getRemindersForUser(userId: string) {
    const subscriptions = await prisma.subscription.findMany({
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
            nextPaymentDate: true,
            reminderDaysBefore: true,
            status: true,
        },
    });

    return subscriptions.map((sub) => {
        const remindAt = new Date(sub.nextPaymentDate);
        remindAt.setDate(remindAt.getDate() - sub.reminderDaysBefore);
        // Ustawiamy godzinę na rano (np. 9:00), chyba że chcemy być bardziej precyzyjni
        remindAt.setHours(9, 0, 0, 0);

        return {
            id: sub.id,
            name: sub.name,
            provider: sub.provider,
            nextPaymentDate: sub.nextPaymentDate.toISOString(),
            reminderDaysBefore: sub.reminderDaysBefore,
            remindAt: remindAt.toISOString(),
            status: sub.status,
        };
    });
}
