import type { ThemeKey } from "@/types/field";
import { prisma } from "@/server/db/client";

export async function listFieldsByUserId(userId: string) {
  return prisma.field.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      theme: true,
    },
  });
}

export async function createFieldForUser(input: {
  userId: string;
  name: string;
  themeId: string;
  isPublic: boolean;
}) {
  return prisma.field.create({
    data: {
      userId: input.userId,
      name: input.name,
      themeId: input.themeId,
      isPublic: input.isPublic,
    },
    include: {
      theme: true,
    },
  });
}

export async function findFieldByIdAndUserId(fieldId: string, userId: string) {
  return prisma.field.findFirst({
    where: {
      id: fieldId,
      userId,
    },
    include: {
      theme: true,
    },
  });
}

export async function findThemeByKey(themeKey: ThemeKey) {
  return prisma.theme.findUnique({
    where: {
      key: themeKey,
    },
  });
}

export async function listActiveThemes() {
  return prisma.theme.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });
}
