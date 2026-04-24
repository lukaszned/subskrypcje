import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getDashboardSummaryForUser } from "../services/dashboard.service";

export async function getDashboardSummaryHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const summary = await getDashboardSummaryForUser(req.appUser.id);

        return res.json(summary);
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}