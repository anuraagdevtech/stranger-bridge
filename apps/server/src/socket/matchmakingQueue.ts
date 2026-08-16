import type { MatchFilters, Gender } from "@stranger-bridge/shared";

export interface QueueEntry {
  userId: string;
  socketId: string;
  gender: Gender | null;
  region: string | null;
  interests: string[];
  filters: MatchFilters;
  joinedAt: number;
}

/**
 * A tiny in-memory matchmaking queue. Fine for a single server process /
 * MVP scale — a production deployment would move this to Redis (or a
 * dedicated matchmaking service) so it works across multiple server
 * instances and survives restarts.
 */
export class MatchmakingQueue {
  private waiting: QueueEntry[] = [];

  add(entry: QueueEntry) {
    this.remove(entry.userId);
    this.waiting.push(entry);
  }

  remove(userId: string) {
    this.waiting = this.waiting.filter((e) => e.userId !== userId);
  }

  size() {
    return this.waiting.length;
  }

  /**
   * Looks for the first waiting entry compatible with `candidate`, given a
   * `isBlocked` predicate the caller supplies (backed by the DB). Filters
   * are treated as mutual: both sides' preferences must be satisfied.
   */
  findMatch(
    candidate: QueueEntry,
    isBlocked: (a: string, b: string) => boolean,
  ): QueueEntry | null {
    for (const other of this.waiting) {
      if (other.userId === candidate.userId) continue;
      if (isBlocked(candidate.userId, other.userId)) continue;
      if (!this.satisfies(candidate, other)) continue;
      if (!this.satisfies(other, candidate)) continue;
      return other;
    }
    return null;
  }

  private satisfies(viewer: QueueEntry, target: QueueEntry): boolean {
    const pref = viewer.filters.genderPreference;
    if (pref && pref !== "any" && target.gender !== pref) return false;

    const region = viewer.filters.region;
    if (region && region !== "any" && target.region !== region) return false;

    const wantedInterests = viewer.filters.interests;
    if (wantedInterests && wantedInterests.length > 0) {
      const hasOverlap = wantedInterests.some((i) => target.interests.includes(i));
      if (!hasOverlap) return false;
    }

    return true;
  }
}
