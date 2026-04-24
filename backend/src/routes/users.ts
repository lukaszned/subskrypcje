import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { getMeHandler } from "../controllers/user.controller";

const router = Router();

router.get("/me", requireAuth, getMeHandler);

export default router;