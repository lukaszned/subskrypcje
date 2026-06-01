import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware";

type ResponseDiagnostics = {
    code?: unknown;
    message?: unknown;
    errors?: unknown;
};

function getAuthHeaderPrefix(authorization: unknown) {
    if (typeof authorization !== "string" || !authorization.trim()) {
        return "none";
    }

    if (authorization.startsWith("Bearer ")) {
        return "Bearer present";
    }

    return "non-bearer present";
}

function getBodyKeys(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return [];
    }

    return Object.keys(body as Record<string, unknown>).sort();
}

function getSafeQueryKeys(query: AuthenticatedRequest["query"]) {
    return Object.keys(query ?? {}).sort();
}

function getImapScanBodyShape(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return undefined;
    }

    const value = body as Record<string, unknown>;

    return {
        hostPresent: typeof value.host === "string" && value.host.trim().length > 0,
        port: value.port,
        secure: value.secure,
        usernamePresent:
            typeof value.username === "string" && value.username.trim().length > 0,
        passwordPresent:
            typeof value.password === "string" && value.password.length > 0,
        mailbox: value.mailbox,
        profile: value.profile,
        includeDebug: value.includeDebug,
    };
}

function getSafeResponseDiagnostics(body: unknown): ResponseDiagnostics {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {};
    }

    const value = body as Record<string, unknown>;
    const diagnostics: ResponseDiagnostics = {};

    if (typeof value.code === "string") {
        diagnostics.code = value.code;
    }

    if (typeof value.message === "string") {
        diagnostics.message = value.message;
    }

    if (Array.isArray(value.errors)) {
        diagnostics.errors = value.errors.map((error) => {
            if (!error || typeof error !== "object" || Array.isArray(error)) {
                return error;
            }

            const validationError = error as Record<string, unknown>;

            return {
                field: validationError.field,
                message: validationError.message,
            };
        });
    }

    return diagnostics;
}

export function emailScanDebugMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const startedAt = Date.now();
    const safePath = req.path;
    const queryKeys = getSafeQueryKeys(req.query);
    const bodyKeys = getBodyKeys(req.body);
    const hasAuthorization = Boolean(req.headers.authorization);
    const authHeaderPrefix = getAuthHeaderPrefix(req.headers.authorization);
    const userAgent = req.get("user-agent") ?? "";
    const requestBase = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: safePath,
        queryKeys,
        ip: req.ip,
        userAgent,
        hasAuthorization,
        authHeaderPrefix,
        bodyKeys,
        imapScanBody:
            safePath === "/imap/scan" ? getImapScanBodyShape(req.body) : undefined,
    };
    let responseDiagnostics: ResponseDiagnostics = {};
    const originalJson = res.json.bind(res);

    res.json = ((body?: unknown) => {
        responseDiagnostics = getSafeResponseDiagnostics(body);
        return originalJson(body);
    }) as Response["json"];

    console.info("[email-scan] request", requestBase);

    res.on("finish", () => {
        console.info("[email-scan] response", {
            ...requestBase,
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            userId: req.appUser?.id ?? req.authUser?.id,
            email: req.appUser?.email ?? req.authUser?.email,
            response: responseDiagnostics,
        });
    });

    next();
}
