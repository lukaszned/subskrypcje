import { BillingCycle, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function createSubscriptionPayment(params: {
    subscriptionId: string;
    userId: string;
    amount: Prisma.Decimal | number | string;
    currency: string;
    billingCycle: BillingCycle;
    paidAt?: Date;
    previousNextPaymentDate?: Date | null;
    nextPaymentDateAfter?: Date | null;
}) {
    return prisma.subscriptionPayment.create({
        data: {
            subscriptionId: params.subscriptionId,
            userId: params.userId,
            amount: params.amount,
            currency: params.currency,
            billingCycle: params.billingCycle,
            paidAt: params.paidAt ?? new Date(),
            previousNextPaymentDate: params.previousNextPaymentDate ?? null,
            nextPaymentDateAfter: params.nextPaymentDateAfter ?? null,
        },
    });
}

export async function getSubscriptionPaymentsForUser(
    subscriptionId: string,
    userId: string
) {
    return prisma.subscriptionPayment.findMany({
        where: {
            subscriptionId,
            userId,
        },
        orderBy: {
            paidAt: "desc",
        },
    });
}