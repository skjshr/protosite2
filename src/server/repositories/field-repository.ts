import type { FieldTheme } from "@/types/field";
import { prisma } from "@/server/db/client";

export async function listFieldsByUserId(userId: string) {
  return prisma.field.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createFieldForUser(input: {
  userId: string;
  name: string;
  theme: FieldTheme;
  isPublic: boolean;
}) {
  return prisma.field.create({
    data: {
      userId: input.userId,
      name: input.name,
      theme: input.theme,
      isPublic: input.isPublic,
    },
  });
}

export async function findFieldByIdAndUserId(fieldId: string, userId: string) {
  return prisma.field.findFirst({
    where: {
      id: fieldId,
      userId,
    },
  });
}
