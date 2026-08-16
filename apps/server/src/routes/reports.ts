import { Router } from "express";
import { reportSchema } from "@stranger-bridge/shared";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { reportedId, matchSessionId, reason, details } = parsed.data;
    if (reportedId === req.userId) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    await prisma.report.create({
      data: {
        reporterId: req.userId!,
        reportedId,
        matchSessionId,
        reason,
        details,
      },
    });

    // Reporting also blocks the reported user going forward, so they're
    // never re-matched with the reporter while the report is reviewed.
    await prisma.block
      .create({ data: { blockerId: req.userId!, blockedId: reportedId } })
      .catch(() => undefined); // ignore if already blocked

    res.status(201).end();
  }),
);
