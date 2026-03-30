import { prisma } from "@/server/db/client";

export async function listWeeklyRanking(weekStart: Date, weekEnd: Date) {
  const groupedRows = await prisma.workSession.groupBy({
    by: ["userId"],
    where: {
      status: "ended",
      endedAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    _sum: {
      score: true,
    },
    orderBy: {
      _sum: {
        score: "desc",
      },
    },
  });

  const userIds = groupedRows.map((row) => row.userId);
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      username: true,
    },
  });

  const usernameByUserId = new Map(users.map((user) => [user.id, user.username ?? "unknown"]));

  return groupedRows.map((row) => ({
    userId: row.userId,
    username: usernameByUserId.get(row.userId) ?? "unknown",
    weeklyScore: row._sum.score ?? 0,
  }));
}
