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
        amountText?: string;
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
    {
        name: "Play monthly invoice PL",
        input: {
            id: "fixture-play-monthly-invoice-pl",
            from: "Play <faktury@play.pl>",
            subject: "Twoja faktura Play jest juz dostepna",
            snippet:
                "Wystawilismy fakture za uslugi telekomunikacyjne. Kwota do zaplaty: 79,99 PLN. Termin platnosci: 20 maja 2026. Abonament odnawia sie co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "Play",
            billingCycle: "monthly",
            amountText: "79,99 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "Play internet recurring payment PL",
        input: {
            id: "fixture-play-internet-recurring-payment-pl",
            from: "Play <ebok@play.pl>",
            subject: "Informacja o platnosci za internet",
            snippet:
                "Twoja platnosc cykliczna za internet domowy Play zostala zrealizowana. Usluga jest rozliczana miesiecznie.",
        },
        expected: {
            isCandidate: true,
            provider: "Play",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Orange internet invoice PL",
        input: {
            id: "fixture-orange-internet-invoice-pl",
            from: "Orange <faktury@orange.pl>",
            subject: "Faktura za uslugi Orange",
            snippet:
                "Twoja faktura za internet domowy i abonament jest gotowa. Kwota do zaplaty 89,99 PLN. Okres rozliczeniowy: maj 2026.",
        },
        expected: {
            isCandidate: true,
            provider: "Orange",
            billingCycle: "monthly",
            amountText: "89,99 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "T-Mobile monthly bill PL",
        input: {
            id: "fixture-t-mobile-monthly-bill-pl",
            from: "T-Mobile <faktura@t-mobile.pl>",
            subject: "Nowa faktura T-Mobile",
            snippet:
                "Wystawilismy fakture za abonament telefoniczny. Kwota do zaplaty: 65,00 PLN. Usluga rozliczana jest co miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "T-Mobile",
            billingCycle: "monthly",
            amountText: "65,00 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "Plus invoice PL",
        input: {
            id: "fixture-plus-invoice-pl",
            from: "Plus <ebok@plus.pl>",
            subject: "Faktura Plus",
            snippet:
                "Faktura za Twoj abonament jest dostepna. Kwota do zaplaty 59,99 PLN. Termin platnosci znajduje sie na fakturze.",
        },
        expected: {
            isCandidate: true,
            provider: "Plus",
            amountText: "59,99 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "Netia internet invoice PL",
        input: {
            id: "fixture-netia-internet-invoice-pl",
            from: "Netia <faktura@netia.pl>",
            subject: "Faktura za Internet Netia",
            snippet:
                "Twoja faktura za internet jest dostepna. Abonament miesieczny za usluge internetowa wynosi 69,90 PLN.",
        },
        expected: {
            isCandidate: true,
            provider: "Netia",
            billingCycle: "monthly",
            amountText: "69,90 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "Vectra internet bill PL",
        input: {
            id: "fixture-vectra-internet-bill-pl",
            from: "Vectra <ebok@vectra.pl>",
            subject: "Nowy rachunek za Internet",
            snippet:
                "Rachunek za internet i telewizje jest juz dostepny. Kwota do zaplaty: 99,99 PLN. Uslugi sa rozliczane miesiecznie.",
        },
        expected: {
            isCandidate: true,
            provider: "Vectra",
            billingCycle: "monthly",
            amountText: "99,99 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "UPC internet bill PL",
        input: {
            id: "fixture-upc-internet-bill-pl",
            from: "UPC <faktury@upc.pl>",
            subject: "Faktura UPC",
            snippet:
                "Faktura za pakiet internetowy zostala wystawiona. Kwota do zaplaty: 79,00 PLN. Okres rozliczeniowy obejmuje kolejny miesiac.",
        },
        expected: {
            isCandidate: true,
            provider: "UPC",
            billingCycle: "monthly",
            amountText: "79,00 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "Play marketing offer PL",
        input: {
            id: "fixture-play-marketing-offer-pl",
            from: "Play <newsletter@play.pl>",
            subject: "Oferta specjalna Play",
            snippet:
                "Poznaj nowa oferte telefonow i internetu. To wiadomosc marketingowa, nie faktura ani potwierdzenie platnosci.",
        },
        expected: {
            isCandidate: false,
            provider: "Play",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Orange login/security PL",
        input: {
            id: "fixture-orange-login-security-pl",
            from: "Orange <bezpieczenstwo@orange.pl>",
            subject: "Nowe logowanie do Moj Orange",
            snippet:
                "Wykrylismy nowe logowanie do Twojego konta. Jesli to nie Ty, zmien haslo.",
        },
        expected: {
            isCandidate: false,
            provider: "Orange",
            maxConfidence: 0.35,
        },
    },
    {
        name: "T-Mobile marketing PL",
        input: {
            id: "fixture-t-mobile-marketing-pl",
            from: "T-Mobile <newsletter@t-mobile.pl>",
            subject: "Promocja na smartfony",
            snippet:
                "Sprawdz najnowsze telefony w promocyjnych cenach. Ta wiadomosc nie jest faktura ani rachunkiem.",
        },
        expected: {
            isCandidate: false,
            provider: "T-Mobile",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Payment confirmation one-time shop PL",
        input: {
            id: "fixture-payment-confirmation-one-time-shop-pl",
            from: "PayU <no-reply@payu.pl>",
            subject: "Potwierdzenie platnosci",
            snippet:
                "Potwierdzamy platnosc za zamowienie w sklepie internetowym. Ta platnosc nie dotyczy subskrypcji ani abonamentu.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "OpenAI ChatGPT Plus new plan EN",
        input: {
            id: "fixture-openai-chatgpt-plus-new-plan-en",
            from: "OpenAI <noreply@tm.openai.com>",
            subject: "ChatGPT - Your new plan",
            snippet:
                "You've successfully subscribed to ChatGPT Plus. Your subscription will automatically renew monthly. You can cancel at any time.",
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
        name: "Play payment due invoice PL",
        input: {
            id: "fixture-play-payment-due-invoice-pl",
            from: "Play <playfinanse@play.pl>",
            subject: "Informacja o zblizajacym sie terminie platnosci",
            snippet:
                "Czy pamietasz, ze zbliza sie termin platnosci za fakture nr F/30006325/03/26? Termin mija 07/04/2026.",
        },
        expected: {
            isCandidate: true,
            provider: "Play",
            minConfidence: 0.55,
        },
    },
    {
        name: "Play marketing 5G offer PL",
        input: {
            id: "fixture-play-marketing-5g-offer-pl",
            from: "PLAY <play@promocjeplay.pl>",
            subject:
                "Mroz odpuszcza, a my rozgrzewamy oferte 5G. Abonament 5G ze smartfonem 5G od 60 zl/mies.",
            snippet:
                "Juz dzis skorzystaj z wyjatkowej oferty. Wybierz abonament 5G ze smartfonem 5G. Sprawdz szczegoly oferty. KUP NA PLAY.PL. Zgody marketingowe oraz e-faktura i terminowe platnosci daja rabaty.",
        },
        expected: {
            isCandidate: false,
            provider: "Play",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Spotify Premium Family upsell PL",
        input: {
            id: "fixture-spotify-premium-family-upsell-pl",
            from: "Spotify <no-reply@spotify.com>",
            subject: "Przejdz na Premium Family.",
            snippet:
                "Aktywuj Premium Family. Wyprobuj najlepszy plan dla ponad 3 osob mieszkajacych razem. Przejdz na Premium Family, aby zyskac nawet 6 oddzielnych kont Premium.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            name: "Spotify Premium",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Suspicious Amazon Prime Max encoded-like",
        input: {
            id: "fixture-suspicious-amazon-prime-max-encoded-like",
            from: "AmazonPrime <info@ermcas.com>",
            subject: "Podsumowanie Twojej subskrypcji Max Standard.",
            snippet:
                "PFRBQkxFIHN0eWxlPSJCQUNLR1JPVU5EOiAjZjVmNWY1IiBjZWxsU3BhY2luZz0wIGNlbGxQYWRkaW5nPTAgd2lkdGg9IjEwMCUi",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Suspicious Prime Max encoded-like",
        input: {
            id: "fixture-suspicious-prime-max-encoded-like",
            from: "PRlME <Noreply@ckcapital.co.uk>",
            subject: "Informacje o Twojej subskrypcji Max Standard",
            snippet:
                "PERJViBzdHlsZT0iTUFYLVdJRFRIOiA1MjBweDsgQkFDS0dST1VORDogI2ZmZmZmZjsgTUFSR0lO",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Suspicious Spotify payment failed wrong domain PL",
        input: {
            id: "fixture-suspicious-spotify-payment-failed-wrong-domain-pl",
            from: "Spotify <service@ezp.com.tw>",
            subject: "Problem z przetworzeniem platnosci",
            snippet:
                "Problem z platnoscia Spotify. Zaktualizuj metode platnosci, aby uniknac przerwy.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Canva account change code PL",
        input: {
            id: "fixture-canva-account-change-code-pl",
            from: "Canva <no-reply@account.canva.com>",
            subject: "Chcesz wprowadzic zmiany na swoim koncie Canva?",
            snippet:
                "Wprowadz ponizszy kod, aby wprowadzic zmiany na swoim koncie. Otrzymalismy od Ciebie prosbe o aktualizacje danych na Twoim koncie Canva. Twoj kod to: 604982. Ta wiadomosc nie ma charakteru marketingowego ani promocyjnego i nie zawiera linku do anulowania subskrypcji.",
        },
        expected: {
            isCandidate: false,
            provider: "Canva",
            maxConfidence: 0.35,
        },
    },
    {
        name: "Suspicious Amazon Prime wrong domain with SendGrid PL",
        input: {
            id: "fixture-suspicious-amazon-prime-wrong-domain-sendgrid-pl",
            from: "PRlME <Noreply@ckcapital.co.uk>",
            subject: "Informacje o Twojej subskrypcji Max Standard",
            snippet:
                "Amazon Prime WITAMY W PROGRAMIE. Wlasnie aktywowalismy Twoja subskrypcje uslugi Prime. Przetworzenie platnosci przebieglo pomyslnie. Oplata miesieczna 34,99 PLN. Subskrypcja automatycznie przedluza sie co miesiac. Panel zarzadzania https://u44305150.ct.sendgrid.net/ls/click",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Suspicious Amazon Max wrong domain PL",
        input: {
            id: "fixture-suspicious-amazon-max-wrong-domain-pl",
            from: "AmazonPrime <info@ermcas.com>",
            subject: "Podsumowanie Twojej subskrypcji Max Standard.",
            snippet:
                "Max. Ostatnio wykupiles dostep do Max Standard poprzez PRlME-Video. Ta wiadomosc przedstawia informacje o Twojej subskrypcji. Oferta Max Standard 39.99 PIn/miesiac. Odnowienie automatyczne.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Amazon Prime trusted domain EN",
        input: {
            id: "fixture-amazon-prime-trusted-domain-en",
            from: "Amazon <digital-no-reply@amazon.com>",
            subject: "Your Prime membership has renewed",
            snippet:
                "Your Amazon Prime membership has renewed. You have been charged 14.99 USD. Your membership renews monthly.",
        },
        expected: {
            isCandidate: true,
            provider: "Amazon",
            minConfidence: 0.55,
        },
    },
    {
        name: "Spotify price increase consent PL",
        input: {
            id: "fixture-spotify-price-increase-consent-pl",
            from: "Spotify <no-reply@legal.spotify.com>",
            subject: "Ceny planow Premium rosna - wymagana jest Twoja zgoda",
            snippet:
                "Wymagane dzialanie: Wyraz zgode na zaktualizowana cene planu do dnia 17 maja 2026, aby pozostac w planie Premium. Aktualizujemy cene Premium Individual z 23,99 zl do 26,99 zl miesiecznie. Poniewaz cenimy Cie jako subskrybenta Spotify Premium, oferujemy Ci trzy dodatkowe miesiace w obecnej cenie do dnia rozliczenia za maja.",
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
        name: "Spotify price change accepted PL",
        input: {
            id: "fixture-spotify-price-change-accepted-pl",
            from: "Spotify <no-reply@spotify.com>",
            subject:
                "Dziekujemy za wyrazenie zgody na zmiane ceny - zachowujesz dostep do wersji Premium",
            snippet:
                "Wyraziles zgode na zaktualizowana cene za Premium Individual. Cieszymy sie, ze nadal bedziesz korzystac z Spotify Premium. Nowa cena 26,99 zl pojawi sie w dniu rozliczeniowym za maja.",
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
        name: "Spotify referral premium free months PL",
        input: {
            id: "fixture-spotify-referral-premium-free-months-pl",
            from: "Spotify <no-reply@spotify.com>",
            subject: "Podziel sie ze znajomym muzyka bez reklam.",
            snippet:
                "Udostepnij kod polecajacy Premium. Polec plan znajomemu, a ten otrzyma 3 miesiace Premium za 0 zl. Trzy miesiace za darmo dostepne sa tylko dla uzytkownikow, ktorzy nie korzystali jeszcze z Premium.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Spotify legal terms update PL",
        input: {
            id: "fixture-spotify-legal-terms-update-pl",
            from: "Spotify <no-reply@legal.spotify.com>",
            subject: "Wazne zmiany w Warunkach Spotify",
            snippet:
                "Zaktualizowalismy nasze Warunki korzystania z uslugi. Nowa wersja Warunkow obowiazuje od 26 wrzesnia 2025 roku. Mozesz zapoznac sie z nimi tutaj.",
        },
        expected: {
            isCandidate: false,
            provider: "Spotify",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Duolingo weekly progress report EN",
        input: {
            id: "fixture-duolingo-weekly-progress-report-en",
            from: "Duolingo <hello@duolingo.com>",
            subject: "Progress report! You did great",
            snippet:
                "Weekly Progress. Take a look at your stats. Your Spanish progress cannot be stopped.",
        },
        expected: {
            isCandidate: false,
            provider: "Duolingo",
            maxConfidence: 0.35,
        },
    },
    {
        name: "Generic eFaktura internet provider PL",
        input: {
            id: "fixture-generic-efaktura-internet-provider-pl",
            from: "faktury@localnet.pl",
            subject: "eFaktura LocalNet | 04 | 2026",
            snippet:
                "Kod abonenta: 12345. Twoja eFaktura za internet o numerze FV/04/2026 na kwote 79,99 zl jest juz dostepna w panelu klienta. Oplac fakture online. Masz czas na jej oplacenie do 15.04.2026 r.",
        },
        expected: {
            isCandidate: true,
            amountText: "79,99 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "TOYA ekoFaktura PL",
        input: {
            id: "fixture-toya-ekofaktura-pl",
            from: "ekofaktura@toya.net.pl",
            subject: "ekoFaktura TOYA | 05 | 2026",
            snippet:
                "Kod Abonenta: 01679519. Dzien dobry, Twoja ekoFaktura o numerze 6V/183570/05/2026 na kwote 55,13 zl jest juz dostepna w eBOA. Oplac fakture w eBOA. Masz czas na jej oplacenie do 20.05.2026 r. Pozdrawiamy Zespol TOYA.",
        },
        expected: {
            isCandidate: true,
            amountText: "55,13 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "One-time shop invoice still false PL",
        input: {
            id: "fixture-one-time-shop-invoice-still-false-pl",
            from: "Media Expert <sklep@mediaexpert.pl>",
            subject: "Faktura VAT do zamowienia 02418348314",
            snippet:
                "Przesylamy fakture VAT do Twojego zamowienia. Dokument znajdziesz w zalaczniku. Dziekujemy za wybor naszego sklepu. Wybrane produkty.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Uber Eats receipt still false PL",
        input: {
            id: "fixture-uber-eats-receipt-still-false-pl",
            from: "Rachunki Uber <noreply@uber.com>",
            subject: "Twoje zamowienie z Uber Eats",
            snippet:
                "Dziekujemy za zlozenie zamowienia. Oto Twoj rachunek dla restauracji. Suma 82,84 zl.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "MPK periodic ticket purchase PL",
        input: {
            id: "fixture-mpk-periodic-ticket-purchase-pl",
            from: "Elektroniczne Konto Pasazera <no-reply@ekp.mpk.krakow.pl>",
            subject: "Potwierdzenie zakupu biletu",
            snippet:
                'Krakowska Karta Miejska. Potwierdzenie zakupu biletu. Dziekujemy za zakup biletu "Bilet ulg. mieszk. 3-mies. sieciowy st. I". Wazny od 19-04-2026 do 18-07-2026. Kwota transakcji 148,50 PLN. Numer klienta 42409118.',
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "MPK ticket payment pending PL",
        input: {
            id: "fixture-mpk-ticket-payment-pending-pl",
            from: "Elektroniczne Konto Pasazera <no-reply@ekp.mpk.krakow.pl>",
            subject: "Informacja o zakupie biletu",
            snippet:
                'Dziekujemy za zakup biletu "Bilet ulg. mieszk. 6-mies. sieciowy st. I". W chwili obecnej oczekujemy na zaksiegowanie Twojej platnosci. Wazny od 16-10-2025 do 15-04-2026. Cena 235,00 PLN.',
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "PayU phone top-up PL",
        input: {
            id: "fixture-payu-phone-top-up-pl",
            from: "Doladowania PayU <no-reply@payu.com>",
            subject: "Realizacja doladowania telefonu",
            snippet:
                "Realizacja doladowania telefonu. Doladowanie numeru telefonu zostalo zrealizowane. Kwota doladowania 10 zl.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Plush monthly offer marketing PL",
        input: {
            id: "fixture-plush-monthly-offer-marketing-pl",
            from: "Plush - dostarczone przez Interie <mailing@interia.pl>",
            subject: "Tylko 20 zl/mies. po rabatach za os.",
            snippet:
                "Oferta promocyjna. Wez abonament z kim chcesz i zyskaj. Tylko 20 zl/mies. po rabatach. Sprawdz szczegoly oferty.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "TOYA ekoFaktura should infer provider PL",
        input: {
            id: "fixture-toya-ekofaktura-should-infer-provider-pl",
            from: "ekofaktura@toya.net.pl",
            subject: "ekoFaktura TOYA | 05 | 2026",
            snippet:
                "Kod Abonenta: 01679519. Twoja ekoFaktura o numerze 6V/183570/05/2026 na kwote 55,13 z\u0142 jest juz dostepna w eBOA. Oplac fakture w eBOA. Masz czas na jej oplacenie do 20.05.2026 r.",
        },
        expected: {
            isCandidate: true,
            provider: "TOYA",
            amountText: "55,13 z\u0142",
            minConfidence: 0.55,
        },
    },
    {
        name: "Onet loan ad PL",
        input: {
            id: "fixture-onet-loan-ad-pl",
            from: "Alior Bank - Onet <mailing_reklamowy@onet.pl>",
            subject: "Pozyczka na Twoje cele z RRSO 9,91%",
            snippet:
                "Kwota do 60 tys. zl, splata do 2 lat. Rzeczywista Roczna Stopa Oprocentowania (RRSO) pozyczki gotowkowej wynosi 9,91%; calkowita kwota pozyczki: 16900zl; calkowita kwota do zaplaty: 18552,15zl; 23 miesieczne raty...",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Onet car credit ad PL",
        input: {
            id: "fixture-onet-car-credit-ad-pl",
            from: "BYD Polska - Onet <mailing_reklamowy@grupaonet.pl>",
            subject: "BYD Atto 2 DM-i w kredycie 50/50, RRSO 0%",
            snippet:
                "NOWA SUPER HYBRYDA JUZ OD 60 399 ZL BRUTTO W KREDYCIE 50/50 RRSO 0%. Calkowita kwota kredytu...",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Onet telecom marketing PL",
        input: {
            id: "fixture-onet-telecom-marketing-pl",
            from: "T-Mobile Polska - Onet <mailing_reklamowy@onet.pl>",
            subject: "Razem najlepiej - internet i abonament w pakiecie!",
            snippet:
                "Oferta promocyjna internetu i abonamentu. Sprawdz oferte. Cena od 49 zl miesiecznie.",
        },
        expected: {
            isCandidate: false,
            provider: "T-Mobile",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Sentinel Hub expired trial EN",
        input: {
            id: "fixture-sentinel-hub-expired-trial-en",
            from: "Sentinel Hub <info@sentinel-hub.com>",
            subject: "Sentinel Hub account has expired",
            snippet:
                "This is a notice that your Sentinel Hub trial has expired. To continue using our services without interruption, please consider a Subscription Plan...",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Adobe cancellation PL",
        input: {
            id: "fixture-adobe-cancellation-pl",
            from: "Adobe <message@adobe.com>",
            subject: "Przykro nam Cie pozegnac",
            snippet:
                "Ta wiadomosc stanowi potwierdzenie anulowania przez Ciebie subskrypcji Adobe Acrobat Pro. Zachowasz dostep do konca okresu rozliczeniowego...",
        },
        expected: {
            isCandidate: false,
            provider: "Adobe",
            maxConfidence: 0.45,
        },
    },
    {
        name: "InterviewMe reactivation marketing PL",
        input: {
            id: "fixture-interviewme-reactivation-marketing-pl",
            from: "InterviewMe <biuletyn@mg.interviewme.pl>",
            subject: "Nieograniczony dostep do InterviewMe tylko za 14,95 zl miesiecznie.",
            snippet:
                "Twoja subskrypcja InterviewMe wygasla jakis czas temu. Reaktywujac subskrypcje, zaplacisz tylko 14,95 zl miesiecznie...",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Tauron invoice PL",
        input: {
            id: "fixture-tauron-invoice-pl",
            from: "TAURON <powiadomienia@tauron.pl>",
            subject: "Wystawilismy fakture za prad",
            snippet:
                "Wystawilismy Ci fakture za prad. Numer faktury: E/TM2/8433843/24/1 Kwota do zaplaty: 216.39 zl Termin platnosci: 12.12.2024 r.",
        },
        expected: {
            isCandidate: true,
            provider: "Tauron",
            amountText: "216.39 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "Uber One payment PL",
        input: {
            id: "fixture-uber-one-payment-pl",
            from: "Uber One <uberone@uber.com>",
            subject: "Potwierdzenie platnosci Uber One",
            snippet:
                "Platnosc za Uber One zostala zrealizowana. Dzieki subskrypcji Uber One zaoszczedzisz...",
        },
        expected: {
            isCandidate: true,
            provider: "Uber One",
            name: "Uber One",
            minConfidence: 0.55,
        },
    },
    {
        name: "Amazon Prime price change active subscriber EN",
        input: {
            id: "fixture-amazon-prime-price-change-active-subscriber-en",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Your Prime Video Channels price is changing",
            snippet:
                "As an active subscriber, your price is changing. Your Prime Video Channels subscription will renew monthly at the updated price of 12.99 USD on your next billing date.",
        },
        expected: {
            isCandidate: true,
            provider: "Prime Video",
            minConfidence: 0.55,
        },
    },
    {
        name: "SkyShowtime on Prime Video active subscription PL",
        input: {
            id: "fixture-skyshowtime-on-prime-video-active-subscription-pl",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Masz subskrypcje SkyShowtime w usludze Prime Video",
            snippet:
                "Masz subskrypcje SkyShowtime w usludze Prime Video. Subskrypcja odnawia sie automatycznie co miesiac. Nastepna platnosc 24,99 zl.",
        },
        expected: {
            isCandidate: true,
            provider: "SkyShowtime",
            name: "SkyShowtime on Prime Video",
            minConfidence: 0.55,
        },
    },
    {
        name: "Apple TV on Prime Video active subscription EN",
        input: {
            id: "fixture-apple-tv-on-prime-video-active-subscription-en",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Apple TV on Prime Video",
            snippet:
                "Your subscription to Apple TV on Prime Video is active and renews automatically every month. You will be charged 9.99 USD on the next billing date.",
        },
        expected: {
            isCandidate: true,
            provider: "Apple TV",
            name: "Apple TV on Prime Video",
            minConfidence: 0.55,
        },
    },
    {
        name: "Google Play YouTube Music subscription receipt EN",
        input: {
            id: "fixture-google-play-youtube-music-subscription-receipt-en",
            from: "Google Play <googleplay-noreply@google.com>",
            subject: "Your Google Play receipt",
            snippet:
                "Thank you for your subscription to YouTube Music Premium. You have been charged 10.99 USD. The subscription renews monthly.",
        },
        expected: {
            isCandidate: true,
            provider: "YouTube Music",
            minConfidence: 0.55,
        },
    },
    {
        name: "Apple App Store Disney Plus subscription receipt EN",
        input: {
            id: "fixture-apple-app-store-disney-plus-subscription-receipt-en",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Your receipt from Apple",
            snippet:
                "Subscription receipt for Disney+. You have been charged 13.99 USD. Your subscription renews monthly and is billed through Apple.",
        },
        expected: {
            isCandidate: true,
            provider: "Disney+",
            minConfidence: 0.55,
        },
    },
    {
        name: "Generic local ISP eFaktura PL",
        input: {
            id: "fixture-generic-local-isp-efaktura-pl",
            from: "ebok@fiber-city.pl",
            subject: "eFaktura Fiber City | 06 | 2026",
            snippet:
                "Numer klienta 778899. Twoja eFaktura za internet jest dostepna w eBOK. Kwota do zaplaty 89,90 zl. Termin platnosci 15.06.2026. Oplac fakture w panelu klienta.",
        },
        expected: {
            isCandidate: true,
            provider: "Fiber City",
            amountText: "89,90 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "Autopay merchant recurring bill PL",
        input: {
            id: "fixture-autopay-merchant-recurring-bill-pl",
            from: "Autopay <no-reply@autopay.pl>",
            subject: "Przekazalismy Twoja platnosc do uslugodawcy - LocalNet",
            snippet:
                "Twoja platnosc cykliczna zostala przekazana do uslugodawcy - LocalNet. Kwota transakcji: 79,99 PLN. Odbiorca: LocalNet Sp. z o.o. Abonament za internet.",
        },
        expected: {
            isCandidate: true,
            provider: "LocalNet",
            amountText: "79,99 PLN",
            minConfidence: 0.55,
        },
    },
    {
        name: "AllTrails subscription renewal receipt EN",
        input: {
            id: "fixture-alltrails-subscription-renewal-receipt-en",
            from: "AllTrails <billing@alltrails.com>",
            subject: "Your AllTrails+ subscription renewed",
            snippet:
                "Your AllTrails+ subscription has renewed. You have been charged 35.99 USD. Your annual plan renews automatically.",
        },
        expected: {
            isCandidate: true,
            provider: "AllTrails",
            name: "AllTrails+",
            minConfidence: 0.55,
        },
    },
    {
        name: "Prime Video recommendation EN",
        input: {
            id: "fixture-prime-video-recommendation-en",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Recommended for you on Prime Video",
            snippet:
                "Based on titles you watched, we recommend Max and Apple TV. Watch now on Prime Video.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Prime Video one-time rental EN",
        input: {
            id: "fixture-prime-video-one-time-rental-en",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Your Prime Video order",
            snippet:
                "Order number 123-456. This receipt is for a one-time rental of a movie on Prime Video. You have been charged 4.99 USD.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "SkyShowtime subscription ended EN",
        input: {
            id: "fixture-skyshowtime-subscription-ended-en",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Your SkyShowtime subscription has ended",
            snippet:
                "Your SkyShowtime subscription on Prime Video has ended. No further charges will apply.",
        },
        expected: {
            isCandidate: false,
            provider: "SkyShowtime",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Google Play one-time app purchase EN",
        input: {
            id: "fixture-google-play-one-time-app-purchase-en",
            from: "Google Play <googleplay-noreply@google.com>",
            subject: "Your Google Play order receipt",
            snippet:
                "Order number GPA.1234. Thank you for your one-time purchase of Photo Editor Pro. You have been charged 3.99 USD.",
        },
        expected: {
            isCandidate: false,
            provider: "Google Play",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Apple security code EN",
        input: {
            id: "fixture-apple-security-code-en",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Your Apple verification code",
            snippet:
                "Use this verification code to sign in to your Apple Account. Your code is 123456.",
        },
        expected: {
            isCandidate: false,
            provider: "Apple",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Onet marketing telecom ad duplicate PL",
        input: {
            id: "fixture-onet-marketing-telecom-ad-duplicate-pl",
            from: "nju. - Onet <mailing_reklamowy@onet.pl>",
            subject: "Abonament komorkowy od 19 zl miesiecznie",
            snippet:
                "Specjalna oferta promocyjna. Wybierz abonament i sprawdz szczegoly oferty. Cena od 19 zl miesiecznie.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Credit loan ad PL",
        input: {
            id: "fixture-credit-loan-ad-pl",
            from: "Bank Newsletter <newsletter@bank-example.pl>",
            subject: "Kredyt gotowkowy z niska rata",
            snippet:
                "RRSO 11,20%. Calkowita kwota kredytu 20000 zl, oprocentowanie stale, miesieczne raty i prowizja 0%.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Ecommerce receipt PL",
        input: {
            id: "fixture-ecommerce-receipt-pl",
            from: "Sklep Online <sklep@example-store.pl>",
            subject: "Zamowienie nr 456789",
            snippet:
                "Dziekujemy za zakupy. Twoje zamowienie nr 456789 zostalo oplacone. Dostawa produktu nastapi w ciagu 2 dni. Kwota 129,99 zl.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Expired subscription reactivation marketing EN",
        input: {
            id: "fixture-expired-subscription-reactivation-marketing-en",
            from: "Resume Builder <newsletter@resume-builder.example>",
            subject: "Reactivate your subscription",
            snippet:
                "Your subscription expired some time ago. Reactivate your subscription today and get Premium for only 9.99 USD monthly.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Cancellation confirmation EN",
        input: {
            id: "fixture-cancellation-confirmation-en",
            from: "Streaming Service <billing@streaming.example>",
            subject: "Subscription cancelled",
            snippet:
                "This is confirmation that your subscription was cancelled. You will keep access until the end of your current billing period and no further charges will apply.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Uber One Eats savings upsell PL",
        input: {
            id: "fixture-uber-one-eats-savings-upsell-pl",
            from: "Uber Eats <ubereats@uber.com>",
            subject: "Subskrypcja Uber One pozwolilaby Ci zaoszczedzic 22 zl",
            snippet:
                "Korzystaj bezplatnie przez 4 tyg. Odblokuj korzysci i oszczedzaj z subskrypcja Uber One.",
        },
        expected: {
            isCandidate: false,
            provider: "Uber One",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Uber One subscription savings newsletter PL",
        input: {
            id: "fixture-uber-one-subscription-savings-newsletter-pl",
            from: "Uber One <uberone@uber.com>",
            subject: "Miesieczna subskrypcja - duza oszczednosc",
            snippet:
                "Koszt subskrypcji? To Twoje oszczednosci. Sprawdz, ile mozesz zaoszczedzic z Uber One.",
        },
        expected: {
            isCandidate: false,
            provider: "Uber One",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Uber One Eats cheaper upsell PL",
        input: {
            id: "fixture-uber-one-eats-cheaper-upsell-pl",
            from: "Uber One <uberone@uber.com>",
            subject: "Lukasz, korzystaj z Uber Eats taniej dzieki subskrypcji",
            snippet:
                "Korzystaj taniej z dostaw Uber Eats. Wyprobuj Uber One i oszczedzaj na zamowieniach.",
        },
        expected: {
            isCandidate: false,
            provider: "Uber One",
            maxConfidence: 0.45,
        },
    },
    {
        name: "PlayStation free Prime Video app purchase PL",
        input: {
            id: "fixture-playstation-free-prime-video-app-purchase-pl",
            from: "PlayStation <sony@txn-email03.playstation.com>",
            subject: "Dziekujemy za zakup",
            snippet:
                "Twoja transakcja w sklepie PlayStation Store przebiegla pomyslnie. Szczegoly Cena Amazon Prime Video (Aplikacja) Suma: 0,00 zl",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Prime Video channel change raw header snippet PL",
        input: {
            id: "fixture-prime-video-channel-change-raw-header-snippet-pl",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Zmiany w Twojej subskrypcji kanalu SkyShowtime",
            snippet:
                "Received: from mail.example by mx.example; Received-SPF: pass Authentication-Results: mx.example; DKIM-Signature: v=1; body headers only",
        },
        expected: {
            isCandidate: false,
            provider: "SkyShowtime",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Uber One payment confirmation duplicate PL",
        input: {
            id: "fixture-uber-one-payment-confirmation-duplicate-pl",
            from: "Uber One <uberone@uber.com>",
            subject: "Potwierdzenie platnosci Uber One",
            snippet:
                "Platnosc za Uber One zostala zrealizowana. Dzieki subskrypcji Uber One zaoszczedzisz na dostawach.",
        },
        expected: {
            isCandidate: true,
            provider: "Uber One",
            name: "Uber One",
            minConfidence: 0.55,
        },
    },
    {
        name: "SkyShowtime Prime Video trial started PL",
        input: {
            id: "fixture-skyshowtime-prime-video-trial-started-pl",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Twoj bezplatny okres probny uslugi SkyShowtime wlasnie sie rozpoczal",
            snippet:
                "Dziekujemy za zakup subskrypcji SkyShowtime. Subskrypcja rozpocznie sie automatycznie po uplywie bezplatnego okresu probnego.",
        },
        expected: {
            isCandidate: true,
            provider: "SkyShowtime",
            name: "SkyShowtime on Prime Video",
            isTrial: true,
            minConfidence: 0.55,
        },
    },
    {
        name: "SkyShowtime Prime Video special offer continuation PL",
        input: {
            id: "fixture-skyshowtime-prime-video-special-offer-continuation-pl",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Potwierdzenie - Oferta specjalna dotyczaca subskrypcji SkyShowtime",
            snippet:
                "Kontynuujac subskrypcje SkyShowtime w usludze Prime Video, metoda platnosci bedzie obciazana kwota 4,00 zl miesiecznie.",
        },
        expected: {
            isCandidate: true,
            provider: "SkyShowtime",
            name: "SkyShowtime on Prime Video",
            minConfidence: 0.55,
        },
    },
    {
        name: "Uber One subscription benefits upsell PL",
        input: {
            id: "fixture-uber-one-subscription-benefits-upsell-pl",
            from: "Uber One <uberone@uber.com>",
            subject: "Lukasz, korzystaj z Uber Eats taniej dzieki subskrypcji",
            snippet:
                "Zamawiaj ulubione jedzenie z wyjatkowymi korzysciami. Dzieki subskrypcji Uber One mozesz korzystac z benefitow i oszczedzac na Uber Eats.",
        },
        expected: {
            isCandidate: false,
            provider: "Uber One",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Uber One four week free trial upsell PL",
        input: {
            id: "fixture-uber-one-four-week-free-trial-upsell-pl",
            from: "Uber Eats <ubereats@uber.com>",
            subject: "4 tyg. bezplatnie! Wyprobuj Uber One i zacznij oszczedzac",
            snippet:
                "Oszczedzaj na zamowieniach dzieki subskrypcji. Korzystaj bezplatnie przez 4 tygodnie i poznaj benefity Uber One.",
        },
        expected: {
            isCandidate: false,
            provider: "Uber One",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Amazon Prime price change active customer PL",
        input: {
            id: "fixture-amazon-prime-price-change-active-customer-pl",
            from: "Amazon Prime <prime@amazon.pl>",
            subject: "Wymagane dzialanie: Przejrzyj nowa cene Amazon Prime",
            snippet:
                "Przejrzyj i zaakceptuj nowa cene Amazon Prime. Cena planu rocznego zmienila sie na 69,00 zl. Dla Ciebie, aktualnego klienta Prime, zmiany wejda w zycie w nastepnej dacie odnowienia.",
        },
        expected: {
            isCandidate: true,
            provider: "Amazon",
            name: "Amazon",
            amountText: "69,00 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "SkyShowtime Prime Video subscription ended PL",
        input: {
            id: "fixture-skyshowtime-prime-video-subscription-ended-pl",
            from: "Prime Video <no-reply@primevideo.com>",
            subject: "Twoja subskrypcja SkyShowtime zakonczyla sie",
            snippet:
                "Twoja subskrypcja SkyShowtime w usludze Prime Video zakonczyla sie. Dostep wygasl i nie beda naliczane dalsze oplaty.",
        },
        expected: {
            isCandidate: false,
            provider: "SkyShowtime",
            maxConfidence: 0.45,
        },
    },
    {
        name: "Strava annual renewal EN",
        input: {
            id: "fixture-strava-annual-renewal-en",
            from: "Strava <noreply@strava.com>",
            subject: "Your Strava subscription renews soon",
            snippet:
                "Your Strava subscription will automatically renew on June 15, 2026. Your payment method will be charged 79.99 USD for the annual plan.",
        },
        expected: {
            isCandidate: true,
            provider: "Strava",
            amountText: "79.99 USD",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Duolingo Super yearly renewal EN",
        input: {
            id: "fixture-duolingo-super-yearly-renewal-en",
            from: "Duolingo <no-reply@duolingo.com>",
            subject: "Your Super Duolingo subscription renews soon",
            snippet:
                "Your Super Duolingo subscription renews automatically on July 1, 2026. The annual plan price is 83.99 USD.",
        },
        expected: {
            isCandidate: true,
            provider: "Duolingo",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "iCloud Plus storage renewal EN",
        input: {
            id: "fixture-icloud-plus-storage-renewal-en",
            from: "Apple <no_reply@email.apple.com>",
            subject: "Your iCloud+ storage plan renews soon",
            snippet:
                "Your iCloud+ subscription will renew automatically. Your payment method will be charged 9.99 USD monthly on the next billing date.",
        },
        expected: {
            isCandidate: true,
            provider: "iCloud",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "PGE invoice PL",
        input: {
            id: "fixture-pge-invoice-pl",
            from: "PGE <ebok@pge.pl>",
            subject: "Wystawiono fakture za energie",
            snippet:
                "Twoja faktura za energie elektryczna jest dostepna w eBOK. Kwota do zaplaty: 184,20 zl. Termin platnosci: 18.06.2026.",
        },
        expected: {
            isCandidate: true,
            provider: "PGE",
            amountText: "184,20 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "Energa invoice PL",
        input: {
            id: "fixture-energa-invoice-pl",
            from: "Energa <faktury@energa.pl>",
            subject: "Nowa eFaktura Energa",
            snippet:
                "Numer klienta 882211. eFaktura Energa za prad jest dostepna. Kwota do zaplaty 92,44 zl. Termin platnosci 21.06.2026.",
        },
        expected: {
            isCandidate: true,
            provider: "Energa",
            amountText: "92,44 zl",
            minConfidence: 0.55,
        },
    },
    {
        name: "Stripe one-time ecommerce receipt EN",
        input: {
            id: "fixture-stripe-one-time-ecommerce-receipt-en",
            from: "Stripe <receipts@stripe.com>",
            subject: "Your receipt from Random Shop",
            snippet:
                "Receipt for your one-time purchase. Order number 99321. Shipping and product details. Total 49.00 USD.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Przelewy24 random shop order PL",
        input: {
            id: "fixture-przelewy24-random-shop-order-pl",
            from: "Przelewy24 <serwis@przelewy24.pl>",
            subject: "Potwierdzenie platnosci za zamowienie",
            snippet:
                "Platnosc za zamowienie w sklepie internetowym zostala przyjeta. Sprzedawca: Sklep Ogrodowy. Kwota 129,99 PLN.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Wolt Plus payment EN",
        input: {
            id: "fixture-wolt-plus-payment-en",
            from: "Wolt <no-reply@wolt.com>",
            subject: "Your Wolt+ payment confirmation",
            snippet:
                "Your payment for Wolt+ has been completed. Your membership renews monthly and your card was charged 9.99 EUR.",
        },
        expected: {
            isCandidate: true,
            provider: "Wolt+",
            amountText: "9.99 EUR",
            billingCycle: "monthly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Glovo Prime marketing PL",
        input: {
            id: "fixture-glovo-prime-marketing-pl",
            from: "Glovo <newsletter@glovoapp.com>",
            subject: "Wyprobuj Glovo Prime i oszczedzaj",
            snippet:
                "Oferta specjalna tylko dla Ciebie. Korzystaj z benefitow Glovo Prime i zamawiaj taniej. Sprawdz oferte.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Allegro Smart active renewal PL",
        input: {
            id: "fixture-allegro-smart-active-renewal-pl",
            from: "Allegro <powiadomienia@allegro.pl>",
            subject: "Twoj Allegro Smart! zostanie przedluzony",
            snippet:
                "Twoja usluga Allegro Smart! odnowi sie automatycznie 30.06.2026. Metoda platnosci bedzie obciazana kwota 59,90 zl rocznie.",
        },
        expected: {
            isCandidate: true,
            provider: "Allegro Smart",
            amountText: "59,90 zl",
            billingCycle: "yearly",
            minConfidence: 0.55,
        },
    },
    {
        name: "Allegro Smart marketing false PL",
        input: {
            id: "fixture-allegro-smart-marketing-false-pl",
            from: "Allegro <powiadomienia@allegro.pl>",
            subject: "Aktywuj Allegro Smart! i odbieraj bezplatne dostawy",
            snippet:
                "Promocja dla Ciebie. Aktywuj Allegro Smart! i sprawdz szczegoly oferty. Korzystaj taniej przez pierwszy miesiac.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "PayPal automatic payment to Netflix EN",
        input: {
            id: "fixture-paypal-automatic-payment-netflix-en",
            from: "PayPal <service@paypal.com>",
            subject: "Automatic payment to Netflix",
            snippet:
                "You sent an automatic payment to Netflix. Merchant: Netflix. Amount 15.49 USD. This billing agreement is active.",
        },
        expected: {
            isCandidate: true,
            provider: "Netflix",
            amountText: "15.49 USD",
            minConfidence: 0.55,
        },
    },
    {
        name: "PayPal suspicious invoice unknown merchant EN",
        input: {
            id: "fixture-paypal-suspicious-invoice-unknown-merchant-en",
            from: "PayPal Billing <notice@random-paypal.example>",
            subject: "Invoice waiting for payment",
            snippet:
                "Your invoice is waiting. Click to pay now. Amount due 499.00 USD.",
        },
        expected: {
            isCandidate: false,
            maxConfidence: 0.45,
        },
    },
    {
        name: "Unknown ISP invoice from domain PL",
        input: {
            id: "fixture-unknown-isp-invoice-from-domain-pl",
            from: "Faktury <faktury@internet-domowy.example>",
            subject: "Faktura za internet 05/2026",
            snippet:
                "Numer klienta 120055. Faktura za internet jest dostepna w panelu klienta. Kwota do zaplaty 89,00 zl. Termin platnosci 15.06.2026.",
        },
        expected: {
            isCandidate: true,
            amountText: "89,00 zl",
            minConfidence: 0.55,
        },
    },
];
