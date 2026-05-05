import {
    DetectedSubscriptionStatus,
    EmailProvider,
} from "@prisma/client";
import { google } from "googleapis";
import { decryptString } from "../lib/crypto";
import { prisma } from "../lib/prisma";
import {
    analyzeMessageForSubscription,
    cleanText,
    EmailDetectionResult,
    parseAmountText,
    parseTrialEndDateText,
    truncateEvidenceSnippet,
} from "./email-detection.service";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type GmailScanQueryVariant = {
    name: string;
    query: string;
};

type GmailScanMessage = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    analysis: EmailDetectionResult;
};

type GmailScanQuerySummary = {
    name: string;
    gmailResults: number;
    analyzed: number;
    candidates: number;
};

export type GmailScanErrorCode =
    | "GMAIL_CONNECTION_NOT_FOUND"
    | "GMAIL_REAUTH_REQUIRED"
    | "GMAIL_SCAN_FAILED";

export class GmailScanServiceError extends Error {
    constructor(
        public code: GmailScanErrorCode,
        message: string
    ) {
        super(message);
        this.name = "GmailScanServiceError";
    }
}

export type ScanGmailParams = {
    connectionId?: string;
    limit: number;
    sinceDays: number;
};

function buildGmailQueryVariants(sinceDays: number): GmailScanQueryVariant[] {
    return [
        {
            name: "broad_current",
            query: `newer_than:${sinceDays}d (receipt OR invoice OR subscription OR renewal OR trial OR payment OR billing OR faktura OR subskrypcja OR platnosc)`,
        },
        {
            name: "strong_subscription",
            query: `newer_than:${sinceDays}d (subscription OR trial OR renewal OR "automatically charged" OR "renews on" OR "trial will end")`,
        },
        {
            name: "receipts",
            query: `newer_than:${sinceDays}d (receipt OR invoice OR "order receipt" OR faktura OR rachunek)`,
        },
        {
            name: "known_providers",
            query: `newer_than:${sinceDays}d (Netflix OR Spotify OR "Google Play" OR Apple OR OpenAI OR ChatGPT OR Canva OR Adobe OR Microsoft OR Amazon OR Disney OR Dropbox OR Notion OR Figma OR GitHub)`,
        },
        {
            name: "payments",
            query: `newer_than:${sinceDays}d (PayPal OR Stripe OR "Google Payments" OR "Apple receipt" OR "Google Play Order Receipt")`,
        },
    ];
}

function getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new GmailScanServiceError(
            "GMAIL_SCAN_FAILED",
            "Missing Google OAuth configuration."
        );
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
    };
}

function getHeader(
    headers: { name?: string | null; value?: string | null }[] | undefined,
    headerName: "From" | "Subject" | "Date"
) {
    return (
        headers?.find(
            (header) => header.name?.toLowerCase() === headerName.toLowerCase()
        )?.value ?? ""
    );
}

async function getGmailConnection(userId: string, connectionId?: string) {
    if (connectionId) {
        return prisma.emailConnection.findFirst({
            where: {
                id: connectionId,
                userId,
                provider: EmailProvider.gmail,
            },
        });
    }

    return prisma.emailConnection.findFirst({
        where: {
            userId,
            provider: EmailProvider.gmail,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });
}

function createGmailClient(connection: {
    accessTokenEncrypted: string | null;
    refreshTokenEncrypted: string | null;
    scope: string;
}) {
    if (!connection.refreshTokenEncrypted) {
        throw new GmailScanServiceError(
            "GMAIL_REAUTH_REQUIRED",
            "Gmail connection requires reauthorization."
        );
    }

    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
    const oauthClient = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    oauthClient.setCredentials({
        access_token: connection.accessTokenEncrypted
            ? decryptString(connection.accessTokenEncrypted)
            : undefined,
        refresh_token: decryptString(connection.refreshTokenEncrypted),
        scope: connection.scope || GMAIL_READONLY_SCOPE,
    });

    return google.gmail({ version: "v1", auth: oauthClient });
}

async function analyzeGmailMessage(
    gmail: ReturnType<typeof google.gmail>,
    messageId: string
): Promise<GmailScanMessage> {
    const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
    });

    const payloadHeaders = messageResponse.data.payload?.headers;
    const id = messageResponse.data.id ?? messageId;
    const from = cleanText(getHeader(payloadHeaders, "From"));
    const subject = cleanText(getHeader(payloadHeaders, "Subject"));
    const date = cleanText(getHeader(payloadHeaders, "Date"));
    const snippet = cleanText(messageResponse.data.snippet);
    const analysis = analyzeMessageForSubscription({
        id,
        from,
        subject,
        date,
        snippet,
    });

    return {
        id,
        from,
        subject,
        date,
        snippet,
        analysis,
    };
}

async function runGmailQueryVariant(
    gmail: ReturnType<typeof google.gmail>,
    variant: GmailScanQueryVariant,
    limit: number,
    globalMessagesById: Map<string, GmailScanMessage>
): Promise<GmailScanQuerySummary> {
    const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: variant.query,
        maxResults: limit,
    });
    const messages = listResponse.data.messages ?? [];
    let candidates = 0;

    for (const message of messages) {
        if (!message.id) {
            continue;
        }

        const existingMessage = globalMessagesById.get(message.id);

        if (existingMessage) {
            if (existingMessage.analysis.isCandidate) {
                candidates += 1;
            }
            continue;
        }

        const analyzedMessage = await analyzeGmailMessage(gmail, message.id);
        globalMessagesById.set(analyzedMessage.id, analyzedMessage);

        if (analyzedMessage.analysis.isCandidate) {
            candidates += 1;
        }
    }

    return {
        name: variant.name,
        gmailResults: messages.length,
        analyzed: messages.filter((message) => Boolean(message.id)).length,
        candidates,
    };
}

async function saveCandidates(params: {
    userId: string;
    emailConnectionId: string;
    candidates: GmailScanMessage[];
}) {
    const created: {
        id: string;
        provider: string | null;
        name: string;
        confidence: number;
        sourceMessageId: string;
    }[] = [];
    let skippedExisting = 0;

    for (const candidate of params.candidates) {
        const existingDetection = await prisma.detectedSubscription.findFirst({
            where: {
                userId: params.userId,
                sourceProvider: EmailProvider.gmail,
                sourceMessageId: candidate.id,
            },
            select: {
                id: true,
            },
        });

        if (existingDetection) {
            skippedExisting += 1;
            continue;
        }

        const parsedAmount = parseAmountText(candidate.analysis.detected.amountText);
        const amount =
            parsedAmount && Number.isFinite(parsedAmount.amount)
                ? parsedAmount.amount
                : null;
        const currency =
            candidate.analysis.detected.currency ?? parsedAmount?.currency ?? null;
        const provider =
            candidate.analysis.detected.provider ??
            candidate.analysis.detected.name ??
            null;
        const name =
            candidate.analysis.detected.name ??
            candidate.analysis.detected.provider ??
            "Detected subscription";

        const detection = await prisma.detectedSubscription.create({
            data: {
                userId: params.userId,
                emailConnectionId: params.emailConnectionId,
                sourceProvider: EmailProvider.gmail,
                sourceMessageId: candidate.id,
                provider,
                name,
                amount,
                currency,
                billingCycle: candidate.analysis.detected.billingCycle ?? null,
                nextPaymentDate: null,
                trialEndDate: parseTrialEndDateText(
                    candidate.analysis.detected.trialEndDateText
                ),
                isTrial: candidate.analysis.detected.isTrial ?? false,
                category: null,
                confidence: candidate.analysis.confidence,
                status: DetectedSubscriptionStatus.pending,
                evidenceSnippet: truncateEvidenceSnippet(candidate.snippet),
            },
        });

        created.push({
            id: detection.id,
            provider: detection.provider,
            name: detection.name,
            confidence: Number(detection.confidence.toString()),
            sourceMessageId: candidate.id,
        });
    }

    return {
        created,
        skippedExisting,
    };
}

export async function scanGmailForUser(userId: string, params: ScanGmailParams) {
    const connection = await getGmailConnection(userId, params.connectionId);

    if (!connection) {
        throw new GmailScanServiceError(
            "GMAIL_CONNECTION_NOT_FOUND",
            "Gmail connection not found."
        );
    }

    try {
        const gmail = createGmailClient(connection);
        const globalMessagesById = new Map<string, GmailScanMessage>();
        const querySummaries: GmailScanQuerySummary[] = [];

        for (const variant of buildGmailQueryVariants(params.sinceDays)) {
            querySummaries.push(
                await runGmailQueryVariant(
                    gmail,
                    variant,
                    params.limit,
                    globalMessagesById
                )
            );
        }

        const analyzedMessages = Array.from(globalMessagesById.values());
        const candidates = analyzedMessages.filter(
            (message) => message.analysis.isCandidate
        );
        const { created, skippedExisting } = await saveCandidates({
            userId,
            emailConnectionId: connection.id,
            candidates,
        });
        const lastScanAt = new Date();
        const updatedConnection = await prisma.emailConnection.update({
            where: {
                id: connection.id,
            },
            data: {
                lastScanAt,
            },
            select: {
                id: true,
                email: true,
                provider: true,
                lastScanAt: true,
            },
        });

        return {
            connection: updatedConnection,
            scannedMessages: analyzedMessages.length,
            candidatesFound: candidates.length,
            createdDetections: created.length,
            skippedExisting,
            rejectedMessages: analyzedMessages.length - candidates.length,
            querySummaries,
            created,
        };
    } catch (error) {
        if (error instanceof GmailScanServiceError) {
            throw error;
        }

        throw new GmailScanServiceError(
            "GMAIL_SCAN_FAILED",
            "Gmail scan failed."
        );
    }
}
