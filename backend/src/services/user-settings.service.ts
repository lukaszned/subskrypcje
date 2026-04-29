import { prisma } from "../lib/prisma";
import { UpdateUserSettingsInput } from "../validators/user-settings";

export async function getOrCreateUserSettings(userId: string) {
    const existingSettings = await prisma.userSettings.findUnique({
        where: {
            userId,
        },
    });

    if (existingSettings) {
        return existingSettings;
    }

    return prisma.userSettings.create({
        data: {
            userId,
            baseCurrency: "PLN",
            defaultReminderDaysBefore: 2,
            notificationsEnabled: true,
            emailReportsEnabled: false,
        },
    });
}

export async function updateUserSettings(
    userId: string,
    data: UpdateUserSettingsInput
) {
    await getOrCreateUserSettings(userId);

    return prisma.userSettings.update({
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
        },
    });
}