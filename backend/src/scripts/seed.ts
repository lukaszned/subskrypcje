import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: "test@flowpay.app",
        },
    });

    if (existingUser) {
        console.log("Test user already exists:", existingUser);
        return;
    }

    const user = await prisma.user.create({
        data: {
            email: "test@flowpay.app",
            name: "Test User",
        },
    });

    console.log("Created test user:", user);
}

main()
    .catch((error) => {
        console.error("Seed error:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });