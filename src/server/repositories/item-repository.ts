import { prisma } from "@/server/db/client";

export type ThemeItemWithItem = {
  itemId: string;
  dropWeight: number;
  unlockLevel: number | null;
  item: {
    id: string;
    key: string;
    name: string;
    rarity: "common" | "rare" | "epic";
    description: string | null;
  };
};

export async function listThemeItemsWithItems(themeId: string): Promise<ThemeItemWithItem[]> {
  const rows = await prisma.themeItem.findMany({
    where: { themeId },
    include: {
      item: true,
    },
  });

  return rows.map((row) => ({
    itemId: row.itemId,
    dropWeight: row.dropWeight ?? 0,
    unlockLevel: row.unlockLevel,
    item: {
      id: row.item.id,
      key: row.item.key,
      name: row.item.name,
      rarity: row.item.rarity,
      description: row.item.description,
    },
  }));
}

export async function createUserItem(params: {
  userId: string;
  itemId: string;
  acquiredWorkSessionId: string;
}) {
  return prisma.userItem.create({
    data: {
      userId: params.userId,
      itemId: params.itemId,
      acquiredWorkSessionId: params.acquiredWorkSessionId,
    },
  });
}

export async function listAcquiredItemIdsByUserId(userId: string): Promise<Set<string>> {
  const rows = await prisma.userItem.findMany({
    where: { userId },
    select: { itemId: true },
  });

  return new Set(rows.map((row) => row.itemId));
}

export async function listAcquiredItemsByUserId(userId: string): Promise<Map<string, string>> {
  const rows = await prisma.userItem.findMany({
    where: { userId },
    orderBy: { acquiredAt: "asc" },
    select: {
      itemId: true,
      acquiredAt: true,
    },
  });

  const acquiredMap = new Map<string, string>();
  for (const row of rows) {
    if (!acquiredMap.has(row.itemId)) {
      acquiredMap.set(row.itemId, row.acquiredAt.toISOString());
    }
  }

  return acquiredMap;
}

export async function listItemsByThemeIds(themeIds: string[]) {
  return prisma.themeItem.findMany({
    where: {
      themeId: {
        in: themeIds,
      },
    },
    include: {
      theme: true,
      item: true,
    },
    orderBy: [{ theme: { sortOrder: "asc" } }, { item: { createdAt: "asc" } }],
  });
}
