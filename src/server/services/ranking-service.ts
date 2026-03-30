import type { RankingEntry } from "@/types/api";

export function extractNearbyRanking(
  allRanking: Array<{ userId: string; username: string; weeklyScore: number }>,
  currentUserId: string,
  neighborCount = 2,
): RankingEntry[] {
  const rankedEntries = allRanking.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: entry.username,
    weeklyScore: entry.weeklyScore,
    isCurrentUser: entry.userId === currentUserId,
  }));

  const myIndex = rankedEntries.findIndex((entry) => entry.userId === currentUserId);

  if (myIndex === -1) {
    return rankedEntries.slice(0, neighborCount).map((entry) => ({
      rank: entry.rank,
      username: entry.username,
      weeklyScore: entry.weeklyScore,
      isCurrentUser: entry.isCurrentUser,
    }));
  }

  const startIndex = Math.max(0, myIndex - neighborCount);
  const endIndex = Math.min(rankedEntries.length, myIndex + neighborCount + 1);

  return rankedEntries.slice(startIndex, endIndex).map((entry) => ({
    rank: entry.rank,
    username: entry.username,
    weeklyScore: entry.weeklyScore,
    isCurrentUser: entry.isCurrentUser,
  }));
}
