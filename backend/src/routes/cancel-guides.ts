import { Router } from "express";
import {
    getCancelGuideBySlugHandler,
    getCancelGuidesHandler,
} from "../controllers/cancel-guide.controller";

const router = Router();

router.get("/", getCancelGuidesHandler);
router.get("/:slug", getCancelGuideBySlugHandler);

export default router;