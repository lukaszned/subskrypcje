import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  getBudgetImpactHandler,
  getCategoryBreakdownHandler,
  getDashboardActivityHandler,
  getDashboardSummaryHandler,
  getDashboardTrendsHandler,
  getNotificationPreviewHandler,
  getRemindersHandler,
  getSavingsHandler,
  getTrialsHandler,
  getUpcomingPaymentsHandler,
  getDashboardHealthScoreHandler,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryHandler);
router.get("/upcoming", requireAuth, getUpcomingPaymentsHandler);
router.get("/trials", requireAuth, getTrialsHandler);
router.get("/category-breakdown", requireAuth, getCategoryBreakdownHandler);
router.get("/reminders", requireAuth, getRemindersHandler);
router.get("/notification-preview", requireAuth, getNotificationPreviewHandler);
router.get("/savings", requireAuth, getSavingsHandler);
router.get("/trends", requireAuth, getDashboardTrendsHandler);
router.get("/budget-impact", requireAuth, getBudgetImpactHandler);
router.get("/activity", requireAuth, getDashboardActivityHandler);
router.get("/health-score", requireAuth, getDashboardHealthScoreHandler);

export default router;