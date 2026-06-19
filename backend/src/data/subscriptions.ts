import { Subscription } from "../models/subscription";

export const subscriptions: Subscription[] = [
    {
        id: "1",
        name: "Netflix",
        amount: 43,
        currency: "PLN",
        category: "entertainment",
        billingCycle: "monthly",
        nextPaymentDate: "2026-05-10",
        isTrial: false,
        status: "pending",
    },
    {
        id: "2",
        name: "Spotify",
        amount: 23.99,
        currency: "PLN",
        category: "entertainment",
        billingCycle: "monthly",
        nextPaymentDate: "2026-05-15",
        isTrial: false,
        status: "paid",
    },
];