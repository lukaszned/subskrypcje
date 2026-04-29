import { z } from "zod";

export const updateUserSettingsSchema = z.object({
    baseCurrency: z.enum(["PLN", "EUR", "USD"]).optional(),
    defaultReminderDaysBefore: z.number().int().min(0).max(30).optional(),
    notificationsEnabled: z.boolean().optional(),
    emailReportsEnabled: z.boolean().optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;