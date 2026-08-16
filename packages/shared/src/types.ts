// Domain types shared by server, web, and mobile. Keep these in sync with
// apps/server/prisma/schema.prisma — this file is the "public" (client-safe)
// shape of each model, not a 1:1 mirror (e.g. no passwordHash).

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type MatchEndReason = "LEFT" | "SKIPPED" | "REPORTED" | "DISCONNECTED";

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  gender: Gender | null;
  region: string | null;
  interests: string[];
}

export interface Me extends PublicUser {
  email: string;
  birthDate: string | null; // ISO date
  tosAcceptedAt: string | null; // ISO datetime, null until onboarding completes
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Friendship {
  id: string;
  requester: PublicUser;
  addressee: PublicUser;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchHistoryEntry {
  matchSessionId: string;
  peer: PublicUser;
  startedAt: string;
  endedAt: string | null;
  endedReason: MatchEndReason | null;
  isFriend: boolean;
  lastMessagePreview: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string; // matchSessionId or friendship-derived conversation id
  senderId: string;
  body: string;
  createdAt: string;
}

export interface MatchFilters {
  interests?: string[];
  genderPreference?: Gender | "any";
  region?: string | "any";
}

export interface MatchFoundPayload {
  matchSessionId: string;
  roomId: string;
  peer: PublicUser;
}

export type CallKind = "voice" | "video";
