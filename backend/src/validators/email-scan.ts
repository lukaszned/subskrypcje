import { z } from "zod";

const subscriptionCategoryValues = [
    "entertainment",
    "utilities",
    "shopping",
    "health",
    "education",
    "productivity",
    "finance",
    "transport",
    "other",
] as const;

const billingCycleValues = [
    "monthly",
    "yearly",
    "weekly",
    "one_time",
    "custom",
] as const;

const dateStringSchema = z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Invalid date format",
    });

const optionalNullableDateStringSchema = z
    .union([dateStringSchema, z.null()])
    .optional();

const optionalNullableStringSchema = z
    .union([z.string().trim().min(1), z.null()])
    .optional();

export const acceptDetectedSubscriptionSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        provider: optionalNullableStringSchema,
        planName: optionalNullableStringSchema,
        amount: z.coerce.number().positive("amount must be greater than 0").optional(),
        currency: z.string().trim().min(3).max(5).optional(),
        category: z.enum(subscriptionCategoryValues).optional(),
        billingCycle: z.enum(billingCycleValues).optional(),
        nextPaymentDate: dateStringSchema.optional(),
        trialEndDate: optionalNullableDateStringSchema,
        isTrial: z.coerce.boolean().optional(),
        reminderDaysBefore: z.coerce
            .number()
            .int("reminderDaysBefore must be an integer")
            .min(0, "reminderDaysBefore cannot be negative")
            .max(30, "reminderDaysBefore cannot be greater than 30")
            .optional(),
        paymentMethodLabel: optionalNullableStringSchema,
        notes: z.string().trim().max(1000).nullable().optional(),
    })
    .strict();

export type AcceptDetectedSubscriptionInput = z.infer<
    typeof acceptDetectedSubscriptionSchema
>;

export const scanGmailSchema = z.object({
    connectionId: z.string().trim().min(1).optional(),
    debug: z.coerce.boolean().optional().default(false),
    dryRun: z.coerce.boolean().optional().default(false),
    limit: z.coerce
        .number()
        .int("limit must be an integer")
        .min(1, "limit cannot be less than 1")
        .max(50, "limit cannot be greater than 50")
        .optional()
        .default(25),
    sinceDays: z.coerce
        .number()
        .int("sinceDays must be an integer")
        .min(7, "sinceDays cannot be less than 7")
        .max(730, "sinceDays cannot be greater than 730")
        .optional()
        .default(365),
});

export type ScanGmailInput = z.infer<typeof scanGmailSchema>;

export const disconnectEmailConnectionSchema = z.object({
    deleteDetections: z.coerce.boolean().optional().default(false),
});

export type DisconnectEmailConnectionInput = z.infer<
    typeof disconnectEmailConnectionSchema
>;
