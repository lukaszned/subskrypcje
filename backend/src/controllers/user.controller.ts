import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function getMeHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.authUser || !req.appUser) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
            });
        }

        return res.json({
            authUser: {
                id: req.authUser.id,
                email: req.authUser.email,
            },
            appUser: {
                id: req.appUser.id,
                email: req.appUser.email,
                name: req.appUser.name,
            },
        });
    } catch (error) {
        console.error("Error fetching current user:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}