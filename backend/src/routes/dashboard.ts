import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
    getCategoryBreakdownHandler,
    getDashboardSummaryHandler,
    getRemindersHandler,
    getTrialsHandler,
    getUpcomingPaymentsHandler,
    getCategoryBreakdownHandler,
    getRemindersHandler,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryHandler);
router.get("/upcoming", requireAuth, getUpcomingPaymentsHandler);
router.get("/trials", requireAuth, getTrialsHandler);
router.get("/category-breakdown", requireAuth, getCategoryBreakdownHandler);
router.get("/reminders", requireAuth, getRemindersHandler);

export default router;