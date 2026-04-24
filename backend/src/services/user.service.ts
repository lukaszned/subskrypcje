import { prisma } from "../lib/prisma";

export async function getUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
    });
}

export async function getUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email },
    });
}