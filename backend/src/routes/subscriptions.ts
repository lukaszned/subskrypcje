import { Router } from "express";
import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    SubscriptionCategory,
    SubscriptionStatus,
} from "@prisma/client";
import {
    createSubscriptionSchema,
    updateSubscriptionSchema,
} from "../validators/subscription";
import { ZodError } from "zod";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const { userId, category, status } = req.query;

        const subscriptions = await prisma.subscription.findMany({
            where: {
                ...(userId ? { userId: String(userId) } : {}),
                ...(category
                    ? { category: String(category) as SubscriptionCategory }
                    : {}),
                ...(status ? { status: String(status) as SubscriptionStatus } : {}),
            },
            orderBy: {
                nextPaymentDate: "asc",
            },
        });

        res.json(subscriptions);
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const subscription = await prisma.subscription.findUnique({
            where: { id },
        });

        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        res.json(subscription);
    } catch (error) {
        console.error("Error fetching subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/", async (req, res) => {
    try {
        const parsedData = createSubscriptionSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { id: parsedData.userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newSubscription = await prisma.subscription.create({
            data: {
                userId: parsedData.userId,
                name: parsedData.name,
                provider: parsedData.provider ?? null,
                planName: parsedData.planName ?? null,
                amount: parsedData.amount,
                currency: parsedData.currency,
                category: parsedData.category as SubscriptionCategory,
                billingCycle: parsedData.billingCycle as BillingCycle,
                nextPaymentDate: new Date(parsedData.nextPaymentDate),
                lastPaymentDate: parsedData.lastPaymentDate
                    ? new Date(parsedData.lastPaymentDate)
                    : null,
                trialEndDate: parsedData.trialEndDate
                    ? new Date(parsedData.trialEndDate)
                    : null,
                isTrial: parsedData.isTrial ?? false,
                isRecurringBill: parsedData.isRecurringBill ?? true,
                reminderDaysBefore: parsedData.reminderDaysBefore ?? 1,
                paymentMethodLabel: parsedData.paymentMethodLabel ?? null,
                cancelUrl: parsedData.cancelUrl ?? null,
                notes: parsedData.notes ?? null,
                status:
                    (parsedData.status as SubscriptionStatus) ||
                    SubscriptionStatus.pending,
            },
        });

        res.status(201).json(newSubscription);
    } catch (error) {
        console.error("Error creating subscription:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const parsedData = updateSubscriptionSchema.parse(req.body);

        const existingSubscription = await prisma.subscription.findUnique({
            where: { id },
        });

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id },
            data: {
                ...(parsedData.name !== undefined && { name: parsedData.name }),
                ...(parsedData.provider !== undefined && {
                    provider: parsedData.provider ?? null,
                }),
                ...(parsedData.planName !== undefined && {
                    planName: parsedData.planName ?? null,
                }),
                ...(parsedData.amount !== undefined && { amount: parsedData.amount }),
                ...(parsedData.currency !== undefined && {
                    currency: parsedData.currency,
                }),
                ...(parsedData.category !== undefined && {
                    category: parsedData.category as SubscriptionCategory,
                }),
                ...(parsedData.billingCycle !== undefined && {
                    billingCycle: parsedData.billingCycle as BillingCycle,
                }),
                ...(parsedData.nextPaymentDate !== undefined && {
                    nextPaymentDate: new Date(parsedData.nextPaymentDate),
                }),
                ...(parsedData.lastPaymentDate !== undefined && {
                    lastPaymentDate: parsedData.lastPaymentDate
                        ? new Date(parsedData.lastPaymentDate)
                        : null,
                }),
                ...(parsedData.trialEndDate !== undefined && {
                    trialEndDate: parsedData.trialEndDate
                        ? new Date(parsedData.trialEndDate)
                        : null,
                }),
                ...(parsedData.isTrial !== undefined && { isTrial: parsedData.isTrial }),
                ...(parsedData.isRecurringBill !== undefined && {
                    isRecurringBill: parsedData.isRecurringBill,
                }),
                ...(parsedData.reminderDaysBefore !== undefined && {
                    reminderDaysBefore: parsedData.reminderDaysBefore,
                }),
                ...(parsedData.paymentMethodLabel !== undefined && {
                    paymentMethodLabel: parsedData.paymentMethodLabel ?? null,
                }),
                ...(parsedData.cancelUrl !== undefined && {
                    cancelUrl: parsedData.cancelUrl ?? null,
                }),
                ...(parsedData.notes !== undefined && {
                    notes: parsedData.notes ?? null,
                }),
                ...(parsedData.status !== undefined && {
                    status: parsedData.status as SubscriptionStatus,
                }),
            },
        });

        res.json(updatedSubscription);
    } catch (error) {
        console.error("Error updating subscription:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch("/:id/pay", async (req, res) => {
    try {
        const { id } = req.params;

        const existingSubscription = await prisma.subscription.findUnique({
            where: { id },
        });

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id },
            data: {
                status: SubscriptionStatus.paid,
                lastPaymentDate: new Date(),
            },
        });

        res.json(updatedSubscription);
    } catch (error) {
        console.error("Error marking subscription as paid:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const existingSubscription = await prisma.subscription.findUnique({
            where: { id },
        });

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const deletedSubscription = await prisma.subscription.delete({
            where: { id },
        });

        res.json(deletedSubscription);
    } catch (error) {
        console.error("Error deleting subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;