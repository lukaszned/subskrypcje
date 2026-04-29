import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
    cancelSubscriptionHandler,
    createSubscriptionHandler,
    deleteSubscriptionHandler,
    getSubscriptionByIdHandler,
    getSubscriptionHistoryHandler,
    getSubscriptionsHandler,
    markSubscriptionAsPaidHandler,
    updateSubscriptionHandler,
    getSubscriptionPaymentsHandler,
} from "../controllers/subscription.controller";

const router = Router();

router.get("/", requireAuth, getSubscriptionsHandler);
router.get("/:id", requireAuth, getSubscriptionByIdHandler);
router.get("/:id/history", requireAuth, getSubscriptionHistoryHandler);
router.post("/", requireAuth, createSubscriptionHandler);
router.patch("/:id", requireAuth, updateSubscriptionHandler);
router.patch("/:id/pay", requireAuth, markSubscriptionAsPaidHandler);
router.patch("/:id/cancel", requireAuth, cancelSubscriptionHandler);
router.delete("/:id", requireAuth, deleteSubscriptionHandler);
router.get("/:id/payments", requireAuth, getSubscriptionPaymentsHandler);

export default router;