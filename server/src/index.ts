import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { usersRouter } from "./routes/users";
import { ticketsRouter } from "./routes/tickets";
import { startEmailPoller } from "./lib/email-poller";

const required = ["BETTER_AUTH_SECRET", "DATABASE_URL", "CLIENT_ORIGIN"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.all("/api/auth/*", authLimiter, toNodeHandler(auth));
} else {
  app.all("/api/auth/*", toNodeHandler(auth));
}

app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);

// Global error handler — catches anything forwarded via next(err) or thrown
// inside an asyncHandler-wrapped route.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startEmailPoller(Number(process.env.POLL_INTERVAL_MS) || 60_000);
});
