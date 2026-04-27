import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    getDashboardSummaryForUser,
    getTrialsForUser,
    getUpcomingPaymentsForUser,
    getCategoryBreakdownForUser,
    getRemindersForUser,
} from "../services/dashboard.service";

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

export async function getUpcomingPaymentsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const daysParam = req.query.days ? Number(req.query.days) : 7;
        const days =
            Number.isNaN(daysParam) || daysParam <= 0 || daysParam > 365
                ? 7
                : daysParam;

        const upcomingPayments = await getUpcomingPaymentsForUser(
            req.appUser.id,
            days
        );

        return res.json({
            days,
            count: upcomingPayments.length,
            items: upcomingPayments,
        });
    } catch (error) {
        console.error("Error fetching upcoming payments:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function getTrialsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const daysParam = req.query.days ? Number(req.query.days) : 30;
        const days =
            Number.isNaN(daysParam) || daysParam <= 0 || daysParam > 365
                ? 30
                : daysParam;

        const trials = await getTrialsForUser(req.appUser.id, days);

        return res.json({
            days,
            count: trials.length,
            items: trials,
        });
    } catch (error) {
        console.error("Error fetching trials:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function getCategoryBreakdownHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const breakdown = await getCategoryBreakdownForUser(req.appUser.id);

        return res.json(breakdown);
    } catch (error) {
        console.error("Error fetching category breakdown:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function getRemindersHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const reminders = await getRemindersForUser(req.appUser.id);

        return res.json(reminders);
    } catch (error) {
        console.error("Error fetching reminders:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
