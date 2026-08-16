import { Router } from "express";
import { MIN_AGE_YEARS, genderSchema, onboardingSchema } from "@stranger-bridge/shared";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toMe } from "../lib/serialize";
import { asyncHandler } from "../lib/asyncHandler";

export const usersRouter = Router();
usersRouter.use(requireAuth);

function ageInYears(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    res.json(toMe(user));
  }),
);

usersRouter.patch(
  "/me/onboarding",
  asyncHandler(async (req, res) => {
    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { birthDate, gender, region, interests } = parsed.data;
    const parsedBirthDate = new Date(birthDate);

    if (ageInYears(parsedBirthDate) < MIN_AGE_YEARS) {
      return res.status(403).json({ message: `You must be at least ${MIN_AGE_YEARS} to use Stranger Bridge` });
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        birthDate: parsedBirthDate,
        tosAcceptedAt: new Date(),
        gender,
        region,
        interests,
      },
    });
    res.json(toMe(user));
  }),
);

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  gender: genderSchema.optional(),
  region: z.string().trim().max(60).optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  avatarUrl: z.string().url().optional(),
});

usersRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: parsed.data,
    });
    res.json(toMe(user));
  }),
);
