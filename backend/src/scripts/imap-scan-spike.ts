import "dotenv/config";
import { ImapFlow, MessageAddressObject } from "imapflow";
import {
    analyzeMessageForSubscription,
    cleanText,
    truncateEvidenceSnippet,
} from "../services/email-detection.service";

type ImapSpikeConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    mailbox: string;
    limit: number;
    verbose: boolean;
    outputJson: boolean;
};

type ImapDebugMessage = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    isCandidate: boolean;
    confidence: number;
    reasons: string[];
    detected: ReturnType<typeof analyzeMessageForSubscription>["detected"];
};

type ImapScanSpikeResult = {
    mailbox: string;
    scannedMessages: number;
    candidatesFound: number;
    rejectedMessages: number;
    debugMessages: ImapDebugMessage[];
};

function parseBoolean(value: string | undefined, defaultValue: boolean) {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function parsePositiveInteger(
    value: string | undefined,
    defaultValue: number,
    label: string
) {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${label} must be a positive integer.`);
    }

    return parsed;
}

function getConfig(): ImapSpikeConfig {
    const host = process.env.IMAP_HOST?.trim();
    const user = process.env.IMAP_USER?.trim();
    const password = process.env.IMAP_PASSWORD;

    if (!host) {
        throw new Error("Missing IMAP_HOST.");
    }

    if (!user) {
        throw new Error("Missing IMAP_USER.");
    }

    if (!password) {
        throw new Error("Missing IMAP_PASSWORD.");
    }

    return {
        host,
        user,
        password,
        port: parsePositiveInteger(process.env.IMAP_PORT, 993, "IMAP_PORT"),
        secure: parseBoolean(process.env.IMAP_SECURE, true),
        mailbox: process.env.IMAP_MAILBOX?.trim() || "INBOX",
        limit: parsePositiveInteger(
            process.env.IMAP_SCAN_LIMIT,
            50,
            "IMAP_SCAN_LIMIT"
        ),
        verbose: parseBoolean(process.env.IMAP_VERBOSE, false),
        outputJson: parseBoolean(process.env.IMAP_OUTPUT_JSON, false),
    };
}

function formatAddress(address: MessageAddressObject | undefined) {
    if (!address) {
        return "";
    }

    if (address.name && address.address) {
        return `${address.name} <${address.address}>`;
    }

    return address.address ?? address.name ?? "";
}

function stripHtml(value: string) {
    return value
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ");
}

function sourceToSnippet(source: Buffer | undefined) {
    if (!source) {
        return "";
    }

    const raw = source.toString("utf8");
    const bodyStart = raw.search(/\r?\n\r?\n/);
    const body = bodyStart >= 0 ? raw.slice(bodyStart) : raw;

    return truncateEvidenceSnippet(cleanText(stripHtml(body)));
}

function optionalLine(label: string, value: string | number | boolean | undefined) {
    if (value === undefined || value === "") {
        return;
    }

    console.log(`   ${label}: ${value}`);
}

function printHumanSummary(result: ImapScanSpikeResult) {
    console.log("IMAP scan summary:");
    console.log(`mailbox: ${result.mailbox}`);
    console.log(`scannedMessages: ${result.scannedMessages}`);
    console.log(`candidatesFound: ${result.candidatesFound}`);
    console.log(`rejectedMessages: ${result.rejectedMessages}`);
    console.log("");

    const candidates = result.debugMessages
        .filter((message) => message.isCandidate)
        .sort((a, b) => b.confidence - a.confidence);

    if (candidates.length === 0) {
        console.log("Potential subscriptions: none");
        return;
    }

    console.log("Potential subscriptions:");

    candidates.forEach((message, index) => {
        const title =
            message.detected.name ??
            message.detected.provider ??
            "Unknown subscription";

        console.log("");
        console.log(`${index + 1}. ${title}`);
        console.log(`   confidence: ${message.confidence.toFixed(2)}`);
        optionalLine("provider", message.detected.provider);
        optionalLine("billingCycle", message.detected.billingCycle);
        optionalLine("amount", message.detected.amountText);
        console.log(`   trial: ${message.detected.isTrial ? "yes" : "no"}`);
        optionalLine("trialEndDate", message.detected.trialEndDateText);
        optionalLine("from", message.from);
        optionalLine("subject", message.subject);
        optionalLine("date", message.date);
        optionalLine("snippet", message.snippet);
        console.log("   reasons:");

        for (const reason of message.reasons) {
            console.log(`   - ${reason}`);
        }
    });
}

async function main() {
    const config = getConfig();

    if (config.verbose) {
        console.error(
            `Connecting to IMAP ${config.host}:${config.port}, mailbox ${config.mailbox}, limit ${config.limit}`
        );
    }

    const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.password,
        },
        logger: false,
    });

    try {
        await client.connect();
        const mailbox = await client.mailboxOpen(config.mailbox);
        const totalMessages = mailbox.exists ?? 0;

        if (config.verbose) {
            console.error(`Opened mailbox ${config.mailbox}; messages: ${totalMessages}`);
        }

        const debugMessages: ImapDebugMessage[] = [];

        if (totalMessages > 0) {
            const startSeq = Math.max(1, totalMessages - config.limit + 1);
            const range = `${startSeq}:*`;

            for await (const message of client.fetch(range, {
                envelope: true,
                internalDate: true,
                source: {
                    maxLength: 20_000,
                },
            })) {
                const id = String(message.uid ?? message.seq);
                const from = cleanText(formatAddress(message.envelope?.from?.[0]));
                const subject = cleanText(message.envelope?.subject ?? "");
                const dateValue =
                    message.envelope?.date ?? message.internalDate ?? undefined;
                const date =
                    dateValue instanceof Date
                        ? dateValue.toISOString()
                        : cleanText(String(dateValue ?? ""));
                const snippet = sourceToSnippet(message.source);
                const analysis = analyzeMessageForSubscription({
                    id,
                    from,
                    subject,
                    date,
                    snippet,
                });

                debugMessages.push({
                    id,
                    from,
                    subject,
                    date,
                    snippet,
                    isCandidate: analysis.isCandidate,
                    confidence: analysis.confidence,
                    reasons: analysis.reasons,
                    detected: analysis.detected,
                });
            }
        }

        const candidatesFound = debugMessages.filter(
            (message) => message.isCandidate
        ).length;
        const result: ImapScanSpikeResult = {
            mailbox: config.mailbox,
            scannedMessages: debugMessages.length,
            candidatesFound,
            rejectedMessages: debugMessages.length - candidatesFound,
            debugMessages,
        };

        if (config.outputJson) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            printHumanSummary(result);
        }
    } finally {
        await client.logout().catch(() => undefined);
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : "IMAP scan failed.";
    console.error(`IMAP scan spike error: ${message}`);
    process.exitCode = 1;
});
