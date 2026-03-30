import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import type { CreateFieldRequest } from "@/types/api";
import * as fieldRepository from "@/server/repositories/field-repository";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const fields = await fieldRepository.listFieldsByUserId(session.user.id);
    return NextResponse.json({ fields }, { status: 200 });
  } catch (error) {
    console.error("Failed to list fields:", error);
    return NextResponse.json({ error: "フィールド取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CreateFieldRequest>;
  if (!body || typeof body.name !== "string" || typeof body.themeKey !== "string" || typeof body.isPublic !== "boolean") {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  if (body.name.trim().length === 0) {
    return NextResponse.json({ error: "フィールド名は必須です" }, { status: 400 });
  }

  try {
    const theme = await fieldRepository.findThemeByKey(body.themeKey);
    if (!theme) {
      return NextResponse.json({ error: "themeKey が不正です" }, { status: 404 });
    }

    await fieldRepository.createFieldForUser({
      userId: session.user.id,
      name: body.name.trim(),
      themeId: theme.id,
      isPublic: body.isPublic,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to create field:", error);
    return NextResponse.json({ error: "フィールド作成に失敗しました" }, { status: 500 });
  }
}
