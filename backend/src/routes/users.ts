import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { getMeHandler } from "../controllers/user.controller";
import {
    getUserSettingsHandler,
    updateUserSettingsHandler,
} from "../controllers/user-settings.controller";

const router = Router();

router.get("/me", requireAuth, getMeHandler);
router.get("/settings", requireAuth, getUserSettingsHandler);
router.patch("/settings", requireAuth, updateUserSettingsHandler);

export default router;