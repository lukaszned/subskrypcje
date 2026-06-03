import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import subscriptionsRouter from "./routes/subscriptions";
import usersRouter from "./routes/users";
import dashboardRouter from "./routes/dashboard";
import cancelGuideRoutes from "./routes/cancel-guides";
import emailScanRouter from "./routes/email-scan";
import { emailScanDebugMiddleware } from "./middlewares/email-scan-debug.middleware";
import { prisma } from "./lib/prisma";
import { startExchangeRateRefreshJob } from "./services/exchange-rate.service";
import { logStartupEnvironmentDiagnostics } from "./config/env";

dotenv.config();
logStartupEnvironmentDiagnostics();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

app.use("/users", usersRouter);
app.use("/subscriptions", subscriptionsRouter);
app.use("/dashboard", dashboardRouter);
app.use("/cancel-guides", cancelGuideRoutes);
app.use("/email-scan", emailScanDebugMiddleware, emailScanRouter);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    startExchangeRateRefreshJob();
});
