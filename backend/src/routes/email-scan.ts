import { Router } from "express";
import {
    getDetectedSubscriptionsHandler,
    getEmailScanStatusHandler,
} from "../controllers/email-scan.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/status", requireAuth, getEmailScanStatusHandler);
router.get("/detections", requireAuth, getDetectedSubscriptionsHandler);

export default router;
