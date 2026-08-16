import { Router } from "express";
import { loginSchema, registerSchema } from "@stranger-bridge/shared";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  durationFromNow,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { toMe } from "../lib/serialize";
import { asyncHandler } from "../lib/asyncHandler";
import { env } from "../lib/env";

export const authRouter = Router();

async function issueTokens(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: durationFromNow(env.jwtRefreshTtl),
    },
  });
  return { accessToken, refreshToken };
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash: await hashPassword(password),
      },
    });

    const tokens = await issueTokens(user.id);
    res.status(201).json({ user: toMe(user), tokens });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const tokens = await issueTokens(user.id);
    res.json({ user: toMe(user), tokens });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken as string | undefined;
    if (!refreshToken) {
      return res.status(400).json({ message: "Missing refresh token" });
    }

    let userId: string;
    try {
      userId = verifyRefreshToken(refreshToken).sub;
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: "Refresh token no longer valid" });
    }

    // Rotate: revoke the used token and issue a fresh pair.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(userId);
    res.json(tokens);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken as string | undefined;
    if (refreshToken) {
      await prisma.refreshToken
        .updateMany({
          where: { token: refreshToken, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    }
    res.status(204).end();
  }),
);
