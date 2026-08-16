import type { User } from "@prisma/client";
import type { Me, PublicUser } from "@stranger-bridge/shared";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    region: user.region,
    interests: user.interests,
  };
}

export function toMe(user: User): Me {
  return {
    ...toPublicUser(user),
    email: user.email,
    birthDate: user.birthDate ? user.birthDate.toISOString() : null,
    tosAcceptedAt: user.tosAcceptedAt ? user.tosAcceptedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}
