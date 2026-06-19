import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { getUserSettingsForUser, updateUserSettingsForUser } from "../services/user.service";

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
         res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function getUserSettingsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const settings = await getUserSettingsForUser(req.appUser.id);
        res.json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function updateUserSettingsHandler(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.appUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const settings = await updateUserSettingsForUser(req.appUser.id, req.body);
        res.json(settings);
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}