import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    findCancelGuideForSubscription,
    getActiveCancelGuides,
    getCancelGuideBySlug,
} from "../services/cancel-guide.service";
import { getSubscriptionByIdForUser } from "../services/subscription.service";

function getParamAsString(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    return null;
}

export async function getCancelGuidesHandler(_req: Request, res: Response) {
    try {
        const guides = await getActiveCancelGuides();

        return res.json({
            count: guides.length,
            items: guides,
        });
    } catch (error) {
        console.error("Error fetching cancel guides:", error);

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getCancelGuideBySlugHandler(req: Request, res: Response) {
    try {
        const slug = getParamAsString(req.params.slug);

        if (!slug) {
            return res.status(400).json({
                message: "Invalid provider slug",
                code: "INVALID_PROVIDER_SLUG",
            });
        }

        const guide = await getCancelGuideBySlug(slug);

        if (!guide) {
            return res.status(404).json({
                message: "Cancel guide not found",
                code: "CANCEL_GUIDE_NOT_FOUND",
            });
        }

        return res.json(guide);
    } catch (error) {
        console.error("Error fetching cancel guide:", error);

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getSubscriptionCancelGuideHandler(
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

        const subscriptionId = getParamAsString(req.params.id);

        if (!subscriptionId) {
            return res.status(400).json({
                message: "Invalid subscription id",
                code: "INVALID_SUBSCRIPTION_ID",
            });
        }

        const subscription = await getSubscriptionByIdForUser(
            subscriptionId,
            req.appUser.id
        );

        if (!subscription) {
            return res.status(404).json({
                message: "Subscription not found",
                code: "SUBSCRIPTION_NOT_FOUND",
            });
        }

        const result = await findCancelGuideForSubscription({
            id: subscription.id,
            name: subscription.name,
            provider: subscription.provider,
            cancelUrl: subscription.cancelUrl,
        });

        return res.json({
            subscription: {
                id: subscription.id,
                name: subscription.name,
                provider: subscription.provider,
                status: subscription.status,
                cancelUrl: subscription.cancelUrl,
            },
            ...result,
        });
    } catch (error) {
        console.error("Error fetching subscription cancel guide:", error);

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}