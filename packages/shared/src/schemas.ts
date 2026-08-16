import { z } from "zod";

// Validation schemas shared between the server (request validation) and the
// clients (form validation), so the rules can never drift apart.

export const genderSchema = z.enum([
  "male",
  "female",
  "non_binary",
  "prefer_not_to_say",
]);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().min(2).max(40),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Minimum age enforced at onboarding time (see apps/server/src/routes/users.ts).
export const MIN_AGE_YEARS = 18;

export const onboardingSchema = z.object({
  birthDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  tosAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service" }),
  }),
  gender: genderSchema.optional(),
  region: z.string().trim().max(60).optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const matchFiltersSchema = z.object({
  interests: z.array(z.string()).max(10).optional(),
  genderPreference: z.union([genderSchema, z.literal("any")]).optional(),
  region: z.string().optional(),
});
export type MatchFiltersInput = z.infer<typeof matchFiltersSchema>;

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const reportSchema = z.object({
  reportedId: z.string().min(1),
  matchSessionId: z.string().optional(),
  reason: z.enum([
    "harassment",
    "explicit_content",
    "spam",
    "underage",
    "other",
  ]),
  details: z.string().trim().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const friendRequestSchema = z.object({
  addresseeId: z.string().min(1),
});
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
