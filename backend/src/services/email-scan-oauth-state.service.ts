import {
    createHmac,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

type EmailScanOAuthStatePayload = {
    userId: string;
    nonce: string;
    exp: number;
};

function getStateSecret() {
    const secret = process.env.EMAIL_SCAN_OAUTH_STATE_SECRET;

    if (!secret) {
        throw new Error("EMAIL_SCAN_OAUTH_STATE_SECRET is not set");
    }

    return secret;
}

function signPayload(encodedPayload: string) {
    return createHmac("sha256", getStateSecret())
        .update(encodedPayload)
        .digest("base64url");
}

export function createEmailScanOAuthState(userId: string): string {
    const payload: EmailScanOAuthStatePayload = {
        userId,
        nonce: randomBytes(16).toString("base64url"),
        exp: Date.now() + STATE_TTL_MS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64url"
    );
    const signature = signPayload(encodedPayload);

    return `${encodedPayload}.${signature}`;
}

export function verifyEmailScanOAuthState(state: string): { userId: string } {
    const [encodedPayload, signature] = state.split(".");

    if (!encodedPayload || !signature) {
        throw new Error("Invalid OAuth state");
    }

    const expectedSignature = signPayload(encodedPayload);
    const signatureBuffer = Buffer.from(signature, "base64url");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");

    if (
        signatureBuffer.length !== expectedSignatureBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
        throw new Error("Invalid OAuth state");
    }

    let payload: EmailScanOAuthStatePayload;

    try {
        payload = JSON.parse(
            Buffer.from(encodedPayload, "base64url").toString("utf8")
        ) as EmailScanOAuthStatePayload;
    } catch {
        throw new Error("Invalid OAuth state");
    }

    if (!payload.userId || !payload.nonce || !payload.exp) {
        throw new Error("Invalid OAuth state");
    }

    if (payload.exp < Date.now()) {
        throw new Error("OAuth state expired");
    }

    return {
        userId: payload.userId,
    };
}
