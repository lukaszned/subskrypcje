import { Router } from "express";
import { z, ZodError } from "zod";
import {
    acceptDetectedSubscriptionHandler,
    disconnectEmailConnectionHandler,
    getEmailConnectionsHandler,
    getDetectedSubscriptionsHandler,
    getEmailScanStatusHandler,
    getGmailAuthUrlHandler,
    getGmailOAuthDiagnosticsHandler,
    handleGmailOAuthCallbackHandler,
    ignoreDetectedSubscriptionHandler,
    scanGmailHandler,
} from "../controllers/email-scan.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    ImapScanServiceErrorCode,
    ImapScanServiceError,
    normalizeImapScanProfile,
    scanImapSubscriptions,
} from "../services/imap-scan.service";
import {
    buildImportPreview,
    confirmScanImportDrafts,
    ImportPreviewServiceError,
    ImportPreviewValidationError,
    normalizeImportPreviewItems,
} from "../services/scan-result-import.service";
import { getEmailScanUserMessage } from "../services/subscription-product-buckets.service";

const router = Router();

function isEmailScanDiagnosticsEnabled() {
    return (
        process.env.EMAIL_SCAN_DEBUG === "true" ||
        process.env.NODE_ENV !== "production"
    );
}

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
        profile: z.string().trim().min(1).optional(),
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
        usernamePresent:
            typeof value.username === "string" && value.username.length > 0,
        username: safeImapUsernameDomain(value.username),
        passwordPresent:
            typeof value.password === "string" && value.password.length > 0,
    };
}

function safeBodyKeys(body: unknown) {
    return body && typeof body === "object" && !Array.isArray(body)
        ? Object.keys(body as Record<string, unknown>).sort()
        : [];
}

function safeImportPreviewContext(body: unknown) {
    const normalized = normalizeImportPreviewItems(body);
    const buckets: Record<string, number> = {};
    const actions: Record<string, number> = {};

    for (const item of normalized.items) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const record = item as Record<string, unknown>;
        const bucket =
            typeof record.productBucket === "string" ? record.productBucket : "unknown";
        const action =
            typeof record.primaryAction === "string" ? record.primaryAction : "unknown";
        buckets[bucket] = (buckets[bucket] ?? 0) + 1;
        actions[action] = (actions[action] ?? 0) + 1;
    }

    return {
        bodyKeys: safeBodyKeys(body),
        sourceShape: normalized.sourceShape,
        rawItemCount: normalized.rawItemCount,
        normalizedItemCount: normalized.normalizedItemCount,
        skippedItemCount: normalized.skippedItemCount,
        acceptedWrapperKeys: normalized.acceptedWrapperKeys,
        buckets,
        actions,
    };
}

function safeImportConfirmContext(body: unknown) {
    const bodyKeys = safeBodyKeys(body);
    const drafts =
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        Array.isArray((body as Record<string, unknown>).drafts)
            ? ((body as Record<string, unknown>).drafts as unknown[])
            : [];
    const actions: Record<string, number> = {};

    for (const item of drafts) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const action =
            typeof (item as Record<string, unknown>).recommendedAction === "string"
                ? ((item as Record<string, unknown>).recommendedAction as string)
                : "unknown";
        actions[action] = (actions[action] ?? 0) + 1;
    }

    return {
        bodyKeys,
        draftCount: drafts.length,
        actions,
    };
}

router.get("/gmail/auth-url", requireAuth, getGmailAuthUrlHandler);
router.get("/gmail/oauth-diagnostics", requireAuth, getGmailOAuthDiagnosticsHandler);
router.get("/gmail/callback", handleGmailOAuthCallbackHandler);
router.post("/gmail/scan", requireAuth, scanGmailHandler);
router.post("/imap/scan", requireAuth, async (req, res) => {
    try {
        const input = scanImapSchema.parse(req.body ?? {});
        const profileNormalization = normalizeImapScanProfile(input.profile);

        if (isEmailScanDiagnosticsEnabled()) {
            console.info("[email-scan] imap profile normalization", {
                requestedProfile: profileNormalization.requestedProfile,
                effectiveProfile: profileNormalization.effectiveProfile,
                normalized: Boolean(profileNormalization.warning),
                request: safeImapRequestContext(req.body),
            });
        }
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
                userMessage: getEmailScanUserMessage("VALIDATION_ERROR"),
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
                userMessage: getEmailScanUserMessage(error.code),
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
        });
    }
});
router.post("/import-preview", requireAuth, async (req, res) => {
    const startedAt = Date.now();
    const appUser = (req as AuthenticatedRequest).appUser;
    const context = safeImportPreviewContext(req.body);
    let responseCode: string | undefined;

    if (isEmailScanDiagnosticsEnabled()) {
        console.info("[email-scan] import-preview received", {
            path: req.originalUrl,
            userId: appUser?.id,
            ...context,
        });
    }

    res.on("finish", () => {
        if (!isEmailScanDiagnosticsEnabled()) return;

        console.info("[email-scan] import-preview finished", {
            path: req.originalUrl,
            userId: appUser?.id,
            statusCode: res.statusCode,
            responseCode,
            durationMs: Date.now() - startedAt,
            ...context,
        });
    });

    try {
        return res.json(buildImportPreview(req.body ?? {}));
    } catch (error) {
        if (error instanceof ImportPreviewServiceError) {
            responseCode = error.code;
            return res
                .status(error.code === "IMPORT_PREVIEW_TOO_MANY_ITEMS" ? 400 : 504)
                .json({
                    message: error.message,
                    code: error.code,
                    userMessage: getEmailScanUserMessage(error.code),
                    details: {
                        expected: "items array",
                        receivedKeys: context.bodyKeys,
                        itemCount: context.normalizedItemCount,
                        maxItems: 50,
                    },
                });
        }

        if (error instanceof ImportPreviewValidationError) {
            responseCode = "VALIDATION_ERROR";
            return res.status(400).json({
                message: "Validation error",
                code: "VALIDATION_ERROR",
                userMessage: getEmailScanUserMessage(
                    "IMPORT_PREVIEW_VALIDATION_ERROR"
                ),
                errors: [
                    {
                        field: "items",
                        message: error.message,
                    },
                ],
                receivedKeys: error.details.receivedKeys,
                expectedShape: error.details.expectedShape,
                sourceShape: error.details.sourceShape,
                warnings: error.details.warnings ?? [],
            });
        }

        if (error instanceof ZodError) {
            responseCode = "VALIDATION_ERROR";
            return res.status(400).json({
                message: "Validation error",
                code: "VALIDATION_ERROR",
                userMessage: getEmailScanUserMessage(
                    "IMPORT_PREVIEW_VALIDATION_ERROR"
                ),
                details: {
                    expected:
                        "items, selectedItems, selected, draftsCandidates, or an array of productResult items",
                    receivedKeys: context.bodyKeys,
                },
                errors: error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        responseCode = "INTERNAL_SERVER_ERROR";
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
        });
    }
});
router.post("/import-confirm", requireAuth, async (req, res) => {
    const startedAt = Date.now();
    const appUser = (req as AuthenticatedRequest).appUser;
    const context = safeImportConfirmContext(req.body);
    let responseCode: string | undefined;
    let resultSummary:
        | {
              created: number;
              skipped: number;
              skippedReasons: Record<string, number>;
          }
        | undefined;

    if (isEmailScanDiagnosticsEnabled()) {
        console.info("[email-scan] import-confirm received", {
            path: req.originalUrl,
            userId: appUser?.id,
            ...context,
        });
    }

    res.on("finish", () => {
        if (!isEmailScanDiagnosticsEnabled()) return;

        console.info("[email-scan] import-confirm finished", {
            path: req.originalUrl,
            userId: appUser?.id,
            statusCode: res.statusCode,
            responseCode,
            durationMs: Date.now() - startedAt,
            ...context,
            resultSummary,
        });
    });

    try {
        if (!appUser) {
            responseCode = "UNAUTHORIZED";
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        const result = await confirmScanImportDrafts(
            appUser.id,
            req.body ?? {}
        );
        resultSummary = {
            created: result.created.length,
            skipped: result.skipped.length,
            skippedReasons: result.skipped.reduce<Record<string, number>>(
                (summary, item) => {
                    summary[item.reason] = (summary[item.reason] ?? 0) + 1;
                    return summary;
                },
                {}
            ),
        };

        return res.status(201).json(result);
    } catch (error) {
        if (error instanceof ZodError) {
            responseCode = "VALIDATION_ERROR";
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

        responseCode = "INTERNAL_SERVER_ERROR";
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
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
