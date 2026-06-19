import { prisma } from "../lib/prisma";
import { UpdateUserSettingsInput } from "../validators/user-settings";

function toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toString" in value &&
        typeof value.toString === "function"
    ) {
        const parsed = Number(value.toString());
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

function serializeUserSettings(settings: {
    id: string;
    userId: string;
    baseCurrency: string;
    defaultReminderDaysBefore: number;
    notificationsEnabled: boolean;
    emailReportsEnabled: boolean;
    monthlyIncome: unknown;
    incomeCurrency: string;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        ...settings,
        monthlyIncome: toNumberOrNull(settings.monthlyIncome),
    };
}

export async function getOrCreateUserSettings(userId: string) {
    const existingSettings = await prisma.userSettings.findUnique({
        where: {
            userId,
        },
    });

    if (existingSettings) {
        return serializeUserSettings(existingSettings);
    }

    const createdSettings = await prisma.userSettings.create({
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

    return serializeUserSettings(createdSettings);
}

export async function updateUserSettings(
    userId: string,
    data: UpdateUserSettingsInput
) {
    await getOrCreateUserSettings(userId);

    const updatedSettings = await prisma.userSettings.update({
        where: {
            userId,
        },
        data: {
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

            ...(data.incomeCurrency !== undefined && {
                incomeCurrency: data.incomeCurrency,
            }),
        },
    });

    return serializeUserSettings(updatedSettings);
}