const REQUIRED_ENV = [
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
] as const;

const OPTIONAL_GMAIL_ENV = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
] as const;

function hasEnv(name: string) {
    return Boolean(process.env[name]?.trim());
}

function resolveGmailRedirectBase() {
    const explicitBase = process.env.GMAIL_REDIRECT_BASE_URL?.trim();

    if (explicitBase) {
        return {
            source: "GMAIL_REDIRECT_BASE_URL",
            value: explicitBase.replace(/\/+$/g, ""),
        };
    }

    const legacyRedirect = process.env.GOOGLE_REDIRECT_URI?.trim();

    if (legacyRedirect) {
        try {
            const parsed = new URL(legacyRedirect);
            return {
                source: "GOOGLE_REDIRECT_URI",
                value: `${parsed.protocol}//${parsed.host}`,
            };
        } catch {
            return {
                source: "GOOGLE_REDIRECT_URI",
                value: "invalid_url",
            };
        }
    }

    return {
        source: "default_localhost",
        value: "http://localhost:3000",
    };
}

function isLocalhostUrl(value: string) {
    try {
        const parsed = new URL(value);
        return /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
    } catch {
        return false;
    }
}

export function logStartupEnvironmentDiagnostics() {
    const missingRequired = REQUIRED_ENV.filter((name) => !hasEnv(name));

    if (missingRequired.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingRequired.join(", ")}`
        );
    }

    const gmailMissing = OPTIONAL_GMAIL_ENV.filter((name) => !hasEnv(name));
    const gmailConfigured = gmailMissing.length === 0;
    const redirectBase = resolveGmailRedirectBase();
    const redirectUsesLocalhost = isLocalhostUrl(redirectBase.value);

    console.info("[startup] environment diagnostics", {
        nodeEnv: process.env.NODE_ENV ?? "development",
        port: process.env.PORT ?? "3000",
        databaseConfigured: hasEnv("DATABASE_URL"),
        supabaseConfigured:
            hasEnv("SUPABASE_URL") && hasEnv("SUPABASE_ANON_KEY"),
        gmailOAuthConfigured: gmailConfigured,
        gmailRedirectSource: redirectBase.source,
        gmailRedirectUsesLocalhost: redirectUsesLocalhost,
        emailTokenEncryptionConfigured: hasEnv("EMAIL_TOKEN_ENCRYPTION_KEY"),
    });

    if (!gmailConfigured) {
        console.warn("[startup] Gmail OAuth config is incomplete", {
            missing: gmailMissing,
            effect: "Gmail connect/scan endpoints will return safe setup errors.",
        });
    }

    if (!hasEnv("EMAIL_TOKEN_ENCRYPTION_KEY")) {
        console.warn("[startup] EMAIL_TOKEN_ENCRYPTION_KEY is missing", {
            effect: "Gmail token encryption/decryption will fail until configured.",
        });
    }

    if (redirectBase.source === "default_localhost") {
        console.warn("[startup] Gmail OAuth redirect is using localhost fallback", {
            effect:
                "Desktop testing can work, but physical phone OAuth needs GMAIL_REDIRECT_BASE_URL with LAN IP or a public tunnel.",
        });
    } else if (
        process.env.NODE_ENV !== "production" &&
        redirectUsesLocalhost
    ) {
        console.warn("[startup] Gmail OAuth redirect uses localhost", {
            effect:
                "This will not work from a physical phone. Use GMAIL_REDIRECT_BASE_URL with LAN IP or a public tunnel for mobile dev.",
        });
    }
}
