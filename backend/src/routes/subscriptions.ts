import { Router } from "express";
import {
    createSubscriptionHandler,
    deleteSubscriptionHandler,
    getSubscriptionByIdHandler,
    getSubscriptionsHandler,
    markSubscriptionAsPaidHandler,
    updateSubscriptionHandler,
} from "../controllers/subscription.controller";

const router = Router();

router.get("/", getSubscriptionsHandler);
router.get("/:id", getSubscriptionByIdHandler);
router.post("/", createSubscriptionHandler);
router.patch("/:id", updateSubscriptionHandler);
router.patch("/:id/pay", markSubscriptionAsPaidHandler);
router.delete("/:id", deleteSubscriptionHandler);

export default router;