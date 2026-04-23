import { Router } from "express";
import { subscriptions } from "../data/subscriptions";
import { Subscription } from "../models/subscription";

const router = Router();

router.get("/", (_req, res) => {
    res.json(subscriptions);
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

export default router;