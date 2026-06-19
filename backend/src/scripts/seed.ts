import "dotenv/config";
import { prisma } from "../lib/prisma";
import { SubscriptionCategory, BillingCycle, SubscriptionStatus } from "@prisma/client";

async function main() {
    const testEmail = "test@sub-sentry.com";
    
    // 1. Wyczyść stare dane dla tego maila (opcjonalnie, ale pomocne przy re-seed)
    const existingUser = await prisma.user.findUnique({
        where: { email: testEmail },
    });

    if (existingUser) {
        console.log("Cleaning existing data for test user...");
        await prisma.subscription.deleteMany({ where: { userId: existingUser.id } });
        await prisma.userSettings.deleteMany({ where: { userId: existingUser.id } });
        await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // 2. Stwórz użytkownika
    const user = await prisma.user.create({
        data: {
            email: testEmail,
            name: "Lukasz Sub-Sentry",
            settings: {
                create: {
                    baseCurrency: "PLN",
                    defaultReminderDaysBefore: 2,
                    notificationsEnabled: true,
                    emailReportsEnabled: true,
                }
            }
        },
    });

    console.log("Created test user with settings:", user.email);

    // 3. Stwórz subskrypcje
    const today = new Date();
    
    const subscriptions = [
        {
            name: "Netflix",
            provider: "Netflix",
            amount: 43.00,
            currency: "PLN",
            category: SubscriptionCategory.entertainment,
            billingCycle: BillingCycle.monthly,
            nextPaymentDate: new Date(new Date().setDate(today.getDate() + 3)), // za 3 dni
            status: SubscriptionStatus.pending,
        },
        {
            name: "Spotify Family",
            provider: "Spotify",
            amount: 29.99,
            currency: "PLN",
            category: SubscriptionCategory.entertainment,
            billingCycle: BillingCycle.monthly,
            nextPaymentDate: new Date(new Date().setDate(today.getDate() + 14)), // za 2 tygodnie
            status: SubscriptionStatus.pending,
        },
        {
            name: "Adobe Creative Cloud",
            provider: "Adobe",
            amount: 149.50,
            currency: "PLN",
            category: SubscriptionCategory.productivity,
            billingCycle: BillingCycle.monthly,
            nextPaymentDate: new Date(new Date().setDate(today.getDate() - 1)), // wczoraj (overdue!)
            status: SubscriptionStatus.pending,
        },
        {
            name: "ChatGPT Plus",
            provider: "OpenAI",
            amount: 20.00,
            currency: "USD", // inna waluta!
            category: SubscriptionCategory.productivity,
            billingCycle: BillingCycle.monthly,
            nextPaymentDate: new Date(new Date().setDate(today.getDate() + 20)),
            status: SubscriptionStatus.pending,
        },
        {
            name: "Allegro Smart",
            provider: "Allegro",
            amount: 59.90,
            currency: "PLN",
            category: SubscriptionCategory.shopping,
            billingCycle: BillingCycle.yearly,
            nextPaymentDate: new Date(new Date().setFullYear(today.getFullYear() + 1)), // za rok
            status: SubscriptionStatus.paid,
            lastPaymentDate: today,
        },
        {
            name: "Apple One",
            provider: "Apple",
            amount: 34.99,
            currency: "PLN",
            category: SubscriptionCategory.entertainment,
            billingCycle: BillingCycle.monthly,
            isTrial: true,
            trialEndDate: new Date(new Date().setDate(today.getDate() + 7)), // trial kończy się za tydzień
            nextPaymentDate: new Date(new Date().setDate(today.getDate() + 7)),
            status: SubscriptionStatus.pending,
        }
    ];

    for (const sub of subscriptions) {
        await prisma.subscription.create({
            data: {
                ...sub,
                userId: user.id,
            }
        });
    }

    console.log(`Successfully seeded ${subscriptions.length} subscriptions.`);
}

main()
    .catch((error) => {
        console.error("Seed error:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });