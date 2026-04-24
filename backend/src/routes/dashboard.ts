import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { getDashboardSummaryHandler } from "../controllers/dashboard.controller";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryHandler);

export default router;