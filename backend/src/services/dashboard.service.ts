import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    SubscriptionCategory,
    SubscriptionEventType,
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

type DashboardTrendsType = "planned" | "real";

function normalizeDashboardTrendsType(
    type: string | null | undefined
): DashboardTrendsType {
    if (type === "real") {
        return "real";
    }

    return "planned";
}

export async function getDashboardTrendsForUser(
    userId: string,
    months: number = 6,
    type: string = "planned"
) {
    await syncOverdueSubscriptionsForUser(userId);
    const baseCurrency = await getBaseCurrencyForUser(userId);

    const safeMonths =
        Number.isNaN(months) || months <= 0 || months > 24 ? 6 : months;

    const trendsType = normalizeDashboardTrendsType(type);

    const now = new Date();
    const currentMonthStart = getStartOfMonth(now);

    const monthBuckets = Array.from({ length: safeMonths }, (_, index) => {
        const date = addMonths(currentMonthStart, -(safeMonths - 1 - index));

        return {
            date,
            monthStart: getStartOfMonth(date),
            monthEnd: getEndOfMonth(date),
            month: getMonthKey(date),
            label: getMonthLabel(date),
            total: 0,
        };
    });

    if (trendsType === "real") {
        const firstBucket = monthBuckets[0];
        const lastBucket = monthBuckets[monthBuckets.length - 1];

        const payments = await prisma.subscriptionPayment.findMany({
            where: {
                userId,
                paidAt: {
                    gte: firstBucket.monthStart,
                    lte: lastBucket.monthEnd,
                },
            },
            orderBy: {
                paidAt: "asc",
            },
            select: {
                amount: true,
                currency: true,
                paidAt: true,
            },
        });

        for (const payment of payments) {
            const bucket = monthBuckets.find((monthBucket) => {
                return (
                    payment.paidAt >= monthBucket.monthStart &&
                    payment.paidAt <= monthBucket.monthEnd
                );
            });

            if (!bucket) {
                continue;
            }

            const convertedAmount = convertCurrency(
                toNumber(payment.amount),
                payment.currency,
                baseCurrency
            );

            bucket.total += convertedAmount;
        }

        return {
            baseCurrency,
            type: trendsType,
            months: safeMonths,
            items: monthBuckets.map((bucket) => ({
                month: bucket.month,
                label: bucket.label,
                total: Number(bucket.total.toFixed(2)),
            })),
        };
    }

    const subscriptions = await prisma.subscription.findMany({
        where: {
            userId,
        },
    });

    for (const bucket of monthBuckets) {
        const total = subscriptions.reduce((sum, subscription) => {
            if (
                !isSubscriptionActiveInMonth(
                    subscription,
                    bucket.monthStart,
                    bucket.monthEnd
                )
            ) {
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
        type: trendsType,
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
function buildActivityMessage(params: {
    type: SubscriptionEventType;
    subscriptionName: string;
    provider: string | null;
}): string {
    const displayName = params.provider
        ? `${params.subscriptionName} (${params.provider})`
        : params.subscriptionName;

    switch (params.type) {
        case SubscriptionEventType.created:
            return `Dodano subskrypcję ${displayName}`;
        case SubscriptionEventType.updated:
            return `Zaktualizowano subskrypcję ${displayName}`;
        case SubscriptionEventType.paid:
            return `Odnotowano płatność dla ${displayName}`;
        case SubscriptionEventType.canceled:
            return `Anulowano subskrypcję ${displayName}`;
        default:
            return `Zarejestrowano aktywność dla ${displayName}`;
    }
}

export async function getDashboardActivityForUser(
    userId: string,
    limit: number = 10
) {
    const safeLimit =
        Number.isNaN(limit) || limit <= 0 || limit > 50 ? 10 : limit;

    const events = await prisma.subscriptionEvent.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: safeLimit,
        include: {
            subscription: {
                select: {
                    id: true,
                    name: true,
                    provider: true,
                    amount: true,
                    currency: true,
                    status: true,
                    nextPaymentDate: true,
                    lastPaymentDate: true,
                    category: true,
                    billingCycle: true,
                },
            },
        },
    });

    const items = events.map((event) => {
        const subscription = event.subscription;

        return {
            id: event.id,
            type: event.type,
            message: buildActivityMessage({
                type: event.type,
                subscriptionName: subscription.name,
                provider: subscription.provider,
            }),
            payload: event.payload,
            createdAt: event.createdAt,
            subscription: {
                id: subscription.id,
                name: subscription.name,
                provider: subscription.provider,
                amount: Number(toNumber(subscription.amount).toFixed(2)),
                currency: subscription.currency,
                status: subscription.status,
                nextPaymentDate: subscription.nextPaymentDate,
                lastPaymentDate: subscription.lastPaymentDate,
                category: subscription.category,
                billingCycle: subscription.billingCycle,
            },
        };
    });

    return {
        count: items.length,
        limit: safeLimit,
        items,
    };
}
type HealthScoreStatus = "excellent" | "good" | "needs_attention" | "risky";

type HealthScoreFactor = {
    type: "positive" | "negative" | "neutral";
    code: string;
    title: string;
    description: string;
    impact: number;
};

type HealthScoreRecommendedAction = {
    type: string;
    title: string;
    description: string;
};

function clampHealthScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthScoreStatus(score: number): {
    status: HealthScoreStatus;
    label: string;
} {
    if (score >= 90) {
        return {
            status: "excellent",
            label: "Świetnie",
        };
    }

    if (score >= 75) {
        return {
            status: "good",
            label: "Dobrze",
        };
    }

    if (score >= 50) {
        return {
            status: "needs_attention",
            label: "Wymaga uwagi",
        };
    }

    return {
        status: "risky",
        label: "Ryzykownie",
    };
}

function normalizeGuideMatchValue(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .trim()
        .replace(/-/g, " ")
        .replace(/\s+/g, " ");
}

function subscriptionHasCatalogCancelGuide(
    subscription: {
        name: string;
        provider: string | null;
    },
    guides: Array<{
        providerName: string;
        providerSlug: string;
        matchingKeywords: string[];
    }>
): boolean {
    const searchText = normalizeGuideMatchValue(
        `${subscription.name} ${subscription.provider ?? ""}`
    );

    return guides.some((guide) => {
        const providerName = normalizeGuideMatchValue(guide.providerName);
        const providerSlug = normalizeGuideMatchValue(guide.providerSlug);

        if (providerName && searchText.includes(providerName)) {
            return true;
        }

        if (providerSlug && searchText.includes(providerSlug)) {
            return true;
        }

        return guide.matchingKeywords.some((keyword) => {
            const normalizedKeyword = normalizeGuideMatchValue(keyword);
            return (
                normalizedKeyword.length > 0 &&
                searchText.includes(normalizedKeyword)
            );
        });
    });
}

function buildHealthSummary(params: {
    score: number;
    overdueCount: number;
    trialsEndingSoonCount: number;
    subscriptionsIncomePercentage: number | null;
    hasIncome: boolean;
}): string {
    if (params.score >= 90) {
        return "Bardzo dobrze kontrolujesz swoje subskrypcje.";
    }

    if (params.overdueCount > 0) {
        if (params.overdueCount === 1) {
            return "Masz 1 zaległą płatność, którą warto sprawdzić w pierwszej kolejności.";
        }

        return `Masz ${params.overdueCount} zaległe płatności, które warto sprawdzić w pierwszej kolejności.`;
    }

    if (params.trialsEndingSoonCount > 0) {
        if (params.trialsEndingSoonCount === 1) {
            return "Masz 1 trial kończący się w ciągu 7 dni. Warto zdecydować, czy chcesz go kontynuować.";
        }

        return `Masz ${params.trialsEndingSoonCount} triale kończące się w ciągu 7 dni. Warto zdecydować, czy chcesz je kontynuować.`;
    }

    if (
        params.hasIncome &&
        params.subscriptionsIncomePercentage !== null &&
        params.subscriptionsIncomePercentage > 10
    ) {
        return `Subskrypcje stanowią ${params.subscriptionsIncomePercentage}% Twojego miesięcznego dochodu. Warto sprawdzić, czy wszystkie są nadal potrzebne.`;
    }

    if (!params.hasIncome) {
        return "Dodaj miesięczny dochód w ustawieniach, żeby aplikacja mogła dokładniej ocenić wpływ subskrypcji na budżet.";
    }

    return "Twoje subskrypcje są pod kontrolą, ale kilka elementów warto regularnie monitorować.";
}

export async function getDashboardHealthScoreForUser(userId: string) {
    await syncOverdueSubscriptionsForUser(userId);

    const now = new Date();

    const next3Days = new Date(now);
    next3Days.setDate(now.getDate() + 3);

    const next7Days = new Date(now);
    next7Days.setDate(now.getDate() + 7);

    const budgetImpact = await getBudgetImpactForUser(userId);
    const summary = await getDashboardSummaryForUser(userId);

    const activeSubscriptions = await prisma.subscription.findMany({
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
            status: true,
            isTrial: true,
            trialEndDate: true,
            nextPaymentDate: true,
            amount: true,
            currency: true,
            billingCycle: true,
        },
    });

    const activeCancelGuides = await prisma.providerCancelGuide.findMany({
        where: {
            isActive: true,
        },
        select: {
            providerName: true,
            providerSlug: true,
            matchingKeywords: true,
        },
    });

    const overdueCount = activeSubscriptions.filter(
        (subscription) => subscription.status === SubscriptionStatus.overdue
    ).length;

    const trialsEndingSoonCount = activeSubscriptions.filter((subscription) => {
        return (
            subscription.isTrial &&
            subscription.trialEndDate !== null &&
            subscription.trialEndDate >= now &&
            subscription.trialEndDate <= next7Days
        );
    }).length;

    const upcomingPaymentsSoonCount = activeSubscriptions.filter(
        (subscription) => {
            return (
                subscription.nextPaymentDate >= now &&
                subscription.nextPaymentDate <= next3Days
            );
        }
    ).length;

    const missingCancelGuidesCount = activeSubscriptions.filter(
        (subscription) =>
            !subscriptionHasCatalogCancelGuide(subscription, activeCancelGuides)
    ).length;

    let score = 100;

    const factors: HealthScoreFactor[] = [];
    const recommendedActions: HealthScoreRecommendedAction[] = [];

    if (overdueCount > 0) {
        const impact = -Math.min(overdueCount * 20, 40);
        score += impact;

        factors.push({
            type: "negative",
            code: "OVERDUE_PAYMENTS",
            title: "Zaległe płatności",
            description:
                overdueCount === 1
                    ? "1 subskrypcja ma status zaległej płatności."
                    : `${overdueCount} subskrypcje mają status zaległej płatności.`,
            impact,
        });

        recommendedActions.push({
            type: "review_overdue",
            title: "Sprawdź zaległe płatności",
            description:
                "Zweryfikuj subskrypcje oznaczone jako zaległe i oznacz je jako opłacone albo anulowane.",
        });
    } else {
        factors.push({
            type: "positive",
            code: "NO_OVERDUE_PAYMENTS",
            title: "Brak zaległości",
            description: "Nie masz aktualnie zaległych płatności.",
            impact: 0,
        });
    }

    if (trialsEndingSoonCount > 0) {
        const impact = -Math.min(trialsEndingSoonCount * 15, 30);
        score += impact;

        factors.push({
            type: "negative",
            code: "TRIALS_ENDING_SOON",
            title: "Trial wymaga decyzji",
            description:
                trialsEndingSoonCount === 1
                    ? "1 trial kończy się w ciągu 7 dni."
                    : `${trialsEndingSoonCount} triale kończą się w ciągu 7 dni.`,
            impact,
        });

        recommendedActions.push({
            type: "review_trials",
            title: "Sprawdź kończące się triale",
            description:
                "Zdecyduj, czy chcesz kontynuować triale przed pierwszą płatnością.",
        });
    }

    if (upcomingPaymentsSoonCount > 0) {
        const impact = -Math.min(upcomingPaymentsSoonCount * 5, 15);
        score += impact;

        factors.push({
            type: "negative",
            code: "UPCOMING_PAYMENTS_SOON",
            title: "Nadchodzące płatności",
            description:
                upcomingPaymentsSoonCount === 1
                    ? "1 płatność przypada w ciągu 3 dni."
                    : `${upcomingPaymentsSoonCount} płatności przypadają w ciągu 3 dni.`,
            impact,
        });

        recommendedActions.push({
            type: "review_upcoming",
            title: "Sprawdź najbliższe płatności",
            description:
                "Przejrzyj najbliższe odnowienia i upewnij się, że nadal chcesz z nich korzystać.",
        });
    }

    if (!budgetImpact.hasIncome) {
        score -= 5;

        factors.push({
            type: "neutral",
            code: "MISSING_INCOME",
            title: "Brak miesięcznego dochodu",
            description:
                "Nie podano miesięcznego dochodu, więc analiza wpływu subskrypcji na budżet jest mniej dokładna.",
            impact: -5,
        });

        recommendedActions.push({
            type: "add_income",
            title: "Dodaj miesięczny dochód",
            description:
                "Uzupełnij dochód w ustawieniach, żeby lepiej ocenić wpływ subskrypcji na budżet.",
        });
    } else if (
        budgetImpact.subscriptionsIncomePercentage !== null &&
        budgetImpact.subscriptionsIncomePercentage > 20
    ) {
        score -= 35;

        factors.push({
            type: "negative",
            code: "VERY_HIGH_INCOME_SHARE",
            title: "Bardzo wysoki udział w dochodzie",
            description: `Subskrypcje stanowią ${budgetImpact.subscriptionsIncomePercentage}% miesięcznego dochodu.`,
            impact: -35,
        });

        recommendedActions.push({
            type: "reduce_costs",
            title: "Przejrzyj najdroższe subskrypcje",
            description:
                "Subskrypcje mają wysoki udział w dochodzie. Warto sprawdzić, które można anulować lub obniżyć.",
        });
    } else if (
        budgetImpact.subscriptionsIncomePercentage !== null &&
        budgetImpact.subscriptionsIncomePercentage > 10
    ) {
        score -= 20;

        factors.push({
            type: "negative",
            code: "HIGH_INCOME_SHARE",
            title: "Wysoki udział w dochodzie",
            description: `Subskrypcje stanowią ${budgetImpact.subscriptionsIncomePercentage}% miesięcznego dochodu.`,
            impact: -20,
        });

        recommendedActions.push({
            type: "review_costs",
            title: "Sprawdź koszt subskrypcji",
            description:
                "Warto przejrzeć subskrypcje i sprawdzić, czy wszystkie są nadal potrzebne.",
        });
    } else {
        factors.push({
            type: "positive",
            code: "HEALTHY_INCOME_SHARE",
            title: "Dobry udział w dochodzie",
            description: `Subskrypcje stanowią ${budgetImpact.subscriptionsIncomePercentage}% miesięcznego dochodu.`,
            impact: 0,
        });
    }

    if (missingCancelGuidesCount > 0) {
        const impact = -Math.min(missingCancelGuidesCount * 3, 15);
        score += impact;

        factors.push({
            type: "negative",
            code: "MISSING_CANCEL_GUIDES",
            title: "Brak instrukcji anulowania",
            description:
                missingCancelGuidesCount === 1
                    ? "1 aktywna subskrypcja nie ma jeszcze gotowej instrukcji anulowania."
                    : `${missingCancelGuidesCount} aktywne subskrypcje nie mają jeszcze gotowej instrukcji anulowania.`,
            impact,
        });

        recommendedActions.push({
            type: "request_cancel_guides",
            title: "Zgłoś brakujące instrukcje",
            description:
                "Dla usług bez gotowego poradnika można później dodać opcję zgłoszenia brakującej instrukcji anulowania.",
        });
    } else if (activeSubscriptions.length > 0) {
        factors.push({
            type: "positive",
            code: "CANCEL_GUIDES_AVAILABLE",
            title: "Instrukcje anulowania dostępne",
            description:
                "Aktywne subskrypcje mają dopasowane instrukcje anulowania w katalogu.",
            impact: 0,
        });
    }

    const finalScore = clampHealthScore(score);
    const { status, label } = getHealthScoreStatus(finalScore);

    return {
        score: finalScore,
        status,
        label,
        summary: buildHealthSummary({
            score: finalScore,
            overdueCount,
            trialsEndingSoonCount,
            subscriptionsIncomePercentage:
                budgetImpact.subscriptionsIncomePercentage,
            hasIncome: budgetImpact.hasIncome,
        }),
        baseCurrency: budgetImpact.baseCurrency,
        metrics: {
            monthlySubscriptionsTotal: budgetImpact.monthlySubscriptionsTotal,
            monthlyIncome: budgetImpact.monthlyIncome,
            incomeCurrency: budgetImpact.incomeCurrency,
            freeAfterSubscriptions: budgetImpact.freeAfterSubscriptions,
            subscriptionsIncomePercentage:
                budgetImpact.subscriptionsIncomePercentage,
            activeSubscriptionsCount: summary.activeSubscriptionsCount,
            trialsCount: summary.trialsCount,
            trialsEndingSoonCount,
            overdueCount,
            upcomingPaymentsSoonCount,
            missingCancelGuidesCount,
        },
        factors,
        recommendedActions,
    };
}
