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
    buildGmailOAuthDiagnostics,
    getGmailAuthUrl,
    getGmailRedirectDiagnostics,
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
import { getEmailScanUserMessage } from "../services/subscription-product-buckets.service";

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
                userMessage: getEmailScanUserMessage("GMAIL_OAUTH_CONFIG_MISSING"),
            });
        case "INVALID_OAUTH_STATE":
            return res.status(400).json({
                message: "Invalid OAuth state.",
                code: "INVALID_OAUTH_STATE",
                userMessage: getEmailScanUserMessage("GMAIL_OAUTH_STATE_INVALID"),
            });
        case "GOOGLE_OAUTH_ERROR":
            return res.status(400).json({
                message: "Google OAuth error.",
                code: "GOOGLE_OAUTH_ERROR",
                userMessage: getEmailScanUserMessage("GMAIL_REAUTH_REQUIRED"),
            });
        case "GMAIL_PROFILE_EMAIL_MISSING":
            return res.status(400).json({
                message: "Gmail profile email is missing.",
                code: "GMAIL_PROFILE_EMAIL_MISSING",
                userMessage: getEmailScanUserMessage("GMAIL_REAUTH_REQUIRED"),
            });
        case "GMAIL_CONNECTION_FAILED":
        default:
            return res.status(500).json({
                message: "Gmail connection failed.",
                code: "GMAIL_CONNECTION_FAILED",
                userMessage: getEmailScanUserMessage("GMAIL_API_FAILED"),
            });
    }
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function sendGmailOAuthHtml(
    res: Response,
    options: { ok: boolean; title: string; message: string; code?: string }
) {
    const status = options.ok ? 200 : 400;
    const codeLine = options.code
        ? `<p class="code">Code: ${escapeHtml(options.code)}</p>`
        : "";

    return res.status(status).type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; line-height: 1.45; color: #111827; }
    main { max-width: 560px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    .code { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(options.title)}</h1>
    <p>${escapeHtml(options.message)}</p>
    ${codeLine}
  </main>
</body>
</html>`);
}

function sendGmailScanError(res: Response, error: GmailScanServiceError) {
    switch (error.code) {
        case "GMAIL_OAUTH_CONFIG_MISSING":
            return res.status(500).json({
                message: "Gmail OAuth is not configured on the server.",
                code: "GMAIL_OAUTH_CONFIG_MISSING",
                userMessage: getEmailScanUserMessage("GMAIL_OAUTH_CONFIG_MISSING"),
            });
        case "GMAIL_CONNECTION_NOT_FOUND":
            return res.status(404).json({
                message: "Gmail connection not found.",
                code: "GMAIL_CONNECTION_NOT_FOUND",
                userMessage: getEmailScanUserMessage("GMAIL_CONNECTION_NOT_FOUND"),
            });
        case "GMAIL_REAUTH_REQUIRED":
            return res.status(409).json({
                message: "Gmail connection requires reauthorization.",
                code: "GMAIL_REAUTH_REQUIRED",
                userMessage: getEmailScanUserMessage("GMAIL_REAUTH_REQUIRED"),
            });
        case "GMAIL_TOKEN_DECRYPT_FAILED":
            return res.status(409).json({
                message: "Gmail connection requires reauthorization.",
                code: "GMAIL_TOKEN_DECRYPT_FAILED",
                userMessage: getEmailScanUserMessage("GMAIL_TOKEN_DECRYPT_FAILED"),
            });
        case "GMAIL_REFRESH_FAILED":
            return res.status(409).json({
                message: "Gmail connection requires reauthorization.",
                code: "GMAIL_REFRESH_FAILED",
                userMessage: getEmailScanUserMessage("GMAIL_REFRESH_FAILED"),
            });
        case "GMAIL_API_FAILED":
            return res.status(502).json({
                message: "Gmail API request failed. Try again later.",
                code: "GMAIL_API_FAILED",
                userMessage: getEmailScanUserMessage("GMAIL_API_FAILED"),
            });
        case "GMAIL_SCAN_FAILED":
        default:
            return res.status(500).json({
                message: "Gmail scan failed.",
                code: "GMAIL_SCAN_FAILED",
                userMessage: getEmailScanUserMessage("GMAIL_SCAN_FAILED"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        const authUrl = getGmailAuthUrl(req.appUser.id);
        const redirectUri = new URL(authUrl).searchParams.get("redirect_uri") ?? "";
        const redirectDiagnostics = getGmailRedirectDiagnostics(redirectUri);

        console.info("[email-scan] gmail auth-url", {
            userId: req.appUser.id,
            requestIp: req.ip,
            userAgent: req.get("user-agent") ?? "",
            ...redirectDiagnostics,
        });

        if (
            process.env.NODE_ENV !== "production" &&
            redirectDiagnostics.redirectUriUsesLocalhost
        ) {
            console.warn(
                "[email-scan] Gmail OAuth redirect uses localhost; this will not work from a physical phone. Use GMAIL_REDIRECT_BASE_URL with LAN IP or tunnel."
            );
        }

        return res.json({
            authUrl,
            redirectMode: redirectDiagnostics.redirectMode,
            redirectUriHost: redirectDiagnostics.redirectUriHost,
            redirectUri,
            callbackPath: redirectDiagnostics.callbackPath,
            redirectReachabilityHint: redirectDiagnostics.redirectReachabilityHint,
        });
    } catch (error) {
        console.error("Error creating Gmail auth URL:", error);

        if (error instanceof GmailOAuthServiceError) {
            return sendGmailOAuthError(res, error);
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
        });
    }
}

export async function getGmailOAuthDiagnosticsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        const diagnostics = buildGmailOAuthDiagnostics();

        console.info("[email-scan] gmail oauth diagnostics", {
            userId: req.appUser.id,
            requestIp: req.ip,
            userAgent: req.get("user-agent") ?? "",
            redirectBase: diagnostics.redirectBase,
            redirectPath: diagnostics.redirectPath,
            redirectUriHost: diagnostics.redirectUriHost,
            redirectMode: diagnostics.redirectMode,
            redirectUriUsesLocalhost: diagnostics.redirectUriUsesLocalhost,
            isTunnelRedirect: diagnostics.isTunnelRedirect,
        });

        return res.json(diagnostics);
    } catch (error) {
        console.error("Error creating Gmail OAuth diagnostics:", {
            name: error instanceof Error ? error.name : "UnknownError",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown Gmail OAuth diagnostics error",
        });

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
        });
    }
}

export async function handleGmailOAuthCallbackHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    const diagnostics = buildGmailOAuthDiagnostics();

    console.info("[email-scan] gmail oauth callback received", {
        hasCode: Boolean(req.query.code),
        hasState: Boolean(req.query.state),
        hasError: Boolean(req.query.error),
        requestIp: req.ip,
        userAgent: req.get("user-agent") ?? "",
        redirectUriHost: diagnostics.redirectUriHost,
        redirectMode: diagnostics.redirectMode,
        callbackPath: diagnostics.callbackPath,
    });

    try {
        if (req.query.error) {
            return sendGmailOAuthHtml(res, {
                ok: false,
                title: "Gmail connection failed",
                message: "Google did not complete authorization. Return to the app and try connecting Gmail again.",
                code: "GOOGLE_OAUTH_ERROR",
            });
        }

        const code = getOAuthQueryParam(req.query.code);
        const state = getOAuthQueryParam(req.query.state);

        if (!code || !state) {
            return sendGmailOAuthHtml(res, {
                ok: false,
                title: "Gmail connection failed",
                message: "The Gmail callback was missing required OAuth data. Return to the app and try again.",
                code: "MISSING_OAUTH_PARAMS",
            });
        }

        const connection = await handleGmailOAuthCallback(code, state);

        console.info("[email-scan] gmail oauth callback connected", {
            connectionId: connection.id,
            provider: connection.provider,
            email: connection.email,
        });

        return sendGmailOAuthHtml(res, {
            ok: true,
            title: "Gmail connected",
            message: "Gmail was connected successfully. You can return to the app and continue scanning.",
        });
    } catch (error) {
        console.error("Error handling Gmail OAuth callback:", {
            name: error instanceof Error ? error.name : "UnknownError",
            code: error instanceof GmailOAuthServiceError ? error.code : undefined,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown Gmail OAuth callback error",
            hasCode: Boolean(req.query.code),
            hasState: Boolean(req.query.state),
            redirectUriHost: diagnostics.redirectUriHost,
            redirectMode: diagnostics.redirectMode,
        });

        if (error instanceof GmailOAuthServiceError) {
            return sendGmailOAuthHtml(res, {
                ok: false,
                title: "Gmail connection failed",
                message: getEmailScanUserMessage(
                    error.code === "INVALID_OAUTH_STATE"
                        ? "GMAIL_OAUTH_STATE_INVALID"
                        : "GMAIL_OAUTH_CALLBACK_FAILED"
                ),
                code: error.code,
            });
        }

        return sendGmailOAuthHtml(res, {
            ok: false,
            title: "Gmail connection failed",
            message: getEmailScanUserMessage("GMAIL_OAUTH_CALLBACK_FAILED"),
            code: "GMAIL_OAUTH_CALLBACK_FAILED",
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
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
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        const status = await getEmailScanStatus(req.appUser.id);

        return res.json(status);
    } catch (error) {
        console.error("Error fetching email scan status:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        const connections = await getEmailConnectionsForUser(req.appUser.id);

        return res.json(connections);
    } catch (error) {
        console.error("Error fetching email connections:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
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
                userMessage: getEmailScanUserMessage("GMAIL_CONNECTION_NOT_FOUND"),
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
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        const status = parseDetectionStatus(req.query.status);

        if (status === null) {
            return res.status(400).json({
                message: "Invalid detection status.",
                code: "INVALID_DETECTION_STATUS",
                userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
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
                userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
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
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
        userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
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
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
                });
            case "already_accepted":
                return res.status(409).json({
                    message: "Accepted detection cannot be ignored.",
                    code: "DETECTION_ALREADY_ACCEPTED",
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
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
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
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
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
                });
            case "already_accepted":
                return res.status(409).json({
                    message: "Detected subscription has already been accepted.",
                    code: "DETECTION_ALREADY_ACCEPTED",
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
                });
            case "already_ignored":
                return res.status(409).json({
                    message: "Ignored detection cannot be accepted.",
                    code: "DETECTION_ALREADY_IGNORED",
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
                });
            case "marked_duplicate":
                return res.status(409).json({
                    message: "Duplicate detection cannot be accepted.",
                    code: "DETECTION_MARKED_DUPLICATE",
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
                });
            case "needs_review":
                return res.status(400).json({
                    message:
                        "Detected subscription needs review before it can be accepted.",
                    code: "DETECTION_NEEDS_REVIEW",
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
                    missingFields: result.missingFields ?? [],
                });
            case "duplicate_subscription":
                return res.status(409).json({
                    message: "A similar subscription already exists",
                    code: "DUPLICATE_SUBSCRIPTION",
                    userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
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
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
        });
    }
}
