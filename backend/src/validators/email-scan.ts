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
