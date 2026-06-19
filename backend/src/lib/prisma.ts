import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Prawidłowa inicjalizacja adaptera PG dla Prisma
const pool = new Pool({ 
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["query", "info", "warn", "error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}