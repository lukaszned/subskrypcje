import { Router } from "express";
import { z, ZodError } from "zod";
import {
    acceptDetectedSubscriptionHandler,
    disconnectEmailConnectionHandler,
    getEmailConnectionsHandler,
    getDetectedSubscriptionsHandler,
    getEmailScanStatusHandler,
    getGmailAuthUrlHandler,
    handleGmailOAuthCallbackHandler,
    ignoreDetectedSubscriptionHandler,
    scanGmailHandler,
} from "../controllers/email-scan.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import {
    ImapScanServiceErrorCode,
    ImapScanServiceError,
    scanImapSubscriptions,
} from "../services/imap-scan.service";
import { buildImportPreview } from "../services/scan-result-import.service";

const router = Router();

const imapErrorResponse: Record<
    ImapScanServiceErrorCode,
    { status: number; message: string }
> = {
    IMAP_AUTH_FAILED: {
        status: 401,
        message: "IMAP authentication failed. Check the username and password.",
    },
    IMAP_CONNECTION_TIMEOUT: {
        status: 504,
        message: "IMAP connection timed out. Try again or use a different scan profile.",
    },
    IMAP_MAILBOX_NOT_FOUND: {
        status: 404,
        message: "Requested IMAP mailbox was not found.",
    },
    IMAP_UNSUPPORTED: {
        status: 422,
        message: "This IMAP server does not support a required scan operation.",
    },
    IMAP_CONNECTION_FAILED: {
        status: 502,
        message: "Could not connect to the IMAP server.",
    },
    IMAP_SCAN_FAILED: {
        status: 500,
        message: "IMAP scan failed.",
    },
};

const scanImapSchema = z
    .object({
        host: z.string().trim().min(1, "host is required"),
        port: z.coerce
            .number()
            .int("port must be an integer")
            .min(1, "port must be greater than 0")
            .max(65535, "port must be less than or equal to 65535")
            .optional()
            .default(993),
        secure: z.coerce.boolean().optional().default(true),
        username: z.string().trim().min(1, "username is required"),
        password: z.string().min(1, "password is required"),
        mailbox: z.string().trim().min(1).optional().default("INBOX"),
        profile: z.enum(["fast", "balanced", "adaptive", "deep"]).optional().default("adaptive"),
        includeDebug: z.coerce.boolean().optional().default(false),
    })
    .strict();

function safeImapUsernameDomain(username: unknown) {
    if (typeof username !== "string") return undefined;
    const domain = username.split("@")[1]?.trim().toLowerCase();
    return domain ? `*@${domain}` : "present";
}

function safeImapRequestContext(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {};
    }

    const value = body as Record<string, unknown>;

    return {
        host: typeof value.host === "string" ? value.host : undefined,
        port: value.port,
        secure: value.secure,
        mailbox: value.mailbox,
        profile: value.profile,
        username: safeImapUsernameDomain(value.username),
        passwordPresent:
            typeof value.password === "string" && value.password.length > 0,
    };
}

router.get("/gmail/auth-url", requireAuth, getGmailAuthUrlHandler);
router.get("/gmail/callback", handleGmailOAuthCallbackHandler);
router.post("/gmail/scan", requireAuth, scanGmailHandler);
router.post("/imap/scan", requireAuth, async (req, res) => {
    try {
        const input = scanImapSchema.parse(req.body ?? {});
        const result = await scanImapSubscriptions(input);

        return res.json({
            ...result,
            message: "IMAP scan completed.",
        });
    } catch (error) {
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

        if (error instanceof ImapScanServiceError) {
            const response = imapErrorResponse[error.code];

            console.error("[email-scan] imap scan service error", {
                code: error.code,
                message: error.message,
                request: safeImapRequestContext(req.body),
                cause: error.safeCause,
            });

            return res.status(response.status).json({
                message: response.message,
                code: error.code,
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
router.post("/import-preview", requireAuth, async (req, res) => {
    try {
        return res.json(buildImportPreview(req.body ?? {}));
    } catch (error) {
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

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
});
router.get("/connections", requireAuth, getEmailConnectionsHandler);
router.delete(
    "/connections/:id",
    requireAuth,
    disconnectEmailConnectionHandler
);
router.get("/status", requireAuth, getEmailScanStatusHandler);
router.get("/detections", requireAuth, getDetectedSubscriptionsHandler);
router.patch(
    "/detections/:id/ignore",
    requireAuth,
    ignoreDetectedSubscriptionHandler
);
router.patch(
    "/detections/:id/accept",
    requireAuth,
    acceptDetectedSubscriptionHandler
);

export default router;
