import jwt from "jsonwebtoken";
import { env } from "./env";

export interface AccessTokenPayload {
  sub: string; // userId
}

// env vars are plain `string`, but @types/jsonwebtoken narrows `expiresIn` to
// a template-literal union (e.g. `${number}m`) — cast at this one boundary
// rather than losing type safety on the env module itself.
type Expiry = jwt.SignOptions["expiresIn"];

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AccessTokenPayload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessTtl as Expiry,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl as Expiry,
  });
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as AccessTokenPayload;
}

/** Parses simple "15m" / "30d" / "1h" / "45s" durations into a future Date. */
export function durationFromNow(duration: string): Date {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(Date.now() + value * unitMs[match[2]]);
}
