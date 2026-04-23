import { Router } from "express";
import { subscriptions } from "../data/subscriptions";
import { Subscription } from "../models/subscription";

const router = Router();

router.get("/", (_req, res) => {
    res.json(subscriptions);
});

router.get("/:id", (req, res) => {
    const { id } = req.params;

    const subscription = subscriptions.find((s) => s.id === id);

    if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
    }

    res.json(subscription);
});

router.post("/", (req, res) => {
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

    if (
        !name ||
        amount === undefined ||
        !currency ||
        !category ||
        !billingCycle ||
        !nextPaymentDate ||
        isTrial === undefined ||
        !status
    ) {
        return res.status(400).json({
            message: "Missing required fields",
        });
    }

    const newSubscription: Subscription = {
        id: Date.now().toString(),
        name,
        amount: Number(amount),
        currency,
        category,
        billingCycle,
        nextPaymentDate,
        isTrial,
        status,
    };

    subscriptions.push(newSubscription);

    res.status(201).json(newSubscription);
});

router.patch("/:id", (req, res) => {
    const { id } = req.params;

    const subscription = subscriptions.find((s) => s.id === id);

    if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
    }

    Object.assign(subscription, req.body);

    res.json(subscription);
});

router.patch("/:id/pay", (req, res) => {
    const { id } = req.params;

    const subscription = subscriptions.find((s) => s.id === id);

    if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.status = "paid";

    res.json(subscription);
});

router.delete("/:id", (req, res) => {
    const { id } = req.params;

    const index = subscriptions.findIndex((s) => s.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Subscription not found" });
    }

    const deletedSubscription = subscriptions.splice(index, 1);

    res.json(deletedSubscription[0]);
});

export default router;