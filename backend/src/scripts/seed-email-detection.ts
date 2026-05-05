import "dotenv/config";
import {
    DetectedSubscriptionStatus,
    EmailProvider,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

async function findTargetUser() {
    const testUserEmail = process.env.TEST_USER_EMAIL;

    if (testUserEmail) {
        const user = await prisma.user.findUnique({
            where: {
                email: testUserEmail,
            },
        });

        if (!user) {
            throw new Error(`No user found for TEST_USER_EMAIL=${testUserEmail}`);
        }

        return user;
    }

    return prisma.user.findFirst({
        orderBy: {
            createdAt: "asc",
        },
    });
}

async function main() {
    const user = await findTargetUser();

    if (!user) {
        throw new Error(
            "No users found. Create a test user first or set TEST_USER_EMAIL."
        );
    }

    const detection = await prisma.detectedSubscription.create({
        data: {
            userId: user.id,
            sourceProvider: EmailProvider.gmail,
            sourceMessageId: `dev-google-play-${Date.now()}`,
            provider: "Google Play",
            name: "Google Play",
            amount: null,
            currency: null,
            billingCycle: null,
            nextPaymentDate: null,
            trialEndDate: new Date("2026-11-10T00:00:00.000Z"),
            isTrial: true,
            category: null,
            confidence: 1.0,
            status: DetectedSubscriptionStatus.pending,
            evidenceSnippet:
                "Google Play trial subscription detected from Gmail metadata. Trial will end on Nov 10, 2026.",
        },
    });

    console.log("Seeded email detection.");
    console.log(`User email: ${user.email}`);
    console.log(`Created detection id: ${detection.id}`);
    console.log(`Status: ${detection.status}`);
    console.log("");
    console.log("Test with:");
    console.log("GET /email-scan/detections?status=pending");
    console.log(`PATCH /email-scan/detections/${detection.id}/accept`);
    console.log(`PATCH /email-scan/detections/${detection.id}/ignore`);
}

main()
    .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Seed email detection error: ${message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
