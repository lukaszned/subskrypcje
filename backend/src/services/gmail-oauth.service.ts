import { EmailProvider } from "@prisma/client";
import { google } from "googleapis";
import { encryptString } from "../lib/crypto";
import { prisma } from "../lib/prisma";
import {
    createEmailScanOAuthState,
    verifyEmailScanOAuthState,
} from "./email-scan-oauth-state.service";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_CALLBACK_PATH = "/email-scan/gmail/callback";

export type GmailOAuthErrorCode =
    | "MISSING_GOOGLE_OAUTH_CONFIG"
    | "INVALID_OAUTH_STATE"
    | "GOOGLE_OAUTH_ERROR"
    | "GMAIL_PROFILE_EMAIL_MISSING"
    | "GMAIL_CONNECTION_FAILED";

export class GmailOAuthServiceError extends Error {
    constructor(
        public code: GmailOAuthErrorCode,
        message: string
    ) {
        super(message);
        this.name = "GmailOAuthServiceError";
    }
}

function getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = resolveGmailRedirectUri();

    if (!clientId || !clientSecret || !redirectUri) {
        throw new GmailOAuthServiceError(
            "MISSING_GOOGLE_OAUTH_CONFIG",
            "Missing Google OAuth configuration."
        );
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
    };
}

export function resolveGmailRedirectUri() {
    const redirectBase = process.env.GMAIL_REDIRECT_BASE_URL?.trim();

    if (redirectBase) {
        return `${redirectBase.replace(/\/+$/g, "")}${GMAIL_CALLBACK_PATH}`;
    }

    return (
        process.env.GOOGLE_REDIRECT_URI?.trim() ??
        `http://localhost:3000${GMAIL_CALLBACK_PATH}`
    );
}

export function getGmailRedirectDiagnostics(redirectUri: string) {
    try {
        const parsed = new URL(redirectUri);
        const redirectBase = `${parsed.protocol}//${parsed.host}`;
        const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
        const isTunnel = /(ngrok|trycloudflare|cloudflared|localhost\.run|serveo)/i.test(
            parsed.hostname
        );

        return {
            redirectBase,
            redirectPath: parsed.pathname,
            callbackPath: GMAIL_CALLBACK_PATH,
            redirectUriHost: parsed.hostname,
            redirectMode: isLocalhost ? "localhost" : "lan_or_custom",
            redirectUriUsesLocalhost: isLocalhost,
            isTunnelRedirect: isTunnel,
            redirectReachabilityHint: isLocalhost
                ? "Localhost redirects work from desktop browser testing, but not from a physical phone. Use GMAIL_REDIRECT_BASE_URL with a public tunnel for mobile dev."
                : isTunnel
                ? "Tunnel redirect detected. Keep the tunnel running and register this exact callback URL in Google Cloud Console."
                : "Custom redirect detected. Register this exact callback URL in Google Cloud Console and make sure the mobile browser can reach it.",
        };
    } catch {
        return {
            redirectBase: "",
            redirectPath: GMAIL_CALLBACK_PATH,
            callbackPath: GMAIL_CALLBACK_PATH,
            redirectUriHost: "",
            redirectMode: "unknown",
            redirectUriUsesLocalhost: false,
            isTunnelRedirect: false,
            redirectReachabilityHint:
                "Gmail redirect URI could not be parsed. Check GMAIL_REDIRECT_BASE_URL or GOOGLE_REDIRECT_URI.",
        };
    }
}

export function buildGmailOAuthDiagnostics() {
    const redirectUri = resolveGmailRedirectUri();
    const diagnostics = getGmailRedirectDiagnostics(redirectUri);

    return {
        gmailOAuthConfigured: Boolean(
            process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ),
        redirectUri,
        ...diagnostics,
    };
}

function createOAuthClient() {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function toSafeConnectionResponse(connection: {
    id: string;
    provider: EmailProvider;
    email: string;
    connectedAt: Date;
    lastScanAt: Date | null;
}) {
    return {
        id: connection.id,
        provider: connection.provider,
        email: connection.email,
        connectedAt: connection.connectedAt,
        lastScanAt: connection.lastScanAt,
    };
}

export function getGmailAuthUrl(userId: string): string {
    try {
        const oauthClient = createOAuthClient();
        const state = createEmailScanOAuthState(userId);

        return oauthClient.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            response_type: "code",
            scope: [GMAIL_READONLY_SCOPE],
            state,
        });
    } catch (error) {
        if (error instanceof GmailOAuthServiceError) {
            throw error;
        }

        throw new GmailOAuthServiceError(
            "MISSING_GOOGLE_OAUTH_CONFIG",
            "Missing Google OAuth configuration."
        );
    }
}

export async function handleGmailOAuthCallback(code: string, state: string) {
    let userId: string;

    try {
        userId = verifyEmailScanOAuthState(state).userId;
    } catch {
        throw new GmailOAuthServiceError(
            "INVALID_OAUTH_STATE",
            "Invalid OAuth state."
        );
    }

    try {
        const oauthClient = createOAuthClient();
        const { tokens } = await oauthClient.getToken(code);

        oauthClient.setCredentials(tokens);

        const gmail = google.gmail({ version: "v1", auth: oauthClient });
        const profile = await gmail.users.getProfile({ userId: "me" });
        const email = profile.data.emailAddress;

        if (!email) {
            throw new GmailOAuthServiceError(
                "GMAIL_PROFILE_EMAIL_MISSING",
                "Gmail profile email is missing."
            );
        }

        const accessTokenEncrypted = tokens.access_token
            ? encryptString(tokens.access_token)
            : undefined;
        const refreshTokenEncrypted = tokens.refresh_token
            ? encryptString(tokens.refresh_token)
            : undefined;
        const scope = tokens.scope ?? GMAIL_READONLY_SCOPE;
        const now = new Date();

        const existingConnection = await prisma.emailConnection.findFirst({
            where: {
                userId,
                provider: EmailProvider.gmail,
                email,
            },
        });

        if (existingConnection) {
            const updatedConnection = await prisma.emailConnection.update({
                where: {
                    id: existingConnection.id,
                },
                data: {
                    ...(accessTokenEncrypted ? { accessTokenEncrypted } : {}),
                    ...(refreshTokenEncrypted ? { refreshTokenEncrypted } : {}),
                    scope,
                    connectedAt: now,
                },
            });

            return toSafeConnectionResponse(updatedConnection);
        }

        const connection = await prisma.emailConnection.create({
            data: {
                userId,
                provider: EmailProvider.gmail,
                email,
                accessTokenEncrypted: accessTokenEncrypted ?? null,
                refreshTokenEncrypted: refreshTokenEncrypted ?? null,
                scope,
                connectedAt: now,
            },
        });

        return toSafeConnectionResponse(connection);
    } catch (error) {
        if (error instanceof GmailOAuthServiceError) {
            throw error;
        }

        throw new GmailOAuthServiceError(
            "GMAIL_CONNECTION_FAILED",
            "Gmail connection failed."
        );
    }
}
