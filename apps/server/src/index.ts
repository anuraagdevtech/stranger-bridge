import "./lib/env"; // fail fast if required env vars are missing
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { Server } from "socket.io";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { friendsRouter } from "./routes/friends";
import { historyRouter } from "./routes/history";
import { reportsRouter } from "./routes/reports";
import { blocksRouter } from "./routes/blocks";
import { registerSocketHandlers } from "./socket";

const app = express();
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/friends", friendsRouter);
app.use("/history", historyRouter);
app.use("/reports", reportsRouter);
app.use("/blocks", blocksRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ message });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin, credentials: true },
});
registerSocketHandlers(io);

httpServer.listen(env.port, () => {
  console.log(`stranger-bridge server listening on :${env.port}`);
});
