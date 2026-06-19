export type SubscriptionCategory =
    | "entertainment"
    | "utilities"
    | "shopping"
    | "health"
    | "education"
    | "other";

export type BillingCycle = "monthly" | "yearly" | "weekly" | "one-time";

export type SubscriptionStatus = "pending" | "paid";

export interface Subscription {
    id: string;
    name: string;
    amount: number;
    currency: string;
    category: SubscriptionCategory;
    billingCycle: BillingCycle;
    nextPaymentDate: string;
    isTrial: boolean;
    status: SubscriptionStatus;
}