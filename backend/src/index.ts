import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});