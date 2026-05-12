import "dotenv/config";
import { ImapFlow, MessageAddressObject } from "imapflow";
import { simpleParser } from "mailparser";
import {
    analyzeMessageForSubscription,
    cleanText,
    debugAnalyzeMessageForSubscription,
    EmailDetectionDebugDetails,
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
    targetedSearch: boolean;
    targetedSearchLimit: number;
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
    source: "latest_scan" | "targeted_search";
    debug?: EmailDetectionDebugDetails;
};

type ImapRecurringGroup = {
    groupKey: string;
    suggestedName: string;
    confidence: number;
    cadence: "monthly" | "weekly" | "unknown";
    count: number;
    firstDate: string;
    lastDate: string;
    amounts: string[];
    provider?: string;
    domain: string;
    fromSample: string;
    sampleSubjects: string[];
    sampleSnippets: string[];
    messageIds: string[];
    candidateMessages: number;
    evidenceMessages: number;
    reasons: string[];
    isRecurringCandidate: boolean;
};

type ImapScanSpikeResult = {
    mailbox: string;
    scannedMessages: number;
    candidatesFound: number;
    rejectedMessages: number;
    recurringGroups: ImapRecurringGroup[];
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
        targetedSearch: parseBoolean(process.env.IMAP_TARGETED_SEARCH, false),
        targetedSearchLimit: parsePositiveInteger(
            process.env.IMAP_TARGETED_SEARCH_LIMIT,
            250,
            "IMAP_TARGETED_SEARCH_LIMIT"
        ),
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

async function messageSourceToSnippet(source: Buffer | undefined) {
    if (!source) {
        return "";
    }

    try {
        const parsed = await simpleParser(source);
        const parsedBody = parsed.text || (parsed.html ? stripHtml(parsed.html) : "");

        if (parsedBody) {
            return truncateEvidenceSnippet(cleanText(parsedBody));
        }
    } catch {
        return sourceToSnippet(source);
    }

    return sourceToSnippet(source);
}

const TARGETED_SEARCH_TERMS = [
    "subscription",
    "subskrypcja",
    "abonament",
    "renewal",
    "odnowienie",
    "trial",
    "okres próbny",
    "faktura",
    "efaktura",
    "rachunek",
    "kwota do zapłaty",
    "termin płatności",
    "invoice",
    "receipt",
    "Google Play",
    "App Store",
    "Prime Video",
    "Amazon Prime",
    "PayPal",
    "Stripe",
    "Netflix",
    "Spotify",
    "YouTube",
    "Google One",
    "iCloud",
    "Disney",
    "Max",
    "SkyShowtime",
    "Adobe",
    "Canva",
    "Microsoft 365",
    "Dropbox",
    "AllTrails",
    "Play",
    "Orange",
    "T-Mobile",
    "Plus",
    "Netia",
    "Vectra",
    "TOYA",
    "Tauron",
    "PGE",
    "E.ON",
    "Energa",
];

async function appendDebugMessageFromFetchMessage(
    debugMessages: ImapDebugMessage[],
    seenIds: Set<string>,
    message: {
        uid?: number | string;
        seq?: number | string;
        envelope?: {
            from?: MessageAddressObject[];
            subject?: string;
            date?: Date | string;
        };
        internalDate?: Date | string;
        source?: Buffer;
    },
    source: "latest_scan" | "targeted_search"
) {
    const id = String(message.uid ?? message.seq);

    if (!id || seenIds.has(id)) {
        return;
    }

    seenIds.add(id);

    const from = cleanText(formatAddress(message.envelope?.from?.[0]));
    const subject = cleanText(message.envelope?.subject ?? "");
    const dateValue = message.envelope?.date ?? message.internalDate ?? undefined;
    const date =
        dateValue instanceof Date
            ? dateValue.toISOString()
            : cleanText(String(dateValue ?? ""));
    const snippet = await messageSourceToSnippet(message.source);
    const input = {
        id,
        from,
        subject,
        date,
        snippet,
    };
    const analysis = analyzeMessageForSubscription(input);
    const debug = debugAnalyzeMessageForSubscription(input);

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
        source,
        debug,
    });
}

async function collectTargetedSearchUids(
    client: ImapFlow,
    limit: number,
    verbose: boolean
) {
    const uids = new Set<number>();

    for (const term of TARGETED_SEARCH_TERMS) {
        if (uids.size >= limit) {
            break;
        }

        try {
            const matches = (await (client as any).search(
                { body: term },
                { uid: true }
            )) as number[];

            for (const uid of matches.reverse()) {
                uids.add(uid);

                if (uids.size >= limit) {
                    break;
                }
            }
        } catch (error) {
            if (verbose) {
                const message =
                    error instanceof Error ? error.message : "targeted search failed";
                console.error(`Targeted IMAP search skipped for "${term}": ${message}`);
            }
        }
    }

    return [...uids].slice(0, limit);
}

function optionalLine(label: string, value: string | number | boolean | undefined) {
    if (value === undefined || value === "") {
        return;
    }

    console.log(`   ${label}: ${value}`);
}

function extractEmailAddress(from: string) {
    return cleanText(from.match(/<([^>]+)>/)?.[1] ?? from).toLowerCase();
}

function extractSenderDomain(from: string) {
    const email = extractEmailAddress(from);
    return email.includes("@") ? email.split("@").pop() ?? email : email;
}

function normalizeSubjectFamily(subject: string) {
    const cleanedSubject = cleanText(subject);
    const efakturaMatch = cleanedSubject.match(
        /\b(eko\s?faktura|e-faktura|efaktura)\s+([^|:\n\r]+)/i
    );

    if (efakturaMatch?.[1] && efakturaMatch?.[2]) {
        return cleanText(`${efakturaMatch[1]} ${efakturaMatch[2]}`)
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    return cleanedSubject
        .toLowerCase()
        .replace(/\b(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[sś]nia|pa[zź]dziernika|listopada|grudnia)\b/gi, " ")
        .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, " ")
        .replace(/\b\d{1,4}(?:[./-]\d{1,4})+\b/g, " ")
        .replace(/\b\d+(?:[,.]\d{2})?\s?(?:pln|usd|eur|gbp|z[lł])\b/gi, " ")
        .replace(/\b\d+\b/g, " ")
        .replace(/[|:_#()[\]{}.,;!?/\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractAmounts(text: string) {
    const matches =
        text.match(/(?:[$€£]\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP|z[lł]))/gi) ??
        [];
    return [...new Set(matches.map((match) => cleanText(match)))];
}

function sanitizeSampleSnippet(snippet: string) {
    return truncateEvidenceSnippet(
        snippet.replace(/https?:\/\/\S+/gi, (url) => url.split("?")[0])
    );
}

function hasRecurringGroupEvidence(message: ImapDebugMessage) {
    const text = `${message.subject} ${message.snippet}`;

    return (
        Boolean(message.detected.amountText) ||
        extractAmounts(text).length > 0 ||
        message.reasons.some((reason) =>
            /receipt|invoice|payment|recurring bill|amount|billing date|payment\/charged/i.test(
                reason
            )
        ) ||
        /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek|payment due|invoice due|kwota do zap[lł]aty|op[lł]a[cć] faktur[eę]|op[lł]acenie do|termin p[lł]atno[sś]ci|abonenta|panel klienta|eboa|ebok|e-bok)\b/i.test(
            text
        )
    );
}

function hasOnetMarketingIntermediaryGroupSignal(text: string) {
    return /mailing_reklamowy@(grupa)?onet\.pl|\s-\s*onet\b/i.test(text);
}

function hasRecurringGroupInvoiceDueSignal(text: string) {
    return /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek|payment due|invoice due|termin p[\u0142l]atno[s\u015b]ci|kwota do zap[\u0142l]aty|op[\u0142l]a[c\u0107] faktur[e\u0119]|oplac fakture|numer faktury|eboa|ebok|e-bok)\b/i.test(
        text
    );
}

function hasRecurringGroupCreditLoanMarketingSignal(text: string) {
    return /\b(rrso|po[z\u017c]yczka|pozyczka|kredyt|oprocentowanie|prowizja|raty|leasing|kredyt 50\/50|rzeczywista roczna stopa oprocentowania)\b/i.test(
        text
    );
}

function isInvoiceLikeFamily(subjectFamily: string, messages: ImapDebugMessage[]) {
    const text = `${subjectFamily} ${messages
        .map((message) => `${message.subject} ${message.snippet}`)
        .join(" ")}`;

    if (/do[lĹ‚]adowanie|doladowanie|top-up|phone top-up|mailing@interia\.pl|dostarczone przez interi/i.test(text)) {
        return false;
    }

    return /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek|payment due|invoice due|termin p[lł]atno[sś]ci|op[lł]a[cć] faktur[eę]|eboa|ebok|e-bok)\b/i.test(
        text
    );
}

function isStrongEfakturaFamily(subjectFamily: string) {
    return /\b(ekofaktura|e-faktura|efaktura)\b/i.test(subjectFamily);
}

function isOneTimeOrNoiseGroup(messages: ImapDebugMessage[], subjectFamily: string) {
    const text = `${subjectFamily} ${messages
        .map((message) => `${message.from} ${message.subject} ${message.snippet}`)
        .join(" ")}`;

    const isStrongInvoiceGroup =
        isStrongEfakturaFamily(subjectFamily) ||
        isInvoiceLikeFamily(subjectFamily, messages);

    if (
        (hasOnetMarketingIntermediaryGroupSignal(text) ||
            hasRecurringGroupCreditLoanMarketingSignal(text)) &&
        !hasRecurringGroupInvoiceDueSignal(text)
    ) {
        return true;
    }

    if (/do[\u0142l]adowanie|top-up|phone top-up|mailing@interia\.pl|dostarczone przez interi/i.test(text)) {
        return true;
    }

    const hasHardOneTimeNoise =
        /\b(uber|uber eats|bolt|booking|media expert|allegro|olx|wizz air|koleo|restaurant|restauracji|przejazd|zam[oó]wienie|bilety kolejowe|progress report|weekly progress|security|login|logowanie)\b/i.test(
            text
        );

    if (hasHardOneTimeNoise) {
        return true;
    }

    const hasSoftMarketingNoise =
        /\b(newsletter|marketing|promocj|oferta)\b/i.test(text);

    return hasSoftMarketingNoise && !isStrongInvoiceGroup;
}

function detectCadence(messages: ImapDebugMessage[]) {
    const dates = messages
        .map((message) => Date.parse(message.date))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b);

    if (dates.length < 2) {
        return "unknown" as const;
    }

    const gaps = dates
        .slice(1)
        .map((date, index) => (date - dates[index]) / (1000 * 60 * 60 * 24))
        .filter((gap) => gap > 0);

    if (gaps.length === 0) {
        return "unknown" as const;
    }

    const monthlyGaps = gaps.filter((gap) => gap >= 20 && gap <= 45).length;
    const weeklyGaps = gaps.filter((gap) => gap >= 5 && gap <= 10).length;

    if (monthlyGaps >= Math.ceil(gaps.length * 0.6)) {
        return "monthly" as const;
    }

    if (weeklyGaps >= Math.ceil(gaps.length * 0.6)) {
        return "weekly" as const;
    }

    return "unknown" as const;
}

function cleanGroupName(value: string | undefined) {
    const cleaned = cleanText(value)
        .replace(/\b\d+(?:[./-]\d+)*\b/g, " ")
        .replace(/[|:,_#()[\]{}.!?/\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) {
        return undefined;
    }

    return cleaned
        .split(" ")
        .slice(0, 3)
        .map((part) =>
            part.length <= 4
                ? part.toUpperCase()
                : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" ");
}

function inferProviderFromGroup(messages: ImapDebugMessage[], subjectFamily: string) {
    const subjectText = messages.map((message) => message.subject).join(" ");
    const efakturaName = subjectText.match(
        /\b(?:eko\s?faktura|e-faktura|efaktura)\s+([^|:\n\r]+)/i
    )?.[1];

    const serviceName = messages
        .map((message) => message.subject)
        .map(
            (subject) =>
                subject.match(/do us[\u0142l]ugodawcy\s*-\s*([^\n\r|:;.,]+)/i)?.[1]
        )
        .find(Boolean);

    const explicitName = cleanGroupName(efakturaName ?? serviceName);

    if (explicitName) {
        return explicitName;
    }

    const domain = extractSenderDomain(messages[0].from);
    const blockedDomains = [
        "gmail.com",
        "interia.pl",
        "paypal.com",
        "tpay.com",
        "payu.com",
        "payu.pl",
        "autopay.pl",
        "stripe.com",
    ];

    if (
        /\b(ekofaktura|e-faktura|efaktura|faktura|rachunek)\b/i.test(subjectFamily) &&
        !blockedDomains.some((blocked) => domain.endsWith(blocked))
    ) {
        return cleanGroupName(domain.split(".")[0]);
    }

    return undefined;
}

function titleFromSubjectFamily(subjectFamily: string) {
    return subjectFamily
        .split(" ")
        .filter(Boolean)
        .slice(0, 5)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function buildRecurringGroups(debugMessages: ImapDebugMessage[]) {
    const grouped = new Map<string, ImapDebugMessage[]>();

    for (const message of debugMessages) {
        const subjectFamily = normalizeSubjectFamily(message.subject);

        if (!subjectFamily) {
            continue;
        }

        const domain = extractSenderDomain(message.from);
        const key = `${domain}|${subjectFamily}`;
        grouped.set(key, [...(grouped.get(key) ?? []), message]);
    }

    const groups: ImapRecurringGroup[] = [];

    for (const [groupKey, messages] of grouped.entries()) {
        if (messages.length < 2) {
            continue;
        }

        const [domain, subjectFamily] = groupKey.split("|");
        const sortedMessages = [...messages].sort(
            (a, b) => Date.parse(a.date) - Date.parse(b.date)
        );
        const cadence = detectCadence(sortedMessages);
        const evidenceMessages = sortedMessages.filter(hasRecurringGroupEvidence)
            .length;
        const candidateMessages = sortedMessages.filter((message) => message.isCandidate)
            .length;
        const invoiceLike = isInvoiceLikeFamily(subjectFamily, sortedMessages);
        const strongEfakturaFamily = isStrongEfakturaFamily(subjectFamily);
        const blockedNoise = isOneTimeOrNoiseGroup(sortedMessages, subjectFamily);
        const hasEnoughEvidenceForSmallGroup =
            sortedMessages.length > 2 || invoiceLike || candidateMessages >= 1;
        const isRecurringCandidate =
            !blockedNoise &&
            hasEnoughEvidenceForSmallGroup &&
            evidenceMessages >= 2 &&
            (cadence !== "unknown" ||
                invoiceLike ||
                (strongEfakturaFamily && sortedMessages.length >= 3));
        const reasons: string[] = [];

        if (evidenceMessages >= 2) {
            reasons.push("repeated similar invoice/payment-like emails");
        }

        if (cadence !== "unknown") {
            reasons.push(`${cadence} cadence`);
        }

        if (invoiceLike) {
            reasons.push("invoice/payment due subject or body evidence");
        }

        if (strongEfakturaFamily) {
            reasons.push("strong eFaktura subject family");
        }

        if (candidateMessages > 0) {
            reasons.push(`${candidateMessages} message-level candidates in group`);
        }

        if (blockedNoise) {
            reasons.push("excluded ecommerce/transport/newsletter/security-like group");
        }

        const amounts = [
            ...new Set(
                sortedMessages.flatMap((message) => [
                    ...(message.detected.amountText ? [message.detected.amountText] : []),
                    ...extractAmounts(`${message.subject} ${message.snippet}`),
                ])
            ),
        ].slice(0, 12);
        const provider =
            sortedMessages.find((message) => message.detected.provider)?.detected
                .provider ?? inferProviderFromGroup(sortedMessages, subjectFamily);
        const suggestedName =
            provider ??
            titleFromSubjectFamily(subjectFamily) ??
            extractEmailAddress(sortedMessages[0].from);
        const confidence = Math.max(
            0,
            Math.min(
                1,
                0.35 +
                Math.min(sortedMessages.length, 5) * 0.08 +
                evidenceMessages * 0.1 +
                (cadence === "monthly" ? 0.2 : cadence === "weekly" ? 0.1 : 0) +
                (invoiceLike ? 0.15 : 0) +
                (strongEfakturaFamily ? 0.1 : 0) -
                (blockedNoise ? 0.7 : 0)
            )
        );
        const firstDate = sortedMessages[0].date;
        const lastDate = sortedMessages[sortedMessages.length - 1].date;

        groups.push({
            groupKey,
            suggestedName,
            confidence,
            cadence,
            count: sortedMessages.length,
            firstDate,
            lastDate,
            amounts,
            provider,
            domain,
            fromSample: sortedMessages[0].from,
            sampleSubjects: [
                ...new Set(sortedMessages.map((message) => message.subject)),
            ].slice(0, 3),
            sampleSnippets: sortedMessages
                .slice(-2)
                .map((message) => sanitizeSampleSnippet(message.snippet)),
            messageIds: sortedMessages.map((message) => message.id),
            candidateMessages,
            evidenceMessages,
            reasons,
            isRecurringCandidate,
        });
    }

    return groups.sort(
        (a, b) => b.confidence - a.confidence || b.count - a.count
    );
}

function printHumanSummary(result: ImapScanSpikeResult) {
    console.log("IMAP scan summary:");
    console.log(`mailbox: ${result.mailbox}`);
    console.log(`scannedMessages: ${result.scannedMessages}`);
    console.log(`candidatesFound: ${result.candidatesFound}`);
    console.log(`rejectedMessages: ${result.rejectedMessages}`);
    console.log("");

    const strongRecurringGroups = result.recurringGroups.filter(
        (group) =>
            group.isRecurringCandidate &&
            group.confidence >= 0.75 &&
            group.count >= 3 &&
            (group.cadence !== "unknown" ||
                isStrongEfakturaFamily(group.groupKey.split("|")[1] ?? ""))
    );
    const recurringMessageIds = new Set(
        strongRecurringGroups.flatMap((group) => group.messageIds)
    );
    const representativeMessageIds = new Set(
        strongRecurringGroups
            .map((group) =>
                result.debugMessages
                    .filter(
                        (message) =>
                            group.messageIds.includes(message.id) &&
                            message.isCandidate
                    )
                    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]
            )
            .filter((message): message is ImapDebugMessage => Boolean(message))
            .map((message) => message.id)
    );
    const visibleCandidates = result.debugMessages
        .filter(
            (message) =>
                message.isCandidate &&
                (!recurringMessageIds.has(message.id) ||
                    representativeMessageIds.has(message.id))
        );
    const dedupedCandidates = new Map<string, ImapDebugMessage>();

    for (const message of visibleCandidates) {
        const providerOrName = message.detected.provider ?? message.detected.name;

        if (!providerOrName) {
            dedupedCandidates.set(message.id, message);
            continue;
        }

        const subjectFamily = normalizeSubjectFamily(message.subject);
        const key = `${providerOrName}|${message.detected.name ?? ""}|${subjectFamily}`;
        const previous = dedupedCandidates.get(key);

        if (!previous || Date.parse(message.date) > Date.parse(previous.date)) {
            dedupedCandidates.set(key, message);
        }
    }

    const candidates = [...dedupedCandidates.values()]
        .sort((a, b) => b.confidence - a.confidence);

    console.log("Potential subscriptions:");

    if (candidates.length === 0) {
        console.log("none");
    }

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

    const recurringCandidates = result.recurringGroups
        .filter((group) => group.isRecurringCandidate)
        .sort((a, b) => b.confidence - a.confidence || b.count - a.count)
        .slice(0, 20);

    console.log("");
    console.log("Recurring groups:");

    if (recurringCandidates.length === 0) {
        console.log("none");
        return;
    }

    recurringCandidates.forEach((group, index) => {
        console.log("");
        const groupTitle =
            group.suggestedName && group.fromSample.includes(group.suggestedName)
                ? group.fromSample
                : `${group.suggestedName} / ${group.fromSample}`;

        console.log(`${index + 1}. ${groupTitle}`);
        console.log(`   confidence: ${group.confidence.toFixed(2)}`);
        console.log(`   cadence: ${group.cadence}`);
        console.log(`   messages: ${group.count}`);
        optionalLine("amounts", group.amounts.join(", "));
        optionalLine("first", group.firstDate.slice(0, 10));
        optionalLine("last", group.lastDate.slice(0, 10));
        optionalLine("sample subject", group.sampleSubjects[0]);
        console.log("   reasons:");

        for (const reason of group.reasons) {
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
        const seenMessageIds = new Set<string>();

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
                await appendDebugMessageFromFetchMessage(
                    debugMessages,
                    seenMessageIds,
                    message,
                    "latest_scan"
                );
            }

            if (config.targetedSearch) {
                if (config.verbose) {
                    console.error(
                        `Running targeted IMAP search, limit ${config.targetedSearchLimit}`
                    );
                }

                const targetedUids = await collectTargetedSearchUids(
                    client,
                    config.targetedSearchLimit,
                    config.verbose
                );

                if (targetedUids.length > 0) {
                    for await (const message of client.fetch(
                        targetedUids,
                        {
                            envelope: true,
                            internalDate: true,
                            source: {
                                maxLength: 20_000,
                            },
                        },
                        { uid: true }
                    )) {
                        await appendDebugMessageFromFetchMessage(
                            debugMessages,
                            seenMessageIds,
                            message,
                            "targeted_search"
                        );
                    }
                }
            }
        }

        const candidatesFound = debugMessages.filter(
            (message) => message.isCandidate
        ).length;
        const recurringGroups = buildRecurringGroups(debugMessages);
        const result: ImapScanSpikeResult = {
            mailbox: config.mailbox,
            scannedMessages: debugMessages.length,
            candidatesFound,
            rejectedMessages: debugMessages.length - candidatesFound,
            recurringGroups,
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
