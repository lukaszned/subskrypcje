import { Response } from "express";
import { ZodError } from "zod";
import {
    createSubscriptionSchema,
    updateSubscriptionSchema,
} from "../validators/subscription";
import {
    cancelSubscriptionForUser,
    createSubscription,
    deleteSubscriptionForUser,
    findPotentialDuplicateSubscription,
    getSubscriptionByIdForUser,
    getSubscriptionsForUser,
    markSubscriptionAsPaidForUser,
    updateSubscriptionForUser,
} from "../services/subscription.service";
import {
    createSubscriptionEvent,
    getSubscriptionHistoryForUser,
} from "../services/subscription-event.service";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function getSubscriptionsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { category, status, search, sortBy, sortOrder } = req.query;

        const subscriptions = await getSubscriptionsForUser(req.appUser.id, {
            category: category ? String(category) : undefined,
            status: status ? String(status) : undefined,
            search: search ? String(search) : undefined,
            sortBy: sortBy ? String(sortBy) : undefined,
            sortOrder: sortOrder ? String(sortOrder) : undefined,
        });

        res.json(subscriptions);
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getSubscriptionByIdHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { id } = req.params;

        const subscription = await getSubscriptionByIdForUser(id, req.appUser.id);

        if (!subscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        res.json(subscription);
    } catch (error) {
        console.error("Error fetching subscription:", error);
        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getSubscriptionHistoryHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { id } = req.params;

        const subscription = await getSubscriptionByIdForUser(id, req.appUser.id);

        if (!subscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        const history = await getSubscriptionHistoryForUser(id, req.appUser.id);

        return res.json({
            count: history.length,
            items: history,
        });
    } catch (error) {
        console.error("Error fetching subscription history:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function createSubscriptionHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const parsedData = createSubscriptionSchema.parse(req.body);

        const duplicate = await findPotentialDuplicateSubscription(
            req.appUser.id,
            parsedData
        );

        if (duplicate) {
            return res.status(409).json({
                message: "A similar subscription already exists",
                code: "DUPLICATE_SUBSCRIPTION",
                duplicate: {
                    id: duplicate.id,
                    name: duplicate.name,
                    provider: duplicate.provider,
                    planName: duplicate.planName,
                    status: duplicate.status,
                },
            });
        }

        const newSubscription = await createSubscription(req.appUser.id, parsedData);

        await createSubscriptionEvent({
            subscriptionId: newSubscription.id,
            userId: req.appUser.id,
            type: "created",
            payload: {
                name: newSubscription.name,
                provider: newSubscription.provider,
                planName: newSubscription.planName,
                amount: newSubscription.amount.toString(),
                currency: newSubscription.currency,
                category: newSubscription.category,
                billingCycle: newSubscription.billingCycle,
                nextPaymentDate: newSubscription.nextPaymentDate.toISOString(),
                status: newSubscription.status,
            },
        });

        res.status(201).json(newSubscription);
    } catch (error) {
        console.error("Error creating subscription:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation error",
                code: "VALIDATION_ERROR",
                errors: error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function updateSubscriptionHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { id } = req.params;
        const parsedData = updateSubscriptionSchema.parse(req.body);

        const existingSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        if (!existingSubscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        await updateSubscriptionForUser(id, req.appUser.id, parsedData);

        const updatedSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        await createSubscriptionEvent({
            subscriptionId: id,
            userId: req.appUser.id,
            type: "updated",
            payload: parsedData,
        });

        res.json(updatedSubscription);
    } catch (error) {
        console.error("Error updating subscription:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation error",
                code: "VALIDATION_ERROR",
                errors: error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function markSubscriptionAsPaidHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { id } = req.params;

        const existingSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        if (!existingSubscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        const previousStatus = existingSubscription.status;
        const previousNextPaymentDate = existingSubscription.nextPaymentDate;
        const previousLastPaymentDate = existingSubscription.lastPaymentDate;

        await markSubscriptionAsPaidForUser(id, req.appUser.id);

        const updatedSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        await createSubscriptionEvent({
            subscriptionId: id,
            userId: req.appUser.id,
            type: "paid",
            payload: {
                action: "payment_recorded",
                previousStatus,
                resultingStatus: updatedSubscription?.status ?? null,
                previousNextPaymentDate: previousNextPaymentDate.toISOString(),
                newNextPaymentDate: updatedSubscription?.nextPaymentDate
                    ? updatedSubscription.nextPaymentDate.toISOString()
                    : null,
                previousLastPaymentDate: previousLastPaymentDate
                    ? previousLastPaymentDate.toISOString()
                    : null,
                newLastPaymentDate: updatedSubscription?.lastPaymentDate
                    ? updatedSubscription.lastPaymentDate.toISOString()
                    : null,
                paidAt: new Date().toISOString(),
            },
        });

        res.json(updatedSubscription);
    } catch (error) {
        console.error("Error marking subscription as paid:", error);
        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function cancelSubscriptionHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { id } = req.params;

        const existingSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        if (!existingSubscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        const previousStatus = existingSubscription.status;

        await cancelSubscriptionForUser(id, req.appUser.id);

        const canceledSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        await createSubscriptionEvent({
            subscriptionId: id,
            userId: req.appUser.id,
            type: "canceled",
            payload: {
                previousStatus,
                resultingStatus: canceledSubscription?.status ?? "canceled",
                canceledAt: new Date().toISOString(),
            },
        });

        res.json(canceledSubscription);
    } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function deleteSubscriptionHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const { id } = req.params;

        const existingSubscription = await getSubscriptionByIdForUser(
            id,
            req.appUser.id
        );

        if (!existingSubscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        await deleteSubscriptionForUser(id, req.appUser.id);

        res.json({
            message: "Subscription deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting subscription:", error);
        res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}