import { Router } from "express";
import type { MatchHistoryEntry } from "@stranger-bridge/shared";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toPublicUser } from "../lib/serialize";
import { asyncHandler } from "../lib/asyncHandler";

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const sessions = await prisma.matchSession.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: true, userB: true },
      orderBy: { startedAt: "desc" },
    });

    const peerIds = sessions.map((s) => (s.userAId === userId ? s.userBId : s.userAId));
    const acceptedFriendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userId, addresseeId: { in: peerIds } },
          { addresseeId: userId, requesterId: { in: peerIds } },
        ],
      },
    });
    const friendPeerIds = new Set(
      acceptedFriendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)),
    );

    const entries: MatchHistoryEntry[] = await Promise.all(
      sessions.map(async (session) => {
        const peer = session.userAId === userId ? session.userB : session.userA;
        const lastMessage = await prisma.message.findFirst({
          where: { matchSessionId: session.id },
          orderBy: { createdAt: "desc" },
        });
        return {
          matchSessionId: session.id,
          peer: toPublicUser(peer),
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt ? session.endedAt.toISOString() : null,
          endedReason: session.endedReason,
          isFriend: friendPeerIds.has(peer.id),
          lastMessagePreview: lastMessage ? lastMessage.body.slice(0, 140) : null,
        };
      }),
    );

    res.json(entries);
  }),
);
