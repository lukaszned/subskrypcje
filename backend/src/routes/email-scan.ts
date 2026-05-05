import { Router } from "express";
import {
    acceptDetectedSubscriptionHandler,
    getDetectedSubscriptionsHandler,
    getEmailScanStatusHandler,
    ignoreDetectedSubscriptionHandler,
} from "../controllers/email-scan.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

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
