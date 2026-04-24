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

const subscriptionStatusValues = [
    "pending",
    "paid",
    "overdue",
    "canceled",
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

export const createSubscriptionSchema = z.object({
    name: z.string().trim().min(1, "name is required").max(100),
    provider: optionalNullableStringSchema,
    planName: optionalNullableStringSchema,
    amount: z.coerce.number().positive("amount must be greater than 0"),
    currency: z.string().trim().min(3).max(5),
    category: z.enum(subscriptionCategoryValues),
    billingCycle: z.enum(billingCycleValues),
    nextPaymentDate: dateStringSchema,
    lastPaymentDate: optionalNullableDateStringSchema,
    trialEndDate: optionalNullableDateStringSchema,
    isTrial: z.coerce.boolean().optional(),
    isRecurringBill: z.coerce.boolean().optional(),
    reminderDaysBefore: z.coerce
        .number()
        .int("reminderDaysBefore must be an integer")
        .min(0, "reminderDaysBefore cannot be negative")
        .max(30, "reminderDaysBefore cannot be greater than 30")
        .optional(),
    paymentMethodLabel: optionalNullableStringSchema,
    cancelUrl: z
        .string()
        .url("cancelUrl must be a valid URL")
        .nullable()
        .optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    status: z.enum(subscriptionStatusValues).optional(),
});

export const updateSubscriptionSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        provider: optionalNullableStringSchema,
        planName: optionalNullableStringSchema,
        amount: z.coerce.number().positive("amount must be greater than 0").optional(),
        currency: z.string().trim().min(3).max(5).optional(),
        category: z.enum(subscriptionCategoryValues).optional(),
        billingCycle: z.enum(billingCycleValues).optional(),
        nextPaymentDate: dateStringSchema.optional(),
        lastPaymentDate: optionalNullableDateStringSchema,
        trialEndDate: optionalNullableDateStringSchema,
        isTrial: z.coerce.boolean().optional(),
        isRecurringBill: z.coerce.boolean().optional(),
        reminderDaysBefore: z.coerce
            .number()
            .int("reminderDaysBefore must be an integer")
            .min(0, "reminderDaysBefore cannot be negative")
            .max(30, "reminderDaysBefore cannot be greater than 30")
            .optional(),
        paymentMethodLabel: optionalNullableStringSchema,
        cancelUrl: z
            .string()
            .url("cancelUrl must be a valid URL")
            .nullable()
            .optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
        status: z.enum(subscriptionStatusValues).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;