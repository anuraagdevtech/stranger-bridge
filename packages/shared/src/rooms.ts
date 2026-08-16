/**
 * Deterministic chat room id for a direct (friend-initiated) conversation,
 * independent of who opens it first. Match-session rooms use the
 * MatchSession id instead (see MatchFoundPayload.roomId).
 */
export function friendRoomId(userIdA: string, userIdB: string): string {
  return `friend:${[userIdA, userIdB].sort().join(":")}`;
}
