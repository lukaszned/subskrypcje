import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DetectedSubscriptionStatus, EmailProvider } from "@prisma/client";
import { google } from "googleapis";
import {
    analyzeMessageForSubscription,
    cleanText,
    EmailDetectionResult,
    parseAmountText,
    parseTrialEndDateText,
    truncateEvidenceSnippet,
} from "../services/email-detection.service";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_MAX_RESULTS = 25;
const GMAIL_SPIKE_VERBOSE = process.env.GMAIL_SPIKE_VERBOSE === "true";
const GMAIL_SPIKE_SAVE_CANDIDATES =
    process.env.GMAIL_SPIKE_SAVE_CANDIDATES === "true";
const GMAIL_QUERY_VARIANTS = [
    {
        name: "broad_current",
        query:
            "newer_than:365d (receipt OR invoice OR subscription OR renewal OR trial OR payment OR billing OR faktura OR subskrypcja OR platnosc)",
    },
    {
        name: "strong_subscription",
        query:
            'newer_than:365d (subscription OR trial OR renewal OR "automatically charged" OR "renews on" OR "trial will end")',
    },
    {
        name: "receipts",
        query:
            'newer_than:365d (receipt OR invoice OR "order receipt" OR faktura OR rachunek)',
    },
    {
        name: "known_providers",
        query:
            'newer_than:365d (Netflix OR Spotify OR "Google Play" OR Apple OR OpenAI OR ChatGPT OR Canva OR Adobe OR Microsoft OR Amazon OR Disney OR Dropbox OR Notion OR Figma OR GitHub)',
    },
    {
        name: "payments",
        query:
            'newer_than:365d (PayPal OR Stripe OR "Google Payments" OR "Apple receipt" OR "Google Play Order Receipt")',
    },
];

type HeaderName = "From" | "Subject" | "Date";

type AnalyzedMessage = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    analysis: EmailDetectionResult;
    sourceQueryNames: Set<string>;
};

type QueryVariant = {
    name: string;
    query: string;
};

type QuerySummary = {
    queryName: string;
    gmailResults: number;
    analyzed: AnalyzedMessage[];
};

type SaveCandidatesResult = {
    userEmail: string;
    created: {
        id: string;
        label: string;
        confidence: number;
        sourceMessageId: string;
    }[];
    skippedExisting: number;
    notSaved: number;
};

function requireGoogleEnv() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    const missing = [
        !clientId ? "GOOGLE_CLIENT_ID" : null,
        !clientSecret ? "GOOGLE_CLIENT_SECRET" : null,
        !redirectUri ? "GOOGLE_REDIRECT_URI" : null,
    ].filter(Boolean);

    if (missing.length > 0) {
        throw new Error(
            "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI"
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
    headerName: HeaderName
) {
    return (
        headers?.find(
            (header) => header.name?.toLowerCase() === headerName.toLowerCase()
        )?.value ?? ""
    );
}

function printOptionalAnalysisField(label: string, value: unknown) {
    if (value !== undefined && value !== null && value !== "") {
        console.log(`${label}: ${value}`);
    }
}

function printAnalysis(analysis: EmailDetectionResult) {
    console.log("Analysis:");
    console.log(`candidate: ${analysis.isCandidate ? "yes" : "no"}`);
    console.log(`confidence: ${analysis.confidence.toFixed(2)}`);
    console.log("reasons:");

    if (analysis.reasons.length === 0) {
        console.log("- no strong signals");
    } else {
        for (const reason of analysis.reasons) {
            console.log(`- ${reason}`);
        }
    }

    const detectedEntries = Object.entries(analysis.detected).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
    );

    if (detectedEntries.length > 0) {
        console.log("detected:");
        printOptionalAnalysisField("provider", analysis.detected.provider);
        printOptionalAnalysisField("name", analysis.detected.name);
        printOptionalAnalysisField("isTrial", analysis.detected.isTrial);
        printOptionalAnalysisField(
            "trialEndDateText",
            analysis.detected.trialEndDateText
        );
        printOptionalAnalysisField("amountText", analysis.detected.amountText);
        printOptionalAnalysisField("currency", analysis.detected.currency);
        printOptionalAnalysisField("billingCycle", analysis.detected.billingCycle);
    }
}

function getCandidateLabel(message: AnalyzedMessage) {
    return (
        message.analysis.detected.provider ??
        message.analysis.detected.name ??
        "Unknown provider"
    );
}

function getCandidates(analyzedMessages: AnalyzedMessage[]) {
    return analyzedMessages
        .filter((message) => message.analysis.isCandidate)
        .sort((left, right) => right.analysis.confidence - left.analysis.confidence);
}

function printMessageDetails(message: AnalyzedMessage) {
    console.log("Message");
    console.log(`id: ${message.id}`);
    console.log(`From: ${message.from}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Date: ${message.date}`);
    console.log(`snippet: ${message.snippet}`);
    printAnalysis(message.analysis);
    console.log("");
}

function printQuerySummary(summary: QuerySummary) {
    const candidates = getCandidates(summary.analyzed);
    const rejected = summary.analyzed.length - candidates.length;
    const candidateRate =
        summary.analyzed.length > 0
            ? Math.round((candidates.length / summary.analyzed.length) * 100)
            : 0;

    console.log(`Query: ${summary.queryName}`);
    console.log(`Gmail results: ${summary.gmailResults}`);
    console.log(`Analyzed: ${summary.analyzed.length}`);
    console.log(`Candidates: ${candidates.length}`);
    console.log(`Rejected: ${rejected}`);
    console.log(`Candidate rate: ${candidateRate}%`);

    if (candidates.length > 0) {
        console.log("");
        console.log("Top candidates:");

        for (const candidate of candidates) {
            console.log(
                `- ${getCandidateLabel(candidate)}, confidence ${candidate.analysis.confidence.toFixed(
                    2
                )}, subject: ${candidate.subject}, messageId: ${candidate.id}`
            );
        }
    }

    console.log("");
}

function printGlobalSummary(analyzedMessages: AnalyzedMessage[]) {
    const candidates = analyzedMessages.filter(
        (message) => message.analysis.isCandidate
    );

    console.log("Global summary:");
    console.log(`unique messages analyzed: ${analyzedMessages.length}`);
    console.log(`unique candidates: ${candidates.length}`);
    console.log(`unique rejected: ${analyzedMessages.length - candidates.length}`);

    if (candidates.length === 0) {
        return;
    }

    console.log("");
    console.log("Global top candidates:");

    for (const candidate of getCandidates(analyzedMessages)) {
        console.log(
            `- ${getCandidateLabel(candidate)}, confidence ${candidate.analysis.confidence.toFixed(
                2
            )}, subject: ${candidate.subject}, source query: ${Array.from(
                candidate.sourceQueryNames
            ).join(", ")}`
        );
    }
}

function printSaveCandidatesResult(result: SaveCandidatesResult) {
    console.log("");
    console.log("Save candidates:");
    console.log(`user: ${result.userEmail}`);
    console.log(`created: ${result.created.length}`);
    console.log(`skippedExisting: ${result.skippedExisting}`);
    console.log(`notSaved: ${result.notSaved}`);

    if (result.created.length === 0) {
        return;
    }

    console.log("");
    console.log("Created detections:");

    for (const createdDetection of result.created) {
        console.log(
            `- id: ${createdDetection.id}, ${createdDetection.label}, confidence ${createdDetection.confidence.toFixed(
                2
            )}, sourceMessageId: ${createdDetection.sourceMessageId}`
        );
    }
}

async function saveCandidatesToDb(
    analyzedMessages: AnalyzedMessage[]
): Promise<SaveCandidatesResult> {
    const testUserEmail = process.env.TEST_USER_EMAIL;

    if (!testUserEmail) {
        throw new Error(
            "TEST_USER_EMAIL is required when GMAIL_SPIKE_SAVE_CANDIDATES=true"
        );
    }

    const { prisma } = await import("../lib/prisma");
    const user = await prisma.user.findUnique({
        where: {
            email: testUserEmail,
        },
    });

    if (!user) {
        throw new Error(`No user found for TEST_USER_EMAIL=${testUserEmail}`);
    }

    const candidates = getCandidates(analyzedMessages);
    const created: SaveCandidatesResult["created"] = [];
    let skippedExisting = 0;
    let notSaved = 0;

    try {
        for (const candidate of candidates) {
            const existingDetection = await prisma.detectedSubscription.findFirst({
                where: {
                    userId: user.id,
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

            const parsedAmount = parseAmountText(
                candidate.analysis.detected.amountText
            );
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

            try {
                const detection = await prisma.detectedSubscription.create({
                    data: {
                        userId: user.id,
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
                    label: provider ?? name,
                    confidence: Number(detection.confidence.toString()),
                    sourceMessageId: candidate.id,
                });
            } catch (error) {
                notSaved += 1;
                const message = error instanceof Error ? error.message : String(error);
                console.error(
                    `Failed to save candidate ${candidate.id}: ${message}`
                );
            }
        }

        return {
            userEmail: user.email,
            created,
            skippedExisting,
            notSaved,
        };
    } finally {
        await prisma.$disconnect();
    }
}

async function analyzeGmailMessage(
    gmail: ReturnType<typeof google.gmail>,
    messageId: string,
    queryName: string
): Promise<AnalyzedMessage> {
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
        sourceQueryNames: new Set([queryName]),
    };
}

async function runQueryVariant(
    gmail: ReturnType<typeof google.gmail>,
    variant: QueryVariant,
    globalMessagesById: Map<string, AnalyzedMessage>
): Promise<QuerySummary> {
    const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: variant.query,
        maxResults: GMAIL_MAX_RESULTS,
    });

    const messages = listResponse.data.messages ?? [];
    const analyzed: AnalyzedMessage[] = [];

    for (const message of messages) {
        if (!message.id) {
            continue;
        }

        const existingMessage = globalMessagesById.get(message.id);

        if (existingMessage) {
            existingMessage.sourceQueryNames.add(variant.name);
            analyzed.push(existingMessage);
            continue;
        }

        const analyzedMessage = await analyzeGmailMessage(
            gmail,
            message.id,
            variant.name
        );

        globalMessagesById.set(analyzedMessage.id, analyzedMessage);
        analyzed.push(analyzedMessage);
    }

    return {
        queryName: variant.name,
        gmailResults: messages.length,
        analyzed,
    };
}

async function main() {
    const { clientId, clientSecret, redirectUri } = requireGoogleEnv();

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        response_type: "code",
        scope: [GMAIL_READONLY_SCOPE],
    });
    console.log("Open this URL in your browser and authorize Gmail readonly access:");
    console.log(authUrl);
    console.log("");

    const readline = createInterface({ input, output });

    try {
        const code = await readline.question("Paste authorization code: ");

        if (!code.trim()) {
            throw new Error("Authorization code is required");
        }

        const { tokens } = await oauth2Client.getToken(code.trim());
        oauth2Client.setCredentials(tokens);

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        const globalMessagesById = new Map<string, AnalyzedMessage>();

        console.log(
            `Running ${GMAIL_QUERY_VARIANTS.length} Gmail query variant(s), max ${GMAIL_MAX_RESULTS} results each.`
        );
        console.log(`Verbose: ${GMAIL_SPIKE_VERBOSE ? "true" : "false"}`);
        console.log(
            `Save candidates: ${GMAIL_SPIKE_SAVE_CANDIDATES ? "true" : "false"}`
        );
        console.log("");

        for (const variant of GMAIL_QUERY_VARIANTS) {
            const summary = await runQueryVariant(
                gmail,
                variant,
                globalMessagesById
            );

            if (GMAIL_SPIKE_VERBOSE) {
                for (const analyzedMessage of summary.analyzed) {
                    printMessageDetails(analyzedMessage);
                }
            }

            printQuerySummary(summary);
        }

        const uniqueAnalyzedMessages = Array.from(globalMessagesById.values());
        printGlobalSummary(uniqueAnalyzedMessages);

        if (GMAIL_SPIKE_SAVE_CANDIDATES) {
            const saveResult = await saveCandidatesToDb(uniqueAnalyzedMessages);
            printSaveCandidatesResult(saveResult);
        }
    } finally {
        readline.close();
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Gmail scan spike failed: ${message}`);
    process.exitCode = 1;
});
