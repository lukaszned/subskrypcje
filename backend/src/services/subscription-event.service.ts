import { Prisma, SubscriptionEventType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function createSubscriptionEvent(params: {
    subscriptionId: string;
    userId: string;
    type: SubscriptionEventType;
    payload?: Prisma.InputJsonValue;
}) {
    return prisma.subscriptionEvent.create({
        data: {
            subscriptionId: params.subscriptionId,
            userId: params.userId,
            type: params.type,
            payload: params.payload,
        },
    });
}

export async function getSubscriptionHistoryForUser(
    subscriptionId: string,
    userId: string
) {
    return prisma.subscriptionEvent.findMany({
        where: {
            subscriptionId,
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}