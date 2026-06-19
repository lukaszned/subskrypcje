import { z } from "zod";

export const supportedCurrencySchema = z.enum(["PLN", "EUR", "USD", "GBP"]);

export const updateUserSettingsSchema = z.object({
    baseCurrency: supportedCurrencySchema.optional(),

    defaultReminderDaysBefore: z
        .number()
        .int()
        .min(0)
        .max(30)
        .optional(),

    notificationsEnabled: z.boolean().optional(),

    emailReportsEnabled: z.boolean().optional(),

    monthlyIncome: z
        .number()
        .min(0)
        .max(100000000)
        .nullable()
        .optional(),

    incomeCurrency: supportedCurrencySchema.optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;