import { CancelDifficulty, SubscriptionCategory } from "@prisma/client";
import { upsertCancelGuide } from "../services/cancel-guide.service";
import { prisma } from "../lib/prisma";

async function main() {
    const guides = [
        {
            providerName: "Netflix",
            providerSlug: "netflix",
            category: SubscriptionCategory.entertainment,
            logoKey: "netflix",
            cancelUrl: "https://www.netflix.com/cancelplan",
            supportUrl: "https://help.netflix.com/en/node/407",
            difficulty: CancelDifficulty.easy,
            estimatedTimeMinutes: 3,
            instructions: [
                "Zaloguj się na konto Netflix.",
                "Wejdź na stronę Account / Konto.",
                "W sekcji Membership wybierz opcję anulowania członkostwa.",
                "Przejdź przez ekran potwierdzenia.",
                "Zachowaj potwierdzenie anulowania.",
            ],
            notes:
                "Jeśli Netflix był opłacany przez partnera lub operatora, anulowanie może wymagać przejścia przez tego partnera. Dostęp zwykle działa do końca bieżącego okresu rozliczeniowego.",
            matchingKeywords: ["netflix", "netflix premium"],
        },
        {
            providerName: "Spotify Premium",
            providerSlug: "spotify-premium",
            category: SubscriptionCategory.entertainment,
            logoKey: "spotify",
            cancelUrl: "https://www.spotify.com/account/subscription/",
            supportUrl: "https://support.spotify.com/us/article/cancel-premium/",
            difficulty: CancelDifficulty.easy,
            estimatedTimeMinutes: 4,
            instructions: [
                "Zaloguj się na konto Spotify w przeglądarce.",
                "Przejdź do strony konta i sekcji planu.",
                "Wybierz zarządzanie planem.",
                "Kliknij Cancel subscription / Anuluj subskrypcję.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "Spotify Premium najczęściej anuluje się przez stronę konta. Jeśli płatność była przez App Store, Google Play albo operatora, trzeba anulować przez ten kanał.",
            matchingKeywords: ["spotify", "spotify premium", "premium spotify"],
        },
        {
            providerName: "YouTube Premium",
            providerSlug: "youtube-premium",
            category: SubscriptionCategory.entertainment,
            logoKey: "youtube",
            cancelUrl: "https://www.youtube.com/paid_memberships",
            supportUrl: "https://support.google.com/youtube/answer/6308278",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się na konto Google używane do YouTube Premium.",
                "Otwórz YouTube i przejdź do Paid memberships / Płatne subskrypcje.",
                "Wybierz aktywną subskrypcję YouTube Premium.",
                "Kliknij Manage membership / Zarządzaj subskrypcją.",
                "Wybierz anulowanie i potwierdź decyzję.",
            ],
            notes:
                "Jeśli subskrypcja była kupiona przez Google Play albo App Store, anulowanie może wymagać użycia ustawień subskrypcji sklepu.",
            matchingKeywords: ["youtube", "youtube premium", "yt premium"],
        },
        {
            providerName: "Canva",
            providerSlug: "canva",
            category: SubscriptionCategory.productivity,
            logoKey: "canva",
            cancelUrl: "https://www.canva.com/settings/billing/",
            supportUrl: "https://www.canva.com/help/cancel-canva-plan/",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się do Canva na właściwe konto lub zespół.",
                "Otwórz ustawienia konta.",
                "Przejdź do Billing & plans / Rozliczenia i plany.",
                "Wybierz aktywny plan.",
                "Kliknij opcję anulowania planu.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "W Canva proces może zależeć od tego, czy plan jest indywidualny, zespołowy, roczny, miesięczny albo kupiony przez sklep aplikacji.",
            matchingKeywords: ["canva", "canva pro", "canva trial"],
        },
        {
            providerName: "Disney+",
            providerSlug: "disney-plus",
            category: SubscriptionCategory.entertainment,
            logoKey: "disney-plus",
            cancelUrl: "https://www.disneyplus.com/account",
            supportUrl: "https://help.disneyplus.com/article/disneyplus-cancel",
            difficulty: CancelDifficulty.easy,
            estimatedTimeMinutes: 4,
            instructions: [
                "Zaloguj się do Disney+ przez komputer lub przeglądarkę mobilną.",
                "Wybierz profil.",
                "Wejdź w Account / Konto.",
                "Wybierz subskrypcję Disney+.",
                "Kliknij Cancel Subscription / Anuluj subskrypcję.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "Jeśli Disney+ był kupiony przez zewnętrznego partnera, pakiet lub operatora, anulowanie może wymagać przejścia przez ten kanał.",
            matchingKeywords: ["disney", "disney+", "disney plus"],
        },
        {
            providerName: "ChatGPT",
            providerSlug: "chatgpt",
            category: SubscriptionCategory.productivity,
            logoKey: "openai",
            cancelUrl: "https://chatgpt.com/#settings/Subscription",
            supportUrl:
                "https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się do ChatGPT.",
                "Kliknij ikonę profilu.",
                "Wejdź w Settings / Ustawienia.",
                "Przejdź do Account albo Subscription.",
                "Wybierz Manage / Zarządzaj.",
                "Kliknij Cancel Subscription i potwierdź.",
            ],
            notes:
                "Jeśli subskrypcja ChatGPT została kupiona przez App Store lub Google Play, trzeba anulować ją przez ustawienia subskrypcji Apple albo Google.",
            matchingKeywords: ["chatgpt", "openai", "chatgpt plus", "gpt plus"],
        },
        {
            providerName: "Figma",
            providerSlug: "figma",
            category: SubscriptionCategory.productivity,
            logoKey: "figma",
            cancelUrl: "https://www.figma.com/files/team",
            supportUrl: "https://www.figma.com/legal/renewal-and-cancellation/",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się do Figma.",
                "Przejdź do teamu lub organizacji, której dotyczy plan.",
                "Otwórz ustawienia zespołu albo panel administracyjny.",
                "Wejdź w Plan & Billing / Billing.",
                "Wybierz zmianę planu, downgrade albo anulowanie.",
                "Potwierdź zmianę zgodnie z instrukcjami Figma.",
            ],
            notes:
                "W Figma proces zależy od typu planu: indywidualny, team, organization lub enterprise. W części przypadków może być potrzebny kontakt z supportem.",
            matchingKeywords: ["figma", "figma professional", "figma team"],
        },
        {
            providerName: "Apple iCloud",
            providerSlug: "apple-icloud",
            category: SubscriptionCategory.productivity,
            logoKey: "icloud",
            cancelUrl: "https://support.apple.com/en-us/118428",
            supportUrl: "https://support.apple.com/icloud",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Otwórz ustawienia Apple ID na iPhonie, iPadzie albo Macu.",
                "Wejdź w Subscriptions / Subskrypcje albo iCloud.",
                "Wybierz plan iCloud+.",
                "Wybierz zmianę lub anulowanie planu.",
                "Potwierdź zmianę.",
            ],
            notes:
                "Subskrypcje Apple zwykle anuluje się z poziomu Apple ID, a nie bezpośrednio przez stronę usługi.",
            matchingKeywords: ["icloud", "apple icloud", "icloud+", "apple"],
        },
        {
            providerName: "Google One",
            providerSlug: "google-one",
            category: SubscriptionCategory.productivity,
            logoKey: "google-one",
            cancelUrl: "https://one.google.com/settings",
            supportUrl: "https://support.google.com/googleone/",
            difficulty: CancelDifficulty.easy,
            estimatedTimeMinutes: 4,
            instructions: [
                "Zaloguj się na konto Google.",
                "Otwórz Google One.",
                "Przejdź do Settings / Ustawienia.",
                "Wybierz Cancel membership / Anuluj subskrypcję.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "Po anulowaniu dodatkowe miejsce może działać do końca opłaconego okresu. Upewnij się, że nie przekraczasz darmowego limitu miejsca.",
            matchingKeywords: ["google one", "google storage", "google drive", "google"],
        },
        {
            providerName: "Microsoft 365",
            providerSlug: "microsoft-365",
            category: SubscriptionCategory.productivity,
            logoKey: "microsoft",
            cancelUrl: "https://account.microsoft.com/services/microsoft365",
            supportUrl:
                "https://support.microsoft.com/en-us/office/cancel-a-microsoft-365-subscription-46e2634c-c64b-4c65-94b9-2cc9c960e91b",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się na konto Microsoft użyte do zakupu subskrypcji.",
                "Wejdź w Services & subscriptions.",
                "Znajdź Microsoft 365.",
                "Kliknij Manage / Zarządzaj.",
                "Wybierz Cancel subscription albo Turn off recurring billing.",
                "Potwierdź zmianę.",
            ],
            notes:
                "Microsoft czasem pokazuje wyłączenie odnawiania zamiast natychmiastowego anulowania. Sprawdź datę wygaśnięcia planu.",
            matchingKeywords: ["microsoft 365", "office 365", "microsoft", "office"],
        },
        {
            providerName: "Amazon Prime",
            providerSlug: "amazon-prime",
            category: SubscriptionCategory.shopping,
            logoKey: "amazon",
            cancelUrl: "https://www.amazon.com/amazonprime",
            supportUrl:
                "https://www.amazon.com/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się na konto Amazon.",
                "Wejdź na stronę Prime Membership.",
                "Otwórz sekcję zarządzania członkostwem.",
                "Wybierz End Membership / Zakończ członkostwo.",
                "Przejdź przez ekrany potwierdzenia.",
            ],
            notes:
                "Amazon może pokazywać kilka ekranów utrzymaniowych. Upewnij się, że dojdziesz do finalnego potwierdzenia zakończenia Prime.",
            matchingKeywords: ["amazon prime", "prime membership", "amazon"],
        },
        {
            providerName: "Prime Video",
            providerSlug: "prime-video",
            category: SubscriptionCategory.entertainment,
            logoKey: "prime-video",
            cancelUrl: "https://www.primevideo.com/settings",
            supportUrl: "https://www.primevideo.com/help?nodeId=GWGDSNXVPJ93UW5V",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się do Prime Video.",
                "Wejdź w Account & Settings.",
                "Otwórz zakładkę Your Account.",
                "Dla subskrypcji Prime Video wybierz End Subscription.",
                "Jeśli Prime Video jest częścią Amazon Prime, zarządzaj członkostwem Prime.",
            ],
            notes:
                "Prime Video może być osobną subskrypcją albo częścią Amazon Prime. Sposób anulowania zależy od typu zakupu.",
            matchingKeywords: ["prime video", "amazon video", "amazon prime video"],
        },
        {
            providerName: "HBO Max / Max",
            providerSlug: "max",
            category: SubscriptionCategory.entertainment,
            logoKey: "max",
            cancelUrl: "https://www.max.com/subscription",
            supportUrl: "https://help.hbomax.com/cancel",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się do Max / HBO Max.",
                "Wejdź w ustawienia konta.",
                "Otwórz sekcję Subscription albo Billing.",
                "Wybierz Cancel Your Subscription.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "Jeśli jesteś rozliczany przez zewnętrznego dostawcę, Max może wskazać, przez kogo trzeba anulować subskrypcję.",
            matchingKeywords: ["max", "hbo max", "hbomax", "hbo"],
        },
        {
            providerName: "Hulu",
            providerSlug: "hulu",
            category: SubscriptionCategory.entertainment,
            logoKey: "hulu",
            cancelUrl: "https://secure.hulu.com/account",
            supportUrl: "https://help.hulu.com/article/hulu-cancel-hulu-subscription",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się do Hulu przez komputer albo przeglądarkę mobilną.",
                "Wejdź na stronę Account.",
                "W sekcji Your Subscription wybierz Cancel.",
                "Postępuj zgodnie z instrukcjami na ekranie.",
                "Zachowaj potwierdzenie anulowania.",
            ],
            notes:
                "Hulu jest dostępne głównie na wybranych rynkach. Jeśli subskrypcja jest częścią pakietu, anulowanie może dotyczyć całego pakietu.",
            matchingKeywords: ["hulu", "hulu plus"],
        },
        {
            providerName: "Dropbox",
            providerSlug: "dropbox",
            category: SubscriptionCategory.productivity,
            logoKey: "dropbox",
            cancelUrl: "https://www.dropbox.com/account/plan",
            supportUrl: "https://help.dropbox.com/plans/downgrade-dropbox-individual-plans",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się na dropbox.com.",
                "Kliknij avatar lub inicjały konta.",
                "Wejdź w Manage account.",
                "Przejdź do ustawień planu.",
                "Kliknij Cancel plan na dole strony.",
                "Wybierz powód i potwierdź anulowanie.",
            ],
            notes:
                "Jeśli Dropbox był kupiony przez sklep mobilny, anulowanie może wymagać użycia App Store albo Google Play.",
            matchingKeywords: ["dropbox", "dropbox plus", "dropbox professional"],
        },
        {
            providerName: "Adobe Creative Cloud",
            providerSlug: "adobe-creative-cloud",
            category: SubscriptionCategory.productivity,
            logoKey: "adobe",
            cancelUrl: "https://account.adobe.com/plans",
            supportUrl:
                "https://helpx.adobe.com/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html",
            difficulty: CancelDifficulty.hard,
            estimatedTimeMinutes: 10,
            instructions: [
                "Zaloguj się na konto Adobe.",
                "Wejdź na stronę Plans.",
                "Wybierz Manage plan przy planie, który chcesz anulować.",
                "Kliknij Cancel your plan.",
                "Przejdź przez szczegóły anulowania.",
                "Wybierz powód anulowania.",
                "Potwierdź anulowanie i sprawdź e-mail potwierdzający.",
            ],
            notes:
                "Adobe może naliczać opłaty lub pokazywać warunki zależnie od typu planu. Dokładnie sprawdź ekran podsumowania przed potwierdzeniem.",
            matchingKeywords: ["adobe", "creative cloud", "photoshop", "lightroom", "adobe cc"],
        },
        {
            providerName: "Zoom",
            providerSlug: "zoom",
            category: SubscriptionCategory.productivity,
            logoKey: "zoom",
            cancelUrl: "https://zoom.us/billing",
            supportUrl: "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0066687",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się do Zoom web portal.",
                "W menu przejdź do Account Management.",
                "Wejdź w Billing.",
                "Na karcie Current Plans znajdź plan do anulowania.",
                "Kliknij Cancel Plan.",
                "Potwierdź anulowanie w oknie dialogowym.",
            ],
            notes:
                "Dostęp do billing może wymagać uprawnień właściciela lub administratora konta.",
            matchingKeywords: ["zoom", "zoom pro", "zoom workplace"],
        },
        {
            providerName: "Notion",
            providerSlug: "notion",
            category: SubscriptionCategory.productivity,
            logoKey: "notion",
            cancelUrl: "https://www.notion.so/settings/billing",
            supportUrl: "https://www.notion.com/help/upgrade-or-downgrade-your-plan",
            difficulty: CancelDifficulty.easy,
            estimatedTimeMinutes: 4,
            instructions: [
                "Otwórz Notion na desktopie lub w przeglądarce.",
                "Przejdź do Settings w lewym sidebarze.",
                "Wybierz Billing.",
                "Kliknij Change plan.",
                "Wybierz anulowanie albo downgrade planu.",
                "Potwierdź zmianę.",
            ],
            notes:
                "Po anulowaniu Notion zwykle pozwala korzystać z płatnych funkcji do końca okresu rozliczeniowego.",
            matchingKeywords: ["notion", "notion ai", "notion plus"],
        },
        {
            providerName: "Duolingo",
            providerSlug: "duolingo",
            category: SubscriptionCategory.education,
            logoKey: "duolingo",
            cancelUrl: "https://www.duolingo.com/settings/subscription",
            supportUrl: "https://www.duolingo.com/help/cancel-my-super-duolingo-subscription",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Otwórz Duolingo albo zaloguj się na stronie.",
                "Przejdź do ustawień subskrypcji.",
                "Wybierz Manage subscription.",
                "Kliknij Cancel subscription.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "Jeśli Super Duolingo było kupione przez App Store albo Google Play, anulowanie trzeba wykonać w subskrypcjach Apple albo Google.",
            matchingKeywords: ["duolingo", "super duolingo", "duolingo plus"],
        },
        {
            providerName: "GitHub Copilot",
            providerSlug: "github-copilot",
            category: SubscriptionCategory.productivity,
            logoKey: "github",
            cancelUrl: "https://github.com/settings/copilot",
            supportUrl:
                "https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się do GitHub.",
                "Wejdź w ustawienia konta.",
                "Otwórz sekcję GitHub Copilot.",
                "Wybierz Manage subscription.",
                "Kliknij Cancel subscription.",
                "Potwierdź anulowanie planu Copilot.",
            ],
            notes:
                "Dla organizacji lub firm zarządzanie subskrypcją Copilot może odbywać się przez ustawienia organizacji.",
            matchingKeywords: ["github copilot", "copilot", "github"],
        },
        {
            providerName: "Slack",
            providerSlug: "slack",
            category: SubscriptionCategory.productivity,
            logoKey: "slack",
            cancelUrl: "https://slack.com/help/articles/218915087-Manage-your-Slack-plan-and-billing-details",
            supportUrl:
                "https://slack.com/help/articles/48764458651795-Change-or-cancel-your-paid-Slack-plan",
            difficulty: CancelDifficulty.hard,
            estimatedTimeMinutes: 8,
            instructions: [
                "Otwórz Slack na desktopie.",
                "Kliknij nazwę workspace.",
                "Przejdź do Tools & settings albo ustawień workspace.",
                "Wejdź w Manage billing.",
                "W sekcji planu wybierz zmianę planu lub anulowanie/downgrade.",
                "Potwierdź zmianę.",
            ],
            notes:
                "Slack billing zwykle wymaga uprawnień właściciela workspace lub administratora. W niektórych przypadkach zamiast anulowania wykonuje się downgrade do planu Free.",
            matchingKeywords: ["slack", "slack pro", "slack business"],
        },
        {
            providerName: "LinkedIn Premium",
            providerSlug: "linkedin-premium",
            category: SubscriptionCategory.education,
            logoKey: "linkedin",
            cancelUrl: "https://www.linkedin.com/premium/manage",
            supportUrl: "https://www.linkedin.com/help/linkedin/answer/a545578",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 5,
            instructions: [
                "Zaloguj się do LinkedIn.",
                "Przejdź do zarządzania Premium albo zakupami.",
                "Wybierz aktywną subskrypcję.",
                "Kliknij Cancel subscription.",
                "Potwierdź anulowanie.",
            ],
            notes:
                "LinkedIn wskazuje, że anulowanie zależy od sposobu zakupu. Po anulowaniu funkcje Premium zwykle wygasają na koniec okresu rozliczeniowego.",
            matchingKeywords: ["linkedin premium", "linkedin", "sales navigator", "linkedin learning"],
        },
        {
            providerName: "NordVPN",
            providerSlug: "nordvpn",
            category: SubscriptionCategory.productivity,
            logoKey: "nordvpn",
            cancelUrl: "https://my.nordaccount.com/billing",
            supportUrl:
                "https://support.nordvpn.com/hc/en-us/articles/19556844985489-How-to-cancel-auto-renewal-for-your-NordVPN-subscription",
            difficulty: CancelDifficulty.medium,
            estimatedTimeMinutes: 6,
            instructions: [
                "Zaloguj się do Nord Account.",
                "Otwórz zakładkę Billing / Rozliczenia.",
                "Znajdź sekcję Auto-renewal / Automatyczne odnawianie.",
                "Kliknij Cancel obok automatycznego odnawiania.",
                "Wybierz Cancel auto-renewal.",
                "Sprawdź, czy status odnawiania zmienił się na wyłączony.",
            ],
            notes:
                "Wyłączenie auto-renewal zatrzymuje przyszłe odnowienia. Refundacja, jeśli przysługuje, może wymagać osobnego kontaktu z supportem.",
            matchingKeywords: ["nordvpn", "nord vpn", "nord"],
        },
    ];

    for (const guide of guides) {
        await upsertCancelGuide(guide);
        console.log(`Seeded cancel guide: ${guide.providerName}`);
    }

    console.log(`Seeded ${guides.length} cancel guides.`);
}

main()
    .then(async () => {
        console.log("Cancel guides seed completed.");
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("Cancel guides seed failed:", error);
        await prisma.$disconnect();
        process.exit(1);
    });