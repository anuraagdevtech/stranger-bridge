import { Router, type Request, type Response } from "express";
import { friendRequestSchema } from "@stranger-bridge/shared";
import type { Friendship as PrismaFriendship, User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toPublicUser } from "../lib/serialize";
import { asyncHandler } from "../lib/asyncHandler";

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

type FriendshipWithUsers = PrismaFriendship & { requester: User; addressee: User };

function toFriendship(f: FriendshipWithUsers) {
  return {
    id: f.id,
    requester: toPublicUser(f.requester),
    addressee: toPublicUser(f.addressee),
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

friendsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: req.userId! }, { addresseeId: req.userId! }] },
      include: { requester: true, addressee: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(friendships.map(toFriendship));
  }),
);

friendsRouter.post(
  "/requests",
  asyncHandler(async (req, res) => {
    const parsed = friendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { addresseeId } = parsed.data;
    if (addresseeId === req.userId) {
      return res.status(400).json({ message: "You cannot friend yourself" });
    }

    const [blockedEitherWay, existing] = await Promise.all([
      prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: req.userId!, blockedId: addresseeId },
            { blockerId: addresseeId, blockedId: req.userId! },
          ],
        },
      }),
      prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: req.userId!, addresseeId },
            { requesterId: addresseeId, addresseeId: req.userId! },
          ],
        },
      }),
    ]);

    if (blockedEitherWay) {
      return res.status(403).json({ message: "You cannot friend this user" });
    }
    if (existing) {
      return res.status(409).json({ message: "A friend request already exists between these users" });
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId: req.userId!, addresseeId },
      include: { requester: true, addressee: true },
    });
    res.status(201).json(toFriendship(friendship));
  }),
);

async function respond(req: Request, res: Response, status: "ACCEPTED" | "DECLINED") {
  const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
  if (!friendship || friendship.addresseeId !== req.userId) {
    return res.status(404).json({ message: "Friend request not found" });
  }
  const updated = await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status },
    include: { requester: true, addressee: true },
  });
  res.json(toFriendship(updated));
}

friendsRouter.post(
  "/requests/:id/accept",
  asyncHandler((req, res) => respond(req, res, "ACCEPTED")),
);

friendsRouter.post(
  "/requests/:id/decline",
  asyncHandler((req, res) => respond(req, res, "DECLINED")),
);

friendsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
    if (!friendship || (friendship.requesterId !== req.userId && friendship.addresseeId !== req.userId)) {
      return res.status(404).json({ message: "Friendship not found" });
    }
    await prisma.friendship.delete({ where: { id: friendship.id } });
    res.status(204).end();
  }),
);
