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
    ImapScanServiceError,
    scanImapSubscriptions,
} from "../services/imap-scan.service";

const router = Router();

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
            return res.status(500).json({
                message: "IMAP scan failed.",
                code: error.code,
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
