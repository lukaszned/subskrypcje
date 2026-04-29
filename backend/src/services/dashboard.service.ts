import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    SubscriptionCategory,
    SubscriptionStatus,
} from "@prisma/client";
import { syncOverdueSubscriptionsForUser } from "./subscription.service";
import {
    BASE_CURRENCY,
    CurrencyCode,
    convertCurrency,
    normalizeCurrency,
} from "../config/currency";

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

async function getBaseCurrencyForUser(userId: string): Promise<CurrencyCode> {
    const settings = await prisma.userSettings.findFirst({
        where: {
            userId,
        },
        select: {
            baseCurrency: true,
        },
    });

    return normalizeCurrency(settings?.baseCurrency ?? BASE_CURRENCY);
}

async function getUserNotificationSettings(userId: string) {
    const existingSettings = await prisma.userSettings.findUnique({
        where: {
            userId,
        },
    });

    if (existingSettings) {
        return {
            notificationsEnabled: existingSettings.notificationsEnabled,
            defaultReminderDaysBefore:
                existingSettings.defaultReminderDaysBefore,
        };
    }

    const createdSettings = await prisma.userSettings.create({
        data: {
            userId,
            baseCurrency: BASE_CURRENCY,
            defaultReminderDaysBefore: 2,
            notificationsEnabled: true,
            emailReportsEnabled: false,
        },
    });

    return {
        notificationsEnabled: createdSettings.notificationsEnabled,
        defaultReminderDaysBefore: createdSettings.defaultReminderDaysBefore,
    };
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

function calculateMonthlyEquivalentInCurrency(
    amount: number,
    currency: string,
    billingCycle: BillingCycle,
    targetCurrency: CurrencyCode
): number {
    const monthlyEquivalent = calculateMonthlyEquivalent(amount, billingCycle);
    return convertCurrency(monthlyEquivalent, currency, targetCurrency);
}

function calculateYearlyEquivalentInCurrency(
    amount: number,
    currency: string,
    billingCycle: BillingCycle,
    targetCurrency: CurrencyCode
): number {
    const yearlyEquivalent = calculateYearlyEquivalent(amount, billingCycle);
    return convertCurrency(yearlyEquivalent, currency, targetCurrency);
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

function getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function getMonthLabel(date: Date): string {
    const labels = [
        "Sty",
        "Lut",
        "Mar",
        "Kwi",
        "Maj",
        "Cze",
        "Lip",
        "Sie",
        "Wrz",
        "Paź",
        "Lis",
        "Gru",
    ];

    return labels[date.getMonth()];
}

function addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}

function getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isSubscriptionActiveInMonth(
    subscription: {
        createdAt: Date;
        status: SubscriptionStatus;
        updatedAt: Date;
    },
    monthStart: Date,
    monthEnd: Date
): boolean {
    if (subscription.createdAt > monthEnd) {
        return false;
    }

    if (
        subscription.status === SubscriptionStatus.canceled &&
        subscription.updatedAt < monthStart
    ) {
        return false;
    }

    return true;
}

function formatDateForNotification(date: Date): string {
    return new Intl.DateTimeFormat("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function getDaysUntil(targetDate: Date, now: Date): number {
    const msInDay = 1000 * 60 * 60 * 24;
    return Math.ceil((targetDate.getTime() - now.getTime()) / msInDay);
}

function buildNotificationTitle(subscriptionName: string): string {
    return `Przypomnienie: ${subscriptionName}`;
}

function buildNotificationBody(params: {
    name: string;
    provider: string | null;
    nextPaymentDate: Date;
    reminderDaysBefore: number;
}): string {
    const displayName = params.provider
        ? `${params.name} (${params.provider})`
        : params.name;

    const formattedDate = formatDateForNotification(params.nextPaymentDate);

    if (params.reminderDaysBefore <= 0) {
        return `${displayName} odnawia się dzisiaj. Termin płatności: ${formattedDate}.`;
    }

    return `${displayName} odnowi się za ${params.reminderDaysBefore} dni. Termin płatności: ${formattedDate}.`;
}

export async function getDashboardSummaryForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);
    const baseCurrency = await getBaseCurrencyForUser(userId);

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

        return (
            sum +
            calculateMonthlyEquivalentInCurrency(
                amount,
                subscription.currency,
                subscription.billingCycle,
                baseCurrency
            )
        );
    }, 0);

    const yearlyTotal = activeSubscriptions.reduce((sum, subscription) => {
        const amount = toNumber(subscription.amount);

        return (
            sum +
            calculateYearlyEquivalentInCurrency(
                amount,
                subscription.currency,
                subscription.billingCycle,
                baseCurrency
            )
        );
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
        baseCurrency,
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

    const items = subscriptions.map((subscription) => ({
        ...subscription,
        amount: Number(toNumber(subscription.amount).toFixed(2)),
    }));

    return {
        days,
        count: items.length,
        items,
    };
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

    const items = subscriptions.map((subscription) => {
        const trialEndDate = subscription.trialEndDate as Date;
        const diffTime = trialEndDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            ...subscription,
            amount: Number(toNumber(subscription.amount).toFixed(2)),
            trialEndDate: trialEndDate.toISOString(),
            daysLeft,
        };
    });

    return {
        days,
        count: items.length,
        items,
    };
}

export async function getCategoryBreakdownForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);
    const baseCurrency = await getBaseCurrencyForUser(userId);

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
        const monthlyAmount = calculateMonthlyEquivalentInCurrency(
            toNumber(subscription.amount),
            subscription.currency,
            subscription.billingCycle,
            baseCurrency
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
        baseCurrency,
        totalMonthly,
        items: itemsWithPercentage,
    };
}

export async function getRemindersForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);
    const settings = await getUserNotificationSettings(userId);

    if (!settings.notificationsEnabled) {
        return {
            notificationsEnabled: false,
            defaultReminderDaysBefore: settings.defaultReminderDaysBefore,
            count: 0,
            items: [],
        };
    }

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
        const reminderDaysBefore =
            subscription.reminderDaysBefore ??
            settings.defaultReminderDaysBefore;

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
            shouldNotifyNow: remindAt <= now,
            status: subscription.status,
        };
    });

    return {
        notificationsEnabled: true,
        defaultReminderDaysBefore: settings.defaultReminderDaysBefore,
        count: items.length,
        items,
    };
}

export async function getNotificationPreviewForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    const settings = await getUserNotificationSettings(userId);

    if (!settings.notificationsEnabled) {
        return {
            notificationsEnabled: false,
            defaultReminderDaysBefore: settings.defaultReminderDaysBefore,
            count: 0,
            nextReminder: null,
            items: [],
        };
    }

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

    const items = subscriptions
        .map((subscription) => {
            const reminderDaysBefore =
                subscription.reminderDaysBefore ??
                settings.defaultReminderDaysBefore;

            const remindAt = calculateRemindAt(
                subscription.nextPaymentDate,
                reminderDaysBefore
            );

            const daysUntilReminder = getDaysUntil(remindAt, now);
            const daysUntilPayment = getDaysUntil(
                subscription.nextPaymentDate,
                now
            );

            return {
                id: subscription.id,
                name: subscription.name,
                provider: subscription.provider,
                title: buildNotificationTitle(subscription.name),
                body: buildNotificationBody({
                    name: subscription.name,
                    provider: subscription.provider,
                    nextPaymentDate: subscription.nextPaymentDate,
                    reminderDaysBefore,
                }),
                nextPaymentDate: subscription.nextPaymentDate,
                reminderDaysBefore,
                remindAt,
                daysUntilReminder,
                daysUntilPayment,
                shouldNotifyNow: remindAt <= now,
                status: subscription.status,
            };
        })
        .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());

    const nextReminder = items.length > 0 ? items[0] : null;

    return {
        notificationsEnabled: true,
        defaultReminderDaysBefore: settings.defaultReminderDaysBefore,
        count: items.length,
        nextReminder,
        items,
    };
}

export async function getSavingsForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);
    const baseCurrency = await getBaseCurrencyForUser(userId);

    const canceledSubscriptions = await prisma.subscription.findMany({
        where: {
            userId,
            status: SubscriptionStatus.canceled,
        },
        orderBy: {
            updatedAt: "desc",
        },
        select: {
            id: true,
            name: true,
            provider: true,
            amount: true,
            currency: true,
            billingCycle: true,
            updatedAt: true,
        },
    });

    const items = canceledSubscriptions.map((subscription) => {
        const rawAmount = toNumber(subscription.amount);

        const monthlyAmount = calculateMonthlyEquivalentInCurrency(
            rawAmount,
            subscription.currency,
            subscription.billingCycle,
            baseCurrency
        );

        const yearlyAmount = calculateYearlyEquivalentInCurrency(
            rawAmount,
            subscription.currency,
            subscription.billingCycle,
            baseCurrency
        );

        return {
            id: subscription.id,
            name: subscription.name,
            provider: subscription.provider,
            originalAmount: Number(rawAmount.toFixed(2)),
            originalCurrency: subscription.currency,
            monthlyAmount: Number(monthlyAmount.toFixed(2)),
            yearlyAmount: Number(yearlyAmount.toFixed(2)),
            canceledAt: subscription.updatedAt,
        };
    });

    const monthlySavings = Number(
        items.reduce((sum, item) => sum + item.monthlyAmount, 0).toFixed(2)
    );

    const yearlySavings = Number(
        items.reduce((sum, item) => sum + item.yearlyAmount, 0).toFixed(2)
    );

    return {
        baseCurrency,
        canceledSubscriptionsCount: items.length,
        monthlySavings,
        yearlySavings,
        items,
    };
}

export async function getDashboardTrendsForUser(
    userId: string,
    months: number = 6
) {
    await syncOverdueSubscriptionsForUser(userId);
    const baseCurrency = await getBaseCurrencyForUser(userId);

    const safeMonths =
        Number.isNaN(months) || months <= 0 || months > 24 ? 6 : months;

    const now = new Date();
    const startMonth = getStartOfMonth(now);

    const monthBuckets = Array.from({ length: safeMonths }, (_, index) => {
        const date = addMonths(startMonth, - (safeMonths - 1 - index)); // Historia + obecny

        return {
            date,
            monthStart: getStartOfMonth(date),
            monthEnd: getEndOfMonth(date),
            month: getMonthKey(date),
            label: getMonthLabel(date),
            total: 0,
        };
    });

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
        },
    });

    for (const bucket of monthBuckets) {
        const total = subscriptions.reduce((sum, subscription) => {
            if (!isSubscriptionActiveInMonth(subscription, bucket.monthStart, bucket.monthEnd)) {
                return sum;
            }

            const amount = toNumber(subscription.amount);

            return (
                sum +
                calculateMonthlyEquivalentInCurrency(
                    amount,
                    subscription.currency,
                    subscription.billingCycle,
                    baseCurrency
                )
            );
        }, 0);

        bucket.total = Number(total.toFixed(2));
    }

    return {
        baseCurrency,
        type: "planned",
        months: safeMonths,
        items: monthBuckets.map((bucket) => ({
            month: bucket.month,
            label: bucket.label,
            total: bucket.total,
        })),
    };
}

export async function getBudgetImpactForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    const settings = await prisma.userSettings.findFirst({
        where: {
            userId,
        },
        select: {
            baseCurrency: true,
            monthlyIncome: true,
            incomeCurrency: true,
        },
    });

    const baseCurrency = normalizeCurrency(settings?.baseCurrency ?? BASE_CURRENCY);
    const incomeCurrency = normalizeCurrency(settings?.incomeCurrency ?? baseCurrency);

    const rawMonthlyIncome = toNumber(settings?.monthlyIncome);

    const summary = await getDashboardSummaryForUser(userId);
    const monthlySubscriptionsTotal = summary.monthlyTotal;

    if (!rawMonthlyIncome || rawMonthlyIncome <= 0) {
        return {
            baseCurrency,
            hasIncome: false,
            monthlyIncome: null,
            incomeCurrency,
            monthlySubscriptionsTotal,
            freeAfterSubscriptions: null,
            subscriptionsIncomePercentage: null,
        };
    }

    const monthlyIncome = convertCurrency(
        rawMonthlyIncome,
        incomeCurrency,
        baseCurrency
    );

    const freeAfterSubscriptions = monthlyIncome - monthlySubscriptionsTotal;

    const subscriptionsIncomePercentage =
        monthlyIncome > 0 ? (monthlySubscriptionsTotal / monthlyIncome) * 100 : 0;

    return {
        baseCurrency,
        hasIncome: true,
        monthlyIncome: Number(monthlyIncome.toFixed(2)),
        incomeCurrency,
        monthlySubscriptionsTotal: Number(monthlySubscriptionsTotal.toFixed(2)),
        freeAfterSubscriptions: Number(freeAfterSubscriptions.toFixed(2)),
        subscriptionsIncomePercentage: Number(
            subscriptionsIncomePercentage.toFixed(2)
        ),
    };
}