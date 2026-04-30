import { prisma } from "../lib/prisma";

export async function getUserSettingsForUser(userId: string) {
    let settings = await prisma.userSettings.findUnique({
        where: { userId },
    });

    if (!settings) {
        settings = await prisma.userSettings.create({
            data: {
                userId,
                baseCurrency: "PLN",
                defaultReminderDaysBefore: 2,
                notificationsEnabled: true,
                emailReportsEnabled: false,
                monthlyIncome: null,
                incomeCurrency: "PLN",
            },
        });
    }

    return settings;
}

export async function updateUserSettingsForUser(
    userId: string,
    data: {
        baseCurrency?: string;
        defaultReminderDaysBefore?: number;
        notificationsEnabled?: boolean;
        emailReportsEnabled?: boolean;
        monthlyIncome?: number | null;
        incomeCurrency?: string | null;
    }
) {
    return prisma.userSettings.upsert({
        where: { userId },
        update: {
            ...(data.baseCurrency !== undefined && {
                baseCurrency: data.baseCurrency,
            }),
            ...(data.defaultReminderDaysBefore !== undefined && {
                defaultReminderDaysBefore: data.defaultReminderDaysBefore,
            }),
            ...(data.notificationsEnabled !== undefined && {
                notificationsEnabled: data.notificationsEnabled,
            }),
            ...(data.emailReportsEnabled !== undefined && {
                emailReportsEnabled: data.emailReportsEnabled,
            }),
            ...(data.monthlyIncome !== undefined && {
                monthlyIncome: data.monthlyIncome,
            }),
            ...(data.incomeCurrency !== undefined &&
                data.incomeCurrency !== null && {
                incomeCurrency: data.incomeCurrency,
            }),
        },
        create: {
            userId,
            baseCurrency: data.baseCurrency ?? "PLN",
            defaultReminderDaysBefore: data.defaultReminderDaysBefore ?? 2,
            notificationsEnabled: data.notificationsEnabled ?? true,
            emailReportsEnabled: data.emailReportsEnabled ?? false,
            monthlyIncome: data.monthlyIncome ?? null,
            incomeCurrency: data.incomeCurrency ?? "PLN",
        },
    });
}