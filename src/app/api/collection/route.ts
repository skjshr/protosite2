import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import type { CollectionResponse } from "@/types/api";
import { listFieldsByUserId } from "@/server/repositories/field-repository";
import {
  listAcquiredItemsByUserId,
  listItemsByThemeIds,
} from "@/server/repositories/item-repository";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const fields = await listFieldsByUserId(session.user.id);
    const uniqueThemeIds = Array.from(new Set(fields.map((field) => field.themeId)));

    if (uniqueThemeIds.length === 0) {
      const emptyResponse: CollectionResponse = { themes: [] };
      return NextResponse.json(emptyResponse, { status: 200 });
    }

    const [themeItems, acquiredItemMap] = await Promise.all([
      listItemsByThemeIds(uniqueThemeIds),
      listAcquiredItemsByUserId(session.user.id),
    ]);

    const groupedByTheme = new Map<string, CollectionResponse["themes"][number]>();

    for (const themeItem of themeItems) {
      const themeKey = themeItem.theme.key;
      const existing = groupedByTheme.get(themeKey);
      if (!existing) {
        groupedByTheme.set(themeKey, {
          themeKey,
          themeDisplayName: themeItem.theme.displayName,
          items: [],
        });
      }

      const acquiredAt = acquiredItemMap.get(themeItem.item.id) ?? null;
      groupedByTheme.get(themeKey)?.items.push({
        id: themeItem.item.id,
        key: themeItem.item.key,
        name: themeItem.item.name,
        rarity: themeItem.item.rarity,
        description: themeItem.item.description,
        isAcquired: acquiredAt !== null,
        acquiredAt,
      });
    }

    const response: CollectionResponse = {
      themes: Array.from(groupedByTheme.values()),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    return NextResponse.json({ error: "図鑑データの取得に失敗しました" }, { status: 500 });
  }
}
