import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { google } from "googleapis";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_MAX_RESULTS = 25;
const GMAIL_SPIKE_VERBOSE = process.env.GMAIL_SPIKE_VERBOSE === "true";
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
type BillingCycle = "monthly" | "yearly" | "weekly" | "custom";

type MessageAnalysisInput = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
};

type SubscriptionAnalysis = {
    isCandidate: boolean;
    confidence: number;
    reasons: string[];
    detected: {
        provider?: string;
        name?: string;
        isTrial?: boolean;
        trialEndDateText?: string;
        amountText?: string;
        currency?: string;
        billingCycle?: BillingCycle;
    };
};

type AnalyzedMessage = {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    analysis: SubscriptionAnalysis;
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

const PROVIDER_CATALOG = [
    { name: "Google Play", patterns: ["google play", "play.google.com"] },
    { name: "Google One", patterns: ["google one", "one.google.com"] },
    { name: "Netflix", patterns: ["netflix"] },
    { name: "Spotify", patterns: ["spotify"] },
    { name: "Apple", patterns: ["apple"] },
    { name: "OpenAI", patterns: ["openai", "chatgpt", "chat gpt"] },
    { name: "Canva", patterns: ["canva"] },
    { name: "Adobe", patterns: ["adobe"] },
    { name: "Microsoft", patterns: ["microsoft"] },
    { name: "Amazon", patterns: ["amazon"] },
    { name: "Disney", patterns: ["disney"] },
    { name: "HBO", patterns: ["hbo"] },
    { name: "Max", patterns: ["max"] },
    { name: "Dropbox", patterns: ["dropbox"] },
    { name: "Notion", patterns: ["notion"] },
    { name: "Figma", patterns: ["figma"] },
    { name: "GitHub", patterns: ["github"] },
    { name: "Slack", patterns: ["slack"] },
    { name: "Duolingo", patterns: ["duolingo"] },
    { name: "NordVPN", patterns: ["nordvpn", "nord vpn"] },
];

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

function cleanText(value: string | null | undefined) {
    return (value ?? "")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#\d+;|&#x[\da-f]+;|&[a-z]+;/gi, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function includesAny(text: string, patterns: RegExp[]) {
    return patterns.some((pattern) => pattern.test(text));
}

function detectProvider(text: string) {
    const normalizedText = text.toLowerCase();

    return PROVIDER_CATALOG.find((provider) =>
        provider.patterns.some((pattern) => normalizedText.includes(pattern))
    )?.name;
}

function detectTrialEndDateText(text: string) {
    const englishDate = "[A-Za-z]+\\s+\\d{1,2},\\s+\\d{4}";
    const englishShortDate = "[A-Za-z]+\\s+\\d{1,2}";
    const polishDate =
        "\\d{1,2}\\s+[A-Za-z\\u0105\\u0107\\u0119\\u0142\\u0144\\u00f3\\u015b\\u017a\\u017c]+(?:\\s+\\d{4})?";
    const patterns = [
        new RegExp(`trial will end on\\s+(${englishDate})`, "i"),
        new RegExp(`trial ends on\\s+(${englishDate})`, "i"),
        new RegExp(`your trial will end on\\s+(${englishDate})`, "i"),
        new RegExp(`trial will end on\\s+(${englishShortDate})`, "i"),
        new RegExp(`trial ends on\\s+(${englishShortDate})`, "i"),
        new RegExp(
            `okres pr[o\\u00f3]bny ko[n\\u0144]czy si[e\\u0119]\\s+(${polishDate})`,
            "i"
        ),
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match?.[1]) {
            return cleanText(match[1]);
        }
    }

    return undefined;
}

function detectAmountText(text: string) {
    const patterns = [
        /[$\u20ac\u00a3]\s?\d+(?:[.,]\d{2})?/,
        /\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP)/i,
        /(?:PLN|USD|EUR|GBP)\s?\d+(?:[.,]\d{2})?/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match?.[0]) {
            return cleanText(match[0]);
        }
    }

    return undefined;
}

function detectCurrency(amountText: string | undefined) {
    if (!amountText) return undefined;

    if (amountText.includes("$")) return "USD";
    if (amountText.includes("\u20ac")) return "EUR";
    if (amountText.includes("\u00a3")) return "GBP";

    const currencyMatch = amountText.match(/\b(PLN|USD|EUR|GBP)\b/i);
    return currencyMatch?.[1]?.toUpperCase();
}

function detectBillingCycle(text: string): BillingCycle | undefined {
    if (/\b(monthly|per month|month-to-month|co miesi[a\u0105]c)\b/i.test(text)) {
        return "monthly";
    }

    if (/\b(yearly|annual|annually|per year|rocznie)\b/i.test(text)) {
        return "yearly";
    }

    if (/\b(weekly|per week|co tydzie[n\u0144])\b/i.test(text)) {
        return "weekly";
    }

    if (/\b(billing cycle|okres rozliczeniowy)\b/i.test(text)) {
        return "custom";
    }

    return undefined;
}

function analyzeMessageForSubscription(
    input: MessageAnalysisInput
): SubscriptionAnalysis {
    const from = cleanText(input.from);
    const subject = cleanText(input.subject);
    const snippet = cleanText(input.snippet);
    const combinedText = `${from} ${subject} ${snippet}`;
    const subjectAndSnippet = `${subject} ${snippet}`;
    const reasons: string[] = [];
    let confidence = 0;

    const detected: SubscriptionAnalysis["detected"] = {};

    if (
        includesAny(subjectAndSnippet, [
            /\b(receipt|order receipt|invoice|faktura|paragon|rachunek)\b/i,
        ])
    ) {
        confidence += 0.25;
        reasons.push("+0.25 receipt/invoice signal");
    }

    if (
        includesAny(subjectAndSnippet, [
            /\b(subscription|subskrypcja|plan|membership)\b/i,
        ])
    ) {
        confidence += 0.25;
        reasons.push("+0.25 subscription/plan signal");
    }

    if (includesAny(subjectAndSnippet, [/\b(trial|okres pr[o\u00f3]bny)\b/i])) {
        confidence += 0.2;
        reasons.push("+0.20 trial signal");
        detected.isTrial = true;
    }

    if (
        includesAny(subjectAndSnippet, [
            /\b(automatically charged|renewal|renews|odnowienie|nast[e\u0119]pna p[\u0142l]atno[s\u015b][c\u0107])\b/i,
        ])
    ) {
        confidence += 0.2;
        reasons.push("+0.20 renewal/automatic charge signal");
    }

    const provider = detectProvider(combinedText);

    if (provider) {
        confidence += 0.2;
        reasons.push(`+0.20 known provider: ${provider}`);
        detected.provider = provider;
        detected.name = provider;
    }

    const trialEndDateText = detectTrialEndDateText(subjectAndSnippet);

    if (trialEndDateText) {
        confidence += 0.15;
        reasons.push("+0.15 trial end date detected");
        detected.trialEndDateText = trialEndDateText;
        detected.isTrial = true;
    }

    const amountText = detectAmountText(subjectAndSnippet);

    if (amountText) {
        confidence += 0.15;
        reasons.push("+0.15 amount/currency detected");
        detected.amountText = amountText;
        detected.currency = detectCurrency(amountText);
    }

    const billingCycle = detectBillingCycle(subjectAndSnippet);

    if (billingCycle) {
        detected.billingCycle = billingCycle;
    }

    if (includesAny(subjectAndSnippet, [/\bverify your email\b/i])) {
        confidence -= 0.4;
        reasons.push("-0.40 verify your email signal");
    }

    if (
        includesAny(combinedText, [
            /\bgoogle cloud\b/i,
            /\bquota\b/i,
            /\bsecurity\b/i,
            /\baction required\b/i,
            /\bcompute\b/i,
            /\bsecurity best practices\b/i,
        ])
    ) {
        confidence -= 0.5;
        reasons.push("-0.50 Google Cloud quota/security signal");
    }

    if (includesAny(subjectAndSnippet, [/\bterms of service updated\b/i])) {
        confidence -= 0.35;
        reasons.push("-0.35 terms of service update signal");
    }

    if (
        /\bwelcome to google payments\b/i.test(subjectAndSnippet) &&
        !/\b(subscription|receipt|trial)\b/i.test(subjectAndSnippet)
    ) {
        confidence -= 0.3;
        reasons.push("-0.30 Google Payments welcome without subscription signal");
    }

    if (
        includesAny(subjectAndSnippet, [/\b(sale|promo|offer|deal)\b/i]) &&
        !/\b(receipt|order receipt|invoice|subscription|subskrypcja)\b/i.test(
            subjectAndSnippet
        )
    ) {
        confidence -= 0.2;
        reasons.push("-0.20 promotional signal without receipt/subscription");
    }

    const normalizedConfidence = Math.max(0, Math.min(1, confidence));

    return {
        isCandidate: normalizedConfidence >= 0.55,
        confidence: normalizedConfidence,
        reasons,
        detected,
    };
}

function printOptionalAnalysisField(label: string, value: unknown) {
    if (value !== undefined && value !== null && value !== "") {
        console.log(`${label}: ${value}`);
    }
}

function printAnalysis(analysis: SubscriptionAnalysis) {
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

        printGlobalSummary(Array.from(globalMessagesById.values()));
    } finally {
        readline.close();
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Gmail scan spike failed: ${message}`);
    process.exitCode = 1;
});
