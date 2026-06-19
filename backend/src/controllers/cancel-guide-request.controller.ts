import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createCancelGuideRequest } from "../services/cancel-guide-request.service";

export async function createCancelGuideRequestHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const userId = req.appUser?.id;
        const subscriptionId = req.params.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        if (!subscriptionId || Array.isArray(subscriptionId)) {
            return res.status(400).json({
                message: "Nieprawidłowe ID subskrypcji.",
                code: "INVALID_SUBSCRIPTION_ID",
            });
        }

        const result = await createCancelGuideRequest(userId, subscriptionId);

        return res.status(result.alreadyExisted ? 200 : 201).json({
            id: result.request.id,
            status: result.request.status,
            alreadyExisted: result.alreadyExisted,
            message: result.alreadyExisted
                ? "To zgłoszenie zostało już wcześniej zapisane."
                : "Zgłoszenie brakującej instrukcji anulowania zostało zapisane.",
            subscription: {
                id: result.subscription.id,
                name: result.subscription.name,
                provider: result.subscription.provider,
            },
            createdAt: result.request.createdAt,
        });
    } catch (error) {
        const statusCode = (error as any).statusCode ?? 500;

        return res.status(statusCode).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Nie udało się zapisać zgłoszenia brakującej instrukcji anulowania.",
            code:
                (error as any).code ??
                "CANCEL_GUIDE_REQUEST_CREATE_FAILED",
            guide: (error as any).guide,
        });
    }
}