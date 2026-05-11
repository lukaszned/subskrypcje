import { BillingCycleDetection, EmailDetectionInput } from "../services/email-detection.service";

export type EmailDetectionFixtureCase = {
    name: string;
    input: EmailDetectionInput;
    expected: {
        isCandidate: boolean;
        provider?: string;
        name?: string;
        isTrial?: boolean;
        billingCycle?: BillingCycleDetection;
        minConfidence?: number;
        maxConfidence?: number;
    };
};

export const emailDetectionFixtureCases: EmailDetectionFixtureCase[] = [
    {
        name: "YouTube Premium Lite PL",
        input: {
            id: "fixture-youtube-premium-lite-pl",
            from: "YouTube <noreply-purchases@youtube.com>",
            subject: "Witamy w Premium Lite",
            snippet:
                "Cześć User, Możesz już korzystać z subskrypcji Premium Lite. Będziemy obciążać Twoją formę płatności co miesiąc od 11 cze 2026. W każdej chwili możesz przeglądać lub anulować swoją subskrypcję.",
        },
        expected: {
            isCandidate: true,
            provider: "YouTube",
            name: "YouTube Premium Lite",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Google Play trial receipt EN",
        input: {
            id: "fixture-google-play-trial-receipt-en",
            from: "Google Play <googleplay-noreply@google.com>",
            subject: "Your Google Play Order Receipt from Nov 10, 2025",
            snippet:
                "Google Play Thank you You have signed up for a trial subscription from Google Commerce Limited on Google Play. Your trial will end on Nov 10, 2026. You will be automatically charged the subscription.",
        },
        expected: {
            isCandidate: true,
            provider: "Google Play",
            isTrial: true,
            minConfidence: 0.75,
        },
    },
    {
        name: "Canva Pro trial EN",
        input: {
            id: "fixture-canva-pro-trial-en",
            from: "Canva <no-reply@canva.com>",
            subject: "Your Canva Pro trial has started",
            snippet:
                "Welcome to Canva Pro. Your free trial has started and your subscription will renew monthly unless canceled before the trial ends.",
        },
        expected: {
            isCandidate: true,
            provider: "Canva",
            name: "Canva Pro",
            isTrial: true,
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Spotify Premium receipt EN",
        input: {
            id: "fixture-spotify-premium-receipt-en",
            from: "Spotify <no-reply@spotify.com>",
            subject: "Your Spotify Premium receipt",
            snippet:
                "Thanks for your payment. Your Spotify Premium Individual subscription is active and will renew monthly.",
        },
        expected: {
            isCandidate: true,
            provider: "Spotify",
            name: "Spotify Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Dropbox Plus billing EN",
        input: {
            id: "fixture-dropbox-plus-billing-en",
            from: "Dropbox <no-reply@dropbox.com>",
            subject: "Your Dropbox Plus billing receipt",
            snippet:
                "Your Dropbox Plus subscription has renewed. You have been charged for your monthly plan.",
        },
        expected: {
            isCandidate: true,
            provider: "Dropbox",
            name: "Dropbox Plus",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Spotify login code PL",
        input: {
            id: "fixture-spotify-login-code-pl",
            from: "Spotify <no-reply@alerts.spotify.com>",
            subject: "Twój kod logowania do Spotify: 188675",
            snippet:
                "Wpisz poniższy kod, aby zalogować się bez hasła. Ten jednorazowy kod jest aktywny przez 20 min.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Dropbox Basic welcome PL",
        input: {
            id: "fixture-dropbox-basic-welcome-pl",
            from: "Dropbox <no-reply@txn.dropbox.com>",
            subject: "Witamy w Dropbox, User! Masz oczekujące działania do wykonania",
            snippet:
                "Masz już taryfę Dropbox Basic, ale co dalej? Przygotowaliśmy listę działań, które pomogą Ci rozpocząć korzystanie.",
        },
        expected: {
            isCandidate: false,
            provider: "Dropbox",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Dropbox new sign in EN/PL",
        input: {
            id: "fixture-dropbox-new-sign-in-en-pl",
            from: "Dropbox <no-reply@dropbox.com>",
            subject: "Hi User, we noticed a new sign in to your Dropbox account",
            snippet:
                "A new przeglądarka internetowa just signed in to your Dropbox account. To help keep your account secure, let us know if this is you.",
        },
        expected: {
            isCandidate: false,
            provider: "Dropbox",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Disney MyDisney welcome PL",
        input: {
            id: "fixture-disney-mydisney-welcome-pl",
            from: "\"Disney+\" <disneyplus@trx.mail2.disneyplus.com>",
            subject: "Witaj w MyDisney",
            snippet: "Większa wygoda. Większa przyjemność.",
        },
        expected: {
            isCandidate: false,
            provider: "Disney",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Disney new login PL",
        input: {
            id: "fixture-disney-new-login-pl",
            from: "\"Disney+\" <disneyplus@trx.mail2.disneyplus.com>",
            subject: "Nowe logowanie",
            snippet: "Nowe logowanie",
        },
        expected: {
            isCandidate: false,
            provider: "Disney",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Netflix create account PL",
        input: {
            id: "fixture-netflix-create-account-pl",
            from: "Netflix <info@account.netflix.com>",
            subject: "To już prawie wszystko!",
            snippet: "Naciśnij link, aby utworzyć konto.",
        },
        expected: {
            isCandidate: false,
            provider: "Netflix",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Canva email verification PL",
        input: {
            id: "fixture-canva-email-verification-pl",
            from: "Canva <no-reply@account.canva.com>",
            subject: "Potwierdź swój nowy adres e-mail",
            snippet:
                "Wprowadź poniższy kod, aby potwierdzić swój adres e-mail dla Twojego konta.",
        },
        expected: {
            isCandidate: false,
            provider: "Canva",
            maxConfidence: 0.3,
        },
    },
    {
        name: "YouTube Music Premium EN",
        input: {
            id: "fixture-youtube-music-premium-en",
            from: "YouTube <noreply-purchases@youtube.com>",
            subject: "Welcome to YouTube Music Premium",
            snippet:
                "You can now use your YouTube Music Premium membership. Your payment method will be charged monthly unless you cancel.",
        },
        expected: {
            isCandidate: true,
            provider: "YouTube",
            name: "YouTube Music Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Google One paid plan EN",
        input: {
            id: "fixture-google-one-paid-plan-en",
            from: "Google One <googleone-noreply@google.com>",
            subject: "Welcome to your Google One plan",
            snippet:
                "Your Google One membership is active. You will be billed monthly for your storage plan.",
        },
        expected: {
            isCandidate: true,
            provider: "Google One",
            name: "Google One",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "ChatGPT Plus receipt EN",
        input: {
            id: "fixture-chatgpt-plus-receipt-en",
            from: "OpenAI <noreply@tm.openai.com>",
            subject: "Your ChatGPT Plus receipt",
            snippet:
                "Thank you for your payment. Your ChatGPT Plus subscription is active and will renew monthly.",
        },
        expected: {
            isCandidate: true,
            provider: "OpenAI",
            name: "ChatGPT Plus",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Apple subscription receipt EN",
        input: {
            id: "fixture-apple-subscription-receipt-en",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Your receipt from Apple",
            snippet:
                "You purchased a monthly subscription. Your Apple subscription will renew on Jun 11, 2026.",
        },
        expected: {
            isCandidate: true,
            provider: "Apple",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "PayPal automatic payment EN",
        input: {
            id: "fixture-paypal-automatic-payment-en",
            from: "PayPal <service@paypal.com>",
            subject: "You sent an automatic payment",
            snippet:
                "You sent an automatic payment to Netflix Services. This payment is part of your monthly subscription.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Netflix payment receipt EN",
        input: {
            id: "fixture-netflix-payment-receipt-en",
            from: "Netflix <info@account.netflix.com>",
            subject: "Your Netflix payment",
            snippet:
                "We received your payment for your Netflix monthly membership. Your plan will renew next month.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Disney Plus subscription EN",
        input: {
            id: "fixture-disney-plus-subscription-en",
            from: "Disney+ <disneyplus@trx.mail2.disneyplus.com>",
            subject: "Welcome to Disney+ Premium",
            snippet:
                "Your Disney+ Premium subscription is active. You will be billed monthly until you cancel.",
        },
        expected: {
            isCandidate: true,
            provider: "Disney",
            name: "Disney+ Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Microsoft 365 billing EN",
        input: {
            id: "fixture-microsoft-365-billing-en",
            from: "Microsoft <microsoft-noreply@microsoft.com>",
            subject: "Your Microsoft 365 subscription",
            snippet:
                "Your Microsoft 365 subscription renewed successfully. You have been charged for your yearly plan.",
        },
        expected: {
            isCandidate: true,
            provider: "Microsoft",
            name: "Microsoft 365",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Adobe Creative Cloud invoice EN",
        input: {
            id: "fixture-adobe-creative-cloud-invoice-en",
            from: "Adobe <message@adobe.com>",
            subject: "Your Adobe Creative Cloud invoice",
            snippet:
                "Your Adobe Creative Cloud membership has renewed and your payment method has been charged for the monthly plan.",
        },
        expected: {
            isCandidate: true,
            provider: "Adobe",
            name: "Adobe Creative Cloud",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "YouTube security alert EN",
        input: {
            id: "fixture-youtube-security-alert-en",
            from: "YouTube <no-reply@youtube.com>",
            subject: "New sign-in to your YouTube account",
            snippet:
                "We noticed a new sign-in to your Google Account. If this was not you, please review your account security.",
        },
        expected: {
            isCandidate: false,
            provider: "YouTube",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Google Payments welcome PL",
        input: {
            id: "fixture-google-payments-welcome-pl",
            from: "Google Payments <payments-noreply@google.com>",
            subject: "Witamy w Google Payments!",
            snippet:
                "Zalozono profil platnosci polaczony z Twoim kontem Google. Powodem utworzenia profilu moglo byc dokonanie zakupu w Google lub dodanie formy platnosci.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.3,
        },
    },
    {
        name: "Link verify email with OpenAI mention EN",
        input: {
            id: "fixture-link-verify-email-openai-mention-en",
            from: "Link <notifications@link.com>",
            subject: "Verify your email",
            snippet:
                "Pay faster at OpenAI Ireland Limited and everywhere Link is accepted.",
        },
        expected: {
            isCandidate: false,
            provider: "OpenAI",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Netflix password reset EN",
        input: {
            id: "fixture-netflix-password-reset-en",
            from: "Netflix <info@account.netflix.com>",
            subject: "Reset your Netflix password",
            snippet:
                "We received a request to reset your password. This link will expire soon.",
        },
        expected: {
            isCandidate: false,
            provider: "Netflix",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Apple ID security EN",
        input: {
            id: "fixture-apple-id-security-en",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Your Apple ID was used to sign in",
            snippet: "Your Apple ID was used to sign in to iCloud from a new device.",
        },
        expected: {
            isCandidate: false,
            provider: "Apple",
            maxConfidence: 0.3,
        },
    },
    {
        name: "Canva sale promo EN",
        input: {
            id: "fixture-canva-sale-promo-en",
            from: "Canva <no-reply@canva.com>",
            subject: "Limited time offer for Canva templates",
            snippet:
                "Get inspired with new templates and design ideas. This promotional email does not confirm any subscription.",
        },
        expected: {
            isCandidate: false,
            provider: "Canva",
            maxConfidence: 0.4,
        },
    },
    {
        name: "YouTube Premium Lite PL charged wording",
        input: {
            id: "fixture-youtube-premium-lite-pl-charged-wording",
            from: "YouTube <noreply-purchases@youtube.com>",
            subject: "Potwierdzenie subskrypcji Premium Lite",
            snippet:
                "Twoja subskrypcja Premium Lite jest aktywna. Obciazymy Twoja forme platnosci co miesiac. Subskrypcje mozesz anulowac w dowolnym momencie.",
        },
        expected: {
            isCandidate: true,
            provider: "YouTube",
            name: "YouTube Premium Lite",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Google Payments receipt for YouTube PL",
        input: {
            id: "fixture-google-payments-receipt-for-youtube-pl",
            from: "Google Payments <payments-noreply@google.com>",
            subject: "Potwierdzenie platnosci Google",
            snippet:
                "Potwierdzamy platnosc za YouTube Premium Lite. Kwota 17,99 PLN zostala pobrana z Twojej formy platnosci. Subskrypcja odnawia sie co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "YouTube",
            name: "YouTube Premium Lite",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "PayPal automatic payment PL",
        input: {
            id: "fixture-paypal-automatic-payment-pl",
            from: "PayPal <service@paypal.com>",
            subject: "Wyslano platnosc automatyczna",
            snippet:
                "Wyslano platnosc automatyczna do Spotify. Ta platnosc dotyczy miesiecznej subskrypcji Spotify Premium.",
        },
        expected: {
            isCandidate: true,
            provider: "Spotify",
            name: "Spotify Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Apple subscription receipt PL",
        input: {
            id: "fixture-apple-subscription-receipt-pl",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Potwierdzenie zakupu od Apple",
            snippet:
                "Dziekujemy za zakup. Subskrypcja odnawia sie co miesiac. Plan Apple iCloud+ zostanie odnowiony 11 cze 2026.",
        },
        expected: {
            isCandidate: true,
            provider: "Apple",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Netflix annual membership EN",
        input: {
            id: "fixture-netflix-annual-membership-en",
            from: "Netflix <info@account.netflix.com>",
            subject: "Your Netflix membership renewal",
            snippet:
                "Your Netflix membership has renewed. You have been charged for your annual plan and your subscription will renew next year.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Disney Plus monthly PL",
        input: {
            id: "fixture-disney-plus-monthly-pl",
            from: "Disney+ <disneyplus@trx.mail2.disneyplus.com>",
            subject: "Twoja subskrypcja Disney+ jest aktywna",
            snippet:
                "Subskrypcja Disney+ Premium jest aktywna. Bedziemy pobierac platnosc co miesiac do momentu anulowania.",
        },
        expected: {
            isCandidate: true,
            provider: "Disney",
            name: "Disney+ Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Canva Pro annual PL",
        input: {
            id: "fixture-canva-pro-annual-pl",
            from: "Canva <no-reply@canva.com>",
            subject: "Twoja subskrypcja Canva Pro zostala odnowiona",
            snippet:
                "Subskrypcja Canva Pro zostala odnowiona. Pobralismy platnosc za plan roczny.",
        },
        expected: {
            isCandidate: true,
            provider: "Canva",
            name: "Canva Pro",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Adobe annual billing PL",
        input: {
            id: "fixture-adobe-annual-billing-pl",
            from: "Adobe <message@adobe.com>",
            subject: "Faktura za Adobe Creative Cloud",
            snippet:
                "Twoja subskrypcja Adobe Creative Cloud zostala odnowiona. Pobralismy platnosc za roczny plan.",
        },
        expected: {
            isCandidate: true,
            provider: "Adobe",
            name: "Adobe Creative Cloud",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Microsoft 365 monthly PL",
        input: {
            id: "fixture-microsoft-365-monthly-pl",
            from: "Microsoft <microsoft-noreply@microsoft.com>",
            subject: "Odnowienie subskrypcji Microsoft 365",
            snippet:
                "Twoja subskrypcja Microsoft 365 zostala odnowiona. Obciazymy Twoja metode platnosci co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "Microsoft",
            name: "Microsoft 365",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Stripe invoice ChatGPT EN",
        input: {
            id: "fixture-stripe-invoice-chatgpt-en",
            from: "Stripe <receipts+acct@test.stripe.com>",
            subject: "Your receipt from OpenAI",
            snippet:
                "You paid OpenAI for ChatGPT Plus. Your monthly subscription is active and will renew automatically.",
        },
        expected: {
            isCandidate: true,
            provider: "OpenAI",
            name: "ChatGPT Plus",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Subscription cancelled EN",
        input: {
            id: "fixture-subscription-cancelled-en",
            from: "Spotify <no-reply@spotify.com>",
            subject: "Your Spotify Premium subscription was canceled",
            snippet:
                "Your Spotify Premium subscription has been canceled and you will not be charged again.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Refund issued EN",
        input: {
            id: "fixture-refund-issued-en",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Your refund from Apple",
            snippet:
                "A refund was issued for your monthly subscription. You will not be charged for this purchase.",
        },
        expected: {
            isCandidate: false,
            provider: "Apple",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Payment failed EN",
        input: {
            id: "fixture-payment-failed-en",
            from: "Netflix <info@account.netflix.com>",
            subject: "Problem with your Netflix payment",
            snippet:
                "We could not process your payment. Please update your payment method to keep your membership active.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            minConfidence: 0.45,
        },
    },
    {
        name: "Free plan welcome EN",
        input: {
            id: "fixture-free-plan-welcome-en",
            from: "Notion <team@mail.notion.so>",
            subject: "Welcome to Notion",
            snippet: "Your free plan is ready. Start using Notion with your team.",
        },
        expected: {
            isCandidate: false,
            provider: "Notion",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Newsletter with premium word EN",
        input: {
            id: "fixture-newsletter-with-premium-word-en",
            from: "Spotify <newsletter@spotify.com>",
            subject: "Premium tips and music news",
            snippet:
                "Discover premium playlists and music news. This newsletter does not confirm a subscription or payment.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            maxConfidence: 0.4,
        },
    },
    {
        name: "Spotify Premium Individual order confirmation PL",
        input: {
            id: "fixture-spotify-premium-individual-order-pl",
            from: "Spotify <no-reply@spotify.com>",
            subject: "Potwierdzenie zamówienia „Premium Individual”",
            snippet:
                "Dziękujemy za złożenie zamówienia. Potwierdzenie zakupu znajduje się w załączeniu. Zawartość koszyka Premium Individual Data 11 maja 2026 Numer faktury test-123 Brak podatku VAT.",
        },
        expected: {
            isCandidate: true,
            provider: "Spotify",
            name: "Spotify Premium",
            minConfidence: 0.55,
        },
    },
    {
        name: "PayU payment for Canva Pro PL",
        input: {
            id: "fixture-payu-payment-for-canva-pro-pl",
            from: "PayU <no-reply@payu.pl>",
            subject: "Potwierdzenie platnosci PayU",
            snippet:
                "Potwierdzamy platnosc za Canva Pro. Kwota 49,99 PLN zostala pobrana. Subskrypcja odnawia sie co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "Canva",
            name: "Canva Pro",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Przelewy24 payment for Netflix PL",
        input: {
            id: "fixture-przelewy24-payment-for-netflix-pl",
            from: "Przelewy24 <serwis@przelewy24.pl>",
            subject: "Potwierdzenie transakcji Przelewy24",
            snippet:
                "Transakcja dla Netflix zostala zakonczona pomyslnie. Platnosc dotyczy miesiecznej subskrypcji Netflix.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Autopay recurring payment Spotify PL",
        input: {
            id: "fixture-autopay-recurring-payment-spotify-pl",
            from: "Autopay <no-reply@autopay.pl>",
            subject: "Potwierdzenie platnosci cyklicznej",
            snippet:
                "Platnosc cykliczna za Spotify Premium zostala zrealizowana. Subskrypcja odnawia sie co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "Spotify",
            name: "Spotify Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Tpay payment for Disney PL",
        input: {
            id: "fixture-tpay-payment-for-disney-pl",
            from: "Tpay <powiadomienia@tpay.com>",
            subject: "Platnosc zakonczona",
            snippet:
                "Twoja platnosc za Disney+ Premium zostala zakonczona pomyslnie. Usluga jest rozliczana miesiecznie.",
        },
        expected: {
            isCandidate: true,
            provider: "Disney",
            name: "Disney+ Premium",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Stripe payment for Figma EN",
        input: {
            id: "fixture-stripe-payment-for-figma-en",
            from: "Stripe <receipts+acct@test.stripe.com>",
            subject: "Your receipt from Figma",
            snippet:
                "You paid Figma for your Professional plan. Your subscription will renew monthly.",
        },
        expected: {
            isCandidate: true,
            provider: "Figma",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Trial ending soon Canva EN",
        input: {
            id: "fixture-trial-ending-soon-canva-en",
            from: "Canva <no-reply@canva.com>",
            subject: "Your Canva Pro trial ends soon",
            snippet:
                "Your free trial for Canva Pro ends in 3 days. After that, your subscription will renew monthly unless canceled.",
        },
        expected: {
            isCandidate: true,
            provider: "Canva",
            name: "Canva Pro",
            isTrial: true,
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Trial ending soon YouTube PL",
        input: {
            id: "fixture-trial-ending-soon-youtube-pl",
            from: "YouTube <noreply-purchases@youtube.com>",
            subject: "Twoj okres probny YouTube Premium wkrotce sie konczy",
            snippet:
                "Okres probny YouTube Premium konczy sie za 3 dni. Po zakonczeniu okresu probnego bedziemy obciazac Twoja forme platnosci co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "YouTube",
            name: "YouTube Premium",
            isTrial: true,
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Price increase Netflix EN",
        input: {
            id: "fixture-price-increase-netflix-en",
            from: "Netflix <info@account.netflix.com>",
            subject: "Your Netflix price is changing",
            snippet:
                "Your monthly Netflix membership price will increase next month. Your subscription will continue unless you cancel.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            billingCycle: "monthly",
            minConfidence: 0.45,
        },
    },
    {
        name: "Price increase Spotify PL",
        input: {
            id: "fixture-price-increase-spotify-pl",
            from: "Spotify <no-reply@spotify.com>",
            subject: "Zmiana ceny Spotify Premium",
            snippet:
                "Cena Twojej subskrypcji Spotify Premium zmieni sie od nastepnego miesiaca. Subskrypcja bedzie odnawiana co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "Spotify",
            name: "Spotify Premium",
            billingCycle: "monthly",
            minConfidence: 0.45,
        },
    },
    {
        name: "Card declined OpenAI EN",
        input: {
            id: "fixture-card-declined-openai-en",
            from: "OpenAI <noreply@tm.openai.com>",
            subject: "Payment failed for ChatGPT Plus",
            snippet:
                "We could not process your payment for ChatGPT Plus. Please update your payment method to keep your subscription active.",
        },
        expected: {
            isCandidate: true,
            provider: "OpenAI",
            name: "ChatGPT Plus",
            minConfidence: 0.45,
        },
    },
    {
        name: "Payment reminder Microsoft PL",
        input: {
            id: "fixture-payment-reminder-microsoft-pl",
            from: "Microsoft <microsoft-noreply@microsoft.com>",
            subject: "Przypomnienie o platnosci Microsoft 365",
            snippet:
                "Nie udalo sie pobrac platnosci za Microsoft 365. Zaktualizuj metode platnosci, aby zachowac aktywna subskrypcje.",
        },
        expected: {
            isCandidate: true,
            provider: "Microsoft",
            name: "Microsoft 365",
            minConfidence: 0.45,
        },
    },
    {
        name: "PayU account created PL",
        input: {
            id: "fixture-payu-account-created-pl",
            from: "PayU <no-reply@payu.pl>",
            subject: "Witamy w PayU",
            snippet:
                "Twoje konto PayU zostalo utworzone. Mozesz teraz szybciej placic w sklepach internetowych.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.35,
        },
    },
    {
        name: "Przelewy24 payment profile PL",
        input: {
            id: "fixture-przelewy24-payment-profile-pl",
            from: "Przelewy24 <serwis@przelewy24.pl>",
            subject: "Utworzono profil platnosci",
            snippet:
                "Utworzono profil platnosci dla Twojego konta. Ta wiadomosc nie potwierdza zadnej subskrypcji.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.35,
        },
    },
    {
        name: "Autopay marketing PL",
        input: {
            id: "fixture-autopay-marketing-pl",
            from: "Autopay <newsletter@autopay.pl>",
            subject: "Nowe mozliwosci platnosci automatycznych",
            snippet:
                "Poznaj wygodne platnosci automatyczne i promocje naszych partnerow. To newsletter, nie potwierdzenie subskrypcji.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.35,
        },
    },
    {
        name: "Trial marketing without active trial EN",
        input: {
            id: "fixture-trial-marketing-without-active-trial-en",
            from: "Adobe <message@adobe.com>",
            subject: "Try Adobe Creative Cloud for free",
            snippet:
                "Start a free trial today and discover creative tools. This promotional email does not confirm an active subscription.",
        },
        expected: {
            isCandidate: false,
            provider: "Adobe",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Price promo without subscription EN",
        input: {
            id: "fixture-price-promo-without-subscription-en",
            from: "Netflix <info@account.netflix.com>",
            subject: "Special offer for Netflix",
            snippet:
                "See available plans and prices. This promotional email does not confirm a subscription or payment.",
        },
        expected: {
            isCandidate: false,
            provider: "Netflix",
            maxConfidence: 0.4,
        },
    },
    {
        name: "Payment method added Google PL",
        input: {
            id: "fixture-payment-method-added-google-pl",
            from: "Google Payments <payments-noreply@google.com>",
            subject: "Dodano forme platnosci",
            snippet:
                "Do Twojego konta Google dodano nowa forme platnosci. Ta wiadomosc nie oznacza rozpoczecia subskrypcji.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.35,
        },
    },
];
