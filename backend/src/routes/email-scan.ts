import { Router } from "express";
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

const router = Router();

router.get("/gmail/auth-url", requireAuth, getGmailAuthUrlHandler);
router.get("/gmail/callback", handleGmailOAuthCallbackHandler);
router.post("/gmail/scan", requireAuth, scanGmailHandler);
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
