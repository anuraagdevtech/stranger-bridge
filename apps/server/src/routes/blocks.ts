import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toPublicUser } from "../lib/serialize";
import { asyncHandler } from "../lib/asyncHandler";

export const blocksRouter = Router();
blocksRouter.use(requireAuth);

const createBlockSchema = z.object({ blockedId: z.string().min(1) });

blocksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createBlockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { blockedId } = parsed.data;
    if (blockedId === req.userId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }
    await prisma.block
      .create({ data: { blockerId: req.userId!, blockedId } })
      .catch(() => undefined); // already blocked - idempotent
    res.status(201).end();
  }),
);

blocksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const blocks = await prisma.block.findMany({
      where: { blockerId: req.userId! },
      include: { blocked: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(blocks.map((b) => toPublicUser(b.blocked)));
  }),
);

blocksRouter.delete(
  "/:blockedId",
  asyncHandler(async (req, res) => {
    await prisma.block
      .delete({
        where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: req.params.blockedId } },
      })
      .catch(() => undefined); // idempotent
    res.status(204).end();
  }),
);
