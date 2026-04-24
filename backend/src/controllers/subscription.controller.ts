import { Request, Response } from "express";
import { ZodError } from "zod";
import {
    createSubscriptionSchema,
    updateSubscriptionSchema,
} from "../validators/subscription";
import {
    createSubscription,
    deleteSubscription,
    getSubscriptionById,
    getSubscriptions,
    getUserById,
    markSubscriptionAsPaid,
    updateSubscription,
} from "../services/subscription.service";

export async function getSubscriptionsHandler(req: Request, res: Response) {
    try {
        const { userId, category, status } = req.query;

        const subscriptions = await getSubscriptions({
            userId: userId ? String(userId) : undefined,
            category: category ? String(category) : undefined,
            status: status ? String(status) : undefined,
        });

        res.json(subscriptions);
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getSubscriptionByIdHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const subscription = await getSubscriptionById(id);

        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        res.json(subscription);
    } catch (error) {
        console.error("Error fetching subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function createSubscriptionHandler(req: Request, res: Response) {
    try {
        const parsedData = createSubscriptionSchema.parse(req.body);

        const user = await getUserById(parsedData.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newSubscription = await createSubscription(parsedData);

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
}

export async function updateSubscriptionHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const parsedData = updateSubscriptionSchema.parse(req.body);

        const existingSubscription = await getSubscriptionById(id);

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const updatedSubscription = await updateSubscription(id, parsedData);

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
}

export async function markSubscriptionAsPaidHandler(
    req: Request,
    res: Response
) {
    try {
        const { id } = req.params;

        const existingSubscription = await getSubscriptionById(id);

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const updatedSubscription = await markSubscriptionAsPaid(id);

        res.json(updatedSubscription);
    } catch (error) {
        console.error("Error marking subscription as paid:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteSubscriptionHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const existingSubscription = await getSubscriptionById(id);

        if (!existingSubscription) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const deletedSubscription = await deleteSubscription(id);

        res.json(deletedSubscription);
    } catch (error) {
        console.error("Error deleting subscription:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}