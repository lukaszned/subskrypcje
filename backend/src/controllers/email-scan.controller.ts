import { DetectedSubscriptionStatus } from "@prisma/client";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    getDetectedSubscriptionsForUser,
    getEmailScanStatus,
} from "../services/email-scan.service";

const detectionStatusValues = Object.values(DetectedSubscriptionStatus);

function parseDetectionStatus(value: unknown) {
    if (value === undefined) {
        return undefined;
    }

    if (
        typeof value !== "string" ||
        !detectionStatusValues.includes(value as DetectedSubscriptionStatus)
    ) {
        return null;
    }

    return value as DetectedSubscriptionStatus;
}

function parsePaginationValue(
    value: unknown,
    defaultValue: number,
    options: { min: number; max?: number }
) {
    if (value === undefined) {
        return defaultValue;
    }

    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    const parsed = Number(value);

    if (
        !Number.isInteger(parsed) ||
        parsed < options.min ||
        (options.max !== undefined && parsed > options.max)
    ) {
        return null;
    }

    return parsed;
}

export async function getEmailScanStatusHandler(
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

        const status = await getEmailScanStatus(req.appUser.id);

        return res.json(status);
    } catch (error) {
        console.error("Error fetching email scan status:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getDetectedSubscriptionsHandler(
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

        const status = parseDetectionStatus(req.query.status);

        if (status === null) {
            return res.status(400).json({
                message: "Invalid detection status.",
                code: "INVALID_DETECTION_STATUS",
            });
        }

        const limit = parsePaginationValue(req.query.limit, 20, {
            min: 1,
            max: 100,
        });
        const offset = parsePaginationValue(req.query.offset, 0, {
            min: 0,
        });

        if (limit === null || offset === null) {
            return res.status(400).json({
                message: "Invalid pagination parameters.",
                code: "INVALID_PAGINATION",
            });
        }

        const detections = await getDetectedSubscriptionsForUser(req.appUser.id, {
            status,
            limit,
            offset,
        });

        return res.json(detections);
    } catch (error) {
        console.error("Error fetching detected subscriptions:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}
