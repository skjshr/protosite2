import { prisma } from "@/server/db/client";
import { DEFAULT_USER_NAME } from "@/server/constants/default-user";

export async function getOrCreateDefaultUser() {
  return prisma.user.upsert({
    where: { name: DEFAULT_USER_NAME },
    update: {},
    create: {
      name: DEFAULT_USER_NAME,
      totalXp: 0,
    },
  });
}
