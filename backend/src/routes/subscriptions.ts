import { Router } from "express";
import {
    createSubscriptionHandler,
    deleteSubscriptionHandler,
    getSubscriptionByIdHandler,
    getSubscriptionsHandler,
    markSubscriptionAsPaidHandler,
    updateSubscriptionHandler,
} from "../controllers/subscription.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth, getSubscriptionsHandler);
router.get("/:id", requireAuth, getSubscriptionByIdHandler);
router.post("/", requireAuth, createSubscriptionHandler);
router.patch("/:id", requireAuth, updateSubscriptionHandler);
router.patch("/:id/pay", requireAuth, markSubscriptionAsPaidHandler);
router.delete("/:id", requireAuth, deleteSubscriptionHandler);

export default router;