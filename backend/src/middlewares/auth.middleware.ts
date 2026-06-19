import { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";
import { getEmailScanUserMessage } from "../services/subscription-product-buckets.service";

export interface AuthenticatedRequest extends Request {
    authUser?: {
        id: string;
        email?: string;
    };
    appUser?: {
        id: string;
        email: string;
        name: string | null;
    };
}

function isDatabaseUnavailableError(error: unknown) {
    const code =
        error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "")
            : "";
    const message =
        error instanceof Error
            ? error.message
            : typeof error === "string"
            ? error
            : "";

    return /^(P1001|P1002|P1017)$/.test(code) ||
        /(can't reach database|database.*unavailable|connection.*(terminated|timeout|refused|closed)|ECONNRESET|ETIMEDOUT|ECONNREFUSED)/i.test(
            message
        );
}

export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Missing or invalid authorization header",
                code: "AUTH_REQUIRED",
                userMessage: getEmailScanUserMessage("AUTH_REQUIRED"),
            });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                message: "Unauthorized",
                code: "UNAUTHORIZED",
                userMessage: getEmailScanUserMessage("UNAUTHORIZED"),
            });
        }

        req.authUser = {
            id: data.user.id,
            email: data.user.email,
        };

        if (!data.user.email) {
            return res.status(400).json({
                message: "Authenticated user has no email",
                code: "AUTH_EMAIL_MISSING",
                userMessage: getEmailScanUserMessage("AUTH_REQUIRED"),
            });
        }

        let appUser = await prisma.user.findUnique({
            where: { email: data.user.email },
        });

        if (!appUser) {
            appUser = await prisma.user.create({
                data: {
                    email: data.user.email,
                    name: data.user.user_metadata?.name ?? null,
                },
            });
        }

        req.appUser = {
            id: appUser.id,
            email: appUser.email,
            name: appUser.name,
        };

        next();
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            console.error("Auth middleware database unavailable:", {
                name: error instanceof Error ? error.name : "UnknownError",
                code:
                    error && typeof error === "object" && "code" in error
                        ? (error as { code?: unknown }).code
                        : undefined,
                message:
                    error instanceof Error
                        ? error.message
                        : "Database unavailable during auth",
            });
            return res.status(503).json({
                message: "Authentication database is temporarily unavailable",
                code: "AUTH_DATABASE_UNAVAILABLE",
                userMessage: getEmailScanUserMessage("AUTH_DATABASE_UNAVAILABLE"),
            });
        }

        console.error("Auth middleware error:", error);
        return res.status(500).json({
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
            userMessage: getEmailScanUserMessage("INTERNAL_SERVER_ERROR"),
        });
    }
}
