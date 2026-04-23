import { Router } from "express";
import { prisma } from "../lib/prisma";
import {
    BillingCycle,
    SubscriptionCategory,
    SubscriptionStatus,
} from "@prisma/client";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;

        const subscriptions = await prisma.subscription.findMany({
            where: userId ? { userId: String(userId) } : undefined,
            orderBy: {
                createdAt: "desc",
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
        const {
            userId,
            name,
            amount,
            currency,
            category,
            billingCycle,
            nextPaymentDate,
            isTrial,
            status,
        } = req.body;

        if (
            !userId ||
            !name ||
            amount === undefined ||
            !currency ||
            !category ||
            !billingCycle ||
            !nextPaymentDate
        ) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newSubscription = await prisma.subscription.create({
            data: {
                userId,
                name,
                amount,
                currency,
                category: category as SubscriptionCategory,
                billingCycle: billingCycle as BillingCycle,
                nextPaymentDate: new Date(nextPaymentDate),
                isTrial: Boolean(isTrial),
                status: (status as SubscriptionStatus) || SubscriptionStatus.pending,
            },
        });

        res.status(201).json(newSubscription);
    } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            amount,
            currency,
            category,
            billingCycle,
            nextPaymentDate,
            isTrial,
            status,
        } = req.body;

        const existingSubscription = await prisma.subscription.findUnique({
            where: { id },
        });

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(amount !== undefined && { amount }),
                ...(currency !== undefined && { currency }),
                ...(category !== undefined && {
                    category: category as SubscriptionCategory,
                }),
                ...(billingCycle !== undefined && {
                    billingCycle: billingCycle as BillingCycle,
                }),
                ...(nextPaymentDate !== undefined && {
                    nextPaymentDate: new Date(nextPaymentDate),
                }),
                ...(isTrial !== undefined && { isTrial: Boolean(isTrial) }),
                ...(status !== undefined && {
                    status: status as SubscriptionStatus,
                }),
            },
        });

        res.json(updatedSubscription);
    } catch (error) {
        console.error("Error updating subscription:", error);
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