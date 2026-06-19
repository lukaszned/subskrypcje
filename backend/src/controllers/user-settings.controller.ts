import { Response } from "express";
import { ZodError } from "zod";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
    getOrCreateUserSettings,
    updateUserSettings,
} from "../services/user-settings.service";
import { updateUserSettingsSchema } from "../validators/user-settings";

export async function getUserSettingsHandler(
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

        const settings = await getOrCreateUserSettings(req.appUser.id);

        return res.json(settings);
    } catch (error) {
        console.error("Error fetching user settings:", error);

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}

export async function updateUserSettingsHandler(
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

        const parsedData = updateUserSettingsSchema.parse(req.body);

        const updatedSettings = await updateUserSettings(req.appUser.id, parsedData);

        return res.json(updatedSettings);
    } catch (error) {
        console.error("Error updating user settings:", error);

        if (error instanceof ZodError) {
            return res.status(400).json({
                message: "Validation error",
                code: "VALIDATION_ERROR",
                errors: error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
        });
    }
}