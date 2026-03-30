import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { getCurrentWeekEndUtc, getCurrentWeekStartUtc } from "@/lib/week";
import type { RankingResponse } from "@/types/api";
import { listWeeklyRanking } from "@/server/repositories/ranking-repository";
import { extractNearbyRanking } from "@/server/services/ranking-service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekStart = getCurrentWeekStartUtc(now);
    const weekEnd = getCurrentWeekEndUtc(weekStart);

    const allRanking = await listWeeklyRanking(weekStart, weekEnd);
    const nearby = extractNearbyRanking(allRanking, session.user.id);
    const myEntry = allRanking.find((entry) => entry.userId === session.user.id);
    const myRank = myEntry ? allRanking.findIndex((entry) => entry.userId === session.user.id) + 1 : null;

    const response: RankingResponse = {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      myRank,
      myWeeklyScore: myEntry?.weeklyScore ?? 0,
      nearby,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch ranking:", error);
    return NextResponse.json({ error: "ランキング取得に失敗しました" }, { status: 500 });
  }
}
