import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    getCategoryBreakdownForUser,
    getDashboardSummaryForUser,
    getDashboardTrendsForUser,
    getRemindersForUser,
    getSavingsForUser,
    getTrialsForUser,
    getUpcomingPaymentsForUser,
} from "../services/dashboard.service";

export async function getDashboardSummaryHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const summary = await getDashboardSummaryForUser(req.appUser.id);

        return res.json(summary);
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getUpcomingPaymentsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
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
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getTrialsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
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
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getCategoryBreakdownHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const breakdown = await getCategoryBreakdownForUser(req.appUser.id);

        return res.json(breakdown);
    } catch (error) {
        console.error("Error fetching category breakdown:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getRemindersHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const reminders = await getRemindersForUser(req.appUser.id);

        return res.json(reminders);
    } catch (error) {
        console.error("Error fetching reminders:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getSavingsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const savings = await getSavingsForUser(req.appUser.id);

        return res.json(savings);
    } catch (error) {
        console.error("Error fetching savings:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getDashboardTrendsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        const monthsParam = req.query.months ? Number(req.query.months) : 6;
        const months =
            Number.isNaN(monthsParam) || monthsParam <= 0 || monthsParam > 12
                ? 6
                : monthsParam;

        const trends = await getDashboardTrendsForUser(req.appUser.id, months);

        return res.json(trends);
    } catch (error) {
        console.error("Error fetching dashboard trends:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}