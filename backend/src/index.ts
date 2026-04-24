import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import subscriptionsRouter from "./routes/subscriptions";
import { prisma } from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ message: "FlowPay backend działa" });
});

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/users", async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.use("/subscriptions", subscriptionsRouter);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});