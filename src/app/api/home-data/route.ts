import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { getHomeData } from "@/server/services/home-data-service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const data = await getHomeData(session.user.id);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch home data:", error);
    return NextResponse.json({ error: "ホームデータの取得に失敗しました" }, { status: 500 });
  }
}
