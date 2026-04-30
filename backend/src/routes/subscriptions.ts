import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
    cancelSubscriptionHandler,
    createSubscriptionHandler,
    deleteSubscriptionHandler,
    getSubscriptionByIdHandler,
    getSubscriptionHistoryHandler,
    getSubscriptionPaymentsHandler,
    getSubscriptionsHandler,
    markSubscriptionAsPaidHandler,
    updateSubscriptionHandler,
} from "../controllers/subscription.controller";
import { getSubscriptionCancelGuideHandler } from "../controllers/cancel-guide.controller";

const router = Router();

router.get("/", requireAuth, getSubscriptionsHandler);
router.get("/:id/cancel-guide", requireAuth, getSubscriptionCancelGuideHandler);
router.get("/:id/history", requireAuth, getSubscriptionHistoryHandler);
router.get("/:id/payments", requireAuth, getSubscriptionPaymentsHandler);
router.get("/:id", requireAuth, getSubscriptionByIdHandler);

router.post("/", requireAuth, createSubscriptionHandler);
router.patch("/:id", requireAuth, updateSubscriptionHandler);
router.patch("/:id/pay", requireAuth, markSubscriptionAsPaidHandler);
router.patch("/:id/cancel", requireAuth, cancelSubscriptionHandler);
router.delete("/:id", requireAuth, deleteSubscriptionHandler);

export default router;