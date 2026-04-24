import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
    getDashboardSummaryHandler,
    getUpcomingPaymentsHandler,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryHandler);
router.get("/upcoming", requireAuth, getUpcomingPaymentsHandler);

export default router;