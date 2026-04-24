import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
    getDashboardSummaryHandler,
    getTrialsHandler,
    getUpcomingPaymentsHandler,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryHandler);
router.get("/upcoming", requireAuth, getUpcomingPaymentsHandler);
router.get("/trials", requireAuth, getTrialsHandler);

export default router;