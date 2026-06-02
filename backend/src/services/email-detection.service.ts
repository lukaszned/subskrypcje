export type BillingCycleDetection = "monthly" | "yearly" | "weekly" | "custom";

export type EmailDetectionInput = {
    id: string;
    from: string;
    subject: string;
    date?: string;
    snippet: string;
};

export type EmailDetectionResult = {
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
        billingCycle?: BillingCycleDetection;
    };
};

export type ParsedDetectedAmount = {
    amount: number;
    currency?: string;
};

type ProviderCategory =
    | "streaming_video"
    | "music_audio"
    | "cloud_storage"
    | "productivity_office"
    | "ai_tools"
    | "design_creative"
    | "developer_tools"
    | "vpn_security"
    | "password_manager"
    | "gaming"
    | "education_learning"
    | "fitness_health"
    | "dating_social"
    | "delivery_membership"
    | "transport_membership"
    | "telecom_mobile"
    | "internet_isp"
    | "utilities_energy"
    | "hosting_domains"
    | "finance_accounting"
    | "news_media"
    | "ecommerce_membership"
    | "app_store_marketplace"
    | "payment_processor"
    | "unknown_recurring_bill";

type ProviderRegistryEntry = {
    canonicalName: string;
    category: ProviderCategory;
    aliases: string[];
    trustedDomains: string[];
    suspiciousDomainPolicy: "strict" | "marketplace_allowed" | "processor_allowed" | "relaxed";
    marketplaceAllowedDomains: string[];
    billingKeywords: string[];
    subscriptionKeywords: string[];
    invoiceKeywords: string[];
    noiseKeywords: string[];
    canBeBilledViaMarketplace: boolean;
    canBeBilledViaProcessor: boolean;
};

type MessageType =
    | "invoice"
    | "payment_due"
    | "payment_confirmation"
    | "processor_payment"
    | "marketplace_subscription"
    | "recurring_bill"
    | "subscription_started"
    | "subscription_active"
    | "subscription_continuation"
    | "trial_started_future_charge"
    | "trial_started_auto_renew"
    | "trial_ending"
    | "subscription_active_notice"
    | "price_change_active"
    | "active_price_change"
    | "onboarding_only"
    | "renewal_notice"
    | "payment_failed"
    | "cancellation"
    | "expired_trial"
    | "reactivation_marketing"
    | "marketing_offer"
    | "newsletter"
    | "security_login"
    | "security"
    | "login"
    | "one_time_purchase"
    | "rental"
    | "ecommerce_order"
    | "loan_credit_marketing"
    | "recommendation"
    | "refund"
    | "unknown";

type MessageClassification = {
    messageType: MessageType;
    positiveEvidence: string[];
    negativeEvidence: string[];
    trustEvidence: string[];
    riskEvidence: string[];
    extractedProvider?: string;
    category?: ProviderCategory;
    billingChannel?: string;
    marketplaceProvider?: string;
    merchant?: string;
    amountText?: string;
    currency?: string;
    billingCycle?: BillingCycleDetection;
    isTrial?: boolean;
    isFinalBlock?: boolean;
    finalBlockReason?: string;
};

export type EmailDetectionDebugDetails = {
    messageType: MessageType;
    provider?: string;
    name?: string;
    category?: ProviderCategory;
    billingChannel?: string;
    marketplaceProvider?: string;
    merchant?: string;
    amountText?: string;
    currency?: string;
    billingCycle?: BillingCycleDetection;
    isTrial?: boolean;
    positiveEvidence: string[];
    negativeEvidence: string[];
    trustEvidence: string[];
    riskEvidence: string[];
    evidenceTiers: string[];
    finalDecision: "candidate" | "rejected";
    finalBlockReason?: string;
};

type DetectionSignals = {
    provider?: string;
    providerFromPaymentProcessor?: string;
    planName?: string;
    billingChannel?: string;
    providerCategory?: ProviderCategory;
    billingCycle?: BillingCycleDetection;
    trialEndDateText?: string;
    amountText?: string;
    currency?: string;
    hasReceiptEvidence: boolean;
    hasInvoiceEvidence: boolean;
    hasPaymentEvidence: boolean;
    hasPaymentDueEvidence: boolean;
    hasChargedEvidence: boolean;
    hasRecurringEvidence: boolean;
    hasSubscriptionEvidence: boolean;
    hasTrialEvidence: boolean;
    hasPaidTierEvidence: boolean;
    hasBillingCycleEvidence: boolean;
    hasPaymentFailedEvidence: boolean;
    hasPriceChangeEvidence: boolean;
    hasActiveSubscriberEvidence: boolean;
    hasBillingDateEvidence: boolean;
    hasTransportTicketEvidence: boolean;
    hasPhoneTopUpEvidence: boolean;
    hasMarketingIntermediaryEvidence: boolean;
    hasSubscriptionUpsellEvidence: boolean;
    hasCreditLoanMarketingEvidence: boolean;
    hasExpiredReactivationEvidence: boolean;
    hasMarketplaceBillingEvidence: boolean;
    hasTrustedSenderEvidence: boolean;
    hasOneTimePurchaseEvidence: boolean;
    hasOneTimeMarketplaceEcommerceEvidence: boolean;
    hasPaymentMethodOnlyEvidence: boolean;
    hasPublicStatutoryPaymentEvidence: boolean;
    hasFreeAppStorePurchaseEvidence: boolean;
    hasNewsletterRecommendationEvidence: boolean;
    hasAccountSecurityEvidence: boolean;
    hasAccountSecurityCodeEvidence: boolean;
    hasVerificationEvidence: boolean;
    hasPasswordResetEvidence: boolean;
    hasCancellationEvidence: boolean;
    hasRefundEvidence: boolean;
    hasFreePlanEvidence: boolean;
    hasMarketingEvidence: boolean;
    hasProgressReportEvidence: boolean;
    hasNegatedSubscriptionEvidence: boolean;
    hasNegatedBillingEvidence: boolean;
    hasPromotionalTrialEvidence: boolean;
    hasActiveTrialSubscriptionEvidence: boolean;
    hasPaymentSetupEvidence: boolean;
    hasRecurringBillEvidence: boolean;
    hasActiveRenewalPaymentEvidence: boolean;
    hasPaymentReceiptTrialChargeEvidence: boolean;
    hasUnreadableEncodedEvidence: boolean;
    hasRawHeaderSnippetEvidence: boolean;
    hasSuspiciousSenderEvidence: boolean;
    hasHighRiskProviderSuspiciousSenderEvidence: boolean;
    hasOnboardingOnlyEvidence: boolean;
    hasSubscriptionStartedEvidence: boolean;
    hasSubscriptionContinuationEvidence: boolean;
    hasAccountAdminUpdateEvidence: boolean;
    hasCollaborationInviteEvidence: boolean;
    hasPlanFeatureUpdateEvidence: boolean;
    hasReviewReplyEvidence: boolean;
    hasProductUpdateQuotaSecurityEvidence: boolean;
    hasProjectStatusUpdateEvidence: boolean;
    hasGeneratedContentReadyEvidence: boolean;
};

function providerEntry(
    canonicalName: string,
    category: ProviderCategory,
    aliases: string[] = [],
    options: Partial<Omit<ProviderRegistryEntry, "canonicalName" | "category" | "aliases">> = {}
): ProviderRegistryEntry {
    return {
        canonicalName,
        category,
        aliases: [canonicalName, ...aliases],
        trustedDomains: options.trustedDomains ?? [],
        suspiciousDomainPolicy: options.suspiciousDomainPolicy ?? "strict",
        marketplaceAllowedDomains: options.marketplaceAllowedDomains ?? [],
        billingKeywords: options.billingKeywords ?? [],
        subscriptionKeywords: options.subscriptionKeywords ?? [],
        invoiceKeywords: options.invoiceKeywords ?? [],
        noiseKeywords: options.noiseKeywords ?? [],
        canBeBilledViaMarketplace: options.canBeBilledViaMarketplace ?? true,
        canBeBilledViaProcessor: options.canBeBilledViaProcessor ?? true,
    };
}

function providerEntries(category: ProviderCategory, names: string[]) {
    return names.map((name) => providerEntry(name, category));
}

const PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
    providerEntry("Uber One", "delivery_membership", ["uberone@uber.com"], {
        trustedDomains: ["uber.com"],
        canBeBilledViaMarketplace: false,
    }),
    providerEntry("Amazon", "ecommerce_membership", ["amazon prime", "prime@amazon.pl"], {
        trustedDomains: ["amazon.pl", "amazon.com", "amazon.co.uk", "amazon.de"],
        canBeBilledViaMarketplace: false,
    }),
    providerEntry("Prime Video", "app_store_marketplace", ["primevideo", "amazon prime video"], {
        trustedDomains: ["primevideo.com", "channels.primevideo.com", "bounces.primevideo.com"],
        suspiciousDomainPolicy: "marketplace_allowed",
    }),
    providerEntry("Google Play", "app_store_marketplace", ["play.google.com", "googleplay-noreply@google.com"], {
        trustedDomains: ["google.com"],
        suspiciousDomainPolicy: "marketplace_allowed",
    }),
    providerEntry("Apple", "app_store_marketplace", ["app store", "apple services"], {
        trustedDomains: ["apple.com", "email.apple.com", "mzstore.com"],
        suspiciousDomainPolicy: "marketplace_allowed",
    }),
    providerEntry("YouTube", "streaming_video", ["youtube.com"]),
    ...providerEntries("streaming_video", [
        "Netflix", "Disney+", "Max", "HBO Max", "HBO", "SkyShowtime", "Apple TV", "Apple TV+",
        "Canal+", "Canal+ Online", "Player", "Player.pl", "Polsat Box Go", "TVP VOD",
        "CDA Premium", "Megogo", "Viaplay", "FilmBox+", "Rakuten TV", "Chili", "Mubi",
        "Crunchyroll", "YouTube Premium", "Twitch", "DAZN", "Eleven Sports", "Eurosport",
        "Discovery+", "Peacock", "Paramount+", "Hulu", "Starz", "MGM+", "BritBox",
        "CuriosityStream", "Nebula", "Dropout",
    ]),
    ...providerEntries("music_audio", [
        "Spotify", "Apple Music", "YouTube Music", "Tidal", "Deezer", "Amazon Music",
        "SoundCloud", "Audible", "Storytel", "Legimi", "Empik Go", "Audioteka", "BookBeat",
        "Pocket Casts", "Podimo", "Calm", "Headspace",
    ]),
    ...providerEntries("cloud_storage", [
        "Google One", "Google Drive", "iCloud", "iCloud+", "Dropbox", "Microsoft OneDrive",
        "Box", "pCloud", "MEGA", "Sync.com", "Proton Drive", "NordLocker", "Backblaze", "iDrive",
    ]),
    ...providerEntries("productivity_office", [
        "Microsoft 365", "Google Workspace", "Notion", "Evernote", "Todoist", "Trello",
        "Asana", "ClickUp", "Monday.com", "Slack", "Zoom", "Calendly", "Miro", "Airtable",
        "Coda", "Grammarly", "LanguageTool", "Readwise", "Pocket", "Instapaper",
    ]),
    ...providerEntries("ai_tools", [
        "OpenAI", "ChatGPT", "ChatGPT Plus", "ChatGPT Pro", "Claude", "Anthropic",
        "Perplexity", "Gemini", "Google AI", "Midjourney", "Runway", "ElevenLabs",
        "HeyGen", "Synthesia", "Cursor", "Windsurf", "GitHub Copilot", "Lovable",
        "Replit", "Poe", "Jasper", "Copy.ai",
    ]),
    ...providerEntries("design_creative", [
        "Adobe", "Adobe Creative Cloud", "Adobe Acrobat Pro", "Canva", "Figma", "Framer",
        "Webflow", "Sketch", "Envato", "Freepik", "Shutterstock", "Getty Images",
        "Epidemic Sound", "Artlist", "Motion Array", "CapCut", "Picsart", "Lightroom",
    ]),
    ...providerEntries("developer_tools", [
        "GitHub", "GitLab", "Bitbucket", "JetBrains", "Vercel", "Netlify", "Supabase",
        "Firebase", "Railway", "Render", "Heroku", "DigitalOcean", "AWS", "Google Cloud",
        "Microsoft Azure", "Cloudflare", "Sentry", "Datadog", "Logtail", "Better Stack",
        "Postman", "Docker", "npm", "Stripe", "Clerk", "Auth0",
    ]),
    ...providerEntries("vpn_security", [
        "NordVPN", "Surfshark", "ExpressVPN", "Proton VPN", "Malwarebytes", "Norton",
        "McAfee", "Avast", "AVG", "Kaspersky", "ESET", "Bitdefender",
    ]),
    ...providerEntries("password_manager", [
        "NordPass", "Proton Pass", "1Password", "Bitwarden", "Dashlane", "LastPass",
        "Keeper", "RoboForm",
    ]),
    ...providerEntries("education_learning", [
        "Duolingo", "Babbel", "Busuu", "Memrise", "Coursera", "Udemy", "Skillshare",
        "MasterClass", "Brilliant", "Codecademy", "DataCamp", "LinkedIn Learning",
        "Pluralsight", "Domestika", "Yousician", "LingQ", "Preply", "Cambly",
    ]),
    ...providerEntries("fitness_health", [
        "Strava", "AllTrails", "Fitbit", "Garmin", "Whoop", "MyFitnessPal", "Lifesum",
        "Freeletics", "Fitbod", "Peloton", "Zwift", "Nike Training Club", "BetterMe", "Flo", "Clue",
    ]),
    ...providerEntries("dating_social", [
        "Tinder", "Bumble", "Badoo", "Hinge", "Grindr", "OkCupid", "Match",
        "Discord Nitro", "Telegram Premium", "X Premium", "LinkedIn Premium",
        "Snapchat+", "Reddit Premium", "Patreon", "OnlyFans", "Substack",
    ]),
    ...providerEntries("delivery_membership", [
        "Wolt+", "Bolt Plus", "Glovo Prime", "Allegro Smart", "Empik Premium",
        "Zabka Nano", "Zappka", "Carrefour", "Frisco",
    ]),
    ...providerEntries("telecom_mobile", [
        "Play", "Orange", "T-Mobile", "Plus", "Polkomtel", "Nju Mobile", "Plush",
        "Heyah", "Lajt Mobile", "Virgin Mobile", "Mobile Vikings", "Premium Mobile",
        "Red Bull Mobile", "Fakt Mobile", "Otvarta", "a2mobile", "Lycamobile",
        "Vectra mobile", "Netia mobile",
    ]),
    ...providerEntries("internet_isp", [
        "UPC", "Netia", "Vectra", "Multimedia", "TOYA", "INEA", "JMDI", "Fiberhost",
        "Swiatlowod Inwestycje", "East & West", "Chopin Telewizja Kablowa", "Elsat",
        "Korbank", "Petrus", "Sat Film", "Telkab", "Promax", "Asta-Net", "Sferanet",
        "Limes", "Leon", "Airmax", "RFC", "LocalNet",
    ]),
    ...providerEntries("utilities_energy", [
        "Tauron", "PGE", "E.ON", "Energa", "Enea", "PGNiG", "Polenergia",
        "Fortum", "Veolia", "Innogy",
    ]),
    ...providerEntries("hosting_domains", [
        "home.pl", "nazwa.pl", "cyber_Folks", "OVH", "LH.pl", "Domeny.tv",
        "Aftermarket", "GoDaddy", "Namecheap", "Bluehost", "SiteGround", "Hostinger",
        "Webh", "Zenbox", "dhosting", "MyDevil",
    ]),
    ...providerEntries("finance_accounting", [
        "inFakt", "Fakturownia", "iFirma", "wFirma", "Taxeon", "Firmao",
        "Comarch ERP XT", "Symfonia", "SaldeoSMART", "Baselinker", "Shopify",
        "Mailchimp", "GetResponse", "FreshMail", "Brevo", "ConvertKit",
    ]),
    ...providerEntries("payment_processor", [
        "PayPal", "Stripe", "Paddle", "FastSpring", "Braintree", "Adyen",
        "Checkout.com", "Recurly", "Chargebee", "2Checkout", "Verifone",
        "PayU", "Przelewy24", "Autopay", "Tpay",
    ]),
];

const PROVIDER_CATALOG = PROVIDER_REGISTRY.map((provider) => ({
    name: provider.canonicalName,
    patterns: provider.aliases.map((alias) => alias.toLowerCase()),
}));

function normalizeProviderForPublicResult(provider: string | undefined) {
    if (!provider) {
        return undefined;
    }

    const legacyProviderNames: Record<string, string> = {
        "YouTube Premium": "YouTube",
        "YouTube Music": "YouTube",
        "Disney+": "Disney",
        "Microsoft 365": "Microsoft",
        "Microsoft OneDrive": "Microsoft",
        "Adobe Acrobat Pro": "Adobe",
        "Adobe Creative Cloud": "Adobe",
    };

    return legacyProviderNames[provider] ?? provider;
}

function getProviderRegistryEntry(provider: string | undefined) {
    const normalizedProvider = normalizeProviderForPublicResult(provider);

    return PROVIDER_REGISTRY.find(
        (entry) =>
            entry.canonicalName === provider ||
            entry.canonicalName === normalizedProvider ||
            entry.aliases.some(
                (alias) => alias.toLowerCase() === provider?.toLowerCase()
            )
    );
}

function repairPolishMojibake(value: string) {
    const replacements: Array<[RegExp, string]> = [
        [/─ů/g, "ą"],
        [/─ä/g, "Ą"],
        [/─ç/g, "ć"],
        [/─ć/g, "Ć"],
        [/─Ö/g, "ę"],
        [/─ś/g, "Ę"],
        [/┼é/g, "ł"],
        [/┼ü/g, "Ł"],
        [/┼ä/g, "ń"],
        [/┼â/g, "Ń"],
        [/├│/g, "ó"],
        [/├ô/g, "Ó"],
        [/┼Ť/g, "ś"],
        [/┼Ü/g, "Ś"],
        [/┼║/g, "ź"],
        [/┼╣/g, "Ź"],
        [/┼╝/g, "ż"],
        [/┼╗/g, "Ż"],
    ];

    return replacements.reduce(
        (text, [pattern, replacement]) => text.replace(pattern, replacement),
        value
    );
}

export function cleanText(value: string | null | undefined) {
    return repairPolishMojibake(
        (value ?? "")
        .replace(/ÔÇô|ÔÇö/g, "-")
        .replace(/ÔÇ×|ÔÇŁ|ÔÇť/g, '"')
        .replace(/ÔÇÖ/g, "'")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#\d+;|&#x[\da-f]+;|&[a-z]+;/gi, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
    )
        .replace(/\s+/g, " ")
        .trim();
}

function includesAny(text: string, patterns: RegExp[]) {
    return patterns.some((pattern) => pattern.test(text));
}

function hasAccountAdminUpdateSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(terms of service|terms update|updated our .*terms|updated .*terms|privacy policy|policy update|legal update)\b/i,
        /\b(account settings|review your .*account settings|security checkup|account checkup|manage your account|oauth app|oauth application|connected app)\b/i,
        /\b(third-party|first-party)\s+oauth\s+application\s+has\s+been\s+added\b/i,
        /\b(app|application)\s+(?:has\s+been\s+)?added\s+to\s+your\s+account\b/i,
        /\b(zmiany w regulaminie|aktualizacja regulaminu|polityka prywatno[s\u015b]ci|warunki korzystania)\b/i,
    ]);
}

function hasCollaborationInviteSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\binvited you to\b.{0,100}\b(repository|repo|organization|project|workspace)\b/i,
        /\b(repository invitation|repo invitation|collaboration invitation|invited you to collaborate)\b/i,
        /\bgithub\b.{0,100}\binvited you\b/i,
        /\binvited you to\s+[\w.-]+\/[\w.-]+\b/i,
        /\bzapros(?:i[l\u0142]|zenie).{0,80}\b(repozytorium|projektu|organizacji|workspace)\b/i,
    ]);
}

function hasReviewReplySignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\breplied to your review\b/i,
        /\byour review on google\b/i,
        /\bdeveloper replied to your review\b/i,
        /\b(opinia|recenzja).{0,80}\b(odpowied[z\u017a]|odpowiedzia[l\u0142])\b/i,
    ]);
}

function hasPlanFeatureUpdateSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(plan|subscription|membership)\b.{0,80}\b(now has|more storage|new storage|storage limit|usage limit|quota|new features|benefits)\b/i,
        /\b(more storage|storage upgrade|usage limit|quota limit|plan benefits|included with your plan)\b/i,
        /\bchanges to your\b.{0,60}\b(subscription|plan)\b/i,
        /\b(plan|subskrypcja|abonament).{0,80}\b(wi[e\u0119]cej miejsca|limit|nowe funkcje|korzy[s\u015b]ci)\b/i,
    ]);
}

function hasProductUpdateQuotaSecuritySignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(product update|service update|monthly update|company update|newsletter|changelog|release notes|quota|usage quota|best practices|security best practices|security recommendations)\b/i,
        /\b(?:\w+\s+)?update\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{4}\b/i,
        /\bgoogle cloud\b.{0,120}\b(action required|quota|security|product update|best practices)\b/i,
        /\b(action required)\b.{0,120}\b(google cloud|security|quota)\b/i,
    ]);
}

function hasProjectStatusUpdateSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(project|service|workspace|site|app|application|account)\b.{0,80}\b(has been|was|is going to be|will be)\s+paused\b/i,
        /\b(project|service|workspace|site|app|application|account)\b.{0,80}\b(inactive|suspended|deactivated)\b/i,
        /\bfree\s+(project|workspace|app|application)\b.{0,80}\b(paused|inactive|suspended)\b/i,
    ]);
}

function hasGeneratedContentReadySignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(done|complete|completed|finished)[!,.:\s-]+.{0,120}\b(is|are)\s+ready\b/i,
        /\byour\s+.{2,120}\b(video|render|export|report|file|project|content|presentation|asset|design)\b.{0,80}\b(is|are)\s+ready\b/i,
        /\b(video|render|export|report|file|project|content|presentation|asset|design)\b.{0,80}\b(is|are)\s+ready\b/i,
        /\bready\s+to\s+(download|view|share|publish)\b/i,
    ]);
}

function hasStrongSubscriptionSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(receipt|order receipt|invoice|payment|billing|charged|automatically charged|renewal|renews|subscription|membership|trial|free trial|trial will end|faktura|rachunek|subskrypcja|abonament|okres pr[o\u00f3]bny|wersja pr[o\u00f3]bna)\b/i,
        /\b(subskrypcji|subskrypcj[e\u0119]|subskrypcj[a\u0105]|abonamentu|abonamentem)\b/i,
        /\b(p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc)\b/i,
        /\b(forma|form[e\u0119]|forme)\s+(p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
        /\b(b[e\u0119]dziemy\s+obci[a\u0105][z\u017c]a[c\u0107]|bedziemy\s+obciazac|obci[a\u0105][z\u017c]a[c\u0107]|obciazac|obci[a\u0105][z\u017c]ymy|obciazymy|obci[a\u0105][z\u017c]enie|obciazenie)\b/i,
        /\b(co\s+miesi[a\u0105]c|miesi[e\u0119]cznie|miesiecznie)\b/i,
        /\banulowa[c\u0107]\s+(swoj[a\u0105]\s+)?subskrypcj[e\u0119]/i,
        /\banulowac\s+(swoja\s+)?subskrypcje/i,
    ]);
}

function hasPaymentReceiptTrialChargeSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(receipt|order receipt|invoice|payment|billing|charged|automatically charged|trial|free trial|trial will end|faktura|rachunek|p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc)\b/i,
        /\b(b[e\u0119]dziemy\s+obci[a\u0105][z\u017c]a[c\u0107]|bedziemy\s+obciazac|obci[a\u0105][z\u017c]a[c\u0107]|obciazac|obci[a\u0105][z\u017c]ymy|obciazymy|obci[a\u0105][z\u017c]enie|obciazenie)\b/i,
    ]);
}

function hasNegatedSubscriptionSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bdoes not confirm an active subscription\b/i,
        /\bdoes not confirm active subscription\b/i,
        /\bdoes not confirm any subscription\b/i,
        /\bdoes not confirm a subscription\b/i,
        /\bdoes not confirm subscription\b/i,
        /\bno subscription\b/i,
        /\bnot a subscription\b/i,
        /\bwithout subscription\b/i,
        /\bnot confirm any subscription\b/i,
        /\bnot confirm a subscription\b/i,
        /\bthis is not a receipt\b/i,
        /\bthis email does not confirm\b/i,
        /nie potwierdza [\w\s]{0,24}subskrypcji/i,
        /nie potwierdza subskrypcji/i,
        /nie jest potwierdzeniem subskrypcji/i,
        /nie potwierdzenie subskrypcji/i,
        /nie oznacza rozpocz[e\u0119]cia subskrypcji/i,
        /nie oznacza rozpoczecia subskrypcji/i,
        /nie oznacza aktywnej subskrypcji/i,
        /bez subskrypcji/i,
        /nie rozpocz[e\u0119]to subskrypcji/i,
        /nie rozpoczeto subskrypcji/i,
        /to nie jest subskrypcja/i,
        /brak subskrypcji/i,
        /nie zawiera linku do anulowania subskrypcji/i,
        /wiadomo[s\u015b][c\u0107] nie ma charakteru marketingowego/i,
        /nie ma charakteru marketingowego ani promocyjnego/i,
    ]);
}

function hasNegatedBillingSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /nie faktura/i,
        /nie jest faktur[a\u0105]/i,
        /nie jest rachunkiem/i,
        /nie rachunek/i,
        /nie potwierdzenie p[\u0142l]atno[s\u015b]ci/i,
        /nie potwierdzenie platnosci/i,
        /nie dotyczy subskrypcji/i,
        /nie dotyczy abonamentu/i,
        /nie dotyczy subskrypcji ani abonamentu/i,
        /nie faktura ani potwierdzenie p[\u0142l]atno[s\u015b]ci/i,
        /nie faktura ani potwierdzenie platnosci/i,
        /nie jest faktur[a\u0105] ani rachunkiem/i,
        /\bnot a receipt\b/i,
        /\bnot a billing receipt\b/i,
        /\bnot a billing confirmation\b/i,
        /\bnot a payment confirmation\b/i,
        /\bdoes not confirm billing\b/i,
        /\bdoes not confirm payment\b/i,
    ]);
}

function hasRecurringBillSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /ekofaktura/i,
        /e-faktura/i,
        /efaktura/i,
        /twoja ekofaktura/i,
        /faktura jest ju[z\u017c] dost[e\u0119]pna/i,
        /faktura dost[e\u0119]pna/i,
        /jest ju[z\u017c] dost[e\u0119]pna w eboa/i,
        /dost[e\u0119]pna w panelu klienta/i,
        /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
        /op[l\u0142]ac fakture/i,
        /op[l\u0142]acenie do/i,
        /op[l\u0142]acenia do/i,
        /masz czas na jej op[l\u0142]acenie do/i,
        /termin op[l\u0142]acenia/i,
        /na kwot[e\u0119]/i,
        /kod abonenta/i,
        /numer klienta/i,
        /numer abonenta/i,
        /\babonent\b/i,
        /panel klienta/i,
        /\b(eBOA|eboa|ebok|e-bok)\b/i,
        /moje konto klienta/i,
        /us[l\u0142]ugi telekomunikacyjne/i,
        /abonament telefoniczny/i,
        /internet domowy/i,
        /faktura za internet/i,
        /faktura za pakiet internetowy/i,
        /rachunek za internet/i,
        /kwota do zap[l\u0142]aty/i,
        /amount due/i,
        /payment due/i,
        /invoice due/i,
        /zbli[z\u017c]a si[e\u0119] termin p[\u0142l]atno[s\u015b]ci/i,
        /termin p[\u0142l]atno[s\u015b]ci za faktur[e\u0119]/i,
        /termin mija/i,
        /termin p[\u0142l]atno[s\u015b]ci/i,
        /okres rozliczeniowy/i,
        /p[\u0142l]atno[s\u015b][c\u0107] cykliczna/i,
        /sta[l\u0142]a p[\u0142l]atno[s\u015b][c\u0107]/i,
        /abonament miesi[e\u0119]czny/i,
        /miesi[e\u0119]czny abonament/i,
        /rozliczana miesi[e\u0119]cznie/i,
        /rozliczane miesi[e\u0119]cznie/i,
        /us[l\u0142]uga rozliczana jest co miesi[a\u0105]c/i,
        /us[l\u0142]ugi s[a\u0105] rozliczane miesi[e\u0119]cznie/i,
    ]);
}

function hasPaymentDueSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /zbli[z\u017c]a si[e\u0119] termin p[\u0142l]atno[s\u015b]ci/i,
        /termin p[\u0142l]atno[s\u015b]ci za faktur[e\u0119]/i,
        /termin mija/i,
        /kwota do zap[l\u0142]aty/i,
        /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
        /op[l\u0142]ac fakture/i,
        /op[l\u0142]acenie do/i,
        /op[l\u0142]acenia do/i,
        /masz czas na jej op[l\u0142]acenie do/i,
        /termin op[l\u0142]acenia/i,
        /\b(amount due|payment due|invoice due)\b/i,
    ]);
}

function hasPriceChangeSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /zmiana ceny/i,
        /zaktualizowan[a\u0105] cen[e\u0119]/i,
        /ceny plan[o\u00f3]w premium rosn[a\u0105]/i,
        /aktualizujemy cen[e\u0119]/i,
        /now[aą] cen[aeę]/i,
        /nowa cena/i,
        /\b(price change|updated price|price increase|your price is changing)\b/i,
    ]);
}

function hasActiveSubscriberSignal(subjectAndSnippet: string) {
    if (includesAny(subjectAndSnippet, [/warunk[o\u00f3]w/i, /regulamin/i])) {
        return false;
    }

    return includesAny(subjectAndSnippet, [
        /jako subskrybenta/i,
        /jako subskrybent/i,
        /nadal b[e\u0119]dziesz korzysta[c\u0107]/i,
        /zachowujesz dost[e\u0119]p/i,
        /aby pozosta[c\u0107] w planie/i,
        /pozostajesz w planie/i,
        /kontynuuj[a\u0105]c subskrypcj[e\u0119]/i,
        /kontynuujac subskrypcje/i,
        /aktualn(ego|ym|y)\s+klient(a|em|owi)?/i,
        /\b(active subscriber|as a subscriber|keep your plan|continue your subscription)\b/i,
    ]);
}

function hasBillingDateSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /dzie[n\u0144] rozliczeniowy/i,
        /dniu rozliczeniowym/i,
        /do dnia rozliczenia/i,
        /pojawi si[e\u0119] w dniu rozliczeniowym/i,
        /nast[e\u0119]pna data przed[l\u0142]u[z\u017c]enia/i,
        /nastepna data przedluzenia/i,
        /\b(billing date|next billing date|renewal date)\b/i,
        /\bnext renewal\b/i,
    ]);
}

function hasSubscriptionStartedSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /w[l\u0142]a[s\u015b]nie rozpoczyna si[e\u0119] twoja subskrypcja/i,
        /wlasnie rozpoczyna sie twoja subskrypcja/i,
        /twoja subskrypcja .{0,40}rozpocz[e\u0119][l\u0142]a si[e\u0119]/i,
        /twoja subskrypcja .{0,40}rozpoczela sie/i,
        /subskrypcja .*rozpocznie si[e\u0119] automatycznie/i,
        /subskrypcja .*rozpocznie sie automatycznie/i,
        /\b(your subscription has started|your subscription started|subscription has started)\b/i,
        /\b(you subscribed|you have subscribed|successfully subscribed)\b/i,
    ]);
}

function hasSubscriptionContinuationSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /kontynuuj[a\u0105]c subskrypcj[e\u0119]/i,
        /kontynuujac subskrypcje/i,
        /automatycznie przed[l\u0142]u[z\u017c]ana/i,
        /automatycznie przedluzana/i,
        /automatycznie odnawiana/i,
        /automatycznie odnawiane/i,
        /subskrypcje b[e\u0119]d[a\u0105] automatycznie odnawiane/i,
        /subskrypcje beda automatycznie odnawiane/i,
        /metoda p[\u0142l]atno[s\u015b]ci .*b[e\u0119]dzie obci[a\u0105][z\u017c]ana/i,
        /metoda platnosci .*bedzie obciazana/i,
        /zostanie naliczona op[l\u0142]ata/i,
        /zostanie naliczona oplata/i,
        /\b(your payment method will be charged|will automatically renew|automatically renews|continue your subscription)\b/i,
    ]);
}

function hasOnboardingOnlySignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /rozpoczynanie pracy/i,
        /pobierz oprogramowanie/i,
        /aby rozpocz[a\u0105][c\u0107]/i,
        /aby rozpoczac/i,
        /witamy w programie/i,
        /witaj w programie/i,
        /\b(getting started|welcome to|start using|download the app|download software|install the app|set up your account)\b/i,
    ]);
}

function hasProgressReportSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bweekly progress\b/i,
        /\bprogress report\b/i,
        /\btake a look at your stats\b/i,
    ]);
}

function hasTransportTicketSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bbilet\b/i,
        /zakup biletu/i,
        /potwierdzenie zakupu biletu/i,
        /karta miejska/i,
        /krakowska karta miejska/i,
        /elektroniczne konto pasa[z\u017c]era/i,
        /wazny od/i,
        /wa[z\u017c]ny od/i,
        /wazny do/i,
        /wa[z\u017c]ny do/i,
        /sieciowy/i,
        /komunikacja miejska/i,
        /\bmpk\b/i,
    ]);
}

function hasPhoneTopUpSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /do[l\u0142]adowanie telefonu/i,
        /realizacja do[l\u0142]adowania/i,
        /kwota do[l\u0142]adowania/i,
        /do[l\u0142]adowanie numeru/i,
        /\btop-up\b/i,
        /\bphone top-up\b/i,
    ]);
}

function hasMarketingIntermediarySignal(combinedText: string) {
    return includesAny(combinedText, [
        /mailing_reklamowy@onet\.pl/i,
        /mailing_reklamowy@grupaonet\.pl/i,
        /\b[^<\n\r]+ - onet\s*</i,
        /dostarczone przez interi[eę]/i,
        /mailing@interia\.pl/i,
    ]);
}

function hasNewsletterRecommendationSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /specjalnie dla ciebie/i,
        /na podstawie ogl[a\u0105]danych/i,
        /na podstawie ogladanych/i,
        /obejrzyj teraz/i,
        /polecamy/i,
        /zmiany w regulaminie/i,
        /zmian[yę] w warunkach/i,
        /aktualizacja warunk[oó]w/i,
        /\bnewsletter\b/i,
        /\brecommendation\b/i,
        /\brecommended for you\b/i,
    ]);
}

function hasOneTimePurchaseSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /zam[o\u00f3]wienie nr/i,
        /zam[o\u00f3]wienie numer/i,
        /zamowienie nr/i,
        /zamowienie numer/i,
        /dotyczy zam[o\u00f3]wienia/i,
        /dotyczy zamowienia/i,
        /przekazane do realizacji/i,
        /zosta[lł]o wys[lł]ane/i,
        /\border number\b/i,
        /\bone-time purchase\b/i,
        /\brental\b/i,
        /wypo[z\u017c]yczenia/i,
        /wypozyczenia/i,
        /zakupy/i,
        /dostawa/i,
        /\bsklep\b/i,
        /produkt/i,
        /koszyk/i,
        /receipt for (?:ride|order)/i,
        /rachunek dla restauracji/i,
        /twoje zam[o\u00f3]wienie/i,
        /twoje zamowienie/i,
    ]) || hasOneTimeMarketplaceEcommerceSignal(subjectAndSnippet);
}

function hasOneTimeMarketplaceEcommerceSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /potwierdzenie (?:twojego )?zakupu/i,
        /zam[o\u00f3]wienie/i,
        /zamowienie/i,
        /numer zam[o\u00f3]wienia/i,
        /numer zamowienia/i,
        /osoba sprzedaj[a\u0105]ca/i,
        /sprzedaj[a\u0105]cy/i,
        /sprzedajacy/i,
        /przedmiot/i,
        /wysy[l\u0142]ka/i,
        /wysylka/i,
        /op[l\u0142]ata za ochron[e\u0119] kupuj[a\u0105]cych/i,
        /oplata za ochrone kupujacych/i,
        /do twojego zam[o\u00f3]wienia/i,
        /do twojego zamowienia/i,
        /e-faktura do/i,
        /faktura do zam[o\u00f3]wienia/i,
        /faktura do zamowienia/i,
        /paragon/i,
        /\bdlc\b/i,
        /\bgame\b/i,
        /\badd-on\b/i,
        /\baddon\b/i,
        /\bplaystation store\b/i,
        /\bxbox store\b/i,
        /\bnintendo\b/i,
        /\bsteam\b/i,
        /\bepic games\b/i,
        /\btransaction description\b/i,
        /\b(order confirmation|purchase confirmation|receipt for your order|invoice for your order|movie rental|rental|rented)\b/i,
        /\b(seller|item|shipping|delivery|buyer protection|marketplace|return|refund)\b/i,
    ]);
}

function hasPaymentMethodOnlySignal(subjectAndSnippet: string) {
    const hasPaymentMethodPhrase = includesAny(subjectAndSnippet, [
        /metoda p[\u0142l]atno[s\u015b]ci/i,
        /metoda platnosci/i,
        /\bpayment method\b/i,
        /\bpaid with\b/i,
        /\bzap[l\u0142]acono.*(?:blik|karta|visa|mastercard|apple pay|google pay)/i,
    ]);

    return (
        hasPaymentMethodPhrase &&
        includesAny(subjectAndSnippet, [
            /\bblik\b/i,
            /\bkarta\b/i,
            /\bcard\b/i,
            /\bvisa\b/i,
            /\bmaster\s*card\b/i,
            /\bmastercard\b/i,
            /\bapple pay\b/i,
            /\bgoogle pay\b/i,
            /\bportfel\b/i,
            /\bwallet\b/i,
            /\bprzelew\b/i,
            /\bbank transfer\b/i,
            /\bpaypal\b/i,
        ])
    );
}

function hasPublicStatutoryPaymentSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bekrus\b/i,
        /\bkrus\b/i,
        /\bzus\b/i,
        /sk[l\u0142]adk/i,
        /ubezpieczenie spo[l\u0142]eczne/i,
        /ubezpieczenie spoleczne/i,
        /\bsocial insurance\b/i,
        /\btax office\b/i,
        /urz[a\u0105]d skarbowy/i,
        /urzad skarbowy/i,
        /\bpodatek\b/i,
        /\btax\b/i,
        /ustawowy obowi[a\u0105]zek/i,
        /ustawowy obowiazek/i,
    ]);
}

function hasSubscriptionUpsellSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /pozwoli[l\u0142]aby ci zaoszcz[e\u0119]dzi[c\u0107]/i,
        /pozwolilaby ci zaoszczedzic/i,
        /korzystaj taniej/i,
        /korzystaj z .{0,80} dzi[e\u0119]ki subskrypcji/i,
        /korzystaj z .{0,80} dzieki subskrypcji/i,
        /dzi[e\u0119]ki subskrypcji mo[z\u017c]esz/i,
        /dzieki subskrypcji mozesz/i,
        /zamawiaj .{0,80} z wyj[a\u0105]tkowymi korzy[s\u015b]ciami/i,
        /zamawiaj .{0,80} z wyjatkowymi korzysciami/i,
        /korzystaj z benefit[o\u00f3]w/i,
        /korzystaj z benefitow/i,
        /oszcz[e\u0119]dzaj dzi[e\u0119]ki subskrypcji/i,
        /oszczedzaj dzieki subskrypcji/i,
        /koszt subskrypcji\??\s*to twoje oszcz[e\u0119]dno[s\u015b]ci/i,
        /koszt subskrypcji\??\s*to twoje oszczednosci/i,
        /korzystaj bezp[l\u0142]atnie przez \d+ tyg/i,
        /korzystaj bezplatnie przez \d+ tyg/i,
        /wypr[o\u00f3]buj/i,
        /wyprobuj/i,
        /\b(start your free trial|try free|try it free)\b/i,
        /oferta specjalna tylko dla ciebie/i,
        /\b(unlock benefits|save with subscription|enjoy benefits with subscription|subscription benefits|get more with subscription)\b/i,
    ]);
}

function hasFreeAppStorePurchaseSignal(subjectAndSnippet: string) {
    return (
        includesAny(subjectAndSnippet, [
            /playstation store/i,
            /app store/i,
            /google play/i,
            /microsoft store/i,
            /\bsklepie playstation\b/i,
        ]) &&
        includesAny(subjectAndSnippet, [
            /\b(aplikacja|app)\b/i,
            /\(aplikacja\)/i,
            /one-time app purchase/i,
        ]) &&
        includesAny(subjectAndSnippet, [
            /\b0[,.]00\s*z[l\u0142]\b/i,
            /\b0[,.]00\s*(PLN|USD|EUR|GBP)\b/i,
            /\bfree\b/i,
            /bezp[l\u0142]atn/i,
        ])
    );
}

function hasRawHeaderSnippetSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bReceived:\s/i,
        /\bReceived-SPF:/i,
        /\bAuthentication-Results:/i,
        /\bDKIM-Signature:/i,
    ]);
}

function hasStrongActiveBillingConfirmationSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(payment confirmed|payment confirmation|charged|invoice issued|subscription started|trial started|your free trial has started)\b/i,
        /potwierdzenie p[\u0142l]atno[s\u015b]ci/i,
        /p[\u0142l]atno[s\u015b][c\u0107].{0,40}zrealizowana/i,
        /zosta[l\u0142]a zrealizowana/i,
        /wystawili[s\u015b]my faktur[e\u0119]/i,
        /bezp[l\u0142]atny okres pr[o\u00f3]bny .*rozpocz[a\u0105][l\u0142]/i,
        /okres pr[o\u00f3]bny .*rozpocz[a\u0105][l\u0142]/i,
        /subskrypcja .*rozpocznie si[e\u0119] automatycznie/i,
        /kontynuuj[a\u0105]c subskrypcj[e\u0119]/i,
        /metoda p[\u0142l]atno[s\u015b]ci .*obci[a\u0105][z\u017c]ana/i,
    ]);
}

function hasCreditLoanMarketingSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bRRSO\b/i,
        /rzeczywista roczna stopa oprocentowania/i,
        /po[zż]yczka/i,
        /pozyczka/i,
        /kredyt/i,
        /ca[lł]kowita kwota po[zż]yczki/i,
        /calkowita kwota pozyczki/i,
        /ca[lł]kowita kwota kredytu/i,
        /calkowita kwota kredytu/i,
        /oprocentowanie/i,
        /prowizja/i,
        /\brat[ay]\b/i,
        /miesi[eę]czne raty/i,
        /miesieczne raty/i,
        /leasing/i,
        /kredyt 50\/50/i,
    ]);
}

function hasExpiredReactivationSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\btrial has expired\b/i,
        /\baccount has expired\b/i,
        /\bsubscription expired\b/i,
        /\bhas ended\b/i,
        /\bended\b/i,
        /zako[n\u0144]czy[l\u0142]a si[e\u0119]/i,
        /zakonczyla sie/i,
        /twoja subskrypcja wygas[lł]a/i,
        /wygas[lł]a jaki[sś] czas temu/i,
        /reaktywuj[aą]c subskrypcj[eę]/i,
        /\bconsider a subscription plan\b/i,
    ]);
}

function detectBillingChannel(from: string, subjectAndSnippet: string) {
    const text = `${from} ${subjectAndSnippet}`;

    if (
        includesAny(from, [
            /primevideo\.com/i,
            /channels\.primevideo\.com/i,
            /bounces\.primevideo\.com/i,
        ])
    ) {
        return "Prime Video";
    }

    if (
        includesAny(subjectAndSnippet, [
            /\bprime video channels\b/i,
            /\bon prime video\b/i,
            /w us[l\u0142]udze prime video/i,
            /w usludze prime video/i,
            /subskrypcj[ae\u0119].{0,80}prime video/i,
            /subskrypcja.{0,80}prime video/i,
        ])
    ) {
        return "Prime Video";
    }

    if (
        includesAny(text, [
            /googleplay-noreply@google\.com/i,
            /play\.google\.com/i,
            /\bgoogle play\b/i,
        ])
    ) {
        return "Google Play";
    }

    if (
        includesAny(text, [
            /@(?:email\.)?apple\.com/i,
            /mzstatic\.com/i,
            /\bapple receipt\b/i,
            /\bbilled through apple\b/i,
            /rachunek apple/i,
        ])
    ) {
        return "Apple";
    }

    if (/\b(paypal|stripe|autopay|tpay|payu|przelewy24)\b/i.test(text)) {
        return "Payment Processor";
    }

    return undefined;
}

function hasMarketplaceBillingSignal(from: string, subjectAndSnippet: string) {
    return Boolean(detectBillingChannel(from, subjectAndSnippet));
}

function cleanExtractedProvider(value: string | undefined) {
    const cleaned = cleanInferredProviderName(value)
        ?.replace(/\b(on|w|us[l\u0142]udze|usludze|prime|video)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    return cleaned || undefined;
}

function inferProviderFromMarketplaceBilling(subjectAndSnippet: string) {
    const patterns = [
        /masz subskrypcj[e\u0119]\s+(.{2,80}?)\s+w us[l\u0142]udze prime video/i,
        /subskrypcj[aię]\s+(.{2,80}?)\s+w us[l\u0142]udze prime video/i,
        /zmiany w twojej subskrypcji kana[l\u0142]u\s+(.{2,80})/i,
        /subskrypcji kana[l\u0142]u\s+(.{2,80})/i,
        /dzi[e\u0119]kujemy za zakup subskrypcji\s+(.{2,80}?)(?:[.!,]|$)/i,
        /dziekujemy za zakup subskrypcji\s+(.{2,80}?)(?:[.!,]|$)/i,
        /your\s+(.{2,80}?)\s+subscription on prime video/i,
        /subscription channel\s+(.{2,80}?)(?:[.!,]|$)/i,
        /\b(.{2,60}?)\s+on prime video\b/i,
    ];

    for (const pattern of patterns) {
        const match = subjectAndSnippet.match(pattern);
        const provider = cleanExtractedProvider(match?.[1]);

        if (provider) {
            return provider;
        }
    }

    return undefined;
}

function normalizeMarketplaceProviderName(provider: string) {
    return provider
        .replace(/\s+Premium\b/i, "")
        .replace(/\s+Standard\b/i, "")
        .replace(/\s+Individual\b/i, "")
        .trim();
}

function detectMarketplaceServiceProvider(subjectAndSnippet: string) {
    const planName = detectPlanName(subjectAndSnippet);

    if (planName) {
        return normalizeMarketplaceProviderName(planName);
    }

    if (/disney\+/i.test(subjectAndSnippet)) {
        return "Disney+";
    }

    const provider = detectProvider(subjectAndSnippet);

    if (
        provider &&
        !["Apple", "Google Play", "Prime Video", "Amazon"].includes(provider)
    ) {
        return normalizeMarketplaceProviderName(provider);
    }

    const subscriptionTo = subjectAndSnippet.match(
        /\bsubscription to\s+(.{2,60}?)(?:\.|,|$)/i
    )?.[1];
    const cleaned = cleanExtractedProvider(subscriptionTo);

    return cleaned ? normalizeMarketplaceProviderName(cleaned) : undefined;
}

function inferProviderFromPaymentProcessorText(from: string, subjectAndSnippet: string) {
    if (!isTrustedPaymentProcessorText(from)) {
        return undefined;
    }

    const patterns = [
        /do us[\u0142l]ugodawcy\s*-\s*([^\n\r|:;.,]+)/i,
        /odbiorca:\s*([^\n\r|:;.,]+)/i,
        /us[\u0142l]ugodawca:\s*([^\n\r|:;.,]+)/i,
        /sprzedawca:\s*([^\n\r|:;.,]+)/i,
        /merchant:\s*([^\n\r|:;.,]+)/i,
        /seller:\s*([^\n\r|:;.,]+)/i,
        /payment to\s+([^\n\r|:;.,]+)/i,
        /automatic payment to\s+([^\n\r|:;.,]+)/i,
        /paid to\s+([^\n\r|:;.,]+)/i,
        /payment for\s+([^\n\r|:;.,]+)/i,
        /receipt from\s+([^\n\r|:;.,]+)/i,
        /transakcja dla\s+([^\n\r|:;.,]+)/i,
        /p[\u0142l]atno[s\u015b][c\u0107]\s+automatyczna\s+do\s+([^\n\r|:;.,]+)/i,
        /platnosc automatyczna do\s+([^\n\r|:;.,]+)/i,
        /p[\u0142l]atno[s\u015b][c\u0107]\s+cykliczna\s+za\s+([^\n\r|:;.,]+)/i,
        /platnosc cykliczna za\s+([^\n\r|:;.,]+)/i,
        /p[\u0142l]atno[s\u015b][c\u0107]\s+za\s+([^\n\r|:;.,]+)/i,
        /platnosc za\s+([^\n\r|:;.,]+)/i,
        /invoice from\s+([^\n\r|:;.,]+)/i,
        /billing agreement with\s+([^\n\r|:;.,]+)/i,
        /opis zam[o\u00f3]wienia w\s+([^\n\r|:;.,]+)/i,
    ];

    for (const pattern of patterns) {
        const match = subjectAndSnippet.match(pattern);
        const provider = cleanInferredProviderName(match?.[1]);
        const cleanedProvider = provider
            ?.replace(/\b(Twoja|Platnosc|Płatnosc|Zostala|Została).*$/i, "")
            .trim();

        if (
            cleanedProvider &&
            !/\b(terg|astarium|koleo|media expert|zamowienie|zam[o\u00f3]wienie|sklep|shop|random shop)\b/i.test(
                cleanedProvider
            )
        ) {
            return cleanedProvider;
        }
    }

    return undefined;
}

function inferProviderFromSubscriptionContext(from: string, subjectAndSnippet: string) {
    if (
        !(
            hasSubscriptionStartedSignal(subjectAndSnippet) ||
            hasSubscriptionContinuationSignal(subjectAndSnippet) ||
            hasActiveRenewalPaymentSignal(subjectAndSnippet)
        )
    ) {
        return undefined;
    }

    const patterns = [
        /your\s+(.{2,80}?)\s+subscription/i,
        /(.{2,80}?)\s+subscription has started/i,
        /subskrypcja\s+(.{2,80}?)(?:\s+rozpocz|\s+odnaw|\s+b[e\u0119]dzie|[.!,]|$)/i,
    ];

    for (const pattern of patterns) {
        const provider = cleanInferredProviderName(
            subjectAndSnippet.match(pattern)?.[1]
        )
            ?.replace(/\b(Pro|Premium|Plus|Standard|Individual|Family|Student)\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();

        if (provider && !/\b(your|twoja|subskrypcja)\b/i.test(provider)) {
            return provider;
        }
    }

    const displayName = from.match(/^([^<]+)</)?.[1];
    const provider = cleanInferredProviderName(displayName);

    return provider && !/\b(no reply|noreply|billing|support)\b/i.test(provider)
        ? provider
        : undefined;
}

function hasPromotionalTrialSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\bstart a free trial today\b/i,
        /\btry .{0,80} for free\b/i,
        /\btry .{0,80} free\b/i,
        /\bstart your free trial\b/i,
        /\bdiscover .{0,80} tools\b/i,
        /\b(this promotional email|promotional email)\b/i,
    ]);
}

function hasActiveTrialSubscriptionSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(active subscription|your subscription is active)\b/i,
        /\b(trial has started|your free trial has started)\b/i,
        /\b(trial ends in|trial ends soon|trial will end|trial ends on|trial will end on)\b/i,
        /\b(subscription will renew|will renew monthly|will renew automatically)\b/i,
        /\bsubskrypcja .{0,40}jest aktywna\b/i,
        /okres pr[o\u00f3]bny .*w[l\u0142]a[s\u015b]nie si[e\u0119] rozpocz[a\u0105][l\u0142]/i,
        /okres probny .*wlasnie sie rozpoczal/i,
        /subskrypcja .*rozpocznie si[e\u0119] automatycznie/i,
        /subskrypcja .*rozpocznie sie automatycznie/i,
        /\bokres pr[o\u00f3]bny .{0,60}ko[n\u0144]czy/i,
        /po zako[n\u0144]czeniu .{0,80}okresu pr[o\u00f3]bnego .{0,80}zostanie naliczona op[l\u0142]ata/i,
        /po zakonczeniu .{0,80}okresu probnego .{0,80}zostanie naliczona oplata/i,
        /\bbedziemy obciazac\b/i,
        /\bb[e\u0119]dziemy obci[a\u0105][z\u017c]a[c\u0107]\b/i,
        /w[l\u0142]a[s\u015b]nie rozpoczyna si[e\u0119] twoja subskrypcja/i,
        /wlasnie rozpoczyna sie twoja subskrypcja/i,
        /automatycznie przed[l\u0142]u[z\u017c]ana/i,
        /automatycznie przedluzana/i,
        /automatycznie odnawiane/i,
        /subskrypcje b[e\u0119]d[a\u0105] automatycznie odnawiane/i,
        /subskrypcje beda automatycznie odnawiane/i,
    ]);
}

function hasPaymentSetupSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(payment profile|payment method added)\b/i,
        /profil p[\u0142l]atno[s\u015b]ci/i,
        /profil platnosci/i,
        /dodano form[e\u0119] p[\u0142l]atno[s\u015b]ci/i,
        /dodano forme platnosci/i,
        /utworzono profil p[\u0142l]atno[s\u015b]ci/i,
        /utworzono profil platnosci/i,
    ]);
}

function hasActiveRenewalPaymentSignal(subjectAndSnippet: string) {
    if (/\b(will not be charged|not be charged)\b/i.test(subjectAndSnippet)) {
        return false;
    }

    return includesAny(subjectAndSnippet, [
        /\b(renewed successfully|has renewed|payment received|you have been charged|charged for)\b/i,
        /\bpobral[iı]smy\s+p[\u0142l]atno[s\u015b][c\u0107]\b/i,
        /\bpobralismy\s+platnosc\b/i,
        /\bobci[a\u0105][z\u017c]ymy\b/i,
        /\bobciazymy\b/i,
        /zostanie naliczona op[l\u0142]ata/i,
        /zostanie naliczona oplata/i,
        /metoda p[\u0142l]atno[s\u015b]ci .*b[e\u0119]dzie obci[a\u0105][z\u017c]ana/i,
        /metoda platnosci .*bedzie obciazana/i,
    ]);
}

function hasCancellationSignal(subjectAndSnippet: string) {
    if (/\b(unless|until)\s+cancell?ed\b/i.test(subjectAndSnippet)) {
        return false;
    }

    return includesAny(subjectAndSnippet, [
        /\b(subscription was canceled|subscription has been canceled|was cancelled|has been cancelled|canceled|cancelled)\b/i,
        /\b(will not be charged again|you will not be charged again)\b/i,
        /anulowano subskrypcj[e\u0119]/i,
        /subskrypcja zosta[l\u0142]a anulowana/i,
        /anulowana subskrypcja/i,
        /potwierdzenie anulowania .*subskrypcji/i,
        /przykro nam ci[e\u0119] po[z\u017c]egna[c\u0107]/i,
        /przykro nam cie pozegnac/i,
        /zachowasz dost[e\u0119]p do ko[n\u0144]ca okresu rozliczeniowego/i,
        /zachowasz dostep do konca okresu rozliczeniowego/i,
        /\bno further charges\b/i,
        /\bscheduled for cancellation\b/i,
        /nie zostanie naliczona op[l\u0142]ata/i,
    ]);
}

function hasRefundSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(refund|refunded|refund issued|refund was issued)\b/i,
        /zwrot/i,
        /zwr[o\u00f3]cono/i,
        /zwrot [s\u015b]rodk[o\u00f3]w/i,
        /zwrot p[\u0142l]atno[s\u015b]ci/i,
        /zwrot platnosci/i,
    ]);
}

function hasFreePlanSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(free plan|free account|free workspace)\b/i,
        /plan darmowy/i,
        /darmowy plan/i,
        /bezp[l\u0142]atny plan/i,
    ]);
}

function hasUnreadableEncodedEvidenceSignal(subjectAndSnippet: string) {
    const quotedPrintableMatches =
        subjectAndSnippet.match(/=(?:C3|C5|3D)/gi)?.length ?? 0;

    return (
        includesAny(subjectAndSnippet, [
            /\bContent-Transfer-Encoding\b/i,
            /\bContent-Type:/i,
            /\bMime-Version\b/i,
            /\b[A-Za-z0-9+/=]{80,}\b/,
            /\b(?:PFRB|PCFE|PERJ)[A-Za-z0-9+/=]{20,}\b/,
        ]) || quotedPrintableMatches >= 4
    );
}

function isTrustedPaymentProcessorText(text: string) {
    return /(?:@|\.)paypal\.com\b|(?:@|\.)stripe\.com\b|(?:@|\.)payu\.(?:com|pl)\b|(?:@|\.)przelewy24\.pl\b|(?:@|\.)autopay\.pl\b|(?:@|\.)tpay\.com\b|payments-noreply@google\.com|\bgoogle payments\b/i.test(
        text
    );
}

function isSuspiciousSenderForProvider(from: string, provider: string | undefined) {
    const emailAddress = from.match(/<([^>]+)>/)?.[1] ?? from;

    if (!provider || isTrustedPaymentProcessorText(emailAddress)) {
        return false;
    }

    const trustedProviderKeywords: Record<string, string[]> = {
        Spotify: ["spotify"],
        OpenAI: ["openai", "tm.openai", "chatgpt"],
        YouTube: ["youtube", "google"],
        "Google Play": ["google"],
        "Google One": ["google"],
        Apple: ["apple"],
        Netflix: ["netflix"],
        Disney: ["disney"],
        Max: ["max", "hbo", "warnermedia", "wbd"],
        HBO: ["hbo", "max", "warnermedia", "wbd"],
        Amazon: ["amazon"],
        Canva: ["canva"],
        Adobe: ["adobe"],
        Microsoft: ["microsoft"],
        Dropbox: ["dropbox"],
        Play: ["play.pl", "mojefinanseplay"],
        Orange: ["orange"],
        "T-Mobile": ["t-mobile", "tmobile"],
        Plus: ["plus.pl"],
        Netia: ["netia"],
        Vectra: ["vectra"],
        UPC: ["upc"],
    };
    const trustedKeywords = trustedProviderKeywords[provider];

    if (!trustedKeywords) {
        return false;
    }

    const normalizedFrom = emailAddress.toLowerCase();
    return !trustedKeywords.some((keyword) =>
        normalizedFrom.includes(keyword.toLowerCase())
    );
}

function isHighRiskProviderForSuspiciousSender(provider: string | undefined) {
    return Boolean(
        provider &&
            [
                "Amazon",
                "Max",
                "HBO",
                "Disney",
                "Netflix",
                "Spotify",
                "OpenAI",
                "YouTube",
                "Google Play",
                "Google One",
                "Apple",
                "Microsoft",
                "Adobe",
                "Canva",
                "Dropbox",
            ].includes(provider)
    );
}

function hasSuspiciousRedirectLinkSignal(subjectAndSnippet: string) {
    return /\b(?:sendgrid|ct\.sendgrid)\b/i.test(subjectAndSnippet);
}

function hasRealExternalDomainMismatchEvidence(
    from: string,
    provider: string | undefined
) {
    return isSuspiciousSenderForProvider(from, provider);
}

function hasAccountSecurityLoginSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\b(verify your email|confirm your email|confirm email|email verification|login code|sign-in code|new sign in|new login|password reset|security alert|create account|account creation)\b/i,
        /potwierd[z\u017a]\s+sw[o\u00f3]j\s+adres\s+e-mail/i,
        /potwierd[z\u017a]\s+adres\s+e-mail/i,
        /potwierdzenia\s+adresu\s+e-mail/i,
        /kod\s+logowania/i,
        /jednorazowy\s+kod/i,
        /nowe\s+logowanie/i,
        /utworzy[c\u0107]\s+konto/i,
        /naci[s\u015b]nij\s+link,\s+aby\s+utworzy[c\u0107]\s+konto/i,
        /zalogowa[c\u0107]/i,
        /logowania/i,
    ]);
}

function hasAccountSecurityCodeSignal(subjectAndSnippet: string) {
    return includesAny(subjectAndSnippet, [
        /\byour\s+[\w\s.-]{0,40}\s+code\s+(?:is|:)\s*\d{4,8}\b/i,
        /\b(?:verification|security|login|sign-in|one-time|otp)\s+code\s+(?:is|:)?\s*\d{4,8}\b/i,
        /\buse\s+(?:this\s+)?code\s+to\s+(?:verify|sign in|login|log in|confirm)\b/i,
        /wprowad[z\u017a] poni[z\u017c]szy kod/i,
        /wpisz poni[z\u017c]szy kod/i,
        /tw[o\u00f3]j kod to/i,
        /\bkod to:/i,
        /zmiany na swoim koncie/i,
        /aktualizacja danych na twoim koncie/i,
        /aktualizacja danych na koncie/i,
        /pro[s\u015b]b[e\u0119] o aktualizacj[e\u0119] danych/i,
        /prosbe o aktualizacje danych/i,
        /kod w ci[a\u0105]gu/i,
        /kod w ciagu/i,
    ]);
}

export function detectProvider(text: string) {
    const normalizedText = text.toLowerCase();

    return PROVIDER_CATALOG.find((provider) =>
        provider.patterns.some((pattern) => matchesProviderPattern(normalizedText, pattern))
    )?.name;
}

function matchesProviderPattern(normalizedText: string, pattern: string) {
    const normalizedPattern = pattern.toLowerCase().trim();

    if (!normalizedPattern) {
        return false;
    }

    if (
        normalizedPattern.includes(".") ||
        normalizedPattern.includes("+") ||
        normalizedPattern.includes("@")
    ) {
        return normalizedText.includes(normalizedPattern);
    }

    if (normalizedPattern.length <= 3) {
        return new RegExp(`\\b${escapeRegExp(normalizedPattern)}\\b`, "i").test(
            normalizedText
        );
    }

    return new RegExp(`\\b${escapeRegExp(normalizedPattern)}\\b`, "i").test(
        normalizedText
    );
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanInferredProviderName(value: string | undefined) {
    const cleaned = cleanText(value)
        .replace(/\b\d+(?:[./|-]\d+)*\b/g, " ")
        .replace(/\b(?:pln|usd|eur|gbp|zl|z\u0142)\b/gi, " ")
        .replace(/[|:,_#()[\]{}.!?/\\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (
        /\b(do twojego zam[oó]wienia|dziekujemy za zakup|dziękujemy za zakup|twoje zam[oó]wienie|potwierdzenie zakupu|e ?faktura|faktura|zam[oó]wienie)\b/i.test(
            cleaned
        )
    ) {
        return undefined;
    }

    if (!cleaned || cleaned.length < 2) {
        return undefined;
    }

    const parts = cleaned.split(" ").filter(Boolean);
    const normalizedParts = parts.map((part) => part.toLowerCase());
    const unsafeProviderTokens = new Set([
        "jan",
        "january",
        "feb",
        "february",
        "mar",
        "march",
        "apr",
        "april",
        "may",
        "jun",
        "june",
        "jul",
        "july",
        "aug",
        "august",
        "sep",
        "sept",
        "september",
        "oct",
        "october",
        "nov",
        "november",
        "dec",
        "december",
        "sty",
        "styczen",
        "styczeń",
        "lut",
        "luty",
        "marzec",
        "kwi",
        "kwiecien",
        "kwiecień",
        "maj",
        "cze",
        "czerwiec",
        "lip",
        "lipiec",
        "sie",
        "sierpien",
        "sierpień",
        "wrz",
        "wrzesien",
        "wrzesień",
        "paz",
        "paź",
        "pazdziernik",
        "październik",
        "lis",
        "listopad",
        "gru",
        "grudzien",
        "grudzień",
        "receipt",
        "order",
        "invoice",
        "from",
        "on",
        "for",
        "payment",
        "paid",
        "charged",
        "subscription",
        "trial",
        "date",
        "data",
        "zamowienie",
        "zamówienie",
        "faktura",
        "rachunek",
    ]);

    if (
        normalizedParts.length > 0 &&
        normalizedParts.every(
            (part) =>
                unsafeProviderTokens.has(part) ||
                /^\d+$/.test(part) ||
                part.length < 3
        )
    ) {
        return undefined;
    }

    return parts
        .slice(0, 3)
        .map((part) =>
            part.length <= 4 && part === part.toUpperCase()
                ? part.toUpperCase()
                : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" ");
}

function isPaymentMethodOnlyProviderName(value: string | undefined) {
    const normalized = cleanText(value).toLowerCase();

    return /^(blik|visa|mastercard|master card|card|karta|apple pay|google pay|paypal|wallet|portfel|bank transfer|przelew)$/.test(
        normalized
    );
}

function hasInvoiceLikeProviderInferenceContext(text: string) {
    return includesAny(text, [
        /ekofaktura/i,
        /e-faktura/i,
        /efaktura/i,
        /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
        /op[l\u0142]ac fakture/i,
        /termin p[l\u0142]atno[s\u015b]ci/i,
        /kwota do zap[l\u0142]aty/i,
        /panel klienta/i,
        /\b(eBOA|eboa|ebok|e-bok)\b/i,
    ]);
}

function inferProviderFromInvoiceContext(from: string, subjectAndSnippet: string) {
    const subjectProvider = subjectAndSnippet.match(
        /\b(?:eko\s?faktura|e-faktura|efaktura)\s+([^|:\n\r]+)/i
    )?.[1];
    const cleanedSubjectProvider = cleanInferredProviderName(subjectProvider);

    if (cleanedSubjectProvider) {
        return cleanedSubjectProvider;
    }

    if (!hasInvoiceLikeProviderInferenceContext(subjectAndSnippet)) {
        return undefined;
    }

    const emailAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
    const domain = emailAddress.toLowerCase().split("@").pop() ?? "";
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

    if (!domain || blockedDomains.some((blocked) => domain.endsWith(blocked))) {
        return undefined;
    }

    return cleanInferredProviderName(domain.split(".")[0]);
}

function isPaymentProcessorText(text: string) {
    return /\b(paypal|stripe|payu|przelewy24|autopay|tpay|google payments|payments-noreply|receipts\+acct)\b/i.test(
        text
    );
}

function detectPlanName(text: string) {
    const provider = detectProvider(text);

    if (
        provider === "Spotify" &&
        /\b(spotify\s+premium|premium\s+individual|premium\s+duo|premium\s+family|premium\s+student)\b/i.test(
            text
        )
    ) {
        return "Spotify Premium";
    }

    const planPatterns = [
        {
            name: "YouTube Premium Lite",
            pattern:
                /\byoutube\b[\s\S]{0,120}\bpremium\s+lite\b|\bpremium\s+lite\b[\s\S]{0,120}\byoutube\b/i,
        },
        {
            name: "YouTube Music Premium",
            pattern: /\byoutube\s+music\s+premium\b/i,
        },
        {
            name: "YouTube Premium",
            pattern: /\byoutube\s+premium\b/i,
        },
        {
            name: "SkyShowtime",
            pattern: /\bsky\s?showtime\b/i,
        },
        {
            name: "Apple TV",
            pattern: /\bapple\s+tv\+?\b/i,
        },
        {
            name: "AllTrails+",
            pattern: /\balltrails\+?\b/i,
        },
        {
            name: "Uber One",
            pattern: /\buber\s+one\b/i,
        },
        {
            name: "YouTube Premium Lite",
            pattern: /\bpremium\s+lite\b/i,
        },
        {
            name: "Spotify Premium",
            pattern:
                /\b(spotify\s+premium|premium\s+individual|premium\s+duo|premium\s+family|premium\s+student)\b/i,
        },
        {
            name: "Canva Pro",
            pattern: /\bcanva\s+pro\b/i,
        },
        {
            name: "Dropbox Plus",
            pattern: /\bdropbox\s+plus\b/i,
        },
        {
            name: "Google One",
            pattern: /\bgoogle\s+one\b/i,
        },
        {
            name: "ChatGPT Plus",
            pattern: /\bchatgpt\s+plus\b/i,
        },
        {
            name: "OpenAI Plus",
            pattern: /\bopenai\s+plus\b/i,
        },
        {
            name: "Microsoft 365",
            pattern: /\bmicrosoft\s+365\b/i,
        },
        {
            name: "Adobe Creative Cloud",
            pattern: /\badobe\s+creative\s+cloud\b/i,
        },
        {
            name: "Adobe Acrobat Pro",
            pattern: /\badobe\s+acrobat\s+pro\b|\bacrobat\s+pro\b/i,
        },
        {
            name: "Netflix Premium",
            pattern: /\bnetflix\s+premium\b/i,
        },
        {
            name: "Netflix Standard",
            pattern: /\bnetflix\s+standard\b/i,
        },
        {
            name: "Disney+ Premium",
            pattern: /\bdisney\+?\s+premium\b/i,
        },
        {
            name: "Disney Premium",
            pattern: /\bdisney\s+premium\b/i,
        },
    ];

    return planPatterns.find(({ pattern }) => pattern.test(text))?.name;
}

export function detectTrialEndDateText(text: string) {
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

export function detectAmountText(text: string) {
    const patterns = [
        /[$\u20ac\u00a3]\s?\d+(?:[.,]\d{2})?/,
        /\d+(?:[.,]\d{2})?\s?z[l\u0142]/i,
        /\d+(?:[.,]\d{2})?\s?(?:PLN|USD|EUR|GBP)/i,
        /(?:PLN|USD|EUR|GBP)\s?\d+(?:[.,]\d{2})?/i,
        /\d+(?:[.,]\d{2})?\s?brutto/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match?.[0]) {
            return cleanText(match[0]);
        }
    }

    return undefined;
}

export function detectCurrency(amountText: string | undefined) {
    if (!amountText) return undefined;

    if (amountText.includes("$")) return "USD";
    if (amountText.includes("\u20ac")) return "EUR";
    if (amountText.includes("\u00a3")) return "GBP";
    if (/\bz[l\u0142]\b/i.test(amountText)) return "PLN";

    const currencyMatch = amountText.match(/\b(PLN|USD|EUR|GBP)\b/i);
    return currencyMatch?.[1]?.toUpperCase();
}

export function parseAmountText(
    amountText: string | undefined
): ParsedDetectedAmount | null {
    if (!amountText) {
        return null;
    }

    const cleanedAmountText = cleanText(amountText);
    const symbolCurrency = cleanedAmountText.match(
        /^([$\u20ac\u00a3])\s?(\d+(?:[.,]\d{2})?)$/
    );
    const suffixCurrency = cleanedAmountText.match(
        /^(\d+(?:[.,]\d{2})?)\s?(PLN|USD|EUR|GBP|z[l\u0142])$/i
    );
    const prefixCurrency = cleanedAmountText.match(
        /^(PLN|USD|EUR|GBP)\s?(\d+(?:[.,]\d{2})?)$/i
    );

    if (symbolCurrency) {
        return {
            amount: Number(symbolCurrency[2].replace(",", ".")),
            currency: detectCurrency(symbolCurrency[1]),
        };
    }

    if (suffixCurrency) {
        return {
            amount: Number(suffixCurrency[1].replace(",", ".")),
            currency: detectCurrency(suffixCurrency[2]),
        };
    }

    if (prefixCurrency) {
        return {
            amount: Number(prefixCurrency[2].replace(",", ".")),
            currency: prefixCurrency[1].toUpperCase(),
        };
    }

    return null;
}

export function parseTrialEndDateText(trialEndDateText: string | undefined) {
    if (!trialEndDateText) {
        return null;
    }

    const parsed = Date.parse(cleanText(trialEndDateText));

    if (Number.isNaN(parsed)) {
        return null;
    }

    return new Date(parsed);
}

export function truncateEvidenceSnippet(snippet: string) {
    return cleanText(snippet).slice(0, 500);
}

export function detectBillingCycle(
    text: string
): BillingCycleDetection | undefined {
    if (hasProgressReportSignal(text)) {
        return undefined;
    }

    if (
        includesAny(text, [
            /\b(monthly|per month|month-to-month|co miesi[a\u0105]c|co miesiac|ka[z\u017c]dego miesi[a\u0105]ca|kazdego miesiaca|miesi[e\u0119]cznie|miesiecznie)\b/i,
            /\b(miesi[e\u0119]czna|miesi[e\u0119]czny|miesi[e\u0119]czne|miesi[e\u0119]cznej|miesi[e\u0119]czn[a\u0105])\b/i,
            /\b(miesieczna|miesieczny|miesieczne|miesiecznej)\b/i,
            /\b(miesi[e\u0119]cznej|miesiecznej)\s+(subskrypcji|p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
            /rozliczana miesi[e\u0119]cznie/i,
            /rozliczane miesi[e\u0119]cznie/i,
            /us[l\u0142]uga rozliczana jest co miesi[a\u0105]c/i,
            /us[l\u0142]ugi s[a\u0105] rozliczane miesi[e\u0119]cznie/i,
            /kolejny miesi[a\u0105]c/i,
            /obejmuje kolejny miesi[a\u0105]c/i,
            /abonament miesi[e\u0119]czny/i,
            /miesi[e\u0119]czny abonament/i,
            /okres rozliczeniowy[\s\S]{0,120}\b(internet|abonament|us[l\u0142]ug)/i,
            /\b(internet|abonament|us[l\u0142]ug)[\s\S]{0,120}okres rozliczeniowy/i,
            /dniu rozliczeniowym/i,
            /do dnia rozliczenia/i,
        ])
    ) {
        return "monthly";
    }

    if (
        includesAny(text, [
            /\b(yearly|annual|annually|per year|rocznie)\b/i,
            /\b(roczna|roczny|roczne|rocznej|roczn[a\u0105])\b/i,
            /\b(za plan roczny|za roczny plan|plan roczny|roczny plan)\b/i,
            /\brocznej\s+(subskrypcji|p[\u0142l]atno[s\u015b]ci|platnosci)\b/i,
        ])
    ) {
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

function collectDetectionSignals(params: {
    from: string;
    subjectAndSnippet: string;
    combinedText: string;
}): DetectionSignals {
    const detectedCatalogProvider = detectProvider(params.combinedText);
    const billingChannel = detectBillingChannel(params.from, params.subjectAndSnippet);
    const marketplaceProvider = inferProviderFromMarketplaceBilling(
        params.subjectAndSnippet
    );
    const marketplaceServiceProvider =
        billingChannel && billingChannel !== "Payment Processor"
            ? detectMarketplaceServiceProvider(params.subjectAndSnippet)
            : undefined;
    const paymentProcessorProvider = inferProviderFromPaymentProcessorText(
        params.from,
        params.subjectAndSnippet
    );
    const rawProvider =
        marketplaceServiceProvider ??
        marketplaceProvider ??
        detectedCatalogProvider ??
        paymentProcessorProvider ??
        inferProviderFromSubscriptionContext(params.from, params.subjectAndSnippet) ??
        inferProviderFromInvoiceContext(params.from, params.subjectAndSnippet);
    const safeRawProvider =
        rawProvider &&
        isPaymentMethodOnlyProviderName(rawProvider) &&
        !paymentProcessorProvider
            ? undefined
            : rawProvider;
    const provider =
        billingChannel && billingChannel !== "Payment Processor" && marketplaceServiceProvider
            ? safeRawProvider
            : normalizeProviderForPublicResult(safeRawProvider);
    const planName = detectPlanName(params.combinedText);
    const billingCycle = detectBillingCycle(params.subjectAndSnippet);
    const trialEndDateText = detectTrialEndDateText(params.subjectAndSnippet);
    const amountText = detectAmountText(params.subjectAndSnippet);
    const hasProgressReportEvidence = hasProgressReportSignal(
        params.subjectAndSnippet
    );
    const hasPriceChangeEvidence = hasPriceChangeSignal(params.subjectAndSnippet);
    const hasActiveSubscriberEvidence = hasActiveSubscriberSignal(
        params.subjectAndSnippet
    );
    const hasBillingDateEvidence = hasBillingDateSignal(params.subjectAndSnippet);
    const hasTransportTicketEvidence = hasTransportTicketSignal(
        params.combinedText
    );
    const hasPhoneTopUpEvidence = hasPhoneTopUpSignal(params.combinedText);
    const hasMarketingIntermediaryEvidence = hasMarketingIntermediarySignal(
        params.combinedText
    );
    const hasSubscriptionUpsellEvidence = hasSubscriptionUpsellSignal(
        params.subjectAndSnippet
    );
    const hasSubscriptionStartedEvidence = hasSubscriptionStartedSignal(
        params.subjectAndSnippet
    );
    const hasSubscriptionContinuationEvidence = hasSubscriptionContinuationSignal(
        params.subjectAndSnippet
    );
    const hasOnboardingOnlyEvidence = hasOnboardingOnlySignal(
        params.subjectAndSnippet
    );
    const hasAccountAdminUpdateEvidence = hasAccountAdminUpdateSignal(
        params.subjectAndSnippet
    );
    const hasCollaborationInviteEvidence = hasCollaborationInviteSignal(
        params.subjectAndSnippet
    );
    const hasPlanFeatureUpdateEvidence = hasPlanFeatureUpdateSignal(
        params.subjectAndSnippet
    );
    const hasReviewReplyEvidence = hasReviewReplySignal(params.subjectAndSnippet);
    const hasProductUpdateQuotaSecurityEvidence =
        hasProductUpdateQuotaSecuritySignal(params.subjectAndSnippet);
    const hasProjectStatusUpdateEvidence = hasProjectStatusUpdateSignal(
        params.subjectAndSnippet
    );
    const hasGeneratedContentReadyEvidence = hasGeneratedContentReadySignal(
        params.subjectAndSnippet
    );
    const hasCreditLoanMarketingEvidence = hasCreditLoanMarketingSignal(
        params.subjectAndSnippet
    );
    const hasExpiredReactivationEvidence = hasExpiredReactivationSignal(
        params.subjectAndSnippet
    );
    const hasMarketplaceBillingEvidence = hasMarketplaceBillingSignal(
        params.from,
        params.subjectAndSnippet
    );
    const providerEntry = getProviderRegistryEntry(provider);
    const hasTrustedSenderEvidence =
        Boolean(provider) &&
        providerEntry?.category !== "payment_processor" &&
        !isSuspiciousSenderForProvider(params.from, provider);
    const hasOneTimePurchaseEvidence = hasOneTimePurchaseSignal(
        params.subjectAndSnippet
    );
    const hasOneTimeMarketplaceEcommerceEvidence =
        hasOneTimeMarketplaceEcommerceSignal(params.subjectAndSnippet);
    const hasPaymentMethodOnlyEvidence = hasPaymentMethodOnlySignal(
        params.subjectAndSnippet
    );
    const hasPublicStatutoryPaymentEvidence = hasPublicStatutoryPaymentSignal(
        params.combinedText
    );
    const hasFreeAppStorePurchaseEvidence = hasFreeAppStorePurchaseSignal(
        params.subjectAndSnippet
    );
    const hasNewsletterRecommendationEvidence = hasNewsletterRecommendationSignal(
        params.subjectAndSnippet
    );
    const hasNegatedSubscriptionEvidence = hasNegatedSubscriptionSignal(
        params.subjectAndSnippet
    );
    const hasNegatedBillingEvidence = hasNegatedBillingSignal(
        params.subjectAndSnippet
    );
    const hasPaymentDueEvidence =
        !hasNegatedBillingEvidence && hasPaymentDueSignal(params.subjectAndSnippet);
    const hasMarketingEvidence = hasMarketingIntermediaryEvidence || hasSubscriptionUpsellEvidence || includesAny(params.subjectAndSnippet, [
        /\b(newsletter|sale|promo|offer|deal|limited time offer|special offer|discover|promotional email|try it|upgrade to|switch to|activate|send-premium|referral|refer a friend)\b/i,
        /\b(oferta|oferte|oferty|wyj[a\u0105]tkowa oferta|wyjatkowa oferta|sprawd[z\u017a] szczeg[o\u00f3][l\u0142]y oferty|sprawdz szczegoly oferty|oferta specjalna|kup na|przejd[z\u017a] na|przejdz na|aktywuj|wypr[o\u00f3]buj|wyprobuj|wybierz abonament|smartfonem|rabatach|zgody marketingowe|promocyjne|promocje|marketingowe|promocyjna|poznaj)\b/i,
        /kod polecaj[a\u0105]cy/i,
        /pole[c\u0107] plan znajomemu/i,
        /podziel si[e\u0119]/i,
        /3 miesi[a\u0105]ce za darmo/i,
        /za 0 z[l\u0142]/i,
    ]);
    const hasRecurringBillEvidence =
        hasRecurringBillSignal(params.subjectAndSnippet) &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence);
    const hasTrialEvidence = includesAny(params.subjectAndSnippet, [
        /\b(trial|free trial|trial started|start your trial|your trial|trial will end|okres pr[o\u00f3]bny|wersja pr[o\u00f3]bna)\b/i,
    ]);
    const hasReceiptEvidence =
        !hasNegatedBillingEvidence &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence) &&
        includesAny(params.subjectAndSnippet, [
            /\b(receipt|order receipt|order confirmation|purchase confirmation|potwierdzenie zakupu|potwierdzenie p[\u0142l]atno[s\u015b]ci|potwierdzenie platnosci)\b/i,
            /ekofaktura/i,
            /e-faktura/i,
            /efaktura/i,
        ]);
    const hasInvoiceEvidence =
        !hasNegatedBillingEvidence &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence) &&
        includesAny(params.subjectAndSnippet, [
            /\b(invoice|faktura|numer faktury|rachunek)\b/i,
            /ekofaktura/i,
            /e-faktura/i,
            /efaktura/i,
            /faktura jest ju[z\u017c] dost[e\u0119]pna/i,
            /faktura dost[e\u0119]pna/i,
        ]);
    const hasPaymentEvidence =
        !hasNegatedBillingEvidence &&
        !(hasMarketingEvidence && !hasPaymentDueEvidence) &&
        includesAny(params.subjectAndSnippet, [
            /\b(payment|paid|purchase|purchased|billed|p[\u0142l]atno[s\u015b][c\u0107]i|p[\u0142l]atno[s\u015b][c\u0107]|platnosci|platnosc|zakup)\b/i,
            /op[l\u0142]a[c\u0107] faktur[e\u0119]/i,
            /op[l\u0142]ac fakture/i,
            /\bpobralismy\s+platnosc\b/i,
            /\bpobral[i\u015b]my\s+p[\u0142l]atno[s\u015b][c\u0107]\b/i,
        ]);
    const hasChargedEvidence = includesAny(params.subjectAndSnippet, [
        /\b(charged|automatically charged|charged for)\b/i,
        /\b(b[e\u0119]dziemy\s+obci[a\u0105][z\u017c]a[c\u0107]|bedziemy\s+obciazac|obci[a\u0105][z\u017c]a[c\u0107]|obciazac|obci[a\u0105][z\u017c]ymy|obciazymy|obci[a\u0105][z\u017c]enie|obciazenie)\b/i,
        /metoda p[\u0142l]atno[s\u015b]ci .*b[e\u0119]dzie obci[a\u0105][z\u017c]ana/i,
        /bedzie obciazana/i,
    ]);
    const hasRecurringEvidence = includesAny(params.subjectAndSnippet, [
        /\b(renewal|renews|renewed|will renew|renew automatically|automatically|automatic payment|recurring)\b/i,
        /\b(odnowienie|odnawia si[e\u0119]|odnowiona|odnowiony|odnowiony|odnowi)\b/i,
        /\b(co\s+miesi[a\u0105]c|co miesiac|rocznie|monthly|yearly|annual|annually)\b/i,
    ]);
    const hasSubscriptionEvidence =
        !hasNegatedSubscriptionEvidence &&
        !hasCollaborationInviteEvidence &&
        includesAny(params.subjectAndSnippet, [
            /\b(subscription|membership|subskrypcja|subskrypcji|subskrypcj[e\u0119]|subskrypcj[a\u0105]|abonament|abonamentu|abonamentem)\b/i,
        ]);
    const hasPaidTierEvidence = includesAny(params.subjectAndSnippet, [
        /\b(premium lite|premium|pro|plus|standard|individual|family|team|business)\b/i,
    ]);
    const hasPaymentFailedEvidence = includesAny(params.subjectAndSnippet, [
        /\b(payment failed|problem with your .*payment|could not process your payment|update your payment method)\b/i,
        /\bproblem z (?:przetworzeniem )?p[\u0142l]atno[s\u015b]ci\b/i,
        /zaktualizuj metod[e\u0119] p[\u0142l]atno[s\u015b]ci/i,
        /\bnie uda[l\u0142]o si[e\u0119] pobra[c\u0107] p[\u0142l]atno[s\u015b]ci\b/i,
        /\bnie udalo sie pobrac platnosci\b/i,
    ]);
    const hasVerificationEvidence = includesAny(params.subjectAndSnippet, [
        /\b(verify your email|confirm your email|confirm email|email verification)\b/i,
        /potwierd[z\u017a]\s+sw[o\u00f3]j\s+adres\s+e-mail/i,
        /potwierd[z\u017a]\s+adres\s+e-mail/i,
        /potwierdzenia\s+adresu\s+e-mail/i,
    ]);
    const hasPasswordResetEvidence = /\b(password reset|reset your .*password)\b/i.test(
        params.subjectAndSnippet
    );
    const hasAccountSecurityCodeEvidence = hasAccountSecurityCodeSignal(
        params.subjectAndSnippet
    );
    const hasAccountSecurityEvidence =
        hasAccountSecurityCodeEvidence ||
        hasAccountSecurityLoginSignal(params.subjectAndSnippet) ||
        includesAny(params.subjectAndSnippet, [
            /\b(login code|sign-in code|new sign in|new sign-in|new login|security alert|account security)\b/i,
            /kod\s+logowania/i,
            /jednorazowy\s+kod/i,
            /nowe\s+logowanie/i,
        ]);
    const hasPromotionalTrialEvidence = hasPromotionalTrialSignal(
        params.subjectAndSnippet
    );
    const hasActiveTrialSubscriptionEvidence = hasActiveTrialSubscriptionSignal(
        params.subjectAndSnippet
    );
    const hasPaymentSetupEvidence = hasPaymentSetupSignal(params.subjectAndSnippet);
    const hasCancellationEvidence = hasCancellationSignal(params.subjectAndSnippet);
    const hasRefundEvidence = hasRefundSignal(params.subjectAndSnippet);
    const hasFreePlanEvidence = hasFreePlanSignal(params.subjectAndSnippet);
    const hasActiveRenewalPaymentEvidence = hasActiveRenewalPaymentSignal(
        params.subjectAndSnippet
    );
    const hasPaymentReceiptTrialChargeEvidence =
        hasPaymentReceiptTrialChargeSignal(params.subjectAndSnippet) ||
        hasReceiptEvidence ||
        hasInvoiceEvidence ||
        hasPaymentEvidence ||
        hasPaymentDueEvidence ||
        hasChargedEvidence ||
        hasTrialEvidence;
    const hasUnreadableEncodedEvidence = hasUnreadableEncodedEvidenceSignal(
        params.subjectAndSnippet
    );
    const hasRawHeaderSnippetEvidence = hasRawHeaderSnippetSignal(
        params.subjectAndSnippet
    );
    const hasSuspiciousSenderEvidence = isSuspiciousSenderForProvider(
        params.from,
        provider
    );
    const hasHighRiskProviderSuspiciousSenderEvidence =
        hasSuspiciousSenderEvidence &&
        isHighRiskProviderForSuspiciousSender(provider) &&
        (hasSuspiciousRedirectLinkSignal(params.subjectAndSnippet) ||
            hasRealExternalDomainMismatchEvidence(params.from, provider));

    return {
        provider,
        providerFromPaymentProcessor: paymentProcessorProvider,
        planName,
        billingChannel,
        providerCategory: providerEntry?.category,
        billingCycle,
        trialEndDateText,
        amountText,
        currency: detectCurrency(params.subjectAndSnippet),
        hasReceiptEvidence,
        hasInvoiceEvidence,
        hasPaymentEvidence,
        hasPaymentDueEvidence,
        hasChargedEvidence,
        hasRecurringEvidence,
        hasSubscriptionEvidence,
        hasTrialEvidence,
        hasPaidTierEvidence: hasPaidTierEvidence || Boolean(planName),
        hasBillingCycleEvidence: Boolean(billingCycle),
        hasPaymentFailedEvidence,
        hasPriceChangeEvidence,
        hasActiveSubscriberEvidence,
        hasBillingDateEvidence,
        hasTransportTicketEvidence,
        hasPhoneTopUpEvidence,
        hasMarketingIntermediaryEvidence,
        hasSubscriptionUpsellEvidence,
        hasCreditLoanMarketingEvidence,
        hasExpiredReactivationEvidence,
        hasMarketplaceBillingEvidence,
        hasTrustedSenderEvidence,
        hasOneTimePurchaseEvidence,
        hasOneTimeMarketplaceEcommerceEvidence,
        hasPaymentMethodOnlyEvidence,
        hasPublicStatutoryPaymentEvidence,
        hasFreeAppStorePurchaseEvidence,
        hasNewsletterRecommendationEvidence,
        hasAccountSecurityEvidence,
        hasAccountSecurityCodeEvidence,
        hasVerificationEvidence,
        hasPasswordResetEvidence,
        hasCancellationEvidence,
        hasRefundEvidence,
        hasFreePlanEvidence,
        hasMarketingEvidence,
        hasProgressReportEvidence,
        hasNegatedSubscriptionEvidence,
        hasNegatedBillingEvidence,
        hasPromotionalTrialEvidence,
        hasActiveTrialSubscriptionEvidence,
        hasPaymentSetupEvidence,
        hasRecurringBillEvidence,
        hasActiveRenewalPaymentEvidence,
        hasPaymentReceiptTrialChargeEvidence,
        hasUnreadableEncodedEvidence,
        hasRawHeaderSnippetEvidence,
        hasSuspiciousSenderEvidence,
        hasHighRiskProviderSuspiciousSenderEvidence,
        hasOnboardingOnlyEvidence,
        hasSubscriptionStartedEvidence,
        hasSubscriptionContinuationEvidence,
        hasAccountAdminUpdateEvidence,
        hasCollaborationInviteEvidence,
        hasPlanFeatureUpdateEvidence,
        hasReviewReplyEvidence,
        hasProductUpdateQuotaSecurityEvidence,
        hasProjectStatusUpdateEvidence,
        hasGeneratedContentReadyEvidence,
    };
}

function hasRealActiveBillingEvidence(signals: DetectionSignals) {
    const hasActivePriceChangeEvidence =
        signals.hasPaidTierEvidence &&
        ((signals.hasPriceChangeEvidence && signals.hasActiveSubscriberEvidence) ||
            (signals.hasPriceChangeEvidence &&
                (signals.hasBillingCycleEvidence || Boolean(signals.amountText))) ||
            (signals.hasActiveSubscriberEvidence && signals.hasBillingDateEvidence));

    return (
        signals.hasReceiptEvidence ||
        signals.hasInvoiceEvidence ||
        signals.hasPaymentEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasChargedEvidence ||
        signals.hasPaymentFailedEvidence ||
        signals.hasRecurringBillEvidence ||
        signals.hasActiveTrialSubscriptionEvidence ||
        signals.hasActiveRenewalPaymentEvidence ||
        signals.hasSubscriptionStartedEvidence ||
        signals.hasSubscriptionContinuationEvidence ||
        hasActivePriceChangeEvidence ||
        (signals.hasSubscriptionEvidence &&
            (signals.hasRecurringEvidence || signals.hasBillingCycleEvidence))
    );
}

function hasTrustedInvoicePaymentDueEvidence(signals: DetectionSignals) {
    return (
        (signals.hasReceiptEvidence || signals.hasInvoiceEvidence) &&
        (signals.hasPaymentDueEvidence ||
            signals.hasChargedEvidence ||
            signals.hasActiveRenewalPaymentEvidence ||
            Boolean(signals.amountText))
    );
}

function hasExplicitActiveBillingEvidence(signals: DetectionSignals) {
    const hasActivePriceChangeEvidence =
        signals.hasPaidTierEvidence &&
        signals.hasPriceChangeEvidence &&
        (signals.hasActiveSubscriberEvidence ||
            signals.hasBillingDateEvidence ||
            signals.hasBillingCycleEvidence ||
            Boolean(signals.amountText));

    return Boolean(
        signals.hasReceiptEvidence ||
            signals.hasInvoiceEvidence ||
            signals.hasPaymentDueEvidence ||
            (signals.hasPaymentEvidence &&
                (signals.hasSubscriptionEvidence ||
                    signals.hasRecurringEvidence ||
                    signals.hasBillingCycleEvidence)) ||
            signals.hasChargedEvidence ||
            signals.hasPaymentFailedEvidence ||
            signals.hasActiveRenewalPaymentEvidence ||
            signals.hasActiveTrialSubscriptionEvidence ||
            signals.hasSubscriptionStartedEvidence ||
            signals.hasSubscriptionContinuationEvidence ||
            hasActivePriceChangeEvidence ||
            (signals.hasActiveSubscriberEvidence &&
                (signals.hasBillingDateEvidence ||
                    signals.hasChargedEvidence ||
                    signals.hasPaymentEvidence))
    );
}

function classifyMessage(signals: DetectionSignals): MessageClassification {
    const positiveEvidence: string[] = [];
    const negativeEvidence: string[] = [];
    const trustEvidence: string[] = [];
    const riskEvidence: string[] = [];
    let messageType: MessageType = "unknown";

    if (signals.hasInvoiceEvidence || signals.hasPaymentDueEvidence) {
        messageType = "invoice";
        positiveEvidence.push("active billing invoice/payment due evidence");
    } else if (signals.hasPaymentEvidence || signals.hasChargedEvidence) {
        messageType = "payment_confirmation";
        positiveEvidence.push("payment confirmation/charged evidence");
    } else if (signals.hasPaymentFailedEvidence) {
        messageType = "payment_failed";
        positiveEvidence.push("payment failed evidence");
    } else if (signals.hasPriceChangeEvidence && signals.hasActiveSubscriberEvidence) {
        messageType = "active_price_change";
        positiveEvidence.push("active subscriber price change evidence");
    } else if (signals.hasSubscriptionContinuationEvidence) {
        messageType = "subscription_continuation";
        positiveEvidence.push("active subscription continuation/future charge evidence");
    } else if (
        signals.hasTrialEvidence &&
        (signals.hasActiveTrialSubscriptionEvidence ||
            signals.hasSubscriptionContinuationEvidence ||
            signals.hasActiveRenewalPaymentEvidence ||
            signals.hasChargedEvidence)
    ) {
        messageType = "trial_started_future_charge";
        positiveEvidence.push("trial started with future charge/auto-renew evidence");
    } else if (
        signals.hasSubscriptionStartedEvidence ||
        (signals.hasTrialEvidence && signals.hasActiveTrialSubscriptionEvidence)
    ) {
        messageType = "subscription_started";
        positiveEvidence.push("active subscription started evidence");
    } else if (signals.hasActiveSubscriberEvidence || signals.hasBillingDateEvidence) {
        messageType = "subscription_active";
        positiveEvidence.push("active subscription/billing date evidence");
    } else if (signals.hasSubscriptionEvidence && signals.hasRecurringEvidence) {
        messageType = "renewal_notice";
        positiveEvidence.push("subscription renewal evidence");
    } else if (signals.hasOnboardingOnlyEvidence) {
        messageType = "onboarding_only";
        positiveEvidence.push("product onboarding evidence without billing confirmation");
    }

    if (signals.hasCancellationEvidence) {
        messageType = "cancellation";
        negativeEvidence.push("cancellation confirmation evidence");
    } else if (signals.hasExpiredReactivationEvidence) {
        messageType = signals.hasMarketingEvidence
            ? "reactivation_marketing"
            : "expired_trial";
        negativeEvidence.push("expired trial/subscription reactivation evidence");
    } else if (signals.hasRefundEvidence) {
        messageType = "refund";
        negativeEvidence.push("refund evidence");
    } else if (signals.hasAccountSecurityEvidence) {
        messageType = "security_login";
        negativeEvidence.push("security/login/code evidence");
    } else if (
        signals.hasAccountAdminUpdateEvidence ||
        signals.hasCollaborationInviteEvidence ||
        signals.hasReviewReplyEvidence ||
        signals.hasProductUpdateQuotaSecurityEvidence ||
        signals.hasPlanFeatureUpdateEvidence
    ) {
        messageType = "security";
        negativeEvidence.push("account/admin/project update evidence without billing confirmation");
    } else if (
        (signals.hasOneTimePurchaseEvidence || signals.hasTransportTicketEvidence) &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        messageType = "one_time_purchase";
        negativeEvidence.push("one-time purchase/order/rental/ticket evidence");
    } else if (signals.hasNewsletterRecommendationEvidence) {
        messageType = "recommendation";
        negativeEvidence.push("newsletter/recommendation evidence");
    } else if (signals.hasMarketingEvidence && !hasExplicitActiveBillingEvidence(signals)) {
        messageType = "marketing_offer";
        negativeEvidence.push("marketing/offer evidence");
    }

    if (signals.provider) {
        trustEvidence.push(`provider detected: ${signals.provider}`);
    }

    if (signals.billingChannel) {
        trustEvidence.push(`billing channel: ${signals.billingChannel}`);
    }

    if (signals.hasTrustedSenderEvidence) {
        trustEvidence.push("sender trusted for provider");
    }

    if (signals.hasSuspiciousSenderEvidence) {
        riskEvidence.push("sender domain does not match detected provider");
    }

    if (signals.hasRawHeaderSnippetEvidence || signals.hasUnreadableEncodedEvidence) {
        riskEvidence.push("body is raw headers or unreadable encoded content");
    }

    if (signals.providerFromPaymentProcessor) {
        trustEvidence.push("trusted payment processor provider extraction");
    }

    const isFinalBlock =
        negativeEvidence.length > 0 &&
        [
            "cancellation",
            "expired_trial",
            "reactivation_marketing",
            "refund",
            "security_login",
            "one_time_purchase",
            "recommendation",
        ].includes(messageType) &&
        !(
            hasTrustedInvoicePaymentDueEvidence(signals) ||
            (signals.hasPaidTierEvidence &&
                (signals.hasInvoiceEvidence || signals.hasReceiptEvidence) &&
                (signals.hasSubscriptionEvidence ||
                    !["Google Play", "Prime Video", "Apple"].includes(
                        signals.provider ?? ""
                    )) &&
                Boolean(signals.provider)) ||
            signals.hasActiveRenewalPaymentEvidence ||
            (signals.hasMarketplaceBillingEvidence &&
                (signals.hasPaymentEvidence || signals.hasChargedEvidence) &&
                (signals.hasSubscriptionEvidence ||
                    signals.hasRecurringEvidence ||
                    signals.hasActiveTrialSubscriptionEvidence))
        );

    return {
        messageType,
        positiveEvidence,
        negativeEvidence,
        trustEvidence,
        riskEvidence,
        extractedProvider: signals.provider,
        category: signals.providerCategory,
        billingChannel: signals.billingChannel,
        marketplaceProvider:
            signals.billingChannel && signals.billingChannel !== "Payment Processor"
                ? signals.provider
                : undefined,
        merchant: signals.providerFromPaymentProcessor,
        amountText: signals.amountText,
        currency: signals.currency,
        billingCycle: signals.billingCycle,
        isTrial: signals.hasTrialEvidence || undefined,
        isFinalBlock,
        finalBlockReason: isFinalBlock ? negativeEvidence[0] : undefined,
    };
}

function isTrustedBillingContext(signals: DetectionSignals) {
    return Boolean(
        signals.hasTrustedSenderEvidence ||
            (signals.billingChannel && signals.billingChannel !== "Payment Processor") ||
            signals.providerFromPaymentProcessor ||
            signals.hasRecurringBillEvidence
    );
}

function hasActiveSubscriptionDecisionEvidence(signals: DetectionSignals) {
    return Boolean(
        signals.hasActiveSubscriberEvidence &&
            (signals.hasRecurringEvidence ||
                signals.hasBillingCycleEvidence ||
                signals.hasBillingDateEvidence ||
                Boolean(signals.amountText) ||
                signals.hasPriceChangeEvidence)
    );
}

function isCandidateByDecisionPolicy(
    signals: DetectionSignals,
    classification: MessageClassification,
    candidateFromPositiveEvidence: boolean,
    normalizedConfidence: number
) {
    if (classification.isFinalBlock) {
        return false;
    }

    if (
        (signals.hasMarketingIntermediaryEvidence ||
            signals.hasMarketingEvidence ||
            signals.hasCreditLoanMarketingEvidence) &&
        !hasRealActiveBillingEvidence(signals)
    ) {
        return false;
    }

    if (
        signals.hasSubscriptionUpsellEvidence &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        return false;
    }

    if (
        signals.hasFreeAppStorePurchaseEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasRecurringEvidence &&
        !signals.hasBillingCycleEvidence
    ) {
        return false;
    }

    if (
        signals.hasRawHeaderSnippetEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !hasStrongActiveBillingConfirmationSignal(
            `${classification.extractedProvider ?? ""} ${classification.billingChannel ?? ""}`
        )
    ) {
        return false;
    }

    if (
        signals.hasSuspiciousSenderEvidence &&
        !signals.hasMarketplaceBillingEvidence &&
        !signals.providerFromPaymentProcessor
    ) {
        return false;
    }

    if (
        hasTrustedInvoicePaymentDueEvidence(signals) &&
        (isTrustedBillingContext(signals) || signals.hasRecurringBillEvidence)
    ) {
        return true;
    }

    if (
        signals.hasPaidTierEvidence &&
        signals.hasInvoiceEvidence &&
        Boolean(signals.provider) &&
        isTrustedBillingContext(signals)
    ) {
        return true;
    }

    if (
        hasActiveSubscriptionDecisionEvidence(signals) &&
        isTrustedBillingContext(signals)
    ) {
        return true;
    }

    if (
        signals.hasRecurringBillEvidence &&
        (signals.hasInvoiceEvidence || signals.hasPaymentDueEvidence) &&
        (signals.amountText || signals.hasBillingCycleEvidence)
    ) {
        return true;
    }

    if (
        signals.hasMarketplaceBillingEvidence &&
        signals.billingChannel !== "Payment Processor" &&
        (signals.hasSubscriptionEvidence ||
            signals.hasReceiptEvidence ||
            signals.hasPaymentEvidence ||
            signals.hasChargedEvidence ||
            signals.hasRecurringEvidence) &&
        normalizedConfidence >= 0.45
    ) {
        return true;
    }

    return (
        candidateFromPositiveEvidence &&
        normalizedConfidence >= 0.45 &&
        (isTrustedBillingContext(signals) || normalizedConfidence >= 0.75)
    );
}

function hasStrongSubscriptionOrPaymentEvidence(signals: DetectionSignals) {
    return hasRealActiveBillingEvidence(signals) || signals.hasTrialEvidence;
}

function isCandidateFromPositiveEvidence(signals: DetectionSignals) {
    const hasProviderOrPlan = Boolean(signals.provider || signals.planName);
    const hasReceiptInvoiceOrPayment =
        signals.hasReceiptEvidence ||
        signals.hasInvoiceEvidence ||
        signals.hasPaymentEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasChargedEvidence;
    const hasActivePriceChangeEvidence =
        signals.hasPaidTierEvidence &&
        ((signals.hasPriceChangeEvidence && signals.hasActiveSubscriberEvidence) ||
            (signals.hasPriceChangeEvidence &&
                (signals.hasBillingCycleEvidence || Boolean(signals.amountText))) ||
            (signals.hasActiveSubscriberEvidence && signals.hasBillingDateEvidence));

    return (
        (hasReceiptInvoiceOrPayment &&
            (hasProviderOrPlan || signals.hasSubscriptionEvidence)) ||
        (signals.hasSubscriptionEvidence &&
            (signals.hasRecurringEvidence ||
                signals.hasPaymentEvidence ||
                signals.hasChargedEvidence ||
                signals.hasBillingCycleEvidence)) ||
        (signals.hasTrialEvidence && hasProviderOrPlan) ||
        ((signals.hasSubscriptionStartedEvidence ||
            signals.hasSubscriptionContinuationEvidence) &&
            hasProviderOrPlan) ||
        (signals.hasPaymentFailedEvidence &&
            (Boolean(signals.provider) || signals.hasSubscriptionEvidence)) ||
        (signals.hasRecurringBillEvidence &&
            (Boolean(signals.provider) ||
                hasReceiptInvoiceOrPayment ||
                Boolean(signals.amountText) ||
                signals.hasBillingCycleEvidence)) ||
        (hasActivePriceChangeEvidence && Boolean(signals.provider)) ||
        (signals.hasPaidTierEvidence &&
            Boolean(signals.provider) &&
            (hasReceiptInvoiceOrPayment ||
                signals.hasSubscriptionEvidence ||
                signals.hasRecurringEvidence))
    );
}

function collectEvidenceTiers(signals: DetectionSignals) {
    const tiers: string[] = [];

    if (
        signals.hasPaymentEvidence ||
        signals.hasChargedEvidence ||
        signals.hasActiveRenewalPaymentEvidence ||
        signals.hasActiveTrialSubscriptionEvidence ||
        signals.hasSubscriptionStartedEvidence ||
        signals.hasSubscriptionContinuationEvidence ||
        (signals.hasSubscriptionEvidence &&
            (signals.hasRecurringEvidence ||
                signals.hasBillingDateEvidence ||
                signals.hasBillingCycleEvidence))
    ) {
        tiers.push("Tier A active subscription/payment evidence");
    }

    if (
        signals.hasInvoiceEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasRecurringBillEvidence
    ) {
        tiers.push("Tier B invoice/recurring bill evidence");
    }

    if (
        signals.hasPriceChangeEvidence &&
        (signals.hasActiveSubscriberEvidence ||
            signals.hasBillingDateEvidence ||
            signals.hasBillingCycleEvidence ||
            Boolean(signals.amountText))
    ) {
        tiers.push("Tier C active price-change evidence");
    }

    if (
        signals.billingChannel === "Payment Processor" &&
        signals.providerFromPaymentProcessor &&
        Boolean(signals.amountText) &&
        (signals.hasSubscriptionEvidence ||
            signals.hasRecurringEvidence ||
            signals.hasInvoiceEvidence ||
            signals.hasPaymentDueEvidence ||
            signals.hasRecurringBillEvidence)
    ) {
        tiers.push("Tier D payment processor merchant billing evidence");
    }

    if (
        signals.hasMarketplaceBillingEvidence &&
        signals.billingChannel &&
        signals.billingChannel !== "Payment Processor" &&
        (signals.hasSubscriptionEvidence ||
            signals.hasRecurringEvidence ||
            signals.hasPaymentEvidence ||
            signals.hasChargedEvidence ||
            signals.hasActiveTrialSubscriptionEvidence)
    ) {
        tiers.push("Tier D marketplace billing evidence");
    }

    return tiers;
}

export function debugAnalyzeMessageForSubscription(
    input: EmailDetectionInput
): EmailDetectionDebugDetails {
    const from = cleanText(input.from);
    const subject = cleanText(input.subject);
    const snippet = cleanText(input.snippet);
    const combinedText = `${from} ${subject} ${snippet}`;
    const subjectAndSnippet = `${subject} ${snippet}`;
    const signals = collectDetectionSignals({
        from,
        subjectAndSnippet,
        combinedText,
    });
    const classification = classifyMessage(signals);
    const analysis = analyzeMessageForSubscription(input);

    return {
        messageType: classification.messageType,
        provider: analysis.detected.provider ?? classification.extractedProvider,
        name: analysis.detected.name,
        category: classification.category,
        billingChannel: classification.billingChannel,
        marketplaceProvider: classification.marketplaceProvider,
        merchant: classification.merchant,
        amountText: analysis.detected.amountText ?? classification.amountText,
        currency: analysis.detected.currency ?? classification.currency,
        billingCycle: analysis.detected.billingCycle ?? classification.billingCycle,
        isTrial: analysis.detected.isTrial ?? classification.isTrial,
        positiveEvidence: classification.positiveEvidence,
        negativeEvidence: classification.negativeEvidence,
        trustEvidence: classification.trustEvidence,
        riskEvidence: classification.riskEvidence,
        evidenceTiers: collectEvidenceTiers(signals),
        finalDecision: analysis.isCandidate ? "candidate" : "rejected",
        finalBlockReason: classification.finalBlockReason,
    };
}

export function analyzeMessageForSubscription(
    input: EmailDetectionInput
): EmailDetectionResult {
    const from = cleanText(input.from);
    const subject = cleanText(input.subject);
    const snippet = cleanText(input.snippet);
    const combinedText = `${from} ${subject} ${snippet}`;
    const subjectAndSnippet = `${subject} ${snippet}`;
    const detected: EmailDetectionResult["detected"] = {};
    const reasons: string[] = [];
    const signals = collectDetectionSignals({
        from,
        subjectAndSnippet,
        combinedText,
    });
    const classification = classifyMessage(signals);
    let confidence = 0;

    if (signals.provider) {
        confidence += 0.25;
        reasons.push(`+0.25 known provider: ${signals.provider}`);
        detected.provider = signals.provider;
        detected.name = signals.provider;
    }

    if (signals.providerFromPaymentProcessor) {
        reasons.push(
            `+provider from payment processor: ${signals.providerFromPaymentProcessor}`
        );
    }

    if (classification.billingChannel) {
        reasons.push(`+ marketplace billing channel: ${classification.billingChannel}`);
    }

    if (classification.messageType !== "unknown") {
        reasons.push(`+ message type: ${classification.messageType}`);
    }

    for (const evidenceTier of collectEvidenceTiers(signals)) {
        reasons.push(`+ ${evidenceTier}`);
    }

    if (signals.planName) {
        detected.name = signals.planName;
    }

    if (
        classification.billingChannel === "Prime Video" &&
        signals.provider &&
        signals.provider !== "Prime Video" &&
        signals.provider !== "Amazon"
    ) {
        detected.name = `${signals.provider} on Prime Video`;
    }

    if (signals.hasReceiptEvidence || signals.hasInvoiceEvidence) {
        confidence += 0.25;
        reasons.push("+0.25 receipt/invoice evidence");
    }

    if (
        signals.hasPaymentEvidence ||
        signals.hasPaymentDueEvidence ||
        signals.hasChargedEvidence
    ) {
        confidence += 0.25;
        reasons.push("+0.25 payment/charged evidence");
    }

    if (signals.hasSubscriptionEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 subscription evidence");
    }

    if (signals.hasTrialEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 trial evidence");
        detected.isTrial = true;
    }

    if (signals.hasPaidTierEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 paid plan tier evidence");
    }

    if (signals.hasRecurringEvidence) {
        confidence += 0.15;
        reasons.push("+0.15 recurring/renewal evidence");
    }

    if (signals.hasRecurringBillEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 recurring bill evidence");
    }

    if (signals.hasBillingCycleEvidence) {
        confidence += 0.1;
        reasons.push("+0.10 billing cycle signal");
        detected.billingCycle = signals.billingCycle;
    }

    if (signals.hasPaymentFailedEvidence) {
        confidence += 0.15;
        reasons.push("+0.15 payment failed evidence");
    }

    if (signals.hasPriceChangeEvidence) {
        confidence += 0.15;
        reasons.push("+0.15 price change evidence");
    }

    if (signals.hasActiveSubscriberEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 active subscriber evidence");
    }

    if (signals.hasSubscriptionStartedEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 subscription started evidence");
    }

    if (signals.hasSubscriptionContinuationEvidence) {
        confidence += 0.2;
        reasons.push("+0.20 subscription continuation/future charge evidence");
    }

    if (signals.hasBillingDateEvidence) {
        confidence += 0.1;
        reasons.push("+0.10 billing date evidence");
    }

    if (signals.trialEndDateText) {
        confidence += 0.15;
        reasons.push("+0.15 trial end date detected");
        detected.trialEndDateText = signals.trialEndDateText;
        detected.isTrial = true;
    }

    if (signals.amountText) {
        confidence += 0.15;
        reasons.push("+0.15 amount/currency detected");
        detected.amountText = signals.amountText;
        detected.currency = detectCurrency(signals.amountText);
    }

    if (
        includesAny(subjectAndSnippet, [
            /\b(welcome to|thanks for joining|your account is ready|start using|you're all set|you\u2019re all set|witamy|konto gotowe|rozpocznij korzystanie)\b/i,
        ]) &&
        signals.provider &&
        signals.providerCategory !== "payment_processor"
    ) {
        confidence += 0.15;
        reasons.push("+0.15 known provider onboarding signal");
    }

    if (signals.hasProductUpdateQuotaSecurityEvidence) {
        confidence -= 0.5;
        reasons.push("-0.50 product update/quota/security signal");
    }

    if (signals.hasAccountAdminUpdateEvidence) {
        const penalty = hasRealActiveBillingEvidence(signals) ? 0.25 : 0.75;
        confidence -= penalty;
        reasons.push(`-${penalty.toFixed(2)} account/legal/admin update signal`);
    }

    if (signals.hasCollaborationInviteEvidence) {
        confidence -= 0.75;
        reasons.push("-0.75 collaboration/project invitation signal");
    }

    if (signals.hasReviewReplyEvidence) {
        confidence -= 0.75;
        reasons.push("-0.75 review reply signal");
    }

    if (
        signals.hasPlanFeatureUpdateEvidence &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        confidence -= 0.65;
        reasons.push("-0.65 plan feature/update without active billing evidence");
    }

    if (signals.hasNegatedSubscriptionEvidence) {
        confidence -= 0.35;
        reasons.push("-0.35 negated subscription signal");
    }

    if (signals.hasNegatedBillingEvidence) {
        confidence -= 0.35;
        reasons.push("-0.35 negated billing/payment signal");
    }

    if (
        signals.hasAccountSecurityEvidence ||
        signals.hasVerificationEvidence ||
        signals.hasPasswordResetEvidence
    ) {
        const penalty = hasStrongSubscriptionOrPaymentEvidence(signals) ? 0.25 : 0.6;
        confidence -= penalty;
        reasons.push(`-${penalty.toFixed(2)} account/security signal`);
    }

    if (signals.hasCancellationEvidence && !signals.hasActiveRenewalPaymentEvidence) {
        confidence -= 0.6;
        reasons.push("-0.60 cancellation signal");
    }

    if (signals.hasRefundEvidence && !signals.hasActiveRenewalPaymentEvidence) {
        confidence -= 0.6;
        reasons.push("-0.60 refund signal");
    }

    if (
        signals.hasFreePlanEvidence &&
        !signals.hasPaymentReceiptTrialChargeEvidence
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 free plan signal");
    }

    if (
        signals.hasPromotionalTrialEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasChargedEvidence
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 promotional trial signal");
    }

    if (
        signals.hasPaymentSetupEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasActiveRenewalPaymentEvidence
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 payment setup signal");
    }

    if (
        /\bwelcome to google payments\b/i.test(subjectAndSnippet) &&
        !hasStrongSubscriptionOrPaymentEvidence(signals)
    ) {
        confidence -= 0.3;
        reasons.push("-0.30 Google Payments welcome without subscription signal");
    }

    if (
        signals.hasMarketingEvidence &&
        !hasRealActiveBillingEvidence(signals)
    ) {
        confidence -= 0.2;
        reasons.push("-0.20 marketing/upsell signal without active billing evidence");
    }

    if (
        signals.hasSubscriptionUpsellEvidence &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        confidence -= 0.7;
        reasons.push("-0.70 subscription marketing/upsell without active billing evidence");
    }

    if (signals.hasUnreadableEncodedEvidence && !hasRealActiveBillingEvidence(signals)) {
        confidence -= 0.35;
        reasons.push("-0.35 unreadable encoded/raw message signal");
    }

    if (
        signals.hasRawHeaderSnippetEvidence &&
        !hasStrongActiveBillingConfirmationSignal(subjectAndSnippet)
    ) {
        confidence -= 0.55;
        reasons.push("-0.55 raw header snippet without strong billing confirmation");
    }

    if (signals.hasSuspiciousSenderEvidence) {
        const penalty =
            signals.hasHighRiskProviderSuspiciousSenderEvidence
                ? 1
                : signals.hasUnreadableEncodedEvidence || signals.hasPaymentFailedEvidence
                ? 0.5
                : 0.25;
        confidence -= penalty;
        reasons.push(
            `-${penalty.toFixed(2)} suspicious sender domain for detected provider`
        );
    }

    if (
        signals.hasProgressReportEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasPaymentDueEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasPaymentFailedEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasTrialEvidence &&
        !hasRealActiveBillingEvidence(signals)
    ) {
        confidence -= 0.25;
        reasons.push("-0.25 progress report without billing signal");
    }

    if (
        signals.hasTransportTicketEvidence &&
        !(signals.hasInvoiceEvidence && signals.hasRecurringBillEvidence)
    ) {
        confidence -= 0.6;
        reasons.push("-0.60 transport ticket/pass purchase signal");
    }

    if (signals.hasPhoneTopUpEvidence) {
        confidence -= 0.6;
        reasons.push("-0.60 phone top-up purchase signal");
    }

    if (
        (signals.hasNewsletterRecommendationEvidence ||
            signals.hasOneTimePurchaseEvidence ||
            signals.hasOneTimeMarketplaceEcommerceEvidence) &&
        !hasRealActiveBillingEvidence(signals)
    ) {
        confidence -= 0.5;
        reasons.push("-0.50 non-subscription newsletter/order signal");
    }

    if (
        signals.hasOneTimePurchaseEvidence &&
        !(
            signals.hasPaidTierEvidence &&
            (signals.hasInvoiceEvidence || signals.hasReceiptEvidence) &&
            (signals.hasSubscriptionEvidence ||
                !["Google Play", "Prime Video", "Apple"].includes(
                    signals.provider ?? ""
                )) &&
            signals.provider
        ) &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasRecurringEvidence &&
        !signals.hasPaymentDueEvidence &&
        !signals.hasRecurringBillEvidence
    ) {
        confidence -= 0.7;
        reasons.push("-0.70 one-time purchase/order without subscription signal");
    }

    if (
        signals.hasOneTimeMarketplaceEcommerceEvidence &&
        !(
            signals.provider &&
            signals.hasPaidTierEvidence &&
            (signals.hasInvoiceEvidence || signals.hasReceiptEvidence) &&
            !includesAny(subjectAndSnippet, [
                /\bdlc\b/i,
                /\bgame\b/i,
                /\bmovie rental\b/i,
                /\brental\b/i,
                /wypo[z\u017c]yczenia/i,
                /wypozyczenia/i,
            ])
        ) &&
        !signals.hasActiveRenewalPaymentEvidence &&
        !signals.hasBillingCycleEvidence &&
        !signals.hasRecurringEvidence &&
        !signals.hasSubscriptionContinuationEvidence &&
        !signals.hasSubscriptionStartedEvidence
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 one-time marketplace/ecommerce purchase signal");
    }

    if (
        signals.hasPaymentMethodOnlyEvidence &&
        !signals.providerFromPaymentProcessor &&
        !signals.hasActiveRenewalPaymentEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasRecurringEvidence
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 payment method only without subscription merchant");
    }

    if (signals.hasPublicStatutoryPaymentEvidence) {
        confidence -= 0.8;
        reasons.push("-0.80 public/statutory payment reminder signal");
    }

    if (
        signals.hasFreeAppStorePurchaseEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasRecurringEvidence &&
        !signals.hasBillingCycleEvidence
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 free app/store purchase without subscription billing");
    }

    if (
        signals.hasMarketingIntermediaryEvidence &&
        !hasTrustedInvoicePaymentDueEvidence(signals)
    ) {
        confidence -= 0.7;
        reasons.push("-0.70 marketing intermediary signal without active billing evidence");
    }

    if (
        signals.hasCreditLoanMarketingEvidence &&
        (signals.hasMarketingEvidence ||
            signals.hasMarketingIntermediaryEvidence ||
            !hasTrustedInvoicePaymentDueEvidence(signals))
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 loan/credit marketing signal");
    }

    if (
        signals.hasExpiredReactivationEvidence &&
        !signals.hasActiveRenewalPaymentEvidence
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 expired trial/subscription reactivation signal");
    }

    if (
        (signals.providerCategory === "payment_processor" ||
            signals.billingChannel === "Payment Processor") &&
        signals.billingChannel === "Payment Processor" &&
        !signals.provider &&
        !signals.providerFromPaymentProcessor
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 payment processor without merchant/subscription context");
    }

    if (
        signals.hasOnboardingOnlyEvidence &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        confidence -= 0.7;
        reasons.push("-0.70 onboarding-only message without billing evidence");
    }

    if (
        signals.hasProjectStatusUpdateEvidence &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 project/account status update without billing evidence");
    }

    if (
        signals.hasGeneratedContentReadyEvidence &&
        !hasExplicitActiveBillingEvidence(signals)
    ) {
        confidence -= 0.8;
        reasons.push("-0.80 generated content ready message without billing evidence");
    }

    const normalizedConfidence = Math.max(0, Math.min(1, confidence));
    const isBlockedAccountMessage =
        (signals.hasAccountSecurityEvidence ||
            signals.hasVerificationEvidence ||
            signals.hasPasswordResetEvidence) &&
        !hasStrongSubscriptionOrPaymentEvidence(signals);
    const isBlockedAccountSecurityCodeMessage =
        signals.hasAccountSecurityCodeEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedNegatedSubscriptionMessage =
        signals.hasNegatedSubscriptionEvidence &&
        !signals.hasPaymentReceiptTrialChargeEvidence;
    const isBlockedNegatedBillingMessage =
        signals.hasNegatedBillingEvidence &&
        !signals.amountText &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveRenewalPaymentEvidence &&
        !signals.hasPaymentFailedEvidence;
    const isBlockedCanceledSubscriptionMessage =
        signals.hasCancellationEvidence && !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedRefundMessage =
        signals.hasRefundEvidence && !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedFreePlanMessage =
        signals.hasFreePlanEvidence && !signals.hasPaymentReceiptTrialChargeEvidence;
    const isBlockedMarketingMessage =
        signals.hasMarketingEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedSubscriptionUpsellMessage =
        signals.hasSubscriptionUpsellEvidence &&
        !hasExplicitActiveBillingEvidence(signals);
    const isBlockedMarketingNegatedMessage =
        signals.hasMarketingEvidence && signals.hasNegatedSubscriptionEvidence;
    const isBlockedPromotionalTrialMessage =
        signals.hasPromotionalTrialEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasChargedEvidence;
    const isBlockedPaymentSetupMessage =
        signals.hasPaymentSetupEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasActiveTrialSubscriptionEvidence &&
        !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedUnreadableEncodedMessage =
        signals.hasUnreadableEncodedEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedSuspiciousSenderMessage =
        signals.hasSuspiciousSenderEvidence &&
        (signals.hasHighRiskProviderSuspiciousSenderEvidence ||
            signals.hasUnreadableEncodedEvidence ||
            signals.hasPaymentFailedEvidence ||
            !hasRealActiveBillingEvidence(signals));
    const isBlockedProgressReportMessage =
        signals.hasProgressReportEvidence &&
        !signals.hasReceiptEvidence &&
        !signals.hasInvoiceEvidence &&
        !signals.hasPaymentEvidence &&
        !signals.hasPaymentDueEvidence &&
        !signals.hasChargedEvidence &&
        !signals.hasPaymentFailedEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasTrialEvidence &&
        !hasRealActiveBillingEvidence(signals);
    const isBlockedTransportTicketMessage =
        signals.hasTransportTicketEvidence &&
        !(signals.hasInvoiceEvidence && signals.hasRecurringBillEvidence);
    const isBlockedPhoneTopUpMessage = signals.hasPhoneTopUpEvidence;
    const isBlockedNewsletterRecommendationMessage =
        signals.hasNewsletterRecommendationEvidence &&
        !hasRealActiveBillingEvidence(signals);
    const hasExplicitOneTimeStoreOrderEvidence = includesAny(subjectAndSnippet, [
        /\bone-time purchase\b/i,
        /\bone-time app purchase\b/i,
        /\brental\b/i,
        /zam[o\u00f3]wienie/i,
        /zamowienie/i,
        /\border number\b/i,
        /\border confirmation\b/i,
        /zam[oó]wienie numer/i,
        /zamowienie numer/i,
        /dotyczy zam[oó]wienia/i,
        /dotyczy zamowienia/i,
        /przekazane do realizacji/i,
        /zosta[lł]o wys[lł]ane/i,
    ]);
    const isBlockedOneTimePurchaseMessage =
        (signals.hasOneTimePurchaseEvidence ||
            signals.hasOneTimeMarketplaceEcommerceEvidence) &&
        hasExplicitOneTimeStoreOrderEvidence &&
        !(
            signals.hasSubscriptionEvidence &&
            !includesAny(subjectAndSnippet, [
                /\bone-time purchase\b/i,
                /\bone-time app purchase\b/i,
                /\brental\b/i,
            ])
        );
    const isBlockedOneTimeMarketplaceEcommerceMessage =
        signals.hasOneTimeMarketplaceEcommerceEvidence &&
        !(
            signals.provider &&
            signals.hasPaidTierEvidence &&
            (signals.hasInvoiceEvidence || signals.hasReceiptEvidence) &&
            !includesAny(subjectAndSnippet, [
                /\bdlc\b/i,
                /\bgame\b/i,
                /\bmovie rental\b/i,
                /\brental\b/i,
                /wypo[z\u017c]yczenia/i,
                /wypozyczenia/i,
            ])
        ) &&
        !signals.hasActiveRenewalPaymentEvidence &&
        !signals.hasBillingCycleEvidence &&
        !signals.hasRecurringEvidence &&
        !signals.hasSubscriptionContinuationEvidence &&
        !signals.hasSubscriptionStartedEvidence;
    const isBlockedFreeAppStorePurchaseMessage =
        signals.hasFreeAppStorePurchaseEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasRecurringEvidence &&
        !signals.hasBillingCycleEvidence;
    const isBlockedPaymentMethodOnlyMessage =
        signals.hasPaymentMethodOnlyEvidence &&
        !signals.providerFromPaymentProcessor &&
        !signals.hasActiveRenewalPaymentEvidence &&
        !signals.hasSubscriptionEvidence &&
        !signals.hasRecurringEvidence;
    const isBlockedPublicStatutoryPaymentMessage =
        signals.hasPublicStatutoryPaymentEvidence;
    const isBlockedMarketingIntermediaryMessage =
        signals.hasMarketingIntermediaryEvidence &&
        !hasTrustedInvoicePaymentDueEvidence(signals);
    const isBlockedCreditLoanMarketingMessage =
        signals.hasCreditLoanMarketingEvidence &&
        (signals.hasMarketingEvidence ||
            signals.hasMarketingIntermediaryEvidence ||
            !hasTrustedInvoicePaymentDueEvidence(signals));
    const isBlockedExpiredReactivationMessage =
        signals.hasExpiredReactivationEvidence &&
        !signals.hasActiveRenewalPaymentEvidence;
    const isBlockedRawHeaderSnippetMessage =
        signals.hasRawHeaderSnippetEvidence &&
        !hasStrongActiveBillingConfirmationSignal(subjectAndSnippet);
    const isBlockedPaymentProcessorWithoutMerchantMessage =
        (signals.providerCategory === "payment_processor" ||
            signals.billingChannel === "Payment Processor") &&
        signals.billingChannel === "Payment Processor" &&
        !signals.provider &&
        !signals.providerFromPaymentProcessor;
    const isBlockedOnboardingOnlyMessage =
        signals.hasOnboardingOnlyEvidence &&
        !hasExplicitActiveBillingEvidence(signals);
    const isBlockedAccountAdminUpdateMessage =
        signals.hasAccountAdminUpdateEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedCollaborationInviteMessage =
        signals.hasCollaborationInviteEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedPlanFeatureUpdateMessage =
        signals.hasPlanFeatureUpdateEvidence &&
        !hasExplicitActiveBillingEvidence(signals);
    const isBlockedReviewReplyMessage =
        signals.hasReviewReplyEvidence && !hasRealActiveBillingEvidence(signals);
    const isBlockedProductUpdateQuotaSecurityMessage =
        signals.hasProductUpdateQuotaSecurityEvidence &&
        !hasRealActiveBillingEvidence(signals);
    const isBlockedProjectStatusUpdateMessage =
        signals.hasProjectStatusUpdateEvidence &&
        !hasExplicitActiveBillingEvidence(signals);
    const isBlockedGeneratedContentReadyMessage =
        signals.hasGeneratedContentReadyEvidence &&
        !hasExplicitActiveBillingEvidence(signals);

    if (isBlockedAccountSecurityCodeMessage) {
        reasons.push("-blocked: account/security code message without billing signal");
    }

    if (isBlockedAccountMessage) {
        reasons.push("-blocked: account/security/login message without subscription signal");
    }

    if (isBlockedNegatedSubscriptionMessage) {
        reasons.push("-blocked: negated subscription message without payment signal");
    }

    if (isBlockedNegatedBillingMessage) {
        reasons.push("-blocked: negated billing/payment message");
    }

    if (isBlockedCanceledSubscriptionMessage) {
        reasons.push("-blocked: cancellation message");
    }

    if (isBlockedRefundMessage) {
        reasons.push("-blocked: refund message");
    }

    if (isBlockedFreePlanMessage) {
        reasons.push("-blocked: free plan without payment signal");
    }

    if (isBlockedMarketingMessage) {
        reasons.push("-blocked: marketing upsell without active billing evidence");
    }

    if (isBlockedSubscriptionUpsellMessage) {
        reasons.push("-blocked: subscription marketing/upsell without active billing evidence");
    }

    if (isBlockedMarketingNegatedMessage) {
        reasons.push("-blocked: marketing message with negated subscription signal");
    }

    if (isBlockedPromotionalTrialMessage) {
        reasons.push(
            "-blocked: promotional trial message without active subscription signal"
        );
    }

    if (isBlockedPaymentSetupMessage) {
        reasons.push("-blocked: payment setup message without subscription signal");
    }

    if (isBlockedUnreadableEncodedMessage) {
        reasons.push("-blocked: unreadable encoded message");
    }

    if (isBlockedSuspiciousSenderMessage) {
        reasons.push("-blocked: suspicious sender domain for detected provider");
    }

    if (isBlockedProgressReportMessage) {
        reasons.push("-blocked: progress report without billing signal");
    }

    if (isBlockedTransportTicketMessage) {
        reasons.push("-blocked: transport ticket/pass purchase");
    }

    if (isBlockedPhoneTopUpMessage) {
        reasons.push("-blocked: phone top-up purchase");
    }

    if (isBlockedNewsletterRecommendationMessage) {
        reasons.push("-blocked: recommendation/newsletter message");
    }

    if (isBlockedOneTimePurchaseMessage) {
        reasons.push("-blocked: one-time purchase/order message");
    }

    if (isBlockedOneTimeMarketplaceEcommerceMessage) {
        reasons.push(
            "-blocked: one-time marketplace/ecommerce purchase without subscription billing"
        );
    }

    if (isBlockedPaymentMethodOnlyMessage) {
        reasons.push("-blocked: payment method only without subscription merchant");
    }

    if (isBlockedPublicStatutoryPaymentMessage) {
        reasons.push("-blocked: public/statutory payment reminder");
    }

    if (isBlockedFreeAppStorePurchaseMessage) {
        reasons.push("-blocked: free app/store purchase without subscription billing");
    }

    if (isBlockedMarketingIntermediaryMessage) {
        reasons.push(
            "-blocked: marketing intermediary message without active billing evidence"
        );
    }

    if (isBlockedCreditLoanMarketingMessage) {
        reasons.push("-blocked: loan/credit marketing message");
    }

    if (isBlockedExpiredReactivationMessage) {
        reasons.push("-blocked: expired trial/subscription reactivation message");
    }

    if (isBlockedRawHeaderSnippetMessage) {
        reasons.push("-blocked: insufficient body evidence / raw header snippet");
    }

    if (isBlockedPaymentProcessorWithoutMerchantMessage) {
        reasons.push("-blocked: payment processor message without merchant/subscription context");
    }

    if (isBlockedOnboardingOnlyMessage) {
        reasons.push("-blocked: onboarding-only message without billing evidence");
    }

    if (isBlockedAccountAdminUpdateMessage) {
        reasons.push("-blocked: account/legal/admin update without billing evidence");
    }

    if (isBlockedCollaborationInviteMessage) {
        reasons.push("-blocked: collaboration/project invitation without billing evidence");
    }

    if (isBlockedPlanFeatureUpdateMessage) {
        reasons.push("-blocked: plan feature/update without active billing evidence");
    }

    if (isBlockedReviewReplyMessage) {
        reasons.push("-blocked: review reply without billing evidence");
    }

    if (isBlockedProductUpdateQuotaSecurityMessage) {
        reasons.push("-blocked: product update/quota/security message without billing evidence");
    }

    if (isBlockedProjectStatusUpdateMessage) {
        reasons.push("-blocked: project/account status update without billing evidence");
    }

    if (isBlockedGeneratedContentReadyMessage) {
        reasons.push("-blocked: generated content ready message without billing evidence");
    }

    const candidateFromPositiveEvidence = isCandidateFromPositiveEvidence(signals);
    const candidateByDecisionPolicy = isCandidateByDecisionPolicy(
        signals,
        classification,
        candidateFromPositiveEvidence,
        normalizedConfidence
    );
    const isBlockedMessage =
        isBlockedAccountMessage ||
        isBlockedNegatedSubscriptionMessage ||
        isBlockedNegatedBillingMessage ||
        isBlockedCanceledSubscriptionMessage ||
        isBlockedRefundMessage ||
        isBlockedFreePlanMessage ||
        isBlockedMarketingMessage ||
        isBlockedSubscriptionUpsellMessage ||
        isBlockedMarketingNegatedMessage ||
        isBlockedPromotionalTrialMessage ||
        isBlockedPaymentSetupMessage ||
        isBlockedUnreadableEncodedMessage ||
        isBlockedAccountSecurityCodeMessage ||
        isBlockedSuspiciousSenderMessage ||
        isBlockedProgressReportMessage ||
        isBlockedTransportTicketMessage ||
        isBlockedPhoneTopUpMessage ||
        isBlockedNewsletterRecommendationMessage ||
        isBlockedOneTimePurchaseMessage ||
        isBlockedOneTimeMarketplaceEcommerceMessage ||
        isBlockedPaymentMethodOnlyMessage ||
        isBlockedPublicStatutoryPaymentMessage ||
        isBlockedFreeAppStorePurchaseMessage ||
        isBlockedMarketingIntermediaryMessage ||
        isBlockedCreditLoanMarketingMessage ||
        isBlockedExpiredReactivationMessage ||
        isBlockedRawHeaderSnippetMessage ||
        isBlockedPaymentProcessorWithoutMerchantMessage ||
        isBlockedOnboardingOnlyMessage ||
        isBlockedAccountAdminUpdateMessage ||
        isBlockedCollaborationInviteMessage ||
        isBlockedPlanFeatureUpdateMessage ||
        isBlockedReviewReplyMessage ||
        isBlockedProductUpdateQuotaSecurityMessage ||
        isBlockedProjectStatusUpdateMessage ||
        isBlockedGeneratedContentReadyMessage;
    const finalConfidence = isBlockedMessage ? 0 : normalizedConfidence;

    return {
        isCandidate:
            !isBlockedMessage && candidateByDecisionPolicy,
        confidence: finalConfidence,
        reasons,
        detected,
    };
}
