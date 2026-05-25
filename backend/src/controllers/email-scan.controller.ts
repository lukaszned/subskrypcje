import { DetectedSubscriptionStatus } from "@prisma/client";
import { Response } from "express";
import { ZodError } from "zod";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    acceptDetectedSubscriptionForUser,
    disconnectEmailConnectionForUser,
    getDetectedSubscriptionsForUser,
    getEmailConnectionsForUser,
    getEmailScanStatus,
    ignoreDetectedSubscriptionForUser,
} from "../services/email-scan.service";
import {
    getGmailAuthUrl,
    GmailOAuthServiceError,
    handleGmailOAuthCallback,
} from "../services/gmail-oauth.service";
import {
    GmailScanServiceError,
    scanGmailForUser,
} from "../services/gmail-scan.service";
import {
    acceptDetectedSubscriptionSchema,
    disconnectEmailConnectionSchema,
    scanGmailSchema,
} from "../validators/email-scan";

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

function getOAuthQueryParam(value: unknown) {
    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;
}

function sendGmailOAuthError(res: Response, error: GmailOAuthServiceError) {
    switch (error.code) {
        case "MISSING_GOOGLE_OAUTH_CONFIG":
            return res.status(500).json({
                message: "Missing Google OAuth configuration.",
                code: "MISSING_GOOGLE_OAUTH_CONFIG",
            });
        case "INVALID_OAUTH_STATE":
            return res.status(400).json({
                message: "Invalid OAuth state.",
                code: "INVALID_OAUTH_STATE",
            });
        case "GOOGLE_OAUTH_ERROR":
            return res.status(400).json({
                message: "Google OAuth error.",
                code: "GOOGLE_OAUTH_ERROR",
            });
        case "GMAIL_PROFILE_EMAIL_MISSING":
            return res.status(400).json({
                message: "Gmail profile email is missing.",
                code: "GMAIL_PROFILE_EMAIL_MISSING",
            });
        case "GMAIL_CONNECTION_FAILED":
        default:
            return res.status(500).json({
                message: "Gmail connection failed.",
                code: "GMAIL_CONNECTION_FAILED",
            });
    }
}

function sendGmailScanError(res: Response, error: GmailScanServiceError) {
    switch (error.code) {
        case "GMAIL_OAUTH_CONFIG_MISSING":
            return res.status(500).json({
                message: "Gmail OAuth is not configured on the server.",
                code: "GMAIL_OAUTH_CONFIG_MISSING",
            });
        case "GMAIL_CONNECTION_NOT_FOUND":
            return res.status(404).json({
                message: "Gmail connection not found.",
                code: "GMAIL_CONNECTION_NOT_FOUND",
            });
        case "GMAIL_REAUTH_REQUIRED":
            return res.status(409).json({
                message: "Gmail connection requires reauthorization.",
                code: "GMAIL_REAUTH_REQUIRED",
            });
        case "GMAIL_TOKEN_DECRYPT_FAILED":
            return res.status(409).json({
                message: "Gmail connection requires reauthorization.",
                code: "GMAIL_TOKEN_DECRYPT_FAILED",
            });
        case "GMAIL_REFRESH_FAILED":
            return res.status(409).json({
                message: "Gmail connection requires reauthorization.",
                code: "GMAIL_REFRESH_FAILED",
            });
        case "GMAIL_API_FAILED":
            return res.status(502).json({
                message: "Gmail API request failed. Try again later.",
                code: "GMAIL_API_FAILED",
            });
        case "GMAIL_SCAN_FAILED":
        default:
            return res.status(500).json({
                message: "Gmail scan failed.",
                code: "GMAIL_SCAN_FAILED",
            });
    }
}

function logGmailScanError(error: unknown) {
    if (error instanceof GmailScanServiceError) {
        console.error("Error scanning Gmail:", {
            name: error.name,
            code: error.code,
            message: error.message,
            causeStatus: error.safeCause?.status,
            causeCode: error.safeCause?.code,
            causeReason: error.safeCause?.reason,
        });
        return;
    }

    console.error("Error scanning Gmail:", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Unknown Gmail scan error",
    });
}

export async function getGmailAuthUrlHandler(
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

        const authUrl = getGmailAuthUrl(req.appUser.id);

        return res.json({ authUrl });
    } catch (error) {
        console.error("Error creating Gmail auth URL:", error);

        if (error instanceof GmailOAuthServiceError) {
            return sendGmailOAuthError(res, error);
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function handleGmailOAuthCallbackHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (req.query.error) {
            return res.status(400).json({
                message: "Google OAuth error.",
                code: "GOOGLE_OAUTH_ERROR",
            });
        }

        const code = getOAuthQueryParam(req.query.code);
        const state = getOAuthQueryParam(req.query.state);

        if (!code || !state) {
            return res.status(400).json({
                message: "Missing OAuth code or state.",
                code: "MISSING_OAUTH_PARAMS",
            });
        }

        const connection = await handleGmailOAuthCallback(code, state);

        return res.json({
            connection,
            message: "Gmail connected successfully.",
        });
    } catch (error) {
        console.error("Error handling Gmail OAuth callback:", error);

        if (error instanceof GmailOAuthServiceError) {
            return sendGmailOAuthError(res, error);
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function scanGmailHandler(
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

        const parsedData = scanGmailSchema.parse(req.body ?? {});
        const result = await scanGmailForUser(req.appUser.id, parsedData);

        return res.json({
            ...result,
            message: "Gmail scan completed.",
        });
    } catch (error) {
        logGmailScanError(error);

        if (error instanceof ZodError) {
            return sendValidationError(res, error);
        }

        if (error instanceof GmailScanServiceError) {
            return sendGmailScanError(res, error);
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
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

export async function getEmailConnectionsHandler(
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

        const connections = await getEmailConnectionsForUser(req.appUser.id);

        return res.json(connections);
    } catch (error) {
        console.error("Error fetching email connections:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function disconnectEmailConnectionHandler(
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

        const parsedData = disconnectEmailConnectionSchema.parse(req.body ?? {});
        const result = await disconnectEmailConnectionForUser(
            req.appUser.id,
            getParamId(req),
            parsedData
        );

        if (result.status === "not_found") {
            return res.status(404).json({
                message: "Email connection not found.",
                code: "EMAIL_CONNECTION_NOT_FOUND",
            });
        }

        return res.json({
            message: "Gmail connection disconnected.",
            deletedDetections: result.deletedDetections,
        });
    } catch (error) {
        console.error("Error disconnecting email connection:", error);

        if (error instanceof ZodError) {
            return sendValidationError(res, error);
        }

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

function getParamId(req: AuthenticatedRequest): string {
    return String(req.params.id);
}

function sendValidationError(res: Response, error: ZodError) {
    return res.status(400).json({
        message: "Validation error",
        code: "VALIDATION_ERROR",
        errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        })),
    });
}

export async function ignoreDetectedSubscriptionHandler(
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

        const result = await ignoreDetectedSubscriptionForUser(
            req.appUser.id,
            getParamId(req)
        );

        switch (result.status) {
            case "not_found":
                return res.status(404).json({
                    message: "Detected subscription not found.",
                    code: "DETECTION_NOT_FOUND",
                });
            case "already_accepted":
                return res.status(409).json({
                    message: "Accepted detection cannot be ignored.",
                    code: "DETECTION_ALREADY_ACCEPTED",
                });
            case "ignored":
                return res.json({
                    id: result.id,
                    status: "ignored",
                    message: "Detected subscription ignored.",
                });
        }
    } catch (error) {
        console.error("Error ignoring detected subscription:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function acceptDetectedSubscriptionHandler(
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

        const parsedData = acceptDetectedSubscriptionSchema.parse(req.body ?? {});
        const result = await acceptDetectedSubscriptionForUser(
            req.appUser.id,
            getParamId(req),
            parsedData
        );

        switch (result.status) {
            case "not_found":
                return res.status(404).json({
                    message: "Detected subscription not found.",
                    code: "DETECTION_NOT_FOUND",
                });
            case "already_accepted":
                return res.status(409).json({
                    message: "Detected subscription has already been accepted.",
                    code: "DETECTION_ALREADY_ACCEPTED",
                });
            case "already_ignored":
                return res.status(409).json({
                    message: "Ignored detection cannot be accepted.",
                    code: "DETECTION_ALREADY_IGNORED",
                });
            case "marked_duplicate":
                return res.status(409).json({
                    message: "Duplicate detection cannot be accepted.",
                    code: "DETECTION_MARKED_DUPLICATE",
                });
            case "needs_review":
                return res.status(400).json({
                    message:
                        "Detected subscription needs review before it can be accepted.",
                    code: "DETECTION_NEEDS_REVIEW",
                    missingFields: result.missingFields ?? [],
                });
            case "duplicate_subscription":
                return res.status(409).json({
                    message: "A similar subscription already exists",
                    code: "DUPLICATE_SUBSCRIPTION",
                    duplicate: result.duplicate,
                });
            case "accepted":
                return res.json({
                    detection: result.detection,
                    subscription: result.subscription,
                    message: "Detected subscription accepted.",
                });
        }
    } catch (error) {
        console.error("Error accepting detected subscription:", error);

        if (error instanceof ZodError) {
            return sendValidationError(res, error);
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}
