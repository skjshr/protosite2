import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { normalizeUsername, validateUsername } from "@/types/validation";
import * as userRepository from "@/server/repositories/user-repository";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = (await request.json()) as { username?: string };
  if (typeof body.username !== "string") {
    return NextResponse.json({ error: "username が必要です" }, { status: 400 });
  }

  const validation = validateUsername(body.username);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error ?? "ユーザー名が不正です" }, { status: 400 });
  }

  const normalizedUsername = normalizeUsername(body.username);

  try {
    const existing = await userRepository.findUserByUsernameNormalized(normalizedUsername);
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "このユーザー名は既に使用されています" }, { status: 409 });
    }

    await userRepository.updateUsername(session.user.id, body.username.trim(), normalizedUsername);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "オンボーディング保存に失敗しました" }, { status: 500 });
  }
}
