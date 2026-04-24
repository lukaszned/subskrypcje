import { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { prisma } from "../lib/prisma";

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

export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ message: "Missing or invalid authorization header" });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.authUser = {
            id: data.user.id,
            email: data.user.email,
        };

        if (!data.user.email) {
            return res
                .status(400)
                .json({ message: "Authenticated user has no email" });
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
        console.error("Auth middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}